import type { CodeFile } from '../types/codebase.types.js';
import { ExplorerOutput } from '../types/codebase.types.js';

function formatFiles(files: CodeFile[]): string {
    const fileBlocks = files
        .map((file) => `--- START FILE: name: ${file.name}, language: ${file.language}, lines: ${file.lines} ---\n${file.content}\n--- END FILE ---`)
        .join('\n\n');
    return fileBlocks;
}

export function buildExplorerPrompt(files: CodeFile[]): string {
    const formattedFiles = formatFiles(files);
    return `Analyze the following codebase (${files.length} files):

${formattedFiles}

Return your analysis as JSON matching the ExplorerOutput schema.`;
}

export function buildEngineerPrompt(files: CodeFile[], explorerReport: ExplorerOutput): string {
    const formattedFiles = formatFiles(files);
    return `Analyze the following codebase (${files.length} files) in the context of the Explorer's report:

Here is the codebase files:
${formattedFiles}

Here is the Explorer's report:
${JSON.stringify(explorerReport)}

For testCoverageMap: list only source code files with application logic. Exclude package.json, README.md, config files, lock files, and test files themselves.

Return your analysis as JSON matching the EngineerOutput schema.`;
}

export function buildAgentMessages(systemPrompt: string, userPrompt: string) {
    return {
        system: systemPrompt,
        user: userPrompt,
    }
}