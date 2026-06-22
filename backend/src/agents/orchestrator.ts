import {
    CodeFile,
    ExplorerOutput,
    SSEEmitter,
    FinalReport,
    EngineerOutput,
    AgentStatus,
    SecurityOutput,
    Issue,
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
        emit("status", { agent: "security", status: "running" });

        const engineerPromise = runEngineer(files, explorerReport)
            .then((result) => {
                engineerReport = result;
                engineerStatus = "done";
                emit('result', { agent: "engineer", data: engineerReport });
                emit('status', { agent: 'engineer', status: 'done' });
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : "Engineer failed";
                emit('status', { agent: 'engineer', status: 'failed' });
                emit('error', { agent: 'engineer', message });
            });

        const securityPromise = runSecurity(files, explorerReport)
            .then((result) => {
                securityReport = result;
                securityStatus = "done";
                emit('result', { agent: "security", data: securityReport });
                emit('status', { agent: 'security', status: 'done' });
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : "Security failed";
                emit('status', { agent: 'security', status: 'failed' });
                emit('error', { agent: 'security', message });
            });

        await Promise.all([engineerPromise, securityPromise]);
    }

    const finalReport: FinalReport = {
        executiveSummary: buildExecutiveSummary(
            explorerReport,
            engineerReport,
            securityReport,
            { explorer: explorerStatus, engineer: engineerStatus, security: securityStatus },
        ),
        topPriorityIssues: aggregateTopIssues(explorerReport, engineerReport, securityReport),
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

const SEVERITY_ORDER: Record<Issue['severity'], number> = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Low: 3,
};

function aggregateTopIssues(
    explorer: ExplorerOutput | null,
    engineer: EngineerOutput | null,
    security: SecurityOutput | null,
    limit = 10,
): Issue[] {
    const issues: Issue[] = [];

    if (security) {
        for (const v of security.vulnerabilities) {
            issues.push({
                source: 'security',
                severity: v.severity,
                file: v.file,
                line: v.line,
                description: `${v.owaspCategory} — ${v.description}`,
            });
        }
    }

    if (engineer) {
        for (const issue of engineer.issues) {
            issues.push({
                source: 'engineer',
                severity: issue.priority,
                file: issue.file,
                line: issue.line,
                description: `${issue.category} — ${issue.description}`,
            });
        }
    }

    if (explorer) {
        for (const file of explorer.highCouplingFlags) {
            issues.push({
                source: 'explorer',
                severity: 'Medium',
                file,
                description: 'High coupling detected — too many dependencies or tight coupling with other modules',
            });
        }
    }

    issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

    return issues.slice(0, limit);
}

function countSeverities<T>(items: T[], getSeverity: (item: T) => Issue['severity']): Record<Issue['severity'], number> {
    const counts: Record<Issue['severity'], number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const item of items) {
        counts[getSeverity(item)]++;
    }
    return counts;
}

function formatSeverityCounts(counts: Record<Issue['severity'], number>): string {
    const parts = (['Critical', 'High', 'Medium', 'Low'] as const)
        .filter((s) => counts[s] > 0)
        .map((s) => `${counts[s]} ${s}`);
    return parts.length > 0 ? parts.join(', ') : 'none';
}

function buildExecutiveSummary(
    explorer: ExplorerOutput | null,
    engineer: EngineerOutput | null,
    security: SecurityOutput | null,
    agentStatus: FinalReport['agentStatus'],
): string {
    if (!explorer) {
        return 'Analysis failed — Explorer could not complete. No architecture or downstream reports are available.';
    }

    const sections: string[] = [];

    const languages = explorer.stack.languages.join(', ');
    const frameworks = explorer.stack.frameworks.length > 0
        ? explorer.stack.frameworks.join(', ')
        : 'none detected';
    sections.push(
        `## Overview\n\n`
        + `This codebase uses **${languages}**`
        + (frameworks !== 'none detected' ? ` with **${frameworks}**` : '')
        + `. ${explorer.entryPoints.length} entry point(s) identified across ${explorer.fileComplexity.length} analyzed source files.`
    );

    const overviewParagraph = explorer.architectureSummary.split(/\n\n+/)[0]?.trim();
    if (overviewParagraph) {
        sections.push(`## Architecture\n\n${overviewParagraph}`);
    }

    if (agentStatus.engineer === 'done' && engineer) {
        const priorityCounts = countSeverities(engineer.issues, (i) => i.priority);
        const untested = engineer.testCoverageMap.filter((f) => !f.hasTests).length;
        const total = engineer.testCoverageMap.length;
        sections.push(
            `## Code Quality\n\n`
            + `Overall quality score: **${engineer.overallScore}/100** `
            + `(readability ${engineer.categoryScores.readability}, `
            + `test coverage ${engineer.categoryScores.testCoverage}, `
            + `duplication ${engineer.categoryScores.duplication}, `
            + `patterns ${engineer.categoryScores.patterns}). `
            + `${engineer.issues.length} issue(s) found (${formatSeverityCounts(priorityCounts)}). `
            + `${untested} of ${total} source files lack tests.`
        );
    } else if (agentStatus.engineer === 'failed') {
        sections.push('## Code Quality\n\nEngineer analysis did not complete.');
    }

    if (agentStatus.security === 'done' && security) {
        const vulnCounts = countSeverities(security.vulnerabilities, (v) => v.severity);
        const extras: string[] = [];
        if (security.hardcodedSecrets.length > 0) {
            extras.push(`${security.hardcodedSecrets.length} hardcoded secret(s)`);
        }
        if (security.missingAuthGuards.length > 0) {
            extras.push(`${security.missingAuthGuards.length} missing auth guard(s)`);
        }
        if (security.insecureDependencies.length > 0) {
            extras.push(`${security.insecureDependencies.length} insecure dependency(ies)`);
        }
        const extrasText = extras.length > 0 ? ` Also flagged: ${extras.join(', ')}.` : '';
        sections.push(
            `## Security\n\n`
            + `Risk score: **${security.riskScore}/100**. `
            + `${security.vulnerabilities.length} vulnerability(ies) (${formatSeverityCounts(vulnCounts)}).`
            + extrasText
        );
        const summaryLead = security.summary.split(/\n\n+/)[0]?.trim();
        if (summaryLead) {
            sections[sections.length - 1] += `\n\n${summaryLead}`;
        }
    } else if (agentStatus.security === 'failed') {
        sections.push('## Security\n\nSecurity analysis did not complete.');
    }

    const topIssues = aggregateTopIssues(explorer, engineer, security, 5);
    if (topIssues.length > 0) {
        const bullets = topIssues
            .map((issue) => {
                const location = issue.line != null ? `${issue.file}:${issue.line}` : issue.file;
                return `- **${issue.severity}** (${issue.source}) — \`${location}\`: ${issue.description}`;
            })
            .join('\n');
        sections.push(`## Priority Actions\n\n${bullets}`);
    }

    return sections.join('\n\n');
}

export { runOrchestrator };
