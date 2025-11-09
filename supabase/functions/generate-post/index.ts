import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      numberOfVehicles,
      vehicleNames,
      vehicleImages = [],
      dealershipTemplate,
      specialFeature,
      backgroundTheme,
      customKeywords
    } = await req.json();

    console.log("Generating post with params:", {
      numberOfVehicles,
      vehicleNames,
      specialFeature,
      backgroundTheme
    });

    if (!dealershipTemplate) {
      throw new Error('Dealership template is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Construct the prompt for image editing - we'll overlay promotional content on the template
    let prompt = `Add professional automotive promotional content to this dealership template image. The template MUST remain completely intact and unchanged - preserve all existing logos, branding, text, and layout elements exactly as they are.

Add the following promotional content as an overlay to the existing template:

1. VEHICLE CONTENT: Feature ${numberOfVehicles} vehicle(s): ${vehicleNames.join(', ')}.
   Background setting: ${backgroundTheme}.`;
    
    if (specialFeature) {
      prompt += `\n   Special offer to highlight: ${specialFeature}.`;
    }
    
    if (customKeywords) {
      prompt += `\n   Additional requirements: ${customKeywords}.`;
    }

    if (vehicleImages.length > 0) {
      prompt += `\n   Use the provided vehicle photos in the composition.`;
    }
    
    prompt += `\n\n2. CRITICAL RULES:
   - DO NOT modify, remove, or change any existing template elements
   - The template logo, address, phone, and branding MUST stay exactly as provided
   - Add promotional vehicle content that complements the existing template design
   - Ensure the final composition is professional and suitable for social media marketing
   - Match the visual style and quality of the template

REMEMBER: This is an EDIT operation - preserve the template completely and only add the promotional vehicle content to it.`;

    console.log("Generated prompt:", prompt);

    // Build the content array for the AI request - template image goes first for editing
    const contentArray: any[] = [
      {
        type: "text",
        text: prompt
      },
      {
        type: "image_url",
        image_url: {
          url: dealershipTemplate
        }
      }
    ];

    // Add vehicle images if provided
    vehicleImages.forEach((imageUrl: string) => {
      if (imageUrl) {
        contentArray.push({
          type: "image_url",
          image_url: {
            url: imageUrl
          }
        });
      }
    });

    // Call Lovable AI image generation model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: contentArray
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please add credits to your workspace." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");
    
    // Extract the generated image
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImage) {
      console.error("No image in response:", data);
      throw new Error("No image generated");
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: generatedImage,
        prompt: prompt
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in generate-post function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
