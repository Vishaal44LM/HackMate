import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Shield, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface OrganizerComment {
  id: string;
  room_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

interface OrganizerCommentsProps {
  roomId: string;
}

const OrganizerComments = ({ roomId }: OrganizerCommentsProps) => {
  const { user } = useAuth();
  const { isOrganizer } = useRoles();
  const { toast } = useToast();
  const [comments, setComments] = useState<OrganizerComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('organizer_comments')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();

    // Subscribe to comments changes
    const channel = supabase
      .channel(`organizer-comments-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organizer_comments',
          filter: `room_id=eq.${roomId}`
        },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !isOrganizer) return;

    setSubmitting(true);
    const { error } = await supabase
      .from('organizer_comments')
      .insert({
        room_id: roomId,
        user_id: user.id,
        comment: newComment.trim()
      });

    setSubmitting(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive'
      });
    } else {
      setNewComment('');
      toast({
        title: 'Comment added',
        description: 'Your organizer comment has been posted.'
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from('organizer_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-orange-500" />
          Organizer Comments
          <Badge variant="outline" className="ml-auto text-xs">
            {comments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organizer comments yet.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {comments.map((comment) => (
              <div 
                key={comment.id} 
                className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm">{comment.comment}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {isOrganizer && comment.user_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isOrganizer && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add an organizer comment..."
              className="min-h-[60px] resize-none text-sm"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={submitting || !newComment.trim()}
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default OrganizerComments;
