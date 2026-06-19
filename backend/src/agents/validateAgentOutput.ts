import { z } from 'zod';

function extractJson(raw: string): unknown {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (fenced) {
        return JSON.parse(fenced[1].trim());
    }

    return JSON.parse(trimmed);
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
