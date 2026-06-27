import { useState } from 'react';
import type { SecurityOutput, ApplyChangeRequest, ApplyChangeResponse } from '../../types/agent.types';
import { SectionPanel } from '../SectionPanel';
import { MarkdownContent } from '../MarkdownContent';

type ApplyFn = (req: ApplyChangeRequest) => Promise<ApplyChangeResponse>;
type ApplyStatus = 'idle' | 'applying' | 'applied' | 'failed';

interface SecurityReportProps {
    report: SecurityOutput;
    codebasePath: string | null;
    applyChange: ApplyFn;
    appliedChanges: Set<string>;
    readOnly?: boolean;
}

const SEVERITY_STYLES = {
    Critical: 'border-rose-500 bg-rose-900/30 text-rose-300',
    High: 'border-red-600 bg-red-900/30 text-red-300',
    Medium: 'border-amber-600 bg-amber-900/30 text-amber-300',
    Low: 'border-gray-600 bg-gray-800 text-gray-300',
} as const;

const SEVERITY_DOTS = {
    Critical: 'bg-rose-500',
    High: 'bg-red-500',
    Medium: 'bg-amber-500',
    Low: 'bg-gray-500',
} as const;

function getRiskColor(score: number): string {
    if (score >= 70) return 'text-red-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-emerald-400';
}

function getRiskBarColor(score: number): string {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-emerald-500';
}

function getRiskLabel(score: number): string {
    if (score >= 70) return 'High Risk';
    if (score >= 40) return 'Medium Risk';
    return 'Low Risk';
}

function RiskScoreCard({ score }: { score: number }) {
    return (
        <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
                <span className={`text-4xl font-bold ${getRiskColor(score)}`}>{score}</span>
                <span className="text-xs text-gray-500 mt-1">/ 100</span>
            </div>
            <div className="flex-1 space-y-2">
                <div className="h-3 rounded-full bg-gray-700">
                    <div
                        className={`h-3 rounded-full transition-all ${getRiskBarColor(score)}`}
                        style={{ width: `${score}%` }}
                    />
                </div>
                <span className={`text-xs font-semibold ${getRiskColor(score)}`}>
                    {getRiskLabel(score)}
                </span>
            </div>
        </div>
    );
}

