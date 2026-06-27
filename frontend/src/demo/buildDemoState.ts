import type { AnalysisState, EngineerOutput, ExplorerOutput, FinalReport, SecurityOutput } from '../types/agent.types';
import explorerReport from './data/explorer.json';
import engineerReport from './data/engineer.json';
import securityReport from './data/security.json';
import finalReport from './data/finalReport.json';
import manifest from './data/manifest.json';

const DEMO_AGENTS: AnalysisState['agents'] = [
    { name: 'explorer', label: 'Explorer', status: 'done' },
    { name: 'engineer', label: 'Engineer', status: 'done' },
    { name: 'security', label: 'Security', status: 'done' },
];

export function buildDemoState(): AnalysisState {
    return {
        agents: DEMO_AGENTS,
        codebasePath: manifest.path,
        explorerReport: explorerReport as ExplorerOutput,
        engineerReport: engineerReport as EngineerOutput,
        securityReport: securityReport as SecurityOutput,
        finalReport: finalReport as FinalReport,
        error: null,
        isAnalyzing: false,
        appliedChanges: new Set(),
    };
}
