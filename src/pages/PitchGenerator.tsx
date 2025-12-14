import { useState, useEffect } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import OutputCard from "@/components/OutputCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { callEdgeFunctionWithRetry } from "@/lib/edgeFunctions";

const PitchGenerator = () => {
  const [summary, setSummary] = useState(() => sessionStorage.getItem('hackmate_pitch_summary') || "");
  const [pitch, setPitch] = useState(() => sessionStorage.getItem('hackmate_pitch') || "");
  const [loading, setLoading] = useState(false);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(() => {
    return sessionStorage.getItem('hackmate_pitch') !== null;
  });
  const { toast } = useToast();

  useEffect(() => {
    sessionStorage.setItem('hackmate_pitch_summary', summary);
  }, [summary]);

  useEffect(() => {
    sessionStorage.setItem('hackmate_pitch', pitch);
  }, [pitch]);

  const generatePitch = async () => {
    if (!summary.trim()) {
      toast({
        title: "Please enter a summary",
        description: "Paste your project summary to generate a pitch",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPitch("");
    setHasGeneratedOnce(false);

    try {
      const data = await callEdgeFunctionWithRetry(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pitch`,
        { summary }
      );

      setPitch(data.pitch);
      setHasGeneratedOnce(true);
      toast({
        title: "Pitch generated!",
        description: "Your winning pitch is ready",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to generate pitch. Please try again.",
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
              AI Pitch Coach
            </h1>
            <p className="text-lg text-muted-foreground">Create a compelling 60-second pitch that wins judges</p>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-[var(--shadow-card)] mb-8">
            <label className="block text-sm font-medium mb-3 text-foreground">
              Paste your project summary
            </label>
            <Textarea
              placeholder="Describe what your project does and why it matters..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[150px] mb-4"
            />
            <Button
              onClick={generatePitch}
              disabled={loading}
              variant="gradient"
              className="w-full h-12"
            >
              <Megaphone className="mr-2 h-5 w-5" />
              Generate Pitch
            </Button>
          </div>

          {loading && <LoadingSpinner />}

          {pitch && !loading && (
            <OutputCard
              title="Your Winning Pitch"
              content={pitch}
              showActions={true}
              saveData={{
                theme: summary.slice(0, 50),
                type: 'pitch',
                skipAnimation: hasGeneratedOnce,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PitchGenerator;