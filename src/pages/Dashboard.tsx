import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRooms } from "@/hooks/useRoom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, LogOut, ArrowRight, Hash, Sparkles } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { rooms, myRooms, loading, createRoom, fetchRooms, fetchMyRooms } = useRooms();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", theme: "", description: "" });
  const [joinCode, setJoinCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim() || !newRoom.theme.trim()) {
      toast({
        title: "Missing fields",
        description: "Please provide a room name and theme.",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(true);
    const result = await createRoom(newRoom.name.trim(), newRoom.theme.trim(), newRoom.description.trim() || undefined);
    setActionLoading(false);

    if (result.success && result.roomId) {
      toast({
        title: "Room created!",
        description: "Your ideation room is ready."
      });
      setCreateDialogOpen(false);
      setNewRoom({ name: "", theme: "", description: "" });
      navigate(`/rooms/${result.roomId}`);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create room",
        variant: "destructive"
      });
    }
  };

  const handleJoinByCode = async () => {
    const code = joinCode.trim();
    if (!code) {
      toast({
        title: "Missing code",
        description: "Please enter a room code or ID.",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(true);

    // Try to find room by ID
    const { data: room, error } = await supabase
      .from('rooms')
      .select('id, status, current_user_count, max_participants')
      .eq('id', code)
      .single();

    if (error || !room) {
      setActionLoading(false);
      toast({
        title: "Room not found",
        description: "Please check the room code and try again.",
        variant: "destructive"
      });
      return;
    }

    if (room.status !== 'active') {
      setActionLoading(false);
      toast({
        title: "Room unavailable",
        description: "This room is no longer active.",
        variant: "destructive"
      });
      return;
    }

    if (room.current_user_count >= room.max_participants) {
      setActionLoading(false);
      toast({
        title: "Room full",
        description: "Room full (5/5 members). Try another room or wait.",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(false);
    setJoinDialogOpen(false);
    setJoinCode("");
    navigate(`/rooms/${room.id}`);
  };

  const handleEnterRoom = (roomId: string) => {
    navigate(`/rooms/${roomId}`);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.email?.split('@')[0]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Hash className="w-4 h-4" />
                  Join Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Room by Code</DialogTitle>
                  <DialogDescription>
                    Enter the room ID or code to join an existing room
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Enter room code or ID"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                  />
                  <Button
                    onClick={handleJoinByCode}
                    className="w-full bg-gradient-to-r from-primary to-secondary"
                    disabled={actionLoading || !joinCode.trim()}
                  >
                    {actionLoading ? "Joining..." : "Join Room"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-primary to-secondary">
                  <Plus className="w-4 h-4" />
                  Create Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Ideation Room</DialogTitle>
                  <DialogDescription>
                    Set up a collaborative space for up to 5 people
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Room name"
                      value={newRoom.name}
                      onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Theme/Topic"
                      value={newRoom.theme}
                      onChange={(e) => setNewRoom({ ...newRoom, theme: e.target.value })}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Description (optional)"
                      value={newRoom.description}
                      onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Max participants: 5 (fixed)</span>
                  </div>
                  <Button
                    onClick={handleCreateRoom}
                    className="w-full bg-gradient-to-r from-primary to-secondary"
                    disabled={actionLoading || !newRoom.name.trim() || !newRoom.theme.trim()}
                  >
                    {actionLoading ? "Creating..." : "Create Room"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* My Rooms Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">My Rooms</h2>
            {myRooms.length > 0 && (
              <Badge variant="secondary">{myRooms.length}</Badge>
            )}
          </div>

          {myRooms.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  You haven't joined any rooms yet
                </p>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create your first room
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myRooms.map((room) => (
                <Card key={room.id} className="group hover:shadow-lg transition-all hover:border-primary/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{room.name}</CardTitle>
                        <CardDescription className="truncate">{room.theme}</CardDescription>
                      </div>
                      <Badge 
                        variant={room.current_user_count >= room.max_participants ? "destructive" : "secondary"}
                        className="ml-2 shrink-0"
                      >
                        <Users className="w-3 h-3 mr-1" />
                        {room.current_user_count}/{room.max_participants}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {room.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {room.description}
                      </p>
                    )}
                    <Button
                      onClick={() => handleEnterRoom(room.id)}
                      className="w-full gap-2 group-hover:bg-primary"
                      variant="outline"
                    >
                      Enter Room
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Available Rooms Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">All Available Rooms</h2>
            <Badge variant="secondary">{rooms.length}</Badge>
          </div>

          {rooms.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <p className="text-muted-foreground">No rooms available yet. Be the first to create one!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => {
                const isFull = room.current_user_count >= room.max_participants;
                const isMyRoom = myRooms.some(r => r.id === room.id);
                
                return (
                  <Card 
                    key={room.id} 
                    className={`group transition-all ${isFull ? 'opacity-60' : 'hover:shadow-lg hover:border-primary/30'}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate flex items-center gap-2">
                            {room.name}
                            {isMyRoom && <Badge variant="outline" className="text-xs">Joined</Badge>}
                          </CardTitle>
                          <CardDescription className="truncate">{room.theme}</CardDescription>
                        </div>
                        <Badge 
                          variant={isFull ? "destructive" : "secondary"}
                          className="ml-2 shrink-0"
                        >
                          <Users className="w-3 h-3 mr-1" />
                          {room.current_user_count}/{room.max_participants}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {room.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {room.description}
                        </p>
                      )}
                      <Button
                        onClick={() => handleEnterRoom(room.id)}
                        className="w-full"
                        variant={isFull ? "outline" : "default"}
                        disabled={isFull && !isMyRoom}
                      >
                        {isFull && !isMyRoom ? "Room Full" : isMyRoom ? "Enter Room" : "Join Room"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
