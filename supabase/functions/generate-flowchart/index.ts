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

    const systemPrompt = `You are a flowchart generator. Given a process description, generate clean Mermaid flowchart code.

Rules:
1. Use 'graph TD' for top-down flowcharts
2. Use descriptive but short node labels (max 25 chars)
3. Use simple node IDs like N0, N1, N2, etc.
4. Create logical connections with arrows (-->)
5. Keep it clean and professional
6. For decisions, use rhombus shapes {text}
7. Maximum 8 nodes for clarity

Example output for "User logs in → dashboard → payment":
graph TD
    N0[User Login] --> N1[Dashboard]
    N1 --> N2[Payment]
    N2 --> N3[Confirmation]

Only output the Mermaid code, nothing else.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a Mermaid flowchart for: ${processDescription}` }
        ],
        max_tokens: 500,
        temperature: 0.3,
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
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const mermaidCode = data.choices?.[0]?.message?.content?.trim() || "";

    // Clean up the mermaid code (remove markdown code blocks if present)
    const cleanMermaid = mermaidCode
      .replace(/```mermaid\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

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
