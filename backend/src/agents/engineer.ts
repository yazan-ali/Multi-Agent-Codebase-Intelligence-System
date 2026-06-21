import { z } from 'zod';
import type { CodeFile } from '../types/codebase.types.js';
import { createAgentChat } from '../core/geminiClient.js';
import { buildEngineerPrompt } from './promptBuilder.js';
import { EngineerOutputSchema } from './schemas.js';
import type { EngineerOutput } from './schemas.js';
import { validateAgentOutput } from './validateAgentOutput.js';
import { ENGINEER_SYSTEM_PROMPT } from './systemPrompts.js';
import type { ExplorerOutput } from '../types/codebase.types.js';

const MAX_RETRIES = 3;

export async function runEngineer(files: CodeFile[], explorerReport: ExplorerOutput): Promise<EngineerOutput> {
    if (!files) {
        throw new Error('No files to analyze');
    }

    if (!explorerReport) {
        throw new Error('No explorer report to analyze');
    }

    const userPrompt = buildEngineerPrompt(files, explorerReport);
    const jsonSchema = z.toJSONSchema(EngineerOutputSchema);

    const chat = createAgentChat({
        systemInstruction: ENGINEER_SYSTEM_PROMPT,
        responseSchema: jsonSchema as Record<string, unknown>,
    });

    const firstResponse = await chat.sendMessage({ message: userPrompt });
    const firstRaw = firstResponse.text ?? '';
    const firstValidation = validateAgentOutput(EngineerOutputSchema, firstRaw);

    if (firstValidation.success) {
        return firstValidation.data;
    }

    let lastError = firstValidation.error;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const retryResponse = await chat.sendMessage(
            {
                message: `Your previous response was invalid.\nValidation errors:\n${lastError}\n\nReturn ONLY valid JSON matching the EngineerOutput schema.`
            });

        const retryRaw = retryResponse.text ?? '';
        const retryValidation = validateAgentOutput(EngineerOutputSchema, retryRaw);

        if (retryValidation.success) {
            return retryValidation.data;
        }

        lastError = retryValidation.error;
    }

    throw new Error(`Engineer agent failed after ${MAX_RETRIES + 1} attempts. Last error: ${lastError}`);
}