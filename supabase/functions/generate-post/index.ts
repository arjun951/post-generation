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
      dealershipName,
      dealershipAddress,
      dealershipPhone,
      numberOfVehicles,
      vehicleNames,
      vehicleImages = [],
      dealershipTemplate,
      specialFeature,
      backgroundTheme,
      customKeywords
    } = await req.json();

    console.log("Generating post with params:", {
      dealershipName,
      numberOfVehicles,
      vehicleNames,
      specialFeature,
      backgroundTheme
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Construct the prompt for image generation
    let prompt = `Create a professional automotive dealership promotional post for ${dealershipName}. `;
    prompt += `Feature ${numberOfVehicles} vehicle(s): ${vehicleNames.join(', ')}. `;
    prompt += `Background setting: ${backgroundTheme}. `;
    
    if (specialFeature) {
      prompt += `Highlight this special offer: ${specialFeature}. `;
    }
    
    if (customKeywords) {
      prompt += `Additional details: ${customKeywords}. `;
    }

    if (dealershipTemplate) {
      prompt += `IMPORTANT: Use the provided dealership template image as the base. Overlay the vehicles and promotional content on this template while preserving the logo, branding, and contact information visible in the template. `;
    }

    if (vehicleImages.length > 0) {
      prompt += `Use the provided vehicle photos in the composition. `;
    }
    
    prompt += `The image should be high-quality, professional, and suitable for social media marketing. `;
    prompt += `Style: modern automotive photography, dramatic lighting, professional composition. `;
    prompt += `Make it eye-catching and premium looking.`;

    console.log("Generated prompt:", prompt);

    // Build the content array for the AI request
    const contentArray: any[] = [
      {
        type: "text",
        text: prompt
      }
    ];

    // Add dealership template if provided
    if (dealershipTemplate) {
      contentArray.push({
        type: "image_url",
        image_url: {
          url: dealershipTemplate
        }
      });
    }

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
