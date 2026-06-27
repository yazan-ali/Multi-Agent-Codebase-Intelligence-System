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
        targetTestFile: string;
        testCode: string;
    }[];
}

export interface SecurityOutput {
    riskScore: number;
    summary: string;
    vulnerabilities: {
        file: string;
        line: number;
        severity: 'Critical' | 'High' | 'Medium' | 'Low';
        owaspCategory: string;
        description: string;
        fix: string;
        before: string;
        after: string;
    }[];
    hardcodedSecrets: {
        file: string;
        line: number;
        type: string;
    }[];
    missingAuthGuards: {
        file: string;
        endpoint: string;
        description: string;
    }[];
    insecureDependencies: {
        package: string;
        version: string;
        reason: string;
    }[];
}

export interface Issue {
    source: 'explorer' | 'engineer' | 'security';
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    file: string;
    line?: number;
    description: string;
}

export interface FinalReport {
    executiveSummary: string;
    topPriorityIssues: Issue[];
    agentStatus: {
        explorer: 'done' | 'failed';
        engineer: 'done' | 'failed';
        security: 'done' | 'failed';
    };
    explorerReport: ExplorerOutput | null;
    engineerReport: EngineerOutput | null;
    securityReport: SecurityOutput | null;
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

export interface ApplyChangeRequest {
    codebasePath: string;
    type: 'issue-fix' | 'test-file';
    file: string;
    description?: string;
    before?: string;
    after?: string;
    targetTestFile?: string;
    testCode?: string;
}

export interface ApplyChangeResponse {
    success: boolean;
    file: string;
    message: string;
}

export interface AnalysisState {
    agents: AgentState[];
    codebasePath: string | null;
    explorerReport: ExplorerOutput | null;
    engineerReport: EngineerOutput | null;
    securityReport: SecurityOutput | null;
    finalReport: FinalReport | null;
    error: string | null;
    isAnalyzing: boolean;
    appliedChanges: Set<string>;
}
