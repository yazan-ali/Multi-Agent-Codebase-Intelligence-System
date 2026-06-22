import type { ExplorerOutput, EngineerOutput, SecurityOutput } from '../agents/schemas.js';

type SSEEmitter = (event: string, data: unknown) => void;
interface CodeFile {
    name: string;
    content: string;
    language: string;
    size: number;
    lines: number;
    lastModified: number;
}

interface ManifestFileEntry {
    name: string;
    lastModified: number;
    size: number;
}

interface CacheManifest {
    path: string;
    analyzedAt: string;
    fileCount: number;
    files: ManifestFileEntry[];
}

interface CachedSession {
    manifest: CacheManifest;
    explorerReport: ExplorerOutput | null;
    engineerReport: EngineerOutput | null;
    securityReport: SecurityOutput | null;
    finalReport: FinalReport;
}

interface Issue {
    source: 'explorer' | 'engineer' | 'security';
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    file: string;
    line?: number;
    description: string;
}

interface FinalReport {
    executiveSummary: string;
    topPriorityIssues: Issue[];
    agentStatus: {
        explorer: "done" | "failed";
        engineer: "done" | "failed";
        security: "done" | "failed";
    };
    explorerReport: ExplorerOutput | null;
    engineerReport: EngineerOutput | null;
    securityReport: SecurityOutput | null;
}

interface ApplyFixInput {
    fileContent: string;
    filePath: string;
    description: string;
    before: string;
    after: string;
}

type AgentStatus = "done" | "failed";

export {
    CodeFile,
    ExplorerOutput,
    EngineerOutput,
    SecurityOutput,
    Issue,
    SSEEmitter,
    FinalReport,
    CacheManifest,
    CachedSession,
    ManifestFileEntry,
    ApplyFixInput,
    AgentStatus
};
