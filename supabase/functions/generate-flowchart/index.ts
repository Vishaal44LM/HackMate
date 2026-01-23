import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { processDescription } = await req.json();
    
    if (!processDescription) {
      return new Response(
        JSON.stringify({ error: "Process description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a MASTER FLOWCHART ARCHITECT. Your job is to transform ANY project description, process, system, or idea into a clean, professional Mermaid.js flowchart.

## YOUR CAPABILITIES:
- Convert ANY input into logical flowchart diagrams
- Handle technical systems, business processes, user journeys, data flows, algorithms, workflows
- Identify decision points, parallel processes, loops, and conditional branches
- Create hackathon-ready, presentation-quality diagrams

## MERMAID SYNTAX RULES:
1. Always start with: graph TD (top-down) or graph LR (left-right based on complexity)
2. Node ID format: Use short descriptive IDs (e.g., start, login, validate, process1)
3. Node shapes:
   - [text] = Rectangle (processes, actions)
   - (text) = Rounded rectangle (start/end points)
   - {text} = Diamond (decisions, yes/no questions)
   - [[text]] = Database/storage
   - ((text)) = Circle (connectors)
4. Connections:
   - --> = Arrow with no label
   - -->|Yes| = Arrow with label
   - -.-> = Dotted arrow (optional flow)
5. Keep labels SHORT but MEANINGFUL (max 20 chars)
6. Use 5-15 nodes for clarity (scale based on complexity)
7. Group related steps logically

## OUTPUT FORMAT:
Return ONLY valid Mermaid code. No markdown, no explanations, no code blocks.

## EXAMPLES:

Input: "E-commerce checkout"
Output:
graph TD
    cart(Shopping Cart) --> checkout[Enter Details]
    checkout --> validate{Valid Info?}
    validate -->|Yes| payment[Process Payment]
    validate -->|No| checkout
    payment --> confirm{Payment OK?}
    confirm -->|Yes| success(Order Complete)
    confirm -->|No| retry[Retry Payment]
    retry --> payment

Input: "ML model training pipeline"
Output:
graph LR
    data[[Raw Data]] --> clean[Data Cleaning]
    clean --> split[Train/Test Split]
    split --> train[Model Training]
    train --> eval{Accuracy OK?}
    eval -->|Yes| deploy(Deploy Model)
    eval -->|No| tune[Hyperparameter Tuning]
    tune --> train

Input: "User authentication with OAuth"
Output:
graph TD
    start(User Clicks Login) --> choice{Auth Method?}
    choice -->|Email| email[Enter Credentials]
    choice -->|OAuth| oauth[Redirect to Provider]
    email --> verify{Valid?}
    verify -->|Yes| session[Create Session]
    verify -->|No| error[Show Error]
    error --> email
    oauth --> callback[OAuth Callback]
    callback --> session
    session --> dashboard(Dashboard)

## INTELLIGENCE RULES:
1. INFER missing steps - if user says "login to dashboard", include validation, session creation
2. ADD decision points where logical (success/failure, valid/invalid, yes/no)
3. DETECT patterns: auth flows, CRUD operations, payment systems, data pipelines
4. HANDLE vague input: "make an app" → generic app architecture flow
5. SCALE complexity: simple description = 5-7 nodes, detailed = 10-15 nodes
6. NEVER output empty or invalid Mermaid code`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a professional Mermaid flowchart for: ${processDescription}` }
        ],
        max_tokens: 1000,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const mermaidCode = data.choices?.[0]?.message?.content?.trim() || "";

    // Clean up the mermaid code (remove markdown code blocks if present)
    let cleanMermaid = mermaidCode
      .replace(/```mermaid\n?/gi, '')
      .replace(/```\n?/g, '')
      .replace(/^\s*\n/gm, '') // Remove empty lines
      .trim();

    // Validate basic mermaid structure
    if (!cleanMermaid.startsWith('graph')) {
      // Try to extract graph portion if AI added extra text
      const graphMatch = cleanMermaid.match(/(graph\s+(TD|LR|TB|BT|RL)[\s\S]+)/i);
      if (graphMatch) {
        cleanMermaid = graphMatch[1].trim();
      }
    }

    console.log("Generated Mermaid:", cleanMermaid);

    return new Response(
      JSON.stringify({ mermaid: cleanMermaid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Flowchart generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate flowchart" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});