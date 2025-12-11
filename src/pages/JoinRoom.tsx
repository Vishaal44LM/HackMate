import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Users, AlertCircle, CheckCircle } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface RoomInfo {
  id: string;
  name: string;
  theme: string;
  description: string | null;
  status: string;
  current_user_count: number;
  max_participants: number;
}

const JoinRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to login with return URL
      navigate(`/login`, { state: { from: `/join/${roomId}` } });
      return;
    }

    fetchRoom();
  }, [user, authLoading, roomId, navigate]);

  const fetchRoom = async () => {
    if (!roomId) {
      setError("Invalid room link");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error || !data) {
      setError("Room not found. The link may be invalid or the room has been deleted.");
      setLoading(false);
      return;
    }

    setRoom(data as RoomInfo);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!user || !roomId || !room) return;

    setJoining(true);

    // Check current status before joining
    const { data: currentRoom } = await supabase
      .from('rooms')
      .select('status, current_user_count, max_participants')
      .eq('id', roomId)
      .single();

    if (!currentRoom) {
      toast({
        title: "Error",
        description: "Room no longer exists.",
        variant: "destructive"
      });
      setJoining(false);
      return;
    }

    if (currentRoom.status !== 'active') {
      toast({
        title: "Room unavailable",
        description: "This room is no longer active.",
        variant: "destructive"
      });
      setJoining(false);
      return;
    }

    if (currentRoom.current_user_count >= currentRoom.max_participants) {
      // Check if user is already a member
      const { data: existing } = await supabase
        .from('room_participants')
        .select('id, is_active')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // User was already a member, navigate to room
        navigate(`/rooms/${roomId}`);
        return;
      }

      toast({
        title: "Room full",
        description: "Someone joined just now, room is now full. You cannot join this room.",
        variant: "destructive"
      });
      setRoom({ ...room, current_user_count: currentRoom.current_user_count });
      setJoining(false);
      return;
    }

    // Navigate to room page which will handle the actual join
    navigate(`/rooms/${roomId}`);
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-10">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Join</h2>
            <p className="text-muted-foreground text-center mb-6">{error}</p>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!room) return null;

  const isFull = room.current_user_count >= room.max_participants;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join Ideation Room</CardTitle>
          <CardDescription>
            You've been invited to join a collaborative brainstorming session
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Room Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Room Name</p>
              <p className="font-semibold text-lg">{room.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Theme</p>
              <p className="font-medium">{room.theme}</p>
            </div>
            {room.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{room.description}</p>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className={`text-sm font-medium ${isFull ? 'text-destructive' : 'text-muted-foreground'}`}>
                {room.current_user_count}/{room.max_participants} participants
              </span>
              {isFull && (
                <span className="text-xs text-destructive">(Full)</span>
              )}
            </div>
          </div>

          {/* Status */}
          {isFull ? (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">
                Room full (5/5 members). Try another room or wait for someone to leave.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-primary/10 text-primary rounded-lg">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">
                Room available! Click below to join the session.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleJoin}
              className="w-full h-11 bg-gradient-to-r from-primary to-secondary"
              disabled={isFull || joining}
            >
              {joining ? "Joining..." : isFull ? "Room Full" : "Join Room"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinRoom;
