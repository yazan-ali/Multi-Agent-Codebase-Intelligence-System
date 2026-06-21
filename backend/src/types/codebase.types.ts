import type { ExplorerOutput, EngineerOutput } from '../agents/schemas.js';

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
}

type AgentStatus = "done" | "failed";

export { CodeFile, ExplorerOutput, EngineerOutput, SSEEmitter, FinalReport, CacheManifest, CachedSession, ManifestFileEntry, AgentStatus };
