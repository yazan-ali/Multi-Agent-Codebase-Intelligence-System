import {
    CodeFile,
    ExplorerOutput,
    SSEEmitter,
    FinalReport,
    EngineerOutput,
    AgentStatus,
    SecurityOutput
} from "../types/codebase.types.js";
import { runExplorer } from "./explorer.js";
import { runEngineer } from "./engineer.js";
import { runSecurity } from "./security.js";
import {
    hashPath,
    buildManifest,
    isCacheValid,
    save,
    replayCached,
} from "../cache/cacheManager.js";

async function runOrchestrator(
    absolutePath: string,
    files: CodeFile[],
    emit: SSEEmitter,
): Promise<FinalReport> {
    const pathHash = hashPath(absolutePath);
    const manifest = buildManifest(absolutePath, files);

    if (await isCacheValid(pathHash, manifest)) {
        return replayCached(pathHash, emit);
    }

    emit("status", { agent: "explorer", status: "running" });

    let explorerReport: ExplorerOutput | null = null;
    let engineerReport: EngineerOutput | null = null;
    let securityReport: SecurityOutput | null = null;
    let explorerStatus: AgentStatus = "failed";
    let engineerStatus: AgentStatus = "failed";
    let securityStatus: AgentStatus = "failed";

    try {
        explorerReport = await runExplorer(files);
        explorerStatus = "done";
        emit("result", { agent: "explorer", data: explorerReport });
        emit("status", { agent: "explorer", status: "done" });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Explorer failed";
        emit("status", { agent: "explorer", status: "failed" });
        emit("error", { agent: "explorer", message });
    }

    if (explorerStatus === "done" && explorerReport) {
        emit("status", { agent: "engineer", status: "running" });
        try {
            engineerReport = await runEngineer(files, explorerReport);
            engineerStatus = "done";
            emit('result', { agent: "engineer", data: engineerReport });
            emit('status', { agent: 'engineer', status: 'done' });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Engineer failed";
            emit('status', { agent: 'engineer', status: 'failed' });
            emit('error', { agent: 'engineer', message });
        }
    }

    if (explorerStatus === "done" && explorerReport) {
        emit("status", { agent: "security", status: "running" });
        try {
            securityReport = await runSecurity(files, explorerReport);
            securityStatus = "done";
            emit('result', { agent: "security", data: securityReport });
            emit('status', { agent: 'security', status: 'done' });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Security failed";
            emit('status', { agent: 'security', status: 'failed' });
            emit('error', { agent: 'security', message });
        }
    }

    const finalReport: FinalReport = {
        executiveSummary: explorerReport?.architectureSummary ?? "Analysis failed — Explorer could not complete.",
        topPriorityIssues: explorerReport?.highCouplingFlags ?? [], // temporary - TODO: Should return Issue[]
        agentStatus: {
            explorer: explorerStatus,
            engineer: engineerStatus,
            security: securityStatus,
        },
        explorerReport,
        engineerReport,
        securityReport,
    };

    if (explorerStatus === "done" && explorerReport) {
        await save(pathHash, { manifest, explorerReport, engineerReport, securityReport, finalReport });
    }

    return finalReport;
}

export { runOrchestrator };
