import { useState, useRef } from "react";
import { Code, Download, Copy, FileText, FolderArchive, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import BackToRoomBanner from "@/components/BackToRoomBanner";

interface GeneratedFile {
  filename: string;
  content: string;
}

interface CodeResult {
  project_type: "single_file" | "multi_file";
  language: string;
  files: GeneratedFile[];
}

const MIME_TYPES: Record<string, string> = {
  ".py": "text/x-python",
  ".c": "text/x-c",
  ".java": "text/x-java",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ts": "application/typescript",
  ".json": "application/json",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".sh": "text/x-shellscript",
  ".sql": "text/x-sql",
  ".xml": "text/xml",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
};

function getExt(filename: string): string {
  return "." + (filename.split(".").pop()?.toLowerCase() || "txt");
}

const CodeGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<CodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFile, setActiveFile] = useState(0);
  const { toast } = useToast();

  const generate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Please enter a coding requirement", variant: "destructive" });
      return;
    }
    if (prompt.length > 1000) {
      toast({ title: "Prompt must be under 1000 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    setActiveFile(0);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt: prompt.trim() }),
        }
      );

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setResult(data);
      toast({ title: "Code generated successfully!" });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const downloadSingleFile = (file: GeneratedFile) => {
    const ext = getExt(file.filename);
    const mime = MIME_TYPES[ext] || "text/plain";
    const blob = new Blob([file.content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadZip = async () => {
    if (!result) return;
    const zip = new JSZip();
    for (const file of result.files) {
      zip.file(file.filename, file.content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-${result.language}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    if (!result) return;
    if (result.project_type === "single_file") {
      downloadSingleFile(result.files[0]);
    } else {
      downloadZip();
    }
  };

  const copyCode = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Copied to clipboard!" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Code className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AI Code Generator
          </h1>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Describe what you want to build and get production-ready code with proper file structure, instantly downloadable.
        </p>
      </div>

      {/* Input */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Textarea
            placeholder="Describe your coding requirement... (e.g., 'Create a Python Flask REST API with user authentication')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] mb-2 resize-none"
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{prompt.length}/1000</span>
            <Button onClick={generate} disabled={loading || !prompt.trim()} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Code className="h-4 w-4" />
                  Generate Code
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-xl">Generated Project</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="capitalize">{result.language}</Badge>
                  <Badge variant="outline" className="gap-1">
                    {result.project_type === "single_file" ? (
                      <><FileText className="h-3 w-3" /> Single File</>
                    ) : (
                      <><FolderArchive className="h-3 w-3" /> {result.files.length} Files</>
                    )}
                  </Badge>
                </CardDescription>
              </div>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                {result.project_type === "single_file" ? "Download File" : "Download .zip"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {result.files.length === 1 ? (
              /* Single file preview */
              <div className="relative">
                <div className="flex items-center justify-between bg-muted rounded-t-lg px-4 py-2 border border-b-0 border-border">
                  <span className="text-sm font-mono text-muted-foreground">{result.files[0].filename}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyCode(result.files[0].content)} className="h-7 gap-1">
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                </div>
                <ScrollArea className="h-[400px] border border-border rounded-b-lg">
                  <pre className="p-4 text-sm font-mono bg-card overflow-x-auto whitespace-pre">
                    {result.files[0].content}
                  </pre>
                </ScrollArea>
              </div>
            ) : (
              /* Multi-file tabbed preview */
              <Tabs value={String(activeFile)} onValueChange={(v) => setActiveFile(Number(v))}>
                <ScrollArea className="w-full">
                  <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-muted p-1">
                    {result.files.map((file, i) => (
                      <TabsTrigger key={i} value={String(i)} className="text-xs font-mono gap-1 data-[state=active]:bg-card">
                        <FileText className="h-3 w-3" />
                        {file.filename}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>
                {result.files.map((file, i) => (
                  <TabsContent key={i} value={String(i)} className="mt-2">
                    <div className="flex items-center justify-between bg-muted rounded-t-lg px-4 py-2 border border-b-0 border-border">
                      <span className="text-sm font-mono text-muted-foreground">{file.filename}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => copyCode(file.content)} className="h-7 gap-1">
                          <Copy className="h-3 w-3" /> Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadSingleFile(file)} className="h-7 gap-1">
                          <Download className="h-3 w-3" /> Save
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[400px] border border-border rounded-b-lg">
                      <pre className="p-4 text-sm font-mono bg-card overflow-x-auto whitespace-pre">
                        {file.content}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      <BackToRoomBanner />
    </div>
  );
};

export default CodeGenerator;
