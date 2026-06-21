export type AgentName = 'explorer' | 'engineer' | 'security';
export type AgentStatus = 'idle' | 'running' | 'done' | 'failed';

export interface AgentState {
    name: AgentName;
    label: string;
    status: AgentStatus;
}

export interface ExplorerOutput {
    stack: {
        languages: string[];
        frameworks: string[];
        libraries: string[];
        testFrameworks: string[];
    };
    entryPoints: string[];
    dependencyMap: Record<string, string[]>;
    architectureLayers: {
        layer: string;
        files: string[];
    }[];
    fileComplexity: {
        file: string;
        score: number;
        reason: string;
    }[];
    architectureSummary: string;
    highCouplingFlags: string[];
}

export interface EngineerOutput {
    overallScore: number;
    categoryScores: {
        readability: number;
        testCoverage: number;
        duplication: number;
        patterns: number;
    };
    issues: {
        file: string;
        line: number;
        priority: 'High' | 'Medium' | 'Low';
        category: string;
        description: string;
        before: string;
        after: string;
    }[];
    testCoverageMap: {
        file: string;
        hasTests: boolean;
        testFile: string | null;
    }[];
    suggestedTests: {
        file: string;
        functionName: string;
        testCode: string;
    }[];
}

export interface FinalReport {
    executiveSummary: string;
    topPriorityIssues: string[];
    agentStatus: {
        explorer: 'done' | 'failed';
        engineer: 'done' | 'failed';
        security: 'done' | 'failed';
    };
    explorerReport: ExplorerOutput | null;
    engineerReport: EngineerOutput | null;
}

export interface SSEStatusEvent {
    agent: AgentName;
    status: 'running' | 'done' | 'failed';
}

export interface SSEResultEvent {
    agent: AgentName;
    data: unknown;
}

export interface SSECompleteEvent {
    finalReport: FinalReport;
}

export interface SSEErrorEvent {
    agent?: AgentName;
    message: string;
}

export interface AnalysisState {
    agents: AgentState[];
    explorerReport: ExplorerOutput | null;
    engineerReport: EngineerOutput | null;
    finalReport: FinalReport | null;
    error: string | null;
    isAnalyzing: boolean;
}
