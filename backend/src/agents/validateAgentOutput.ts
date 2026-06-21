import { z } from 'zod';

function extractJsonObject(raw: string): string | null {
    const start = raw.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < raw.length; i++) {
        const char = raw[i];

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }

        if (char === '{') depth++;
        if (char === '}') {
            depth--;
            if (depth === 0) {
                return raw.slice(start, i + 1);
            }
        }
    }

    return null;
}

function extractJson(raw: string): unknown {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (fenced) {
        return JSON.parse(fenced[1].trim());
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        const jsonObject = extractJsonObject(trimmed);
        if (!jsonObject) {
            throw new Error(`No JSON object found in response. Preview: ${trimmed.slice(0, 120)}`);
        }
        return JSON.parse(jsonObject);
    }
}

export function validateAgentOutput<T>(
    schema: z.ZodType<T>,
    raw: string,
): { success: true; data: T } | { success: false; error: string } {
    try {
        const parsed = extractJson(raw);
        const result = schema.safeParse(parsed);

        if (result.success) {
            return { success: true, data: result.data };
        }

        return { success: false, error: JSON.stringify(result.error.format(), null, 2) };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown parse error';
        return { success: false, error: message };
    }
}
