import fs from 'fs';
import pathModule from 'path';
import { detectLanguage } from 'file-lang';
import { isIgnored } from './filters.js';
import type { CodeFile } from '../types/codebase.types.js';

function readCodebase(rootPath: string): CodeFile[] {
    if (!fs.existsSync(rootPath)) {
        throw new Error(`Path does not exist: ${rootPath}`);
    }

    if (!fs.statSync(rootPath).isDirectory()) {
        throw new Error(`Path is not a directory: ${rootPath}`);
    }

    const files: CodeFile[] = [];
    walkDirectory(rootPath, rootPath, files);
    return files;
}

function walkDirectory(rootPath: string, currentPath: string, files: CodeFile[]) {
    let entries: string[];
    try {
        entries = fs.readdirSync(currentPath);
    } catch {
        return;
    }

    for (const entry of entries) {
        const fullPath = pathModule.join(currentPath, entry);

        if (isIgnored(fullPath)) continue;

        try {
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                walkDirectory(rootPath, fullPath, files);
            } else if (stat.isFile()) {
                const file = readFile(rootPath, fullPath, stat);
                if (file) files.push(file);
            }
        } catch {
            continue;
        }
    }
}

function readFile(rootPath: string, filePath: string, stat: fs.Stats): CodeFile | null {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return {
            name: pathModule.relative(rootPath, filePath).replace(/\\/g, '/'),
            content,
            language: getLanguage(filePath),
            size: stat.size,
            lines: content.split('\n').length,
            lastModified: stat.mtimeMs,
        };
    } catch {
        return null;
    }
}

function getLanguage(filePath: string): string {
    const language = detectLanguage(filePath);
    return language === 'Unknown' ? 'unknown' : language.toLowerCase();
}

export { readCodebase };
