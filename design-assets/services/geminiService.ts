
import { GoogleGenAI } from "@google/genai";

export async function processCommand(command: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an AI assistant for ProFlow Studio, a productivity app. 
      The user entered a command: "${command}". 
      Respond with a 2-sentence confirmation of what you will do to help them process this task. 
      Be professional and helpful.`,
      config: {
        temperature: 0.7,
      }
    });
    return response.text || "Command accepted. Starting background processing...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Command received. ProFlow is analyzing your request.";
  }
}
