import { generateText } from '../core/geminiClient.js';
import type { ApplyFixInput } from '../types/codebase.types.js';
import { APPLY_FIX_SYSTEM_PROMPT } from './systemPrompts.js';

export async function runApplyFix(input: ApplyFixInput): Promise<string> {
    const prompt = `File: ${input.filePath}
---
Issue: ${input.description}
---
Before (snippet):
${input.before}
---
After (snippet):
${input.after}
---
Full file content:
${input.fileContent}
---
Apply the fix to the full file and return the complete corrected file content.`;

    const result = await generateText(APPLY_FIX_SYSTEM_PROMPT, prompt);

    let cleaned = result.trim();
    if (cleaned.startsWith('```')) {
        const firstNewline = cleaned.indexOf('\n');
        cleaned = cleaned.slice(firstNewline + 1);
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3).trimEnd();
    }

    return cleaned;
}
