import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnouncements, AnnouncementType } from '@/hooks/useAnnouncements';
import { useRoles } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bell, Plus, Pin, Trash2, Edit, Calendar, Trophy, BookOpen, Info, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';

const typeOptions: { value: AnnouncementType; label: string; icon: typeof Bell }[] = [
  { value: 'general', label: 'General', icon: Info },
  { value: 'schedule', label: 'Schedule', icon: Calendar },
  { value: 'rules', label: 'Rules', icon: BookOpen },
  { value: 'prizes', label: 'Prizes', icon: Trophy }
];

const Announcements = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOrganizer, loading: rolesLoading } = useRoles();
  const { 
    announcements, 
    loading, 
    createAnnouncement, 
    updateAnnouncement, 
    deleteAnnouncement,
    togglePin 
  } = useAnnouncements();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<typeof announcements[0] | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'general' as AnnouncementType,
    is_pinned: false
  });
  const [submitting, setSubmitting] = useState(false);

  if (rolesLoading || loading) return <LoadingSpinner />;

  if (!isOrganizer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-10">
            <Bell className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground text-center mb-6">
              Only organizers can manage announcements.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in title and message.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    const result = await createAnnouncement(
      formData.title.trim(),
      formData.message.trim(),
      formData.type,
      formData.is_pinned
    );
    setSubmitting(false);

    if (result.success) {
      setCreateDialogOpen(false);
      setFormData({ title: '', message: '', type: 'general', is_pinned: false });
      toast({
        title: 'Announcement created',
        description: 'Your announcement has been published.'
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to create announcement',
        variant: 'destructive'
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingAnnouncement) return;

    setSubmitting(true);
    const result = await updateAnnouncement(editingAnnouncement.id, {
      title: formData.title.trim(),
      message: formData.message.trim(),
      type: formData.type,
      is_pinned: formData.is_pinned
    });
    setSubmitting(false);

    if (result.success) {
      setEditDialogOpen(false);
      setEditingAnnouncement(null);
      setFormData({ title: '', message: '', type: 'general', is_pinned: false });
      toast({
        title: 'Announcement updated',
        description: 'Your changes have been saved.'
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update announcement',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteAnnouncement(id);
    if (result.success) {
      toast({
        title: 'Announcement deleted'
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete announcement',
        variant: 'destructive'
      });
    }
  };

  const handleTogglePin = async (id: string, currentPinState: boolean) => {
    await togglePin(id, currentPinState);
  };

  const openEditDialog = (announcement: typeof announcements[0]) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type as AnnouncementType,
      is_pinned: announcement.is_pinned
    });
    setEditDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Announcements
              </h1>
              <p className="text-muted-foreground">Manage announcements for all participants</p>
            </div>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-primary to-secondary">
                <Plus className="w-4 h-4" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Announcement title"
                  />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Announcement message"
                    className="min-h-[100px]"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as AnnouncementType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="w-4 h-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_pinned}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
                  />
                  <Label>Pin this announcement</Label>
                </div>
                <Button
                  onClick={handleCreate}
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Announcement'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-10">
                <Bell className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No announcements yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create your first announcement
                </Button>
              </CardContent>
            </Card>
          ) : (
            announcements.map((announcement) => {
              const TypeIcon = typeOptions.find(t => t.value === announcement.type)?.icon || Info;
              
              return (
                <Card key={announcement.id} className={announcement.is_pinned ? 'border-primary/30 bg-primary/5' : ''}>
                  <CardHeader className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="gap-1">
                            <TypeIcon className="w-3 h-3" />
                            {announcement.type}
                          </Badge>
                          {announcement.is_pinned && (
                            <Badge variant="secondary" className="gap-1">
                              <Pin className="w-3 h-3" />
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePin(announcement.id, announcement.is_pinned)}
                          title={announcement.is_pinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin className={`w-4 h-4 ${announcement.is_pinned ? 'text-primary' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(announcement)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(announcement.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground">{announcement.message}</p>
                    <p className="text-xs text-muted-foreground mt-3">
                      {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Announcement message"
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as AnnouncementType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_pinned}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
                />
                <Label>Pin this announcement</Label>
              </div>
              <Button
                onClick={handleUpdate}
                className="w-full"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Announcements;
