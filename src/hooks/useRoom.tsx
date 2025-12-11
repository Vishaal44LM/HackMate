import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface Room {
  id: string;
  name: string;
  theme: string;
  description: string | null;
  created_at: string;
  created_by: string;
  max_participants: number;
  current_user_count: number;
  status: string;
}

interface Participant {
  id: string;
  user_id: string;
  room_id: string;
  joined_at: string;
  is_active: boolean;
  last_seen: string;
  device_id: string | null;
}

interface Message {
  id: string;
  room_id: string;
  user_id: string | null;
  user_email: string | null;
  message: string;
  is_ai: boolean;
  created_at: string;
}

interface Suggestion {
  id: string;
  room_id: string;
  suggestion: string;
  suggestion_type: string;
  created_at: string;
}

// Generate a unique device ID
const getDeviceId = () => {
  let deviceId = localStorage.getItem('hackmate_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('hackmate_device_id', deviceId);
  }
  return deviceId;
};

export const useRoom = (roomId: string | undefined) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch room data
  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (error) {
      setError('Room not found');
      return null;
    }
    
    setRoom(data as Room);
    return data;
  }, [roomId]);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (!roomId) return;
    
    const { data } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true);
    
    if (data) {
      setParticipants(data as Participant[]);
    }
  }, [roomId]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    
    const { data } = await supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data as Message[]);
    }
  }, [roomId]);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async () => {
    if (!roomId) return;
    
    const { data } = await supabase
      .from('room_ai_suggestions')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) {
      setSuggestions(data as Suggestion[]);
    }
  }, [roomId]);

  // Join room using atomic function
  const joinRoom = useCallback(async () => {
    if (!user || !roomId) return { success: false, error: 'Missing user or room ID' };
    
    const deviceId = getDeviceId();
    
    const { data, error } = await supabase.rpc('join_room', {
      p_room_id: roomId,
      p_user_id: user.id,
      p_device_id: deviceId
    });
    
    if (error) {
      console.error('Join room error:', error);
      return { success: false, error: error.message };
    }
    
    const result = data as { success: boolean; error?: string; message?: string; already_member?: boolean };
    
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to join room' };
    }
    
    // Refresh room data
    await Promise.all([fetchRoom(), fetchParticipants()]);
    
    return { success: true, alreadyMember: result.already_member };
  }, [user, roomId, fetchRoom, fetchParticipants]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!user || !roomId) return { success: false, error: 'Missing user or room ID' };
    
    const { data, error } = await supabase.rpc('leave_room', {
      p_room_id: roomId,
      p_user_id: user.id
    });
    
    if (error) {
      console.error('Leave room error:', error);
      return { success: false, error: error.message };
    }
    
    const result = data as { success: boolean; error?: string };
    return { success: result.success, error: result.error };
  }, [user, roomId]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!user || !roomId) return;
    
    await supabase.rpc('room_heartbeat', {
      p_room_id: roomId,
      p_user_id: user.id
    });
  }, [user, roomId]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !roomId || !content.trim()) return { success: false };
    
    const { error } = await supabase.from('room_messages').insert({
      room_id: roomId,
      user_id: user.id,
      user_email: user.email,
      message: content.trim(),
      is_ai: false
    });
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      return { success: false };
    }
    
    // Trigger AI moderation every 3 messages
    if (messages.length > 0 && messages.length % 3 === 0) {
      supabase.functions.invoke('ai-room-moderator', {
        body: { roomId, recentMessages: messages.slice(-5).map(m => m.message) }
      }).catch(console.error);
    }
    
    return { success: true };
  }, [user, roomId, messages, toast]);

  // Setup realtime subscriptions
  useEffect(() => {
    if (!roomId) return;
    
    const roomChannel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rooms',
        filter: `id=eq.${roomId}`
      }, () => {
        fetchRoom();
      })
      .subscribe();

    const participantsChannel = supabase
      .channel(`participants-${roomId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`
      }, () => {
        fetchParticipants();
        fetchRoom();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel(`messages-${roomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'room_messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    const suggestionsChannel = supabase
      .channel(`suggestions-${roomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'room_ai_suggestions',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setSuggestions(prev => [payload.new as Suggestion, ...prev].slice(0, 5));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(suggestionsChannel);
    };
  }, [roomId, fetchRoom, fetchParticipants]);

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchRoom(),
        fetchParticipants(),
        fetchMessages(),
        fetchSuggestions()
      ]);
      setLoading(false);
    };
    
    if (roomId) {
      loadData();
    }
  }, [roomId, fetchRoom, fetchParticipants, fetchMessages, fetchSuggestions]);

  // Heartbeat interval
  useEffect(() => {
    if (!user || !roomId) return;
    
    // Send heartbeat every 30 seconds
    heartbeatRef.current = setInterval(sendHeartbeat, 30000);
    
    // Also send on mount
    sendHeartbeat();
    
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [user, roomId, sendHeartbeat]);

  // Cleanup inactive users check
  useEffect(() => {
    if (!roomId) return;
    
    // Check for inactive users every minute
    cleanupRef.current = setInterval(async () => {
      await supabase.rpc('cleanup_inactive_participants' as any);
      fetchParticipants();
      fetchRoom();
    }, 60000);
    
    return () => {
      if (cleanupRef.current) {
        clearInterval(cleanupRef.current);
      }
    };
  }, [roomId, fetchParticipants, fetchRoom]);

  return {
    room,
    participants,
    messages,
    suggestions,
    loading,
    error,
    joinRoom,
    leaveRoom,
    sendMessage,
    fetchRoom,
    fetchParticipants
  };
};

export const useRooms = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (data) {
      setRooms(data as Room[]);
    }
  }, []);

  const fetchMyRooms = useCallback(async () => {
    if (!user) return;
    
    // Get rooms where user is a participant
    const { data: participations } = await supabase
      .from('room_participants')
      .select('room_id')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    if (!participations || participations.length === 0) {
      setMyRooms([]);
      return;
    }
    
    const roomIds = participations.map(p => p.room_id);
    
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .in('id', roomIds)
      .eq('status', 'active');
    
    if (data) {
      setMyRooms(data as Room[]);
    }
  }, [user]);

  const createRoom = useCallback(async (name: string, theme: string, description?: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name,
        theme,
        description,
        created_by: user.id,
        max_participants: 5,
        current_user_count: 0,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Join the room as creator
    const { error: joinError } = await supabase.rpc('join_room', {
      p_room_id: data.id,
      p_user_id: user.id,
      p_device_id: getDeviceId()
    });
    
    if (joinError) {
      return { success: false, error: joinError.message, roomId: data.id };
    }
    
    return { success: true, roomId: data.id };
  }, [user]);

  // Setup realtime subscription for rooms
  useEffect(() => {
    const channel = supabase
      .channel('all-rooms')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rooms' 
      }, () => {
        fetchRooms();
        fetchMyRooms();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'room_participants' 
      }, () => {
        fetchRooms();
        fetchMyRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms, fetchMyRooms]);

  // Initial fetch
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchRooms(), fetchMyRooms()]);
      setLoading(false);
    };
    load();
  }, [fetchRooms, fetchMyRooms]);

  return {
    rooms,
    myRooms,
    loading,
    createRoom,
    fetchRooms,
    fetchMyRooms
  };
};
