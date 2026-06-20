import { CodeFile, ExplorerOutput, SSEEmitter, FinalReport } from "../types/codebase.types.js";
import { runExplorer } from "./explorer.js";
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
    let explorerStatus: "done" | "failed" = "failed";

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

    // TODO: Run Engineer + Security in parallel (once implemented)
    // Both depend on explorerReport — skip if Explorer failed

    const finalReport: FinalReport = {
        executiveSummary: explorerReport?.architectureSummary ?? "Analysis failed — Explorer could not complete.",
        topPriorityIssues: explorerReport?.highCouplingFlags ?? [], // temporary - TODO: Should return Issue[]
        agentStatus: {
            explorer: explorerStatus,
            engineer: "failed",
            security: "failed",
        },
        explorerReport,
    };

    if (explorerStatus === "done" && explorerReport) {
        await save(pathHash, { manifest, explorerReport, finalReport });
    }

    return finalReport;
}

export { runOrchestrator };
