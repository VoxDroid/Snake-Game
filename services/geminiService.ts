import { GoogleGenAI, Type } from "@google/genai";
import { AiCommentary, GameState } from "../types";

let ai: GoogleGenAI | null = null;

try {
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (error) {
  console.error("Failed to initialize Gemini AI:", error);
}

const commentarySchema = {
  type: Type.OBJECT,
  properties: {
    text: {
      type: Type.STRING,
      description: "A short, punchy commentary sentence about the snake's performance.",
    },
    mood: {
      type: Type.STRING,
      enum: ["hype", "tense", "analytical", "funny"],
      description: "The emotional tone of the commentary.",
    },
  },
  required: ["text", "mood"],
};

export const getGeminiCommentary = async (state: GameState): Promise<AiCommentary | null> => {
  if (!ai) return null;

  try {
    const prompt = `
      You are an intense e-sports commentator watching a high-speed autonomous Snake AI bot.
      
      Current Game Stats:
      - Score (Length): ${state.score}
      - Grid Size: ${state.gridSize}x${state.gridSize}
      - Status: ${state.gameOver ? "GAME OVER" : "Playing"}
      
      Provide a SINGLE sentence commentary.
      If the score is low, encourage it. 
      If the score is high (>20), get hyped about the efficiency.
      If Game Over, mourn the loss or celebrate the run.
      Be brief. Max 15 words.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: commentarySchema,
        thinkingConfig: { thinkingBudget: 0 } // Fast response needed
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AiCommentary;
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};