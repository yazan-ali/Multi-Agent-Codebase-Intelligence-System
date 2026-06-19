import { z } from 'zod';
import type { CodeFile } from '../types/codebase.types.js';
import { createAgentChat } from '../core/geminiClient.js';
import { buildExplorerMessages } from './promptBuilder.js';
import { ExplorerOutputSchema, type ExplorerOutput } from './schemas.js';
import { validateAgentOutput } from './validateAgentOutput.js';

const MAX_RETRIES = 3;

export async function runExplorer(files: CodeFile[]): Promise<ExplorerOutput> {
    if (files.length === 0) {
        throw new Error('No files to analyze');
    }

    const { system, user } = buildExplorerMessages(files);
    const jsonSchema = z.toJSONSchema(ExplorerOutputSchema);

    const chat = createAgentChat({
        systemInstruction: system,
        responseSchema: jsonSchema as Record<string, unknown>,
    });

    const firstResponse = await chat.sendMessage({ message: user });
    const firstRaw = firstResponse.text ?? '';
    const firstValidation = validateAgentOutput(ExplorerOutputSchema, firstRaw);

    if (firstValidation.success) {
        return firstValidation.data;
    }

    let lastError = firstValidation.error;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const retryResponse = await chat.sendMessage({
            message: `Your previous response was invalid.\nValidation errors:\n${lastError}\n\nReturn ONLY valid JSON matching the ExplorerOutput schema.`,
        });

        const retryRaw = retryResponse.text ?? '';
        const retryValidation = validateAgentOutput(ExplorerOutputSchema, retryRaw);

        if (retryValidation.success) {
            return retryValidation.data;
        }

        lastError = retryValidation.error;
    }

    throw new Error(`Explorer agent failed after ${MAX_RETRIES + 1} attempts. Last error: ${lastError}`);
}
