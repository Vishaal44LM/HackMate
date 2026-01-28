import { useState, useEffect } from "react";
import { Save, Trash2, Download, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSavedIdeas, deleteIdea, SavedIdea, exportProjectData, copyToClipboard, downloadAsText } from "@/lib/localStorage";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const MyIdeas = () => {
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    setSavedIdeas(getSavedIdeas());
  }, []);

  const handleDelete = (id: string) => {
    deleteIdea(id);
    setSavedIdeas(getSavedIdeas());
    setOpenItems(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast({
      title: "Idea deleted",
      description: "Your saved idea has been removed",
    });
  };

  const toggleOpen = (id: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      idea: "Project Idea",
      expansion: "Expanded Plan",
      pitch: "Pitch Script",
      qa: "Judge Q&A",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      idea: "bg-primary/10 text-primary",
      expansion: "bg-secondary/10 text-secondary",
      pitch: "bg-accent/20 text-accent-foreground",
      qa: "bg-muted text-muted-foreground",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  const handleExportProject = (theme: string) => {
    exportProjectData(theme, savedIdeas);
    toast({
      title: "Project exported!",
      description: "Your complete project has been downloaded",
    });
  };

  const handleCopy = async (content: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      });
    }
  };

  const handleDownload = (idea: SavedIdea) => {
    const filename = `hackmate-${idea.type}-${Date.now()}.txt`;
    downloadAsText(idea.content, filename);
    toast({
      title: "Downloaded!",
      description: "Your content has been saved as a text file",
    });
  };

  // Group ideas by theme
  const groupedIdeas = savedIdeas.reduce((acc, idea) => {
    if (!acc[idea.theme]) {
      acc[idea.theme] = [];
    }
    acc[idea.theme].push(idea);
    return acc;
  }, {} as Record<string, SavedIdea[]>);

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              My Saved Ideas
            </h1>
            <p className="text-lg text-muted-foreground">
              Revisit and manage your saved hackathon projects
            </p>
          </div>

          {savedIdeas.length === 0 ? (
            <div className="bg-card rounded-2xl p-12 shadow-[var(--shadow-card)] text-center">
              <Save className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold mb-2 text-foreground">No saved ideas yet</h2>
              <p className="text-muted-foreground">
                Start generating ideas and save them to revisit later!
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedIdeas).map(([theme, ideas]) => (
                <div key={theme} className="space-y-3">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-foreground">
                      {theme}
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportProject(theme)}
                      className="h-9"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Full Project
                    </Button>
                  </div>
                  
                  {ideas.map((idea) => (
                    <Collapsible
                      key={idea.id}
                      open={openItems.has(idea.id)}
                      onOpenChange={() => toggleOpen(idea.id)}
                    >
                      <div className="bg-card rounded-xl border border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center gap-3 p-4 cursor-pointer">
                            <div className="flex-shrink-0">
                              {openItems.has(idea.id) ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTypeColor(idea.type)}`}>
                                  {getTypeLabel(idea.type)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(idea.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {idea.content.slice(0, 80)}...
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(idea.id);
                              }}
                              className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="px-4 pb-4 pt-0">
                            <div className="border-t border-border pt-4">
                              <div className="bg-muted/50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
                                  {idea.content}
                                </pre>
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCopy(idea.content)}
                                >
                                  Copy
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(idea)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyIdeas;
