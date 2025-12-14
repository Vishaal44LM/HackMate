import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useRoles } from './useRoles';

export type AnnouncementType = 'schedule' | 'rules' | 'prizes' | 'general';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useAnnouncements = () => {
  const { user } = useAuth();
  const { isOrganizer } = useRoles();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnnouncements(data as Announcement[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();

    // Subscribe to announcements changes
    const channel = supabase
      .channel('announcements-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => fetchAnnouncements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createAnnouncement = async (
    title: string,
    message: string,
    type: AnnouncementType = 'general',
    isPinned: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !isOrganizer) {
      return { success: false, error: 'Not authorized' };
    }

    const { error } = await supabase
      .from('announcements')
      .insert({
        title,
        message,
        type,
        is_pinned: isPinned,
        created_by: user.id
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const updateAnnouncement = async (
    id: string,
    updates: Partial<Pick<Announcement, 'title' | 'message' | 'type' | 'is_pinned'>>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !isOrganizer) {
      return { success: false, error: 'Not authorized' };
    }

    const { error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const deleteAnnouncement = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || !isOrganizer) {
      return { success: false, error: 'Not authorized' };
    }

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const togglePin = async (id: string, currentPinState: boolean): Promise<{ success: boolean; error?: string }> => {
    return updateAnnouncement(id, { is_pinned: !currentPinState });
  };

  // Get the latest pinned announcement for the strip
  const pinnedAnnouncement = announcements.find(a => a.is_pinned);
  const latestAnnouncement = announcements[0];
  const stripAnnouncement = pinnedAnnouncement || latestAnnouncement;

  return {
    announcements,
    loading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePin,
    pinnedAnnouncement,
    latestAnnouncement,
    stripAnnouncement,
    isOrganizer
  };
};