function SeverityBreakdown({ vulnerabilities }: { vulnerabilities: SecurityOutput['vulnerabilities'] }) {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const v of vulnerabilities) {
        counts[v.severity]++;
    }

    return (
        <div className="flex gap-4 flex-wrap">
            {(Object.entries(counts) as [keyof typeof counts, number][]).map(([severity, count]) => (
                <div key={severity} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${SEVERITY_DOTS[severity]}`} />
                    <span className="text-sm text-gray-300">{severity}</span>
                    <span className="text-sm font-mono text-gray-400">{count}</span>
                </div>
            ))}
        </div>
    );
}

function CodeBlock({ code }: { code: string }) {
    return (
        <pre className="rounded bg-gray-950 border border-gray-700 px-3 py-2 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
            {code}
        </pre>
    );
}

function ApplyButton({ status, label, onClick, errorMessage, disabled = false }: {
    status: ApplyStatus;
    label: string;
    onClick: () => void;
    errorMessage: string | null;
    disabled?: boolean;
}) {
    if (status === 'applied') {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span>&#10003;</span> Applied
            </span>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={onClick}
                disabled={disabled || status === 'applying'}
                title={disabled ? 'Not available in demo mode' : undefined}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {status === 'applying' ? 'Applying...' : label}
            </button>
            {status === 'failed' && errorMessage && (
                <span className="text-xs text-red-400">{errorMessage}</span>
            )}
        </div>
    );
}

function vulnKey(vuln: SecurityOutput['vulnerabilities'][number]): string {
    return `issue-fix:${vuln.file}:${vuln.before.slice(0, 40)}`;
}

function VulnerabilityCard({ vuln, codebasePath, applyChange, isApplied, readOnly }: {
    vuln: SecurityOutput['vulnerabilities'][number];
    codebasePath: string | null;
    applyChange: ApplyFn;
    isApplied: boolean;
    readOnly: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [status, setStatus] = useState<ApplyStatus>(isApplied ? 'applied' : 'idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const canApply = Boolean(vuln.before && vuln.after);

    const handleApply = async () => {
        if (!codebasePath || !canApply) return;
        setStatus('applying');
        setErrorMsg(null);
        const res = await applyChange({
            codebasePath,
            type: 'issue-fix',
            file: vuln.file,
            description: `${vuln.description}\n\nRecommended fix: ${vuln.fix}`,
            before: vuln.before,
            after: vuln.after,
        });
        if (res.success) {
            setStatus('applied');
        } else {
            setStatus('failed');
            setErrorMsg(res.message);
        }
    };

    return (
        <div className="rounded border border-gray-700 bg-gray-800/50">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-gray-800 transition-colors"
            >
                <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_STYLES[vuln.severity]}`}>
                    {vuln.severity}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="font-mono">{vuln.file}:{vuln.line}</span>
                        <span className="text-gray-600">·</span>
                        <span>{vuln.owaspCategory}</span>
                    </div>
                    <p className="text-sm text-gray-200 mt-0.5">{vuln.description}</p>
                </div>
                <span className="text-gray-500 text-xs mt-1 shrink-0">
                    {expanded ? '▲' : '▼'}
                </span>
            </button>
            {expanded && (
                <div className="border-t border-gray-700 px-3 py-3 space-y-2">
                    <div>
                        <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Recommended Fix</span>
                        <div className="mt-1 rounded bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-gray-300">
                            {vuln.fix}
                        </div>
                    </div>
                    {vuln.before && (
                        <div>
                            <span className="text-[10px] uppercase font-semibold text-red-400 tracking-wider">Before</span>
                            <CodeBlock code={vuln.before} />
                        </div>
                    )}
                    {vuln.after && (
                        <div>
                            <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">After</span>
                            <CodeBlock code={vuln.after} />
                        </div>
                    )}
                    {codebasePath && canApply && (
                        <div className="pt-1">
                            <ApplyButton
                                status={status}
                                label="Apply Fix"
                                onClick={handleApply}
                                errorMessage={errorMsg}
                                disabled={readOnly}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function VulnerabilitiesList({ vulnerabilities, codebasePath, applyChange, appliedChanges, readOnly }: {
    vulnerabilities: SecurityOutput['vulnerabilities'];
    codebasePath: string | null;
    applyChange: ApplyFn;
    appliedChanges: Set<string>;
    readOnly: boolean;
}) {
    if (vulnerabilities.length === 0) {
        return <p className="text-sm text-gray-500">No vulnerabilities detected.</p>;
    }

    const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    const sorted = [...vulnerabilities].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const grouped = new Map<string, SecurityOutput['vulnerabilities']>();
    for (const vuln of sorted) {
        const existing = grouped.get(vuln.file) ?? [];
        existing.push(vuln);
        grouped.set(vuln.file, existing);
    }

    const sortedGroups = [...grouped.entries()].sort((a, b) => {
        const aMin = Math.min(...a[1].map((v) => severityOrder[v.severity]));
        const bMin = Math.min(...b[1].map((v) => severityOrder[v.severity]));
        return aMin - bMin;
    });

    return (
        <div className="space-y-4">
            {sortedGroups.map(([file, fileVulns]) => (
                <div key={file}>
                    <h4 className="text-sm font-medium text-gray-200 font-mono mb-2">{file}</h4>
                    <div className="space-y-1.5">
                        {fileVulns.map((vuln, i) => (
                            <VulnerabilityCard
                                key={`${vuln.file}-${vuln.line}-${i}`}
                                vuln={vuln}
                                codebasePath={codebasePath}
                                applyChange={applyChange}
                                isApplied={appliedChanges.has(vulnKey(vuln))}
                                readOnly={readOnly}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function HardcodedSecrets({ secrets }: { secrets: SecurityOutput['hardcodedSecrets'] }) {
    if (secrets.length === 0) {
        return <p className="text-sm text-gray-500">No hardcoded secrets detected.</p>;
    }

    return (
        <div className="space-y-1.5">
            {secrets.map((secret, i) => (
                <div key={`${secret.file}-${secret.line}-${i}`} className="flex items-center gap-3 rounded border border-gray-700 bg-gray-800/50 px-3 py-2">
                    <span className="text-amber-400 text-sm">🔑</span>
                    <span className="font-mono text-xs text-gray-300">{secret.file}:{secret.line}</span>
                    <span className="text-gray-600">·</span>
                    <span className="text-sm text-gray-400">{secret.type}</span>
                </div>
            ))}
        </div>
    );
}

function MissingAuthGuards({ guards }: { guards: SecurityOutput['missingAuthGuards'] }) {
    if (guards.length === 0) {
        return <p className="text-sm text-gray-500">No missing auth guards detected.</p>;
    }

    return (
        <div className="space-y-1.5">
            {guards.map((guard, i) => (
                <div key={`${guard.file}-${guard.endpoint}-${i}`} className="rounded border border-gray-700 bg-gray-800/50 px-3 py-2.5 min-w-0">
                    <div className="flex items-start gap-2 text-xs text-gray-400 min-w-0">
                        <span className="text-red-400 text-sm shrink-0">🔓</span>
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="font-mono break-all">{guard.file}</span>
                                <span className="text-gray-600 shrink-0">·</span>
                                <span className="font-mono text-amber-300 break-all">{guard.endpoint}</span>
                            </div>
                            <p className="text-sm text-gray-300 wrap-break-word">{guard.description}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function InsecureDependencies({ deps }: { deps: SecurityOutput['insecureDependencies'] }) {
    if (deps.length === 0) {
        return <p className="text-sm text-gray-500">No insecure dependencies detected.</p>;
    }

    return (
        <div className="space-y-1.5">
            {deps.map((dep, i) => (
                <div key={`${dep.package}-${i}`} className="rounded border border-gray-700 bg-gray-800/50 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-amber-400 text-sm">📦</span>
                        <span className="font-mono text-gray-200">{dep.package}</span>
                        <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">{dep.version}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 ml-6">{dep.reason}</p>
                </div>
            ))}
        </div>
    );
}

function OwaspBreakdown({ vulnerabilities }: { vulnerabilities: SecurityOutput['vulnerabilities'] }) {
    if (vulnerabilities.length === 0) {
        return <p className="text-sm text-gray-500">No OWASP categories to display.</p>;
    }

    const categoryCounts = new Map<string, number>();
    for (const v of vulnerabilities) {
        categoryCounts.set(v.owaspCategory, (categoryCounts.get(v.owaspCategory) ?? 0) + 1);
    }

    const sorted = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
    const maxCount = sorted[0]?.[1] ?? 1;

    return (
        <div className="space-y-2">
            {sorted.map(([category, count]) => (
                <div key={category} className="flex items-center gap-3">
                    <span className="w-52 shrink-0 text-xs text-gray-300 truncate" title={category}>{category}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-700">
                        <div
                            className="h-2 rounded-full bg-red-500 transition-all"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                    </div>
                    <span className="w-6 text-right text-xs font-mono text-gray-400">{count}</span>
                </div>
            ))}
        </div>
    );
}

export function SecurityReport({ report, codebasePath, applyChange, appliedChanges, readOnly = false }: SecurityReportProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SectionPanel title="Risk Score">
                    <RiskScoreCard score={report.riskScore} />
                </SectionPanel>

                <SectionPanel title="Severity Breakdown">
                    <div className="space-y-4">
                        <SeverityBreakdown vulnerabilities={report.vulnerabilities} />
                        <div className="text-sm text-gray-400">
                            {report.vulnerabilities.length} vulnerabilit{report.vulnerabilities.length !== 1 ? 'ies' : 'y'} found across{' '}
                            {new Set(report.vulnerabilities.map((v) => v.file)).size} file{new Set(report.vulnerabilities.map((v) => v.file)).size !== 1 ? 's' : ''}
                        </div>
                    </div>
                </SectionPanel>
            </div>

            <SectionPanel title="Summary">
                <MarkdownContent content={report.summary} />
            </SectionPanel>

            <SectionPanel title="Vulnerabilities">
                <VulnerabilitiesList
                    vulnerabilities={report.vulnerabilities}
                    codebasePath={codebasePath}
                    applyChange={applyChange}
                    appliedChanges={appliedChanges}
                    readOnly={readOnly}
                />
            </SectionPanel>

            <SectionPanel title="OWASP Category Breakdown">
                <OwaspBreakdown vulnerabilities={report.vulnerabilities} />
            </SectionPanel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SectionPanel title="Hardcoded Secrets">
                    <HardcodedSecrets secrets={report.hardcodedSecrets} />
                </SectionPanel>

                <SectionPanel title="Missing Auth Guards">
                    <MissingAuthGuards guards={report.missingAuthGuards} />
                </SectionPanel>
            </div>

            {report.insecureDependencies.length > 0 && (
                <SectionPanel title="Insecure Dependencies">
                    <InsecureDependencies deps={report.insecureDependencies} />
                </SectionPanel>
            )}
        </div>
    );
}
