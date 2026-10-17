// The shared Workers AI model for all SkillBridge AI features.
// (llama-3.1-8b-instruct was deprecated; DeepSeek V4 Flash is stronger
// for structured output like code reviews.)
export const AI_MODEL = "@cf/deepseek-ai/deepseek-v4-flash-0731";

// Workers AI models return one of two shapes:
//   - standard:  { response: "text" }
//   - OpenAI-style (DeepSeek V4 etc.): { choices: [{ message: { content: "text" } }] }
export function aiResponseText(res: any): string {
  if (typeof res?.response === "string" && res.response.trim()) return res.response;
  if (Array.isArray(res?.choices) && res.choices.length > 0) {
    const content = res.choices[0]?.message?.content;
    if (typeof content === "string" && content.trim()) return content;
  }
  return "";
}