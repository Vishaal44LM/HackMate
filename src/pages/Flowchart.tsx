import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Download,
  Copy,
  Share2,
  Save,
  ZoomIn,
  ZoomOut,
  Move,
  History,
  Trash2,
  Loader2,
  ArrowRight,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FlowNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: "start" | "process" | "decision" | "end";
}

interface FlowConnection {
  from: string;
  to: string;
  label?: string;
}

interface Flowchart {
  id: string;
  name: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
  mermaid: string;
  createdAt: Date;
}

const TEMPLATES = [
  { id: "user-journey", name: "User Journey", prompt: "User signs up → onboards → uses features → becomes power user" },
  { id: "data-pipeline", name: "Data Pipeline", prompt: "Collect data → Clean → Transform → Analyze → Report" },
  { id: "payment-flow", name: "Payment Flow", prompt: "Cart → Checkout → Payment → Verification → Confirmation" },
  { id: "auth-flow", name: "Auth Flow", prompt: "Login page → Validate credentials → Success? → Dashboard or Error" },
];

const Flowchart = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [processInput, setProcessInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [currentFlowchart, setCurrentFlowchart] = useState<Flowchart | null>(null);
  const [recentFlowcharts, setRecentFlowcharts] = useState<Flowchart[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showHistory, setShowHistory] = useState(true);

  // Load recent flowcharts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('hackmate_flowcharts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentFlowcharts(parsed.map((f: any) => ({
          ...f,
          createdAt: new Date(f.createdAt)
        })));
      } catch (e) {
        console.error('Failed to parse saved flowcharts');
      }
    }
  }, []);

  // Save flowcharts to localStorage
  const saveFlowcharts = useCallback((flowcharts: Flowchart[]) => {
    localStorage.setItem('hackmate_flowcharts', JSON.stringify(flowcharts));
    setRecentFlowcharts(flowcharts);
  }, []);

  const parseMermaidToNodes = (mermaid: string): { nodes: FlowNode[], connections: FlowConnection[] } => {
    const nodes: FlowNode[] = [];
    const connections: FlowConnection[] = [];
    const nodeMap: Record<string, FlowNode> = {};
    
    const lines = mermaid.split('\n').filter(line => line.trim() && !line.trim().startsWith('graph'));
    
    let yOffset = 80;
    let xBase = 200;
    
    lines.forEach((line, index) => {
      // Parse arrow connections: A --> B or A -->|label| B
      const arrowMatch = line.match(/(\w+)(?:\[([^\]]+)\])?\s*-->(?:\|([^|]+)\|)?\s*(\w+)(?:\[([^\]]+)\])?/);
      
      if (arrowMatch) {
        const [, fromId, fromLabel, connLabel, toId, toLabel] = arrowMatch;
        
        // Create source node if not exists
        if (!nodeMap[fromId]) {
          const node: FlowNode = {
            id: fromId,
            label: fromLabel || fromId,
            x: xBase + (index % 2) * 100,
            y: yOffset,
            type: index === 0 ? 'start' : 'process'
          };
          nodeMap[fromId] = node;
          nodes.push(node);
          yOffset += 100;
        }
        
        // Create target node if not exists
        if (!nodeMap[toId]) {
          const node: FlowNode = {
            id: toId,
            label: toLabel || toId,
            x: xBase + ((index + 1) % 2) * 100,
            y: yOffset,
            type: 'process'
          };
          nodeMap[toId] = node;
          nodes.push(node);
          yOffset += 100;
        }
        
        connections.push({ from: fromId, to: toId, label: connLabel });
      }
    });
    
    // Mark last node as end
    if (nodes.length > 0) {
      nodes[nodes.length - 1].type = 'end';
    }
    
    return { nodes, connections };
  };

  const generateFlowchart = async () => {
    if (!processInput.trim()) {
      toast({
        title: "Missing input",
        description: "Please describe your process or flow.",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-flowchart', {
        body: { processDescription: processInput.trim() }
      });

      if (error) throw error;

      const mermaidCode = data.mermaid || generateFallbackMermaid(processInput);
      const { nodes, connections } = parseMermaidToNodes(mermaidCode);
      
      const newFlowchart: Flowchart = {
        id: `flow_${Date.now()}`,
        name: processInput.slice(0, 30) + (processInput.length > 30 ? '...' : ''),
        nodes,
        connections,
        mermaid: mermaidCode,
        createdAt: new Date()
      };

      setCurrentFlowchart(newFlowchart);
      saveFlowcharts([newFlowchart, ...recentFlowcharts.slice(0, 9)]);
      
      toast({
        title: "Flowchart generated!",
        description: "Your flowchart is ready. Click nodes to edit."
      });
    } catch (error) {
      console.error('Flowchart generation error:', error);
      // Fallback to local generation
      const mermaidCode = generateFallbackMermaid(processInput);
      const { nodes, connections } = parseMermaidToNodes(mermaidCode);
      
      const newFlowchart: Flowchart = {
        id: `flow_${Date.now()}`,
        name: processInput.slice(0, 30) + (processInput.length > 30 ? '...' : ''),
        nodes,
        connections,
        mermaid: mermaidCode,
        createdAt: new Date()
      };

      setCurrentFlowchart(newFlowchart);
      saveFlowcharts([newFlowchart, ...recentFlowcharts.slice(0, 9)]);
      
      toast({
        title: "Flowchart generated!",
        description: "Generated locally. Full AI features coming soon."
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateFallbackMermaid = (input: string): string => {
    // Parse input for common patterns
    const steps = input
      .split(/[→\->]|then|next|after/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (steps.length === 0) {
      steps.push(...input.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0));
    }
    
    if (steps.length === 0) {
      steps.push('Start', 'Process', 'End');
    }
    
    let mermaid = 'graph TD\n';
    steps.forEach((step, i) => {
      const nodeId = `N${i}`;
      const nextId = `N${i + 1}`;
      const cleanLabel = step.replace(/[[\]{}()]/g, '').slice(0, 25);
      
      if (i < steps.length - 1) {
        mermaid += `    ${nodeId}[${cleanLabel}] --> ${nextId}[${steps[i + 1].replace(/[[\]{}()]/g, '').slice(0, 25)}]\n`;
      }
    });
    
    return mermaid;
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setProcessInput(template.prompt);
      setSelectedTemplate(templateId);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.target === canvasRef.current) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleNodeEdit = (nodeId: string, newLabel: string) => {
    if (!currentFlowchart) return;
    
    const updatedNodes = currentFlowchart.nodes.map(node =>
      node.id === nodeId ? { ...node, label: newLabel } : node
    );
    
    setCurrentFlowchart({ ...currentFlowchart, nodes: updatedNodes });
    setEditingNode(null);
  };

  const handleNodeDrag = (nodeId: string, deltaX: number, deltaY: number) => {
    if (!currentFlowchart) return;
    
    const updatedNodes = currentFlowchart.nodes.map(node =>
      node.id === nodeId 
        ? { ...node, x: node.x + deltaX / zoom, y: node.y + deltaY / zoom } 
        : node
    );
    
    setCurrentFlowchart({ ...currentFlowchart, nodes: updatedNodes });
  };

  const copyMermaid = () => {
    if (currentFlowchart) {
      navigator.clipboard.writeText(currentFlowchart.mermaid);
      toast({ title: "Copied!", description: "Mermaid code copied to clipboard." });
    }
  };

  const downloadPNG = async () => {
    if (!canvasRef.current || !currentFlowchart) return;
    
    try {
      // Create a simple SVG representation
      const svg = createSVGFromFlowchart(currentFlowchart);
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowchart-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Downloaded!", description: "Flowchart saved as SVG." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to download.", variant: "destructive" });
    }
  };

  const createSVGFromFlowchart = (flowchart: Flowchart): string => {
    const width = 800;
    const height = 600;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    svg += `<rect width="100%" height="100%" fill="#0a0a0a"/>`;
    
    // Draw connections
    flowchart.connections.forEach(conn => {
      const fromNode = flowchart.nodes.find(n => n.id === conn.from);
      const toNode = flowchart.nodes.find(n => n.id === conn.to);
      if (fromNode && toNode) {
        svg += `<line x1="${fromNode.x + 75}" y1="${fromNode.y + 30}" x2="${toNode.x + 75}" y2="${toNode.y}" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrowhead)"/>`;
      }
    });
    
    // Draw nodes
    flowchart.nodes.forEach(node => {
      const fill = node.type === 'start' ? '#22c55e' : node.type === 'end' ? '#ef4444' : '#3b82f6';
      svg += `<rect x="${node.x}" y="${node.y}" width="150" height="40" rx="8" fill="${fill}" opacity="0.9"/>`;
      svg += `<text x="${node.x + 75}" y="${node.y + 25}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="12">${node.label}</text>`;
    });
    
    // Add arrowhead marker
    svg += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6"/></marker></defs>`;
    svg += `</svg>`;
    
    return svg;
  };

  const loadFlowchart = (flowchart: Flowchart) => {
    setCurrentFlowchart(flowchart);
    setProcessInput(flowchart.name);
    handleResetView();
  };

  const deleteFlowchart = (id: string) => {
    const updated = recentFlowcharts.filter(f => f.id !== id);
    saveFlowcharts(updated);
    if (currentFlowchart?.id === id) {
      setCurrentFlowchart(null);
    }
    toast({ title: "Deleted", description: "Flowchart removed from history." });
  };

  const getNodeColor = (type: FlowNode['type']) => {
    switch (type) {
      case 'start': return 'from-green-500 to-emerald-600';
      case 'end': return 'from-red-500 to-rose-600';
      case 'decision': return 'from-amber-500 to-orange-600';
      default: return 'from-primary to-secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pt-4">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Flowchart Generator
          </h1>
          <p className="text-muted-foreground mt-2">
            Transform your ideas into professional flowcharts instantly
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel - Input & History */}
          <div className="lg:w-80 space-y-4">
            {/* Input Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Describe Your Flow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Templates */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Quick templates</label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATES.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  value={processInput}
                  onChange={(e) => setProcessInput(e.target.value)}
                  placeholder="User logs in → dashboard → payment → success&#10;&#10;Or describe in natural language..."
                  className="min-h-[120px] resize-none"
                />

                <Button 
                  onClick={generateFlowchart}
                  disabled={generating || !processInput.trim()}
                  className="w-full gap-2 bg-gradient-to-r from-primary to-secondary"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Flowchart
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader className="pb-2">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center justify-between w-full"
                >
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    Recent Flowcharts
                  </CardTitle>
                  {showHistory ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </CardHeader>
              {showHistory && (
                <CardContent className="pt-2">
                  {recentFlowcharts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No flowcharts yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {recentFlowcharts.map(flow => (
                        <div
                          key={flow.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 ${
                            currentFlowchart?.id === flow.id ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                          onClick={() => loadFlowchart(flow)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{flow.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {flow.nodes.length} steps • {new Date(flow.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFlowchart(flow.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>

          {/* Main Canvas */}
          <div className="flex-1">
            <Card className="h-[600px] flex flex-col">
              {/* Toolbar */}
              <div className="border-b px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handleZoomIn}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleZoomOut}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleResetView}>
                    <Move className="w-4 h-4" />
                  </Button>
                  <Badge variant="outline" className="ml-2">
                    {Math.round(zoom * 100)}%
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={downloadPNG} disabled={!currentFlowchart}>
                    <Download className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Download SVG</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyMermaid} disabled={!currentFlowchart}>
                    <Copy className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Copy Mermaid</span>
                  </Button>
                </div>
              </div>

              {/* Canvas */}
              <div 
                ref={canvasRef}
                className="flex-1 overflow-hidden relative bg-muted/20 cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {!currentFlowchart ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    <Sparkles className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      No flowchart yet
                    </h3>
                    <p className="text-sm text-muted-foreground/70 max-w-md">
                      Describe your process in the input field and click "Generate Flowchart" 
                      to create a professional diagram
                    </p>
                  </div>
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: 'center center'
                    }}
                  >
                    {/* Grid */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border/30" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>

                    {/* Connections */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <defs>
                        <marker
                          id="arrowhead"
                          markerWidth="10"
                          markerHeight="7"
                          refX="10"
                          refY="3.5"
                          orient="auto"
                        >
                          <polygon points="0 0, 10 3.5, 0 7" className="fill-primary" />
                        </marker>
                      </defs>
                      {currentFlowchart.connections.map((conn, i) => {
                        const fromNode = currentFlowchart.nodes.find(n => n.id === conn.from);
                        const toNode = currentFlowchart.nodes.find(n => n.id === conn.to);
                        if (!fromNode || !toNode) return null;
                        
                        const startX = fromNode.x + 75;
                        const startY = fromNode.y + 40;
                        const endX = toNode.x + 75;
                        const endY = toNode.y;
                        
                        return (
                          <g key={i}>
                            <path
                              d={`M ${startX} ${startY} C ${startX} ${startY + 30}, ${endX} ${endY - 30}, ${endX} ${endY - 5}`}
                              fill="none"
                              stroke="hsl(var(--primary))"
                              strokeWidth="2"
                              markerEnd="url(#arrowhead)"
                            />
                            {conn.label && (
                              <text
                                x={(startX + endX) / 2}
                                y={(startY + endY) / 2}
                                textAnchor="middle"
                                className="fill-muted-foreground text-xs"
                              >
                                {conn.label}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Nodes */}
                    {currentFlowchart.nodes.map((node) => (
                      <div
                        key={node.id}
                        className={`absolute cursor-pointer select-none transition-shadow hover:shadow-lg`}
                        style={{ left: node.x, top: node.y }}
                        draggable
                        onDragEnd={(e) => {
                          const rect = canvasRef.current?.getBoundingClientRect();
                          if (rect) {
                            handleNodeDrag(node.id, e.clientX - rect.left - node.x * zoom - pan.x, e.clientY - rect.top - node.y * zoom - pan.y);
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNode(node.id);
                        }}
                      >
                        <div className={`w-[150px] rounded-xl bg-gradient-to-br ${getNodeColor(node.type)} p-0.5 shadow-md`}>
                          <div className="bg-card rounded-[10px] px-4 py-2.5">
                            {editingNode === node.id ? (
                              <input
                                autoFocus
                                defaultValue={node.label}
                                className="w-full bg-transparent text-center text-sm font-medium focus:outline-none"
                                onBlur={(e) => handleNodeEdit(node.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleNodeEdit(node.id, e.currentTarget.value);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <p className="text-sm font-medium text-center truncate">{node.label}</p>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="absolute -top-2 -right-2 text-[10px] px-1.5 capitalize bg-background"
                        >
                          {node.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flowchart;
