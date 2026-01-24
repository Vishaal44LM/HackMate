import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

// No templates - fully manual user input

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
  // Template state removed - fully manual input
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
    
    // Start with better initial positioning - centered in canvas
    let yOffset = 60;
    const xBase = 100;
    const nodeWidth = 150;
    const nodeHeight = 50;
    const verticalSpacing = 120;
    
    lines.forEach((line, index) => {
      // Parse arrow connections: A --> B or A -->|label| B
      const arrowMatch = line.match(/(\w+)(?:\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})?\s*-->(?:\|([^|]+)\|)?\s*(\w+)(?:\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})?/);
      
      if (arrowMatch) {
        const [, fromId, fromLabel1, fromLabel2, fromLabel3, connLabel, toId, toLabel1, toLabel2, toLabel3] = arrowMatch;
        const fromLabel = fromLabel1 || fromLabel2 || fromLabel3 || fromId;
        const toLabel = toLabel1 || toLabel2 || toLabel3 || toId;
        
        // Create source node if not exists
        if (!nodeMap[fromId]) {
          const node: FlowNode = {
            id: fromId,
            label: fromLabel,
            x: xBase,
            y: yOffset,
            type: nodes.length === 0 ? 'start' : (fromLabel3 ? 'decision' : 'process')
          };
          nodeMap[fromId] = node;
          nodes.push(node);
          yOffset += verticalSpacing;
        }
        
        // Create target node if not exists
        if (!nodeMap[toId]) {
          const node: FlowNode = {
            id: toId,
            label: toLabel,
            x: xBase,
            y: yOffset,
            type: toLabel3 ? 'decision' : 'process'
          };
          nodeMap[toId] = node;
          nodes.push(node);
          yOffset += verticalSpacing;
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

  // Calculate bounds of all nodes for auto-fitting
  const calculateBounds = (nodes: FlowNode[]) => {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
    
    const nodeWidth = 150;
    const nodeHeight = 50;
    const padding = 80;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + nodeWidth);
      maxY = Math.max(maxY, node.y + nodeHeight);
    });
    
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  };

  // Auto-fit view when flowchart changes
  useEffect(() => {
    if (currentFlowchart && canvasRef.current) {
      const bounds = calculateBounds(currentFlowchart.nodes);
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // Calculate zoom to fit all nodes
      const scaleX = canvasRect.width / bounds.width;
      const scaleY = canvasRect.height / bounds.height;
      const newZoom = Math.min(scaleX, scaleY, 1.2);
      
      // Calculate pan to center
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      setZoom(Math.max(0.5, Math.min(newZoom, 1.5)));
      setPan({
        x: canvasRect.width / 2 - centerX * newZoom,
        y: canvasRect.height / 2 - centerY * newZoom
      });
    }
  }, [currentFlowchart?.id]);

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

  // Template functionality removed - fully manual input

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
    if (!currentFlowchart) return;
    
    try {
      // Create SVG first
      const svg = createSVGFromFlowchart(currentFlowchart);
      
      // Convert SVG to PNG using canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      
      // Parse SVG dimensions
      const svgMatch = svg.match(/width="(\d+)" height="(\d+)"/);
      const svgWidth = svgMatch ? parseInt(svgMatch[1]) : 800;
      const svgHeight = svgMatch ? parseInt(svgMatch[2]) : 600;
      
      // Set canvas size with high DPI for better quality
      const scale = 2;
      canvas.width = svgWidth * scale;
      canvas.height = svgHeight * scale;
      ctx.scale(scale, scale);
      
      // Create image from SVG
      const img = new Image();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        // Draw background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, svgWidth, svgHeight);
        
        // Draw the SVG
        ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
        
        // Convert to PNG and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flowchart-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }, 'image/png', 1.0);
        
        URL.revokeObjectURL(svgUrl);
        toast({ title: "Downloaded!", description: "Flowchart saved as PNG image." });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        toast({ title: "Error", description: "Failed to generate image.", variant: "destructive" });
      };
      
      img.src = svgUrl;
    } catch (e) {
      toast({ title: "Error", description: "Failed to download.", variant: "destructive" });
    }
  };

  const createSVGFromFlowchart = (flowchart: Flowchart): string => {
    const bounds = calculateBounds(flowchart.nodes);
    const nodeWidth = 180;
    const nodeHeight = 60;
    const padding = 60;
    
    // Calculate actual dimensions based on node positions with more padding
    const width = Math.max(bounds.width + padding * 2, 500);
    const height = Math.max(bounds.height + padding * 2, 400);
    
    // Offset to normalize coordinates (start from padding)
    const offsetX = -bounds.minX + padding;
    const offsetY = -bounds.minY + padding;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    
    // Background with subtle gradient
    svg += `<defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0f172a"/>
        <stop offset="100%" style="stop-color:#1e293b"/>
      </linearGradient>
      <marker id="arrowhead" markerWidth="14" markerHeight="10" refX="12" refY="5" orient="auto" markerUnits="strokeWidth">
        <polygon points="0 0, 14 5, 0 10" fill="#60a5fa"/>
      </marker>
      <linearGradient id="startGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#22c55e"/>
        <stop offset="100%" style="stop-color:#16a34a"/>
      </linearGradient>
      <linearGradient id="endGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ef4444"/>
        <stop offset="100%" style="stop-color:#dc2626"/>
      </linearGradient>
      <linearGradient id="processGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6"/>
        <stop offset="100%" style="stop-color:#8b5cf6"/>
      </linearGradient>
      <linearGradient id="decisionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#f59e0b"/>
        <stop offset="100%" style="stop-color:#ea580c"/>
      </linearGradient>
      <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.4"/>
      </filter>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>`;
    
    svg += `<rect width="100%" height="100%" fill="url(#bgGradient)"/>`;
    
    // Draw connections with proper curved paths - thicker and more visible
    flowchart.connections.forEach(conn => {
      const fromNode = flowchart.nodes.find(n => n.id === conn.from);
      const toNode = flowchart.nodes.find(n => n.id === conn.to);
      if (fromNode && toNode) {
        const startX = fromNode.x + offsetX + nodeWidth / 2;
        const startY = fromNode.y + offsetY + nodeHeight;
        const endX = toNode.x + offsetX + nodeWidth / 2;
        const endY = toNode.y + offsetY;
        
        // Calculate control points for smooth curve
        const midY = (startY + endY) / 2;
        
        // Glow effect behind the line
        svg += `<path d="M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY - 10}" fill="none" stroke="#3b82f6" stroke-width="6" opacity="0.3"/>`;
        // Main line
        svg += `<path d="M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY - 10}" fill="none" stroke="#60a5fa" stroke-width="3" marker-end="url(#arrowhead)"/>`;
        
        // Connection label with background
        if (conn.label) {
          const labelX = (startX + endX) / 2;
          const labelY = midY;
          svg += `<rect x="${labelX - 30}" y="${labelY - 10}" width="60" height="20" rx="4" fill="#1e293b" opacity="0.9"/>`;
          svg += `<text x="${labelX}" y="${labelY + 4}" text-anchor="middle" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="12" font-weight="600">${conn.label}</text>`;
        }
      }
    });
    
    // Draw nodes with enhanced styling
    flowchart.nodes.forEach(node => {
      const x = node.x + offsetX;
      const y = node.y + offsetY;
      const gradientId = node.type === 'start' ? 'startGradient' : 
                         node.type === 'end' ? 'endGradient' : 
                         node.type === 'decision' ? 'decisionGradient' : 'processGradient';
      
      // Node shadow and background
      svg += `<rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="14" fill="url(#${gradientId})" filter="url(#nodeShadow)"/>`;
      
      // Inner highlight
      svg += `<rect x="${x + 2}" y="${y + 2}" width="${nodeWidth - 4}" height="${nodeHeight/2 - 2}" rx="12" fill="white" opacity="0.15"/>`;
      
      // Node label - larger and bolder
      const label = node.label.length > 22 ? node.label.substring(0, 20) + '...' : node.label;
      svg += `<text x="${x + nodeWidth / 2}" y="${y + nodeHeight / 2 + 6}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="15" font-weight="700">${label}</text>`;
      
      // Type badge
      const badgeX = x + nodeWidth - 35;
      const badgeY = y - 8;
      const badgeColor = node.type === 'start' ? '#22c55e' : node.type === 'end' ? '#ef4444' : node.type === 'decision' ? '#f59e0b' : '#3b82f6';
      svg += `<rect x="${badgeX}" y="${badgeY}" width="40" height="16" rx="8" fill="${badgeColor}"/>`;
      svg += `<text x="${badgeX + 20}" y="${badgeY + 11}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="9" font-weight="600">${node.type.toUpperCase()}</text>`;
    });
    
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
                <Textarea
                  value={processInput}
                  onChange={(e) => setProcessInput(e.target.value)}
                  placeholder="Describe any project, process, or system...&#10;&#10;Examples:&#10;• E-commerce checkout flow&#10;• User authentication with OAuth&#10;• ML training pipeline&#10;• Mobile app architecture"
                  className="min-h-[140px] resize-none"
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
                    <span className="hidden sm:inline">Download PNG</span>
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
                    className="absolute"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: '0 0',
                      width: '2000px',
                      height: '2000px'
                    }}
                  >
                    {/* Grid */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ width: '2000px', height: '2000px' }}>
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border/30" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>

                    {/* Connections - SVG with proper dimensions */}
                    <svg 
                      className="absolute pointer-events-none" 
                      style={{ 
                        width: '2000px', 
                        height: '2000px',
                        overflow: 'visible'
                      }}
                    >
                      <defs>
                        <marker
                          id="arrowhead-canvas"
                          markerWidth="12"
                          markerHeight="8"
                          refX="11"
                          refY="4"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <polygon points="0 0, 12 4, 0 8" className="fill-primary" />
                        </marker>
                      </defs>
                      {currentFlowchart.connections.map((conn, i) => {
                        const fromNode = currentFlowchart.nodes.find(n => n.id === conn.from);
                        const toNode = currentFlowchart.nodes.find(n => n.id === conn.to);
                        if (!fromNode || !toNode) return null;
                        
                        const nodeWidth = 150;
                        const nodeHeight = 50;
                        const startX = fromNode.x + nodeWidth / 2;
                        const startY = fromNode.y + nodeHeight;
                        const endX = toNode.x + nodeWidth / 2;
                        const endY = toNode.y;
                        
                        // Smooth bezier curve
                        const midY = (startY + endY) / 2;
                        
                        return (
                          <g key={i}>
                            <path
                              d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY - 8}`}
                              fill="none"
                              stroke="hsl(var(--primary))"
                              strokeWidth="2.5"
                              markerEnd="url(#arrowhead-canvas)"
                            />
                            {conn.label && (
                              <text
                                x={(startX + endX) / 2}
                                y={midY}
                                textAnchor="middle"
                                className="fill-muted-foreground"
                                fontSize="11"
                                fontWeight="500"
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
                        className="absolute cursor-pointer select-none transition-all hover:shadow-xl hover:scale-105"
                        style={{ left: node.x, top: node.y, width: '150px' }}
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
                        <div className={`rounded-xl bg-gradient-to-br ${getNodeColor(node.type)} p-0.5 shadow-lg`}>
                          <div className="bg-card rounded-[10px] px-4 py-3 min-h-[50px] flex items-center justify-center">
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
                              <p className="text-sm font-medium text-center leading-tight">{node.label}</p>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="absolute -top-2 -right-2 text-[10px] px-1.5 capitalize bg-background border-primary/30"
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
