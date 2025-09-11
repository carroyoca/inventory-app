import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BASE_PROMPT = `
You are a world-class professional photographer specializing in documenting artwork for prestigious auction houses and online marketplaces like eBay.
Your task is to take a user-submitted photo of an artwork and create a professional, hyper-realistic photograph of it, as if it were being photographed in a high-end gallery for a catalog.

Your primary directive is absolute fidelity to the source artwork.

Follow these rules with extreme precision:

1.  **Analyze the Subject:** First, identify the subject of the photo. It could be a painting, a drawing, a print, a signature on paper, or any other form of visual art. Your job is to photograph THIS EXACT OBJECT. Do not add content or create a new piece of art based on the subject. If the image is just a signature, your output should be a professional photograph of that signature on its original paper.

2.  **Frame Handling (CRITICAL):**
    *   **If the artwork in the photo ALREADY HAS A FRAME:** You MUST preserve the existing frame with 100% accuracy. Replicate its color, material (e.g., gold leaf, wood grain, metal), style (e.g., ornate, modern), texture, and any signs of aging or defects. DO NOT replace it with a different frame.
    *   **If the artwork in the photo is UNFRAMED (e.g., a raw canvas, a sheet of paper):** You may then add a simple, thin, gallery-style frame that complements the piece. Choose a neutral color (black, white, natural wood) that does not distract from the art. Alternatively, if it's a canvas, you can present it as a gallery-wrapped canvas.

3.  **Preserve the Artwork Itself:** Do NOT alter the artwork within the frame (or the unframed artwork) in any way. Every brushstroke, color, texture, signature, imperfection, or defect must be perfectly preserved and clearly visible. The goal is an honest and accurate representation for a potential buyer.

4.  **Studio Environment:** Place the object (artwork with its original frame, or the newly framed piece) against a neutral, clean, off-white or very light grey wall with a subtle, realistic texture. The background must be simple and non-distracting.

5.  **Masterful Lighting & Composition:** This is where your artistry as a photographer comes in.
    *   **Composition:** Instead of a perfectly flat, straight-on shot, compose the photograph from a slight, tasteful angle. This should create a sense of depth and presence, making the viewer feel like they are in the room with the artwork.
    *   **Lighting:** Use soft, diffused lighting to illuminate the piece evenly, but also use it to create realism. The light should catch subtle, realistic reflections on the surface of the frame (especially if it's metallic or glossy) and gently highlight the natural texture of the canvas or paper. Cast a very subtle, realistic shadow on the wall behind the art to give it depth.
    *   **Focus:** The artwork itself must be in sharp focus.

6.  **Photorealistic Output:** The final image must look like a photograph taken with a high-end DSLR camera and a prime lens. The result should be both an accurate document for a buyer and a beautiful photograph in its own right.
`;

const SHOT_INSTRUCTIONS = {
  FRONTAL: `
**Your Task:** Generate ONE photograph with the following style:
- **Style: The Frontal Shot.** A professional, head-on photograph. This is the main catalog shot. Compose it with minimal angle, ensuring the artwork is the hero. Use soft, even lighting to accurately represent colors while still providing a sense of realism.
`,
  ANGLED: `
**Your Task:** Generate ONE photograph with the following style:
- **Style: The Angled Shot.** A photograph taken from a clear side angle (approximately 30-45 degrees). This shot is designed to showcase the depth of the frame and the texture of the artwork's surface. Use lighting that rakes across the surface to highlight these details.
`,
  DETAIL: `
**Your Task:** Generate ONE photograph with the following style:
- **Style: The Detail Shot.** A close-up, artistic shot focusing on a compelling feature of the artwork. This could be the artist's signature, an area with heavy brushstrokes or texture, or an interesting detail on the frame. The focus should be sharp on the detail, with a shallow depth of field.
`
};

export interface ArtworkAnalysis {
  estimatedPrice: string;
  priceReasoning: string;
  advertisementTitle: string;
  advertisementBody: string;
}

export interface GroundingChunk {
  web: {
    uri: string;
    title: string;
  }
}

const generateSingleShot = async (base64ImageData: string, mimeType: string, shotInstruction: string): Promise<string> => {
    const fullPrompt = BASE_PROMPT + '\n' + shotInstruction;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: mimeType } },
                    { text: fullPrompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data; // Return the first image found
            }
        }
        
        let responseText = '';
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
                responseText += part.text;
            }
        }

        if (responseText.trim()) {
            throw new Error(`API Error: ${responseText.trim()}`);
        }

        throw new Error("No image was generated by the API for this shot.");
    } catch (error) {
        console.error("Error generating single shot:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while generating a shot.");
    }
};

export const transformArtwork = async (base64ImageData: string, mimeType: string): Promise<string[]> => {
    const promises = [
        generateSingleShot(base64ImageData, mimeType, SHOT_INSTRUCTIONS.FRONTAL),
        generateSingleShot(base64ImageData, mimeType, SHOT_INSTRUCTIONS.ANGLED),
        generateSingleShot(base64ImageData, mimeType, SHOT_INSTRUCTIONS.DETAIL),
    ];

    const results = await Promise.allSettled(promises);
    const generatedImages: string[] = [];

    results.forEach(result => {
        if (result.status === 'fulfilled') {
            generatedImages.push(result.value);
        } else {
            console.error("A shot failed to generate:", result.reason);
        }
    });

    if (generatedImages.length === 0) {
        const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
        const errorMessage = firstError?.reason?.message || "All image generation attempts failed.";
        throw new Error(errorMessage);
    }
    
    return generatedImages;
};

export const analyzeArtwork = async (
    base64ImageData: string,
    mimeType: string,
    artworkDescription: string
): Promise<{ analysis: ArtworkAnalysis; sources: GroundingChunk[] }> => {
    const prompt = `
      You are an expert art appraiser and marketing copywriter for a high-end auction house.
      Analyze the provided image of an artwork and the user's description.
      Your task is to use Google Search to research the artwork, the artist, and comparable pieces to provide a comprehensive analysis.

      User's description: "${artworkDescription}"

      Based on your analysis of the image, the user's description, and your web search, you MUST return a single, valid JSON object.
      Do not include any text or markdown formatting before or after the JSON object.
      The JSON object must have the following structure and content:
      {
        "estimatedPrice": "A realistic price range for this artwork at auction or on a marketplace like eBay (e.g., '$500 - $800 USD'). If you cannot determine a price, state 'Not Available'.",
        "priceReasoning": "A detailed report explaining your price estimation. Discuss the artist's background and significance (if known), the artwork's style and medium, its condition as seen in the photo, and any comparable sales or market trends you found. Structure this as a few clear paragraphs.",
        "advertisementTitle": "A compelling, SEO-friendly title for an online listing (e.g., on eBay). Include artist, style, and medium.",
        "advertisementBody": "A professional and persuasive description for the online listing. Detail the artwork's features, its history (based on the user's description and your research), and its appeal to potential buyers. Format this with paragraphs."
      }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        // Clean the response text to extract only the JSON part
        const text = response.text.trim();
        const jsonMatch = text.match(/{[\s\S]*}/);
        if (!jsonMatch) {
            throw new Error("The AI returned an invalid analysis format. No JSON object found.");
        }
        
        const jsonText = jsonMatch[0];
        const analysis = JSON.parse(jsonText) as ArtworkAnalysis;
        return { analysis, sources: sources as GroundingChunk[] };

    } catch (error) {
        console.error("Error analyzing artwork:", error);
        if (error instanceof Error) {
            throw new Error(`Analysis failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during artwork analysis.");
    }
};
