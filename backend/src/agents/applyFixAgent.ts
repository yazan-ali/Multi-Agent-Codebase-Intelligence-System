import { generateText } from '../core/geminiClient.js';
import type { ApplyFixInput } from '../types/codebase.types.js';
import { APPLY_FIX_SYSTEM_PROMPT } from './systemPrompts.js';

function cleanGeneratedContent(result: string): string {
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

function buildPrompt(input: ApplyFixInput): string {
    if (input.mode === 'test-merge') {
        return `File: ${input.filePath}
---
Task: Merge the new test code into the existing test file below.
- If the new code defines a test class that already exists, add new test methods to the existing class — do NOT create a duplicate class
- Consolidate duplicate imports — keep one import statement per module
- Preserve all existing tests
---
New test code to merge in:
${input.newTestCode}
---
Full existing file content:
${input.fileContent}
---
Return the complete merged file content.`;
    }

    return `File: ${input.filePath}
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
}

export async function runApplyFix(input: ApplyFixInput): Promise<string> {
    const result = await generateText(APPLY_FIX_SYSTEM_PROMPT, buildPrompt(input));
    return cleanGeneratedContent(result);
}
