import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Edit2, Save, X, Trophy, Link, Video, Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FinalSubmissionProps {
  roomId: string;
  pitchLink: string | null;
  demoLink: string | null;
  repoLink: string | null;
  summary: string | null;
  canEdit: boolean;
  onSave: (data: { pitchLink: string; demoLink: string; repoLink: string; summary: string }) => Promise<{ success: boolean; error?: string }>;
}

const FinalSubmission = ({
  pitchLink,
  demoLink,
  repoLink,
  summary,
  canEdit,
  onSave
}: FinalSubmissionProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    pitchLink: pitchLink || '',
    demoLink: demoLink || '',
    repoLink: repoLink || '',
    summary: summary || ''
  });

  const handleSave = async () => {
    setSaving(true);
    const result = await onSave(formData);
    setSaving(false);
    
    if (result.success) {
      setIsEditing(false);
      toast({
        title: "Saved!",
        description: "Final submission updated successfully."
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save",
        variant: "destructive"
      });
    }
  };

  const hasAnyLink = pitchLink || demoLink || repoLink || summary;

  const LinkButton = ({ href, icon: Icon, label }: { href: string | null; icon: React.ElementType; label: string }) => {
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
      >
        <Icon className="w-4 h-4 text-primary" />
        <span className="truncate">{label}</span>
        <ExternalLink className="w-3 h-3 ml-auto shrink-0 text-muted-foreground" />
      </a>
    );
  };

  if (isEditing) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Edit Final Submission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Pitch Link</label>
            <Input
              value={formData.pitchLink}
              onChange={(e) => setFormData(prev => ({ ...prev, pitchLink: e.target.value }))}
              placeholder="https://..."
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Demo Link</label>
            <Input
              value={formData.demoLink}
              onChange={(e) => setFormData(prev => ({ ...prev, demoLink: e.target.value }))}
              placeholder="https://..."
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Repository Link</label>
            <Input
              value={formData.repoLink}
              onChange={(e) => setFormData(prev => ({ ...prev, repoLink: e.target.value }))}
              placeholder="https://github.com/..."
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Summary (optional)</label>
            <Textarea
              value={formData.summary}
              onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Brief project summary..."
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-3 h-3" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Final Submission
          </span>
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-7 gap-1">
              <Edit2 className="w-3 h-3" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!hasAnyLink ? (
          <div className="text-center py-4">
            <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No submission yet</p>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="mt-3 gap-2">
                <Edit2 className="w-3 h-3" />
                Add Submission
              </Button>
            )}
          </div>
        ) : (
          <>
            <LinkButton href={pitchLink} icon={Link} label="Pitch Deck" />
            <LinkButton href={demoLink} icon={Video} label="Demo" />
            <LinkButton href={repoLink} icon={Github} label="Repository" />
            {summary && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Summary</p>
                <p className="text-sm">{summary}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FinalSubmission;
