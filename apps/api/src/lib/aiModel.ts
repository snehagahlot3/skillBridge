// The shared Workers AI model for all SkillBridge AI features.
// (llama-3.1-8b-instruct was deprecated; DeepSeek V4 Flash is stronger
// for structured output like code reviews.)
export const AI_MODEL = "@cf/deepseek-ai/deepseek-v4-flash-0731";

// Some byte-level tokenizers emit multi-byte UTF-8 sequences as
// Latin-1-decoded codepoints (e.g. the rupee sign U+20B9, bytes
// E2 82 B9, arrives as "â\x82¹"). Repair runs of U+0080..U+00FF that
// form valid UTF-8 back into the original characters. Single Latin-1
// characters don't form valid UTF-8 on their own, so they pass through.
function repairMojibake(text: string): string {
  let out = "";
  let run = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0x80 && cp <= 0xff) {
      run += ch;
      continue;
    }
    out += fixRun(run) + ch;
    run = "";
  }
  return out + fixRun(run);
}

function fixRun(run: string): string {
  if (!run) return "";
  try {
    // encode chars as Latin-1 bytes, then decode as UTF-8
    const bytes = new Uint8Array(run.length);
    for (let i = 0; i < run.length; i++) bytes[i] = run.charCodeAt(i);
    const decoded = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true }).decode(bytes);
    if (!decoded.includes("\uFFFD") && decoded !== run) return decoded;
  } catch {
    // keep the run as-is
  }
  return run;
}

// Workers AI models return one of two shapes:
//   - standard:  { response: "text" }
//   - OpenAI-style (DeepSeek V4 etc.): { choices: [{ message: { content: "text" } }] }
export function aiResponseText(res: any): string {
  let text = "";
  if (typeof res?.response === "string" && res.response.trim()) text = res.response;
  else if (Array.isArray(res?.choices) && res.choices.length > 0) {
    const content = res.choices[0]?.message?.content;
    if (typeof content === "string" && content.trim()) text = content;
  }
  return text ? repairMojibake(text) : "";
}