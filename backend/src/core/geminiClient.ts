import { GoogleGenAI, type Chat } from '@google/genai';

const DEFAULT_MODEL = 'gemini-2.5-flash';

function getApiKey(): string {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing.');
    }
    return apiKey;
}

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
    if (!aiInstance) {
        aiInstance = new GoogleGenAI({ apiKey: getApiKey() });
    }
    return aiInstance;
}

export function getModelName(): string {
    return process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
}

export interface AgentConfig {
    systemInstruction: string;
    responseSchema: Record<string, unknown>;
}

export function createAgentChat(config: AgentConfig): Chat {
    const ai = getAI();

    return ai.chats.create({
        model: getModelName(),
        config: {
            systemInstruction: config.systemInstruction,
            responseMimeType: 'application/json',
            responseJsonSchema: config.responseSchema,
            temperature: 0.2,
        },
    });
}
