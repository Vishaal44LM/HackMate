import { useState, useEffect } from "react";
import { Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import OutputCard from "@/components/OutputCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { callEdgeFunctionWithRetry } from "@/lib/edgeFunctions";

const ExpandIdea = () => {
  const [idea, setIdea] = useState(() => sessionStorage.getItem('hackmate_expand_idea') || "");
  const [expansion, setExpansion] = useState(() => sessionStorage.getItem('hackmate_expansion') || "");
  const [loading, setLoading] = useState(false);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(() => {
    return sessionStorage.getItem('hackmate_expansion') !== null;
  });
  const { toast } = useToast();

  useEffect(() => {
    sessionStorage.setItem('hackmate_expand_idea', idea);
  }, [idea]);

  useEffect(() => {
    sessionStorage.setItem('hackmate_expansion', expansion);
  }, [expansion]);

  const expandIdea = async () => {
    if (!idea.trim()) {
      toast({
        title: "Please enter an idea",
        description: "Paste or type your project idea to expand it",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setExpansion("");
    setHasGeneratedOnce(false);

    try {
      const data = await callEdgeFunctionWithRetry(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expand-idea`,
        { idea }
      );

      setExpansion(data.expansion);
      setHasGeneratedOnce(true);
      toast({
        title: "Idea expanded!",
        description: "Your detailed project breakdown is ready",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to expand idea. Please try again.",
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
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Expand Your Idea
            </h1>
            <p className="text-lg text-muted-foreground">Transform your concept into a detailed project plan</p>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-[var(--shadow-card)] mb-8">
            <label className="block text-sm font-medium mb-3 text-foreground">
              Paste or select your idea here
            </label>
            <Textarea
              placeholder="Describe your project idea..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              className="min-h-[150px] mb-4"
            />
            <Button
              onClick={expandIdea}
              disabled={loading}
              variant="gradient"
              className="w-full h-12"
            >
              <Expand className="mr-2 h-5 w-5" />
              Expand Idea
            </Button>
          </div>

          {loading && <LoadingSpinner />}

          {expansion && !loading && (
            <OutputCard
              title="Detailed Project Breakdown"
              content={expansion}
              showActions={true}
              saveData={{
                theme: idea.slice(0, 50),
                type: 'expansion',
                skipAnimation: hasGeneratedOnce,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpandIdea;