import { useState, useEffect } from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import OutputCard from "@/components/OutputCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { callEdgeFunctionWithRetry } from "@/lib/edgeFunctions";

const JudgeQA = () => {
  const [summary, setSummary] = useState(() => sessionStorage.getItem('hackmate_qa_summary') || "");
  const [qa, setQa] = useState(() => sessionStorage.getItem('hackmate_qa') || "");
  const [loading, setLoading] = useState(false);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(() => {
    return sessionStorage.getItem('hackmate_qa') !== null;
  });
  const { toast } = useToast();

  useEffect(() => {
    sessionStorage.setItem('hackmate_qa_summary', summary);
  }, [summary]);

  useEffect(() => {
    sessionStorage.setItem('hackmate_qa', qa);
  }, [qa]);

  const generateQA = async () => {
    if (!summary.trim()) {
      toast({
        title: "Please enter a summary",
        description: "Paste your project summary to practice judge questions",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setQa("");
    setHasGeneratedOnce(false);

    try {
      const data = await callEdgeFunctionWithRetry(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-judge-qa`,
        { summary }
      );

      setQa(data.qa);
      setHasGeneratedOnce(true);
      toast({
        title: "Q&A generated!",
        description: "Practice these questions before presenting",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to generate Q&A. Please try again.",
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
              Judge Practice Mode
            </h1>
            <p className="text-lg text-muted-foreground">Prepare for tough questions with AI-generated Q&A</p>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-[var(--shadow-card)] mb-8">
            <label className="block text-sm font-medium mb-3 text-foreground">
              Paste your project summary
            </label>
            <Textarea
              placeholder="Describe your project so we can generate relevant questions..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[150px] mb-4"
            />
            <Button
              onClick={generateQA}
              disabled={loading}
              variant="gradient"
              className="w-full h-12"
            >
              <Scale className="mr-2 h-5 w-5" />
              Generate Q&A
            </Button>
          </div>

          {loading && <LoadingSpinner />}

          {qa && !loading && (
            <OutputCard
              title="Judge Q&A Practice"
              content={qa}
              showActions={true}
              saveData={{
                theme: summary.slice(0, 50),
                type: 'qa',
                skipAnimation: hasGeneratedOnce,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default JudgeQA;