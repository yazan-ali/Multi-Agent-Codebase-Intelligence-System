import type { CodeFile } from '../types/codebase.types.js';
import { EXPLORER_SYSTEM_PROMPT } from './systemPrompts.js';

export function buildExplorerPrompt(files: CodeFile[]): string {
    const fileBlocks = files
        .map((file) => `--- START FILE: name: ${file.name}, language: ${file.language}, lines: ${file.lines} ---\n${file.content}\n--- END FILE ---`)
        .join('\n\n');

    return `Analyze the following codebase (${files.length} files):

${fileBlocks}

Return your analysis as JSON matching the ExplorerOutput schema.`;
}

export function buildExplorerMessages(files: CodeFile[]) {
    return {
        system: EXPLORER_SYSTEM_PROMPT,
        user: buildExplorerPrompt(files),
    };
}
