import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface PromptDefaults {
  systemPrompt: string;
  userPrompt: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const devPromptDir = join(__dirname, "..", "prompts");
const builtPromptDir = join(__dirname, "..", "..", "prompts");
const promptDir = existsSync(devPromptDir) ? devPromptDir : builtPromptDir;

export function loadDefaultPrompts(): PromptDefaults {
  return {
    systemPrompt: readPromptFile("system.txt"),
    userPrompt: readPromptFile("user.txt")
  };
}

export function renderPromptTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((rendered, [key, value]) => {
    return rendered.replaceAll(`{{${key}}}`, value);
  }, template);
}

function readPromptFile(fileName: string): string {
  return readFileSync(join(promptDir, fileName), "utf8").trim();
}
