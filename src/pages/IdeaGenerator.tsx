import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import OutputCard from "@/components/OutputCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { callEdgeFunctionWithRetry } from "@/lib/edgeFunctions";

const IdeaGenerator = () => {
  const [theme, setTheme] = useState(() => sessionStorage.getItem('hackmate_theme') || "");
  const [ideas, setIdeas] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('hackmate_ideas');
    return saved ? JSON.parse(saved) : [];
  });
  const [themeHistory, setThemeHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('hackmate_theme_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(() => {
    return sessionStorage.getItem('hackmate_ideas') !== null;
  });
  const { toast } = useToast();

  useEffect(() => {
    sessionStorage.setItem('hackmate_theme', theme);
  }, [theme]);

  useEffect(() => {
    sessionStorage.setItem('hackmate_ideas', JSON.stringify(ideas));
  }, [ideas]);

  const generateIdeas = async () => {
    if (!theme.trim()) {
      toast({
        title: "Please enter a theme",
        description: "Enter your hackathon theme or domain to continue",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setIdeas([]);
    setHasGeneratedOnce(false);

    try {
      const data = await callEdgeFunctionWithRetry(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ideas`,
        { theme }
      );

      setIdeas(data.ideas);
      setHasGeneratedOnce(true);
      
      // Save theme to history
      if (!themeHistory.includes(theme)) {
        const newHistory = [theme, ...themeHistory].slice(0, 10);
        setThemeHistory(newHistory);
        localStorage.setItem('hackmate_theme_history', JSON.stringify(newHistory));
      }
      
      toast({
        title: "Ideas generated!",
        description: "Check out your AI-powered project ideas below",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to generate ideas. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              HackMate
            </h1>
            <p className="text-xl text-muted-foreground mb-2">Your AI Hackathon Partner</p>
            <p className="text-lg text-muted-foreground">Brainstorm. Build. Pitch. Win. 💡</p>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-[var(--shadow-card)] mb-8">
            <label className="block text-sm font-medium mb-3 text-foreground">
              Enter your hackathon theme or domain
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="e.g., EduTech, AI for Social Good, IoT"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && generateIdeas()}
                  className="h-12"
                  list="theme-history"
                />
                {themeHistory.length > 0 && (
                  <datalist id="theme-history">
                    {themeHistory.map((t, i) => (
                      <option key={i} value={t} />
                    ))}
                  </datalist>
                )}
              </div>
              <Button
                onClick={generateIdeas}
                disabled={loading}
                variant="gradient"
                className="h-12 px-8"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Ideas
              </Button>
            </div>
          </div>

          {loading && <LoadingSpinner />}

          {ideas.length > 0 && !loading && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground mb-4">Your Project Ideas</h2>
              {ideas.map((idea, index) => (
                <OutputCard
                  key={index}
                  title={`Idea ${index + 1}`}
                  content={idea}
                  showActions={true}
                  saveData={{
                    theme,
                    type: 'idea',
                    skipAnimation: hasGeneratedOnce,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdeaGenerator;