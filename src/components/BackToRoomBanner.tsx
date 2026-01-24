import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, X, ArrowRight } from "lucide-react";

const BackToRoomBanner = () => {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const roomId = sessionStorage.getItem('hackmate_active_room');
    if (roomId) {
      setActiveRoomId(roomId);
    }
  }, []);

  if (!activeRoomId || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg border border-primary/20 p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Active Room Session</p>
          <p className="text-xs opacity-80">Return to your ideation room</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/rooms/${activeRoomId}`}>
            <Button size="sm" variant="secondary" className="gap-1.5">
              <span className="hidden sm:inline">Back to Room</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 hover:bg-primary-foreground/20"
            onClick={() => setDismissed(true)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BackToRoomBanner;
