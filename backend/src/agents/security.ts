import { z } from 'zod';
import type { CodeFile } from '../types/codebase.types.js';
import { createAgentChat } from '../core/geminiClient.js';
import { buildSecurityPrompt } from './promptBuilder.js';
import { SecurityOutputSchema } from './schemas.js';
import type { SecurityOutput } from '../types/codebase.types.js';
import { validateAgentOutput } from './validateAgentOutput.js';
import { SECURITY_SYSTEM_PROMPT } from './systemPrompts.js';
import type { ExplorerOutput } from '../types/codebase.types.js';

const MAX_RETRIES = 3;

export async function runSecurity(files: CodeFile[], explorerReport: ExplorerOutput): Promise<SecurityOutput> {
    if (!files) {
        throw new Error('No files to analyze');
    }

    if (!explorerReport) {
        throw new Error('No explorer report to analyze');
    }

    const userPrompt = buildSecurityPrompt(files, explorerReport);
    const jsonSchema = z.toJSONSchema(SecurityOutputSchema);

    const chat = createAgentChat({
        systemInstruction: SECURITY_SYSTEM_PROMPT,
        responseSchema: jsonSchema as Record<string, unknown>,
    });

    const firstResponse = await chat.sendMessage({ message: userPrompt });
    const firstRaw = firstResponse.text ?? '';
    const firstValidation = validateAgentOutput(SecurityOutputSchema, firstRaw);

    if (firstValidation.success) {
        return firstValidation.data;
    }

    let lastError = firstValidation.error;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const retryResponse = await chat.sendMessage(
            {
                message: `Your previous response was invalid.\nValidation errors:\n${lastError}\n\nReturn ONLY valid JSON matching the SecurityOutput schema.`
            });

        const retryRaw = retryResponse.text ?? '';
        const retryValidation = validateAgentOutput(SecurityOutputSchema, retryRaw);

        if (retryValidation.success) {
            return retryValidation.data;
        }

        lastError = retryValidation.error;
    }

    throw new Error(`Security agent failed after ${MAX_RETRIES + 1} attempts. Last error: ${lastError}`);
}