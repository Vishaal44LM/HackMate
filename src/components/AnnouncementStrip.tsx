import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAnnouncements, AnnouncementType } from '@/hooks/useAnnouncements';
import { Bell, ChevronRight, Clock, Pin, Calendar, Trophy, BookOpen, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const typeConfig: Record<AnnouncementType, { icon: typeof Bell; color: string; label: string }> = {
  schedule: { icon: Calendar, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Schedule' },
  rules: { icon: BookOpen, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Rules' },
  prizes: { icon: Trophy, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Prizes' },
  general: { icon: Info, color: 'bg-primary/10 text-primary border-primary/20', label: 'General' }
};

const AnnouncementStrip = () => {
  const { stripAnnouncement, announcements, loading } = useAnnouncements();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading) return null;

  if (!stripAnnouncement) {
    return (
      <div className="bg-muted/30 border-b border-border px-4 py-2">
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Bell className="w-4 h-4" />
          <span>No announcements yet</span>
        </div>
      </div>
    );
  }

  const TypeIcon = typeConfig[stripAnnouncement.type as AnnouncementType]?.icon || Bell;
  const typeStyle = typeConfig[stripAnnouncement.type as AnnouncementType]?.color || typeConfig.general.color;
  const typeLabel = typeConfig[stripAnnouncement.type as AnnouncementType]?.label || 'General';

  return (
    <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5 border-b border-primary/20 px-4 py-2">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Badge variant="outline" className={`shrink-0 gap-1 ${typeStyle}`}>
            <TypeIcon className="w-3 h-3" />
            {typeLabel}
          </Badge>
          
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {stripAnnouncement.is_pinned && (
              <Pin className="w-3 h-3 text-primary shrink-0" />
            )}
            <span className="font-medium text-sm truncate">{stripAnnouncement.title}</span>
            <span className="text-muted-foreground text-sm hidden sm:inline truncate">
              — {stripAnnouncement.message.slice(0, 60)}{stripAnnouncement.message.length > 60 ? '...' : ''}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 hidden md:flex">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(stripAnnouncement.created_at), { addSuffix: true })}
          </div>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="shrink-0 gap-1">
              View all
              <ChevronRight className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-96 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Announcements
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {announcements.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No announcements</p>
              ) : (
                announcements.map((announcement) => {
                  const AnnTypeIcon = typeConfig[announcement.type as AnnouncementType]?.icon || Bell;
                  const annTypeStyle = typeConfig[announcement.type as AnnouncementType]?.color || typeConfig.general.color;
                  const annTypeLabel = typeConfig[announcement.type as AnnouncementType]?.label || 'General';
                  
                  return (
                    <div key={announcement.id} className="p-4 rounded-lg bg-card border">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant="outline" className={`gap-1 ${annTypeStyle}`}>
                          <AnnTypeIcon className="w-3 h-3" />
                          {annTypeLabel}
                        </Badge>
                        {announcement.is_pinned && (
                          <Pin className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <h4 className="font-medium text-sm mb-1">{announcement.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{announcement.message}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default AnnouncementStrip;
