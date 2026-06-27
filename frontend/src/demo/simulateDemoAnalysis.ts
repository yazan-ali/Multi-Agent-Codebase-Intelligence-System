import type { Dispatch, SetStateAction } from 'react';
import type { AgentName, AgentState, AnalysisState } from '../types/agent.types';
import { DEMO_REPORTS } from './demoData';

const INITIAL_AGENTS: AnalysisState['agents'] = [
    { name: 'explorer', label: 'Explorer', status: 'idle' },
    { name: 'engineer', label: 'Engineer', status: 'idle' },
    { name: 'security', label: 'Security', status: 'idle' },
];

const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
        const id = setTimeout(() => {
            pendingTimeouts.delete(id);
            resolve();
        }, ms);
        pendingTimeouts.add(id);
    });
}

export function cancelDemoSimulation(): void {
    for (const id of pendingTimeouts) {
        clearTimeout(id);
    }
    pendingTimeouts.clear();
}

// Mirrors backend cache replay timing in cacheManager.replayCached
export async function simulateDemoAnalysis(
    path: string,
    setState: Dispatch<SetStateAction<AnalysisState>>,
    updateAgent: (name: AgentName, status: AgentState['status']) => void,
): Promise<void> {
    cancelDemoSimulation();

    setState({
        agents: INITIAL_AGENTS,
        codebasePath: path,
        explorerReport: null,
        engineerReport: null,
        securityReport: null,
        finalReport: null,
        error: null,
        isAnalyzing: true,
        appliedChanges: new Set(),
    });

    await wait(1000);
    updateAgent('explorer', 'running');
    await wait(3000);

    setState((prev) => ({ ...prev, explorerReport: DEMO_REPORTS.explorer }));
    updateAgent('explorer', 'done');

    updateAgent('engineer', 'running');
    updateAgent('security', 'running');

    await Promise.all([
        wait(3000).then(() => {
            setState((prev) => ({ ...prev, engineerReport: DEMO_REPORTS.engineer }));
            updateAgent('engineer', 'done');
        }),
        wait(3000).then(() => {
            setState((prev) => ({ ...prev, securityReport: DEMO_REPORTS.security }));
            updateAgent('security', 'done');
        }),
    ]);

    await wait(1000);

    setState((prev) => ({
        ...prev,
        finalReport: DEMO_REPORTS.finalReport,
        isAnalyzing: false,
    }));
}
