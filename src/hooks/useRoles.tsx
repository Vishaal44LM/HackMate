import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'participant' | 'organizer' | 'judge';
export type RoomRole = 'member' | 'organizer' | 'judge';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export const useRoles = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!error && data) {
        setRoles(data.map(r => r.role as AppRole));
      }
      setLoading(false);
    };

    fetchRoles();

    // Subscribe to role changes
    const channel = supabase
      .channel(`user-roles-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchRoles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isOrganizer = roles.includes('organizer');
  const isJudge = roles.includes('judge');
  const isParticipant = roles.includes('participant') || (!isOrganizer && !isJudge);

  const hasRole = (role: AppRole) => roles.includes(role);

  return {
    roles,
    loading,
    isOrganizer,
    isJudge,
    isParticipant,
    hasRole
  };
};

export const useRoomRole = (roomId: string | undefined) => {
  const { user } = useAuth();
  const { isOrganizer: isGlobalOrganizer, isJudge: isGlobalJudge } = useRoles();
  const [roomRole, setRoomRole] = useState<RoomRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !roomId) {
      setRoomRole(null);
      setLoading(false);
      return;
    }

    const fetchRoomRole = async () => {
      // First check if user is a participant in this room
      const { data, error } = await supabase
        .from('room_participants')
        .select('room_role')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        setRoomRole(data.room_role as RoomRole);
      } else if (isGlobalOrganizer) {
        // Organizers can view any room
        setRoomRole('organizer');
      } else if (isGlobalJudge) {
        setRoomRole('judge');
      } else {
        setRoomRole(null);
      }
      setLoading(false);
    };

    fetchRoomRole();
  }, [user, roomId, isGlobalOrganizer, isGlobalJudge]);

  // Determine permissions
  const canEdit = roomRole === 'member';
  const canComment = roomRole === 'organizer' || roomRole === 'member';
  const canKick = roomRole === 'organizer';
  const isReadOnly = roomRole === 'organizer' || roomRole === 'judge';
  const isOrganizerMode = roomRole === 'organizer';
  const isJudgeMode = roomRole === 'judge';

  return {
    roomRole,
    loading,
    canEdit,
    canComment,
    canKick,
    isReadOnly,
    isOrganizerMode,
    isJudgeMode
  };
};
