import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoom } from "@/hooks/useRoom";
import { useRoomRole } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import FinalSubmission from "@/components/FinalSubmission";
import RoleBadge from "@/components/RoleBadge";
import OrganizerComments from "@/components/OrganizerComments";
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  Users, 
  Copy, 
  LogOut, 
  Menu, 
  AlertCircle,
  Wifi,
  MonitorSmartphone,
  RefreshCw,
  Lock
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOrganizerMode, isJudgeMode, isReadOnly } = useRoomRole(roomId);
  const {
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
    saveFinalSubmission
  } = useRoom(roomId);
  
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showMobileUsers, setShowMobileUsers] = useState(false);
  const [multiDeviceWarning, setMultiDeviceWarning] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isHost = room && user && room.created_by === user.id;

  useEffect(() => {
    if (user && participants.length > 0) {
      const userParticipations = participants.filter(p => p.user_id === user.id);
      if (userParticipations.length > 1 || 
          (userParticipations.length === 1 && userParticipations[0].device_id !== localStorage.getItem('hackmate_device_id'))) {
        setMultiDeviceWarning(true);
      } else {
        setMultiDeviceWarning(false);
      }
    }
  }, [user, participants]);

  useEffect(() => {
    const attemptJoin = async () => {
      if (!user || !roomId || hasJoined || loading) return;
      const storedJoinCode = sessionStorage.getItem(`join_code_${roomId}`);
      const result = await joinRoom(storedJoinCode || undefined);
      sessionStorage.removeItem(`join_code_${roomId}`);
      
      if (result.success) {
        setHasJoined(true);
        toast({ title: result.alreadyMember ? "Welcome back!" : "Joined room" });
      } else {
        setJoinError(result.error || "Failed to join room");
      }
    };
    if (!loading && user && roomId && !hasJoined) attemptJoin();
  }, [user, roomId, hasJoined, loading, joinRoom, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || isReadOnly) return;
    setSending(true);
    const result = await sendMessage(newMessage);
    setSending(false);
    if (result.success) setNewMessage("");
  };

  const handleLeaveRoom = async () => {
    await leaveRoom();
    toast({ title: "Left room" });
    navigate("/dashboard");
  };

  const handleCopyJoinCode = () => {
    if (room?.join_code) {
      navigator.clipboard.writeText(room.join_code);
      toast({ title: "Code copied!", description: `Share code "${room.join_code}" with teammates.` });
    }
  };

  const handleRegenerateCode = async () => {
    setRegenerating(true);
    const result = await regenerateJoinCode();
    setRegenerating(false);
    if (result.success) {
      toast({ title: "Code regenerated", description: `New code: ${result.join_code}` });
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error || joinError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-10">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Access Room</h2>
            <p className="text-muted-foreground text-center mb-6">{error || joinError}</p>
            <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!room) return null;

  const isUserInRoom = participants.some(p => p.user_id === user?.id);
  const activeParticipantsCount = participants.filter(p => p.is_active).length;

  const HostControls = () => {
    if (!isHost) return null;
    return (
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Lock className="w-4 h-4 text-primary" />
          Host Controls
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Share this code with teammates:</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-background rounded-md px-3 py-2 font-mono text-lg tracking-widest text-center border">
              {room.join_code}
            </div>
            <Button size="icon" variant="outline" onClick={handleCopyJoinCode}><Copy className="w-4 h-4" /></Button>
          </div>
          <Button variant="ghost" size="sm" className="w-full text-xs gap-2" onClick={handleRegenerateCode} disabled={regenerating}>
            <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? "Regenerating..." : "Regenerate code"}
          </Button>
        </div>
      </div>
    );
  };

  const ParticipantsList = () => (
    <div className="space-y-2">
      {participants.filter(p => p.is_active).map((p, i) => {
        const isCurrentUser = p.user_id === user?.id;
        const isParticipantHost = room && p.user_id === room.created_by;
        return (
          <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isCurrentUser ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}>
            <div className="relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-secondary/20 text-secondary-foreground'}`}>P{i + 1}</div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate flex items-center gap-1">
                {isCurrentUser ? 'You' : `Participant ${i + 1}`}
                {isParticipantHost && <Badge variant="outline" className="text-xs ml-1">Host</Badge>}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Wifi className="w-3 h-3 text-green-500" />Online</p>
            </div>
          </div>
        );
      })}
      {Array.from({ length: room.max_participants - activeParticipantsCount }).map((_, i) => (
        <div key={`empty-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-dashed border-border">
          <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center"><Users className="w-4 h-4 text-muted-foreground/50" /></div>
          <p className="text-sm text-muted-foreground">Empty slot</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {multiDeviceWarning && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2">
          <MonitorSmartphone className="w-4 h-4 text-amber-500" />
          <p className="text-sm text-amber-600 dark:text-amber-400">You are connected from multiple devices; changes are synced.</p>
        </div>
      )}

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
              <div className="min-w-0">
                <h1 className="font-semibold text-sm sm:text-base truncate flex items-center gap-2">
                  {room.name}
                  {isHost && <Badge variant="outline" className="text-xs">Host</Badge>}
                  {isOrganizerMode && <RoleBadge role="organizer" size="sm" />}
                  {isJudgeMode && <RoleBadge role="judge" size="sm" />}
                </h1>
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">{room.theme}</Badge>
              </div>
            </div>
            <Badge variant={activeParticipantsCount >= room.max_participants ? "destructive" : "secondary"} className="shrink-0 gap-1">
              <Users className="w-3 h-3" />{activeParticipantsCount}/{room.max_participants}
            </Badge>
            <div className="flex items-center gap-1">
              {isHost && <Button variant="outline" size="sm" onClick={handleCopyJoinCode} className="hidden sm:flex gap-1"><Copy className="h-4 w-4" /><span className="hidden md:inline">Copy Code</span></Button>}
              <Button variant="outline" size="sm" onClick={handleLeaveRoom} className="hidden sm:flex gap-1 text-destructive hover:text-destructive"><LogOut className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={handleLeaveRoom} className="sm:hidden text-destructive"><LogOut className="h-4 w-4" /></Button>
              <Sheet open={showMobileUsers} onOpenChange={setShowMobileUsers}>
                <SheetTrigger asChild><Button variant="outline" size="icon" className="lg:hidden"><Menu className="h-4 w-4" /></Button></SheetTrigger>
                <SheetContent side="right" className="w-80 overflow-y-auto">
                  <SheetHeader><SheetTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Participants</SheetTitle></SheetHeader>
                  <div className="mt-6 space-y-6">
                    <FinalSubmission roomId={room.id} pitchLink={room.final_pitch_link} demoLink={room.final_demo_link} repoLink={room.final_repo_link} summary={room.final_summary} canEdit={isHost && !isReadOnly} onSave={saveFinalSubmission} />
                    {isOrganizerMode && <OrganizerComments roomId={room.id} />}
                    <HostControls />
                    <ParticipantsList />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-4 flex gap-4 main-content">
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="py-3 border-b shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />Ideation Chat
                {isReadOnly && <Badge variant="outline" className="ml-2 text-xs">Read-only</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.user_id === user?.id;
                    const isAI = msg.is_ai;
                    return (
                      <div key={msg.id} className={`flex ${isAI ? 'justify-start' : isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 ${isAI ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20' : isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            {isAI && <Sparkles className="w-3 h-3 text-primary" />}
                            <span className={`text-xs font-medium ${isOwn && !isAI ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                              {isAI ? "AI Assistant" : isOwn ? "You" : msg.user_email?.split('@')[0] || "User"}
                            </span>
                          </div>
                          <p className="text-sm break-words">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="border-t p-4 shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={isReadOnly ? "Read-only mode" : "Type your message..."} className="flex-1" disabled={sending || !isUserInRoom || isReadOnly} />
                  <Button type="submit" disabled={sending || !newMessage.trim() || !isUserInRoom || isReadOnly} className="bg-gradient-to-r from-primary to-secondary shrink-0"><Send className="w-4 h-4" /></Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:flex flex-col gap-4 w-80 shrink-0">
          <FinalSubmission roomId={room.id} pitchLink={room.final_pitch_link} demoLink={room.final_demo_link} repoLink={room.final_repo_link} summary={room.final_summary} canEdit={isHost && !isReadOnly} onSave={saveFinalSubmission} />
          {isOrganizerMode && <OrganizerComments roomId={room.id} />}
          <HostControls />
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Participants</CardTitle></CardHeader>
            <CardContent className="pt-0"><ParticipantsList /></CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />AI Suggestions</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {suggestions.length === 0 ? (
                  <div className="text-center py-6"><Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Keep chatting to get AI suggestions!</p></div>
                ) : suggestions.map((s) => (
                  <div key={s.id} className="p-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/10">
                    <Badge variant="outline" className="mb-2 text-xs">{s.suggestion_type}</Badge>
                    <p className="text-sm">{s.suggestion}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Room;
