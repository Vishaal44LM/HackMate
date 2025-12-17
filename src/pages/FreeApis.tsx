import { useState } from "react";
import { ExternalLink, Zap, Info, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FREE_API_PROVIDERS = [
  {
    id: "bytez",
    name: "Bytez",
    tagline: "One API key for 150k+ AI models (Qwen, IBM Granite, and more).",
    badge: "Free tier available",
    category: "AI model hub",
    link: "https://bytez.com/models?modelId=ibm-granite/granite-docling-258M&task=chat",
    description:
      "Great for hackathons: unified access to many LLMs and tools with a single API key. Good for experiments with Qwen, IBM Granite, and other models.",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    tagline: "Unified interface for many LLM providers.",
    badge: "Free tier available",
    category: "LLM router",
    link: "https://openrouter.ai/models?fmt=cards&input_modalities=text%2Cimage&order=pricing-low-to-high",
    description:
      "Browse and compare LLMs sorted by price. Good for finding free/cheaper models and trying multiple providers behind one API.",
  },
];

const FreeApis = () => {
  const [selectedProvider, setSelectedProvider] = useState<typeof FREE_API_PROVIDERS[0] | null>(null);
  const [copied, setCopied] = useState(false);

  const copyEnvExample = (providerName: string) => {
    const envKey = providerName.toUpperCase().replace(/\s+/g, "_") + "_API_KEY";
    navigator.clipboard.writeText(`${envKey}=your_api_key_here`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Zap className="h-4 w-4" />
              Recommended for Hackathons
            </div>
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Free / Low-Cost AI APIs
            </h1>
            <p className="text-lg text-muted-foreground">
              Power your hackathon project with these trusted providers
            </p>
          </div>

          {/* Info bullets */}
          <div className="bg-card rounded-2xl p-6 shadow-[var(--shadow-card)] mb-8">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              How it works
            </h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">1</span>
                <span>These providers offer free tiers or low-cost access suitable for hackathons.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">2</span>
                <span>Sign up directly on their websites to get your own API key.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">3</span>
                <span>Use their docs or example code to plug into your project.</span>
              </li>
            </ul>
          </div>

          {/* Provider cards */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            {FREE_API_PROVIDERS.map((provider) => (
              <div
                key={provider.id}
                className="bg-card rounded-2xl p-6 shadow-[var(--shadow-card)] border border-border hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{provider.name}</h3>
                    <span className="text-xs text-muted-foreground">{provider.category}</span>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                    {provider.badge}
                  </Badge>
                </div>
                
                <p className="text-sm font-medium text-foreground mb-2">{provider.tagline}</p>
                <p className="text-sm text-muted-foreground mb-6">{provider.description}</p>
                
                <div className="flex gap-3">
                  <Button
                    variant="gradient"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(provider.link, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Site
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedProvider(provider)}
                  >
                    <Info className="h-4 w-4 mr-2" />
                    How to Use
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">
            <p>
              Pricing and free tiers may change over time. Always confirm limits and costs on the provider's website.
            </p>
            <p className="mt-1 text-xs">
              HackMate does not handle or store your API keys.
            </p>
          </div>
        </div>
      </div>

      {/* How to use modal */}
      <Dialog open={!!selectedProvider} onOpenChange={() => setSelectedProvider(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              How to use {selectedProvider?.name} with your project
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                1
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Sign up and get an API key</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Visit Site", create an account, and generate your own API key from their dashboard.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                2
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Store the key in your project</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Put the key in your project's environment variables instead of hard-coding it.
                </p>
                <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
                  <code className="text-xs text-foreground">
                    {selectedProvider?.name.toUpperCase().replace(/\s+/g, "_")}_API_KEY=your_key
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => copyEnvExample(selectedProvider?.name || "")}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                3
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Use their docs or example code</h4>
                <p className="text-sm text-muted-foreground">
                  Follow the provider's documentation or example code to call their models. Replace YOUR_API_KEY_HERE with your environment variable.
                </p>
              </div>
            </div>

            {/* Reminder */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Reminder:</strong> HackMate does not see or store your API keys. You are in full control.
            </div>

            {/* Action button */}
            <Button
              variant="gradient"
              className="w-full"
              onClick={() => window.open(selectedProvider?.link, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit {selectedProvider?.name}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FreeApis;
