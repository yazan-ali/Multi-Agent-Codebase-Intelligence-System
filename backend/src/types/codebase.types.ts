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

interface FinalReport {
    executiveSummary: string;
    topPriorityIssues: string[];
    agentStatus: {
        explorer: "done" | "failed";
        engineer: "done" | "failed";
        security: "done" | "failed";
    };
    explorerReport: ExplorerOutput | null;
    engineerReport: EngineerOutput | null;
    securityReport: SecurityOutput | null;
}

type AgentStatus = "done" | "failed";

export {
    CodeFile,
    ExplorerOutput,
    EngineerOutput,
    SecurityOutput,
    SSEEmitter,
    FinalReport,
    CacheManifest,
    CachedSession,
    ManifestFileEntry,
    AgentStatus
};
