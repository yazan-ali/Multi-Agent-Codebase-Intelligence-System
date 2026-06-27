import { useCallback, useRef, useState } from 'react';
import { IS_DEMO_MODE } from '../config';
import { buildDemoState } from '../demo/buildDemoState';
import type {
    AgentName,
    AgentState,
    AnalysisState,
    ApplyChangeRequest,
    ApplyChangeResponse,
    EngineerOutput,
    ExplorerOutput,
    SecurityOutput,
    SSECompleteEvent,
    SSEErrorEvent,
    SSEResultEvent,
    SSEStatusEvent,
} from '../types/agent.types';

const INITIAL_AGENTS: AgentState[] = [
    { name: 'explorer', label: 'Explorer', status: 'idle' },
    { name: 'engineer', label: 'Engineer', status: 'idle' },
    { name: 'security', label: 'Security', status: 'idle' },
];

const INITIAL_STATE: AnalysisState = {
    agents: INITIAL_AGENTS,
    codebasePath: null,
    explorerReport: null,
    engineerReport: null,
    securityReport: null,
    finalReport: null,
    error: null,
    isAnalyzing: false,
    appliedChanges: new Set<string>(),
};

export function useAnalysis() {
    const [state, setState] = useState<AnalysisState>(
        IS_DEMO_MODE ? buildDemoState() : INITIAL_STATE,
    );
    const abortRef = useRef<AbortController | null>(null);

    const updateAgent = useCallback((name: AgentName, status: AgentState['status']) => {
        setState((prev) => ({
            ...prev,
            agents: prev.agents.map((a) => (a.name === name ? { ...a, status } : a)),
        }));
    }, []);

    const analyze = useCallback(async (path: string) => {
        if (IS_DEMO_MODE) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setState({ ...INITIAL_STATE, isAnalyzing: true, codebasePath: path, appliedChanges: new Set() });

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path }),
                signal: controller.signal,
            });

            if (!res.ok || !res.body) {
                const text = await res.text();
                setState((prev) => ({ ...prev, isAnalyzing: false, error: text }));
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const messages = buffer.split('\n\n');
                buffer = messages.pop() ?? '';

                for (const msg of messages) {
                    const eventMatch = msg.match(/^event:\s*(.+)$/m);
                    const dataMatch = msg.match(/^data:\s*(.+)$/m);
                    if (!eventMatch || !dataMatch) continue;

                    const event = eventMatch[1].trim();
                    const data = JSON.parse(dataMatch[1].trim());

                    switch (event) {
                        case 'status': {
                            const { agent, status } = data as SSEStatusEvent;
                            updateAgent(agent, status);
                            break;
                        }
                        case 'result': {
                            const { agent, data: agentData } = data as SSEResultEvent;
                            if (agent === 'explorer') {
                                setState((prev) => ({
                                    ...prev,
                                    explorerReport: agentData as ExplorerOutput,
                                }));
                            } else if (agent === 'engineer') {
                                setState((prev) => ({
                                    ...prev,
                                    engineerReport: agentData as EngineerOutput,
                                }));
                            } else if (agent === 'security') {
                                setState((prev) => ({
                                    ...prev,
                                    securityReport: agentData as SecurityOutput,
                                }));
                            }
                            break;
                        }
                        case 'complete': {
                            const { finalReport } = data as SSECompleteEvent;
                            setState((prev) => ({
                                ...prev,
                                finalReport,
                                isAnalyzing: false,
                            }));
                            break;
                        }
                        case 'error': {
                            const { message } = data as SSEErrorEvent;
                            setState((prev) => ({ ...prev, error: message }));
                            break;
                        }
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                setState((prev) => ({
                    ...prev,
                    isAnalyzing: false,
                    error: (err as Error).message,
                }));
            }
        }
    }, [updateAgent]);

    const applyChange = useCallback(async (request: ApplyChangeRequest): Promise<ApplyChangeResponse> => {
        if (IS_DEMO_MODE) {
            return { success: false, file: request.file, message: 'Not available in demo mode' };
        }

        try {
            const res = await fetch('/api/apply-change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });
            const data = (await res.json()) as ApplyChangeResponse;
            if (data.success) {
                const key = request.type === 'issue-fix'
                    ? `issue-fix:${request.file}:${request.before?.slice(0, 40)}`
                    : `test-file:${request.targetTestFile}`;
                setState((prev) => {
                    const next = new Set(prev.appliedChanges);
                    next.add(key);
                    return { ...prev, appliedChanges: next };
                });
            }
            return data;
        } catch (err) {
            return { success: false, file: request.file, message: (err as Error).message };
        }
    }, []);

    return { state, analyze, applyChange };
}
