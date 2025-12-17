import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  join_code: string;
  is_private: boolean;
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

// Generate a unique device ID - cached for performance
const getDeviceId = (() => {
  let cachedId: string | null = null;
  return () => {
    if (cachedId) return cachedId;
    cachedId = localStorage.getItem('hackmate_device_id');
    if (!cachedId) {
      cachedId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('hackmate_device_id', cachedId);
    }
    return cachedId;
  };
})();

// Debounce helper for realtime updates
const createDebouncer = (delay: number) => {
  let timeoutId: NodeJS.Timeout | null = null;
  return (fn: () => void) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(fn, delay);
  };
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
  
  // Refs for intervals and state tracking
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<NodeJS.Timeout | null>(null);
  const isJoinedRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Memoized device ID
  const deviceId = useMemo(() => getDeviceId(), []);

  // Optimized fetch with error handling and retry
  const fetchRoom = useCallback(async () => {
    if (!roomId) return null;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (fetchError) {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          await new Promise(r => setTimeout(r, 1000 * retryCountRef.current));
          return fetchRoom();
        }
        setError('Room not found');
        return null;
      }
      
      retryCountRef.current = 0;
      setRoom(data as Room);
      return data;
    } catch (e) {
      console.error('Fetch room error:', e);
      setError('Failed to load room');
      return null;
    }
  }, [roomId]);

  // Batch fetch for participants - only active ones
  const fetchParticipants = useCallback(async () => {
    if (!roomId) return;
    
    try {
      const { data } = await supabase
        .from('room_participants')
        .select('id, user_id, room_id, joined_at, is_active, last_seen, device_id')
        .eq('room_id', roomId)
        .eq('is_active', true);
      
      if (data) {
        setParticipants(data as Participant[]);
      }
    } catch (e) {
      console.error('Fetch participants error:', e);
    }
  }, [roomId]);

  // Fetch messages with limit for performance
  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    
    try {
      const { data } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(200); // Limit to last 200 messages for performance
      
      if (data) {
        setMessages(data as Message[]);
      }
    } catch (e) {
      console.error('Fetch messages error:', e);
    }
  }, [roomId]);

  // Fetch suggestions - limited
  const fetchSuggestions = useCallback(async () => {
    if (!roomId) return;
    
    try {
      const { data } = await supabase
        .from('room_ai_suggestions')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) {
        setSuggestions(data as Suggestion[]);
      }
    } catch (e) {
      console.error('Fetch suggestions error:', e);
    }
  }, [roomId]);

  // Atomic join room with optimized error handling
  const joinRoom = useCallback(async (joinCode?: string) => {
    if (!user || !roomId) return { success: false, error: 'Missing user or room ID' };
    
    try {
      const { data, error: rpcError } = await supabase.rpc('join_room', {
        p_room_id: roomId,
        p_user_id: user.id,
        p_device_id: deviceId,
        p_join_code: joinCode || null
      });
      
      if (rpcError) {
        console.error('Join room RPC error:', rpcError);
        return { success: false, error: rpcError.message };
      }
      
      const result = data as { success: boolean; error?: string; message?: string; already_member?: boolean };
      
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to join room' };
      }
      
      isJoinedRef.current = true;
      
      // Parallel refresh for speed
      await Promise.all([fetchRoom(), fetchParticipants()]);
      
      return { success: true, alreadyMember: result.already_member };
    } catch (e) {
      console.error('Join room exception:', e);
      return { success: false, error: 'Network error - please try again' };
    }
  }, [user, roomId, deviceId, fetchRoom, fetchParticipants]);

  // Regenerate join code (host only)
  const regenerateJoinCode = useCallback(async () => {
    if (!user || !roomId) return { success: false, error: 'Missing user or room ID' };
    
    try {
      const { data, error: rpcError } = await supabase.rpc('regenerate_join_code', {
        p_room_id: roomId,
        p_user_id: user.id
      });
      
      if (rpcError) {
        return { success: false, error: rpcError.message };
      }
      
      const result = data as { success: boolean; error?: string; join_code?: string };
      
      if (result.success) {
        await fetchRoom();
      }
      
      return result;
    } catch (e) {
      console.error('Regenerate code error:', e);
      return { success: false, error: 'Failed to regenerate code' };
    }
  }, [user, roomId, fetchRoom]);

  // Leave room with cleanup
  const leaveRoom = useCallback(async () => {
    if (!user || !roomId) return { success: false, error: 'Missing user or room ID' };
    
    try {
      const { data, error: rpcError } = await supabase.rpc('leave_room', {
        p_room_id: roomId,
        p_user_id: user.id
      });
      
      if (rpcError) {
        console.error('Leave room error:', rpcError);
        return { success: false, error: rpcError.message };
      }
      
      isJoinedRef.current = false;
      const result = data as { success: boolean; error?: string };
      return { success: result.success, error: result.error };
    } catch (e) {
      console.error('Leave room exception:', e);
      return { success: false, error: 'Failed to leave room' };
    }
  }, [user, roomId]);

  // Optimized heartbeat with error recovery
  const sendHeartbeat = useCallback(async () => {
    if (!user || !roomId || !isJoinedRef.current) return;
    
    try {
      await supabase.rpc('room_heartbeat', {
        p_room_id: roomId,
        p_user_id: user.id
      });
    } catch (e) {
      // Silent fail for heartbeat - will retry on next interval
      console.debug('Heartbeat failed, will retry');
    }
  }, [user, roomId]);

  // Send message with optimistic update
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !roomId || !content.trim()) return { success: false };
    
    const trimmedContent = content.trim();
    const messageCount = messages.length;
    
    try {
      const { error: insertError } = await supabase.from('room_messages').insert({
        room_id: roomId,
        user_id: user.id,
        user_email: user.email,
        message: trimmedContent,
        is_ai: false
      });
      
      if (insertError) {
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
        return { success: false };
      }
      
      // Trigger AI moderation every 5 messages (reduced frequency for performance)
      if (messageCount > 0 && messageCount % 5 === 0) {
        supabase.functions.invoke('ai-room-moderator', {
          body: { roomId, recentMessages: messages.slice(-5).map(m => m.message) }
        }).catch(() => {
          // Silent fail for AI moderation
          console.debug('AI moderation skipped');
        });
      }
      
      return { success: true };
    } catch (e) {
      console.error('Send message error:', e);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      return { success: false };
    }
  }, [user, roomId, messages, toast]);

  // Optimized realtime subscriptions with debouncing
  useEffect(() => {
    if (!roomId) return;
    
    const debouncedFetchRoom = createDebouncer(100);
    const debouncedFetchParticipants = createDebouncer(100);
    
    const roomChannel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rooms',
        filter: `id=eq.${roomId}`
      }, () => {
        debouncedFetchRoom(() => fetchRoom());
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
        debouncedFetchParticipants(() => {
          fetchParticipants();
          fetchRoom();
        });
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
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m.id === (payload.new as Message).id)) {
            return prev;
          }
          return [...prev, payload.new as Message];
        });
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
        setSuggestions(prev => {
          const newSuggestion = payload.new as Suggestion;
          if (prev.some(s => s.id === newSuggestion.id)) {
            return prev;
          }
          return [newSuggestion, ...prev].slice(0, 5);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(suggestionsChannel);
    };
  }, [roomId, fetchRoom, fetchParticipants]);

  // Initial data fetch - parallel for speed
  useEffect(() => {
    if (!roomId) return;
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchRoom(),
        fetchParticipants(),
        fetchMessages(),
        fetchSuggestions()
      ]);
      
      setLoading(false);
    };
    
    loadData();
  }, [roomId, fetchRoom, fetchParticipants, fetchMessages, fetchSuggestions]);

  // Optimized heartbeat - 30 second interval
  useEffect(() => {
    if (!user || !roomId) return;
    
    // Send initial heartbeat
    sendHeartbeat();
    
    // Setup interval
    heartbeatRef.current = setInterval(sendHeartbeat, 30000);
    
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [user, roomId, sendHeartbeat]);

  // Cleanup inactive users - 90 second interval (reduced frequency)
  useEffect(() => {
    if (!roomId) return;
    
    cleanupRef.current = setInterval(async () => {
      try {
        await supabase.rpc('cleanup_inactive_participants' as any);
        fetchParticipants();
        fetchRoom();
      } catch (e) {
        console.debug('Cleanup skipped');
      }
    }, 90000);
    
    return () => {
      if (cleanupRef.current) {
        clearInterval(cleanupRef.current);
        cleanupRef.current = null;
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
    regenerateJoinCode,
    fetchRoom,
    fetchParticipants
  };
};

export const useRooms = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Debounce for realtime updates
  const debouncedFetch = useMemo(() => createDebouncer(150), []);

  const fetchRooms = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50); // Limit for performance
      
      if (data) {
        setRooms(data as Room[]);
      }
    } catch (e) {
      console.error('Fetch rooms error:', e);
    }
  }, []);

  const fetchMyRooms = useCallback(async () => {
    if (!user) {
      setMyRooms([]);
      return;
    }
    
    try {
      // Optimized query - get rooms in one query where user is participant
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
    } catch (e) {
      console.error('Fetch my rooms error:', e);
    }
  }, [user]);

  const createRoom = useCallback(async (name: string, theme: string, description?: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    try {
      const { data, error: insertError } = await supabase
        .from('rooms')
        .insert({
          name,
          theme,
          description,
          created_by: user.id,
          max_participants: 5,
          current_user_count: 0,
          status: 'active',
          is_private: true,
          join_code: '' // Trigger will generate
        })
        .select()
        .single();
      
      if (insertError) {
        return { success: false, error: insertError.message };
      }
      
      // Join as creator atomically
      const { error: joinError } = await supabase.rpc('join_room', {
        p_room_id: data.id,
        p_user_id: user.id,
        p_device_id: getDeviceId(),
        p_join_code: null
      });
      
      if (joinError) {
        return { success: false, error: joinError.message, roomId: data.id };
      }
      
      return { success: true, roomId: data.id, joinCode: data.join_code };
    } catch (e) {
      console.error('Create room error:', e);
      return { success: false, error: 'Failed to create room' };
    }
  }, [user]);

  // Optimized realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('all-rooms')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rooms' 
      }, () => {
        debouncedFetch(() => {
          fetchRooms();
          fetchMyRooms();
        });
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'room_participants' 
      }, () => {
        debouncedFetch(() => {
          fetchRooms();
          fetchMyRooms();
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms, fetchMyRooms, debouncedFetch]);

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
