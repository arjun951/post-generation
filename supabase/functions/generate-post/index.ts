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
      examplePostImages = [],
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

    if (examplePostImages.length > 0) {
      prompt += `\n\n   STYLE REFERENCE: Example post images are provided for reference. Study their format, layout style, visual characteristics, and composition approach. Use these as inspiration for the expected format and quality, but DO NOT copy them directly. Innovate and create a unique post based on the user's vehicle and theme inputs while maintaining similar professional characteristics.`;
    }
    
    prompt += `\n\n2. CRITICAL RULES:
   - Use dealershipTemplate as the base image and create the post image on top of it. The post image must align with the dimensions and style of the dealershipTemplate, and the positions of banners, logos, and any other visual elements on the dealershipTemplate must not be changed
   - DO NOT modify, remove, or change any existing template elements
   - The template logo, address, phone, and branding MUST stay exactly as provided
   - Add promotional vehicle content that complements the existing template design
   - Ensure the final composition is professional and suitable for social media marketing
   - Match the visual style and quality of the template

Remember, there the dealership template format whether it is landscape or portrait and generate final image accordingly. You can use your own creativity for post generation.  MUST REQUIRED:  Make sure you are not chaging anything (design, position of logo, address, whether it is landscap, potrail mode) in the final generated image. Always maintain it.`;

    // Enforce exact canvas match and no whitespace/letterboxing
    prompt += `

3. OUTPUT FORMAT (CRITICAL - NO WHITESPACE):
   - ABSOLUTELY NO BORDERS, WHITESPACE, OR PADDING around the image
   - The generated image MUST fill 100% of the canvas edge-to-edge
   - Final output must be the EXACT same pixel dimensions as the template image
   - No letterboxing, pillarboxing, white borders, black borders, or any spacing whatsoever
   - If the template is portrait, output must be portrait; if landscape, output must be landscape
   - Content must extend all the way to every edge of the canvas
   - Return a single flattened composite image only

4. CONTENT PLACEMENT (CRITICAL - FILL COMPLETELY):
   - The entire canvas must be COMPLETELY FILLED with content
   - Do NOT leave any white space, gaps, or empty areas anywhere
   - Extend the background and promotional content to touch all four edges of the canvas
   - The promotional content should blend seamlessly into the full canvas area
   - Keep the top logos and bottom footer completely visible and unchanged
   - Everything between the top and bottom should be filled edge-to-edge with no gaps`;

    console.log("Generated prompt:", prompt);

    // Build the content array for the AI request - put template FIRST as the base canvas, then instructions
    const contentArray: any[] = [
      {
        type: "image_url",
        image_url: {
          url: dealershipTemplate
        }
      },
      {
        type: "text",
        text: prompt
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

    // Add example post images if provided (for style reference)
    examplePostImages.forEach((imageUrl: string) => {
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
