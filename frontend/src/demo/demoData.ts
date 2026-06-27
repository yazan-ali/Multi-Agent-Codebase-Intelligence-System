import type { AnalysisState, EngineerOutput, ExplorerOutput, FinalReport, SecurityOutput } from '../types/agent.types';
import explorerReport from './data/explorer.json';
import engineerReport from './data/engineer.json';
import securityReport from './data/security.json';
import finalReport from './data/finalReport.json';
import manifest from './data/manifest.json';

export const DEMO_PATH = manifest.path;

export const DEMO_REPORTS = {
    explorer: explorerReport as ExplorerOutput,
    engineer: engineerReport as EngineerOutput,
    security: securityReport as SecurityOutput,
    finalReport: finalReport as FinalReport,
};

const IDLE_AGENTS: AnalysisState['agents'] = [
    { name: 'explorer', label: 'Explorer', status: 'idle' },
    { name: 'engineer', label: 'Engineer', status: 'idle' },
    { name: 'security', label: 'Security', status: 'idle' },
];

export function buildDemoIdleState(): AnalysisState {
    return {
        agents: IDLE_AGENTS,
        codebasePath: DEMO_PATH,
        explorerReport: null,
        engineerReport: null,
        securityReport: null,
        finalReport: null,
        error: null,
        isAnalyzing: false,
        appliedChanges: new Set(),
    };
}
