import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({}); // Automatically picks up process.env.GEMINI_API_KEY

const maxDiffLength = 30000;

function truncateDiff(diff: string) {
  return diff.length > maxDiffLength ? diff.slice(0, maxDiffLength) + "\n\n... [DIFF TRUNCATED]" : diff;
}

export async function generateBriefSummary(diffText: string): Promise<string> {
  const truncatedDiff = truncateDiff(diffText);
  const prompt = `Here are some code changes (a git diff).\n<diff>\n${truncatedDiff}\n</diff>\n\nWrite a brief explanation of these changes in 50-100 words. Explain what changed and why it matters. Keep it somewhat technical so a developer or product manager can understand the codebase impact, but avoid being overly verbose. Describe the changes directly.`;

  try {
    const interaction = await client.interactions.create({
      model: "gemini-3.6-flash",
      input: prompt,
      system_instruction: "You are a friendly communicator explaining software changes simply to non-technical people."
    });
    return interaction.output_text || "Could not generate brief summary.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return "Error generating summary. Please check your Gemini API key.";
  }
}

export async function generateDetailedExplanation(diffText: string): Promise<string> {
  const truncatedDiff = truncateDiff(diffText);
  const prompt = `Here are some code changes (a git diff).\n<diff>\n${truncatedDiff}\n</diff>\n\nWrite a highly detailed but completely non-technical explanation of these changes. \nBreak it down into:\n1. The Core Idea (What happened)\n2. The Why (Why it was done)\n3. Real World Impact (How it affects the product)\nDo NOT use technical jargon (no 'variables', 'API', 'endpoints', 'DOM'). Use analogies extensively. Format neatly.`;

  try {
    const interaction = await client.interactions.create({
      model: "gemini-3.6-flash",
      input: prompt,
      system_instruction: "You are an expert communicator explaining complex software architecture to a non-technical CEO using simple analogies."
    });
    return interaction.output_text || "Could not generate detailed explanation.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return "Error generating explanation. Please check your Gemini API key.";
  }
}

export async function chatWithCommit(diffText: string, userMessage: string, history: { role: string, content: string }[]): Promise<string> {
  const truncatedDiff = truncateDiff(diffText);

  const systemPrompt = `You are a helpful Oracle answering questions about this specific code change. 
Keep your answers extremely simple, warm, and non-technical. If they ask what a functionality does, explain it like a simple real-world concept. 
Here is the context diff:\n\n${truncatedDiff}`;

  try {
    // Reconstruct the history as a string or use a multi-turn chat if needed.
    // For simplicity with this prompt, we can inject the history contextually.
    let fullInput = "";
    if (history.length > 0) {
      fullInput += "Previous Conversation:\n";
      history.forEach(h => {
        fullInput += `${h.role === 'user' ? 'User' : 'Oracle'}: ${h.content}\n`;
      });
      fullInput += `\nNew User Message: ${userMessage}`;
    } else {
      fullInput = userMessage;
    }

    const interaction = await client.interactions.create({
      model: "gemini-3.6-flash",
      input: fullInput,
      system_instruction: systemPrompt
    });

    return interaction.output_text || "I'm sorry, I couldn't answer that.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return "Error communicating with Oracle. Please check your Gemini API key.";
  }
}
