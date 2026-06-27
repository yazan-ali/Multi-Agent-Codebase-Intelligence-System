import { useState } from 'react';
import type { EngineerOutput, ApplyChangeRequest, ApplyChangeResponse } from '../../types/agent.types';
import { SectionPanel } from '../SectionPanel';

type ApplyFn = (req: ApplyChangeRequest) => Promise<ApplyChangeResponse>;
type ApplyStatus = 'idle' | 'applying' | 'applied' | 'failed';

interface EngineerReportProps {
    report: EngineerOutput;
    codebasePath: string | null;
    applyChange: ApplyFn;
    appliedChanges: Set<string>;
    readOnly?: boolean;
}

const PRIORITY_STYLES = {
    High: 'border-red-600 bg-red-900/30 text-red-300',
    Medium: 'border-amber-600 bg-amber-900/30 text-amber-300',
    Low: 'border-gray-600 bg-gray-800 text-gray-300',
} as const;

const PRIORITY_DOTS = {
    High: 'bg-red-500',
    Medium: 'bg-amber-500',
    Low: 'bg-gray-500',
} as const;

function getScoreColor(score: number, max: number): string {
    const ratio = score / max;
    if (ratio >= 0.7) return 'bg-emerald-500';
    if (ratio >= 0.4) return 'bg-amber-500';
    return 'bg-red-500';
}

function getScoreTextColor(score: number, max: number): string {
    const ratio = score / max;
    if (ratio >= 0.7) return 'text-emerald-400';
    if (ratio >= 0.4) return 'text-amber-400';
    return 'text-red-400';
}

function QualityGauge({ score, label }: { score: number; label: string }) {
    const pct = Math.round(score);
    return (
        <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-sm text-gray-300 capitalize">{label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-gray-700">
                <div
                    className={`h-2.5 rounded-full transition-all ${getScoreColor(score, 100)}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={`w-12 text-right text-xs font-mono ${getScoreTextColor(score, 100)}`}>
                {score}/100
            </span>
        </div>
    );
}

function OverallScore({ score }: { score: number }) {
    return (
        <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
                <span className={`text-4xl font-bold ${getScoreTextColor(score, 100)}`}>
                    {score}
                </span>
                <span className="text-xs text-gray-500 mt-1">/ 100</span>
            </div>
            <div className="flex-1 h-3 rounded-full bg-gray-700">
                <div
                    className={`h-3 rounded-full transition-all ${getScoreColor(score, 100)}`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
}

function QualityScorecard({ overallScore, categoryScores }: {
    overallScore: number;
    categoryScores: EngineerOutput['categoryScores'];
}) {
    const categories = [
        { label: 'Readability', score: categoryScores.readability },
        { label: 'Test Coverage', score: categoryScores.testCoverage },
        { label: 'Duplication', score: categoryScores.duplication },
        { label: 'Patterns', score: categoryScores.patterns },
    ];

    return (
        <div className="space-y-5">
            <OverallScore score={overallScore} />
            <div className="space-y-2.5">
                {categories.map((cat) => (
                    <QualityGauge key={cat.label} score={cat.score} label={cat.label} />
                ))}
            </div>
        </div>
    );
}

function PriorityBreakdown({ issues }: { issues: EngineerOutput['issues'] }) {
    const counts = { High: 0, Medium: 0, Low: 0 };
    for (const issue of issues) {
        counts[issue.priority]++;
    }

    return (
        <div className="flex gap-4">
            {(Object.entries(counts) as [keyof typeof counts, number][]).map(([priority, count]) => (
                <div key={priority} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${PRIORITY_DOTS[priority]}`} />
                    <span className="text-sm text-gray-300">{priority}</span>
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

function issueKey(issue: EngineerOutput['issues'][number]): string {
    return `issue-fix:${issue.file}:${issue.before.slice(0, 40)}`;
}

function testKey(test: EngineerOutput['suggestedTests'][number]): string {
    return `test-file:${test.targetTestFile}`;
}

function IssueCard({ issue, codebasePath, applyChange, isApplied, readOnly }: {
    issue: EngineerOutput['issues'][number];
    codebasePath: string | null;
    applyChange: ApplyFn;
    isApplied: boolean;
    readOnly: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [status, setStatus] = useState<ApplyStatus>(isApplied ? 'applied' : 'idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleApply = async () => {
        if (!codebasePath) return;
        setStatus('applying');
        setErrorMsg(null);
        const res = await applyChange({
            codebasePath,
            type: 'issue-fix',
            file: issue.file,
            description: issue.description,
            before: issue.before,
            after: issue.after,
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
                <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLES[issue.priority]}`}>
                    {issue.priority}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="font-mono">{issue.file}:{issue.line}</span>
                        <span className="text-gray-600">·</span>
                        <span>{issue.category}</span>
                    </div>
                    <p className="text-sm text-gray-200 mt-0.5">{issue.description}</p>
                </div>
                <span className="text-gray-500 text-xs mt-1 shrink-0">
                    {expanded ? '▲' : '▼'}
                </span>
            </button>
            {expanded && (
                <div className="border-t border-gray-700 px-3 py-3 space-y-2">
                    <div>
                        <span className="text-[10px] uppercase font-semibold text-red-400 tracking-wider">Before</span>
                        <CodeBlock code={issue.before} />
                    </div>
                    <div>
                        <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">After</span>
                        <CodeBlock code={issue.after} />
                    </div>
                    {codebasePath && (
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

function IssuesList({ issues, codebasePath, applyChange, appliedChanges, readOnly }: {
    issues: EngineerOutput['issues'];
    codebasePath: string | null;
    applyChange: ApplyFn;
    appliedChanges: Set<string>;
    readOnly: boolean;
}) {
    const grouped = new Map<string, EngineerOutput['issues']>();
    for (const issue of issues) {
        const existing = grouped.get(issue.file) ?? [];
        existing.push(issue);
        grouped.set(issue.file, existing);
    }

    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    const sortedGroups = [...grouped.entries()].sort((a, b) => {
        const aMin = Math.min(...a[1].map((i) => priorityOrder[i.priority]));
        const bMin = Math.min(...b[1].map((i) => priorityOrder[i.priority]));
        return aMin - bMin;
    });

    return (
        <div className="space-y-4">
            {sortedGroups.map(([file, fileIssues]) => (
                <div key={file}>
                    <h4 className="text-sm font-medium text-gray-200 font-mono mb-2">{file}</h4>
                    <div className="space-y-1.5">
                        {fileIssues.map((issue, i) => (
                            <IssueCard
                                key={`${issue.file}-${issue.line}-${i}`}
                                issue={issue}
                                codebasePath={codebasePath}
                                applyChange={applyChange}
                                isApplied={appliedChanges.has(issueKey(issue))}
                                readOnly={readOnly}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function TestCoverageMap({ coverageMap }: { coverageMap: EngineerOutput['testCoverageMap'] }) {
    const sorted = [...coverageMap].sort((a, b) => {
        if (a.hasTests === b.hasTests) return a.file.localeCompare(b.file);
        return a.hasTests ? 1 : -1;
    });

    const testedCount = coverageMap.filter((f) => f.hasTests).length;
    const totalCount = coverageMap.length;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">
                    {testedCount} of {totalCount} files have tests
                </span>
                <span className={`font-mono text-xs ${getScoreTextColor(testedCount, totalCount)}`}>
                    ({totalCount > 0 ? Math.round((testedCount / totalCount) * 100) : 0}%)
                </span>
            </div>
            <div className="space-y-1">
                {sorted.map((entry) => (
                    <div key={entry.file} className="flex items-center gap-2 text-sm">
                        <span className={`text-base ${entry.hasTests ? 'text-emerald-400' : 'text-red-400'}`}>
                            {entry.hasTests ? '✓' : '✗'}
                        </span>
                        <span className="font-mono text-xs text-gray-300">{entry.file}</span>
                        {entry.testFile && (
                            <>
                                <span className="text-gray-600">→</span>
                                <span className="font-mono text-xs text-gray-500">{entry.testFile}</span>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function SuggestedTestCard({ test, codebasePath, applyChange, isApplied, readOnly }: {
    test: EngineerOutput['suggestedTests'][number];
    codebasePath: string | null;
    applyChange: ApplyFn;
    isApplied: boolean;
    readOnly: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [status, setStatus] = useState<ApplyStatus>(isApplied ? 'applied' : 'idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleApply = async () => {
        if (!codebasePath) return;
        setStatus('applying');
        setErrorMsg(null);
        const res = await applyChange({
            codebasePath,
            type: 'test-file',
            file: test.file,
            targetTestFile: test.targetTestFile,
            testCode: test.testCode,
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
                <span className="text-purple-400 text-sm mt-0.5">λ</span>
                <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-200 font-mono">{test.functionName}</span>
                    <span className="text-xs text-gray-500 ml-2">in {test.file}</span>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">→ {test.targetTestFile}</div>
                </div>
                <span className="text-gray-500 text-xs mt-1 shrink-0">
                    {expanded ? '▲' : '▼'}
                </span>
            </button>
            {expanded && (
                <div className="border-t border-gray-700 px-3 py-3 space-y-2">
                    <CodeBlock code={test.testCode} />
                    {codebasePath && (
                        <div className="pt-1">
                            <ApplyButton
                                status={status}
                                label="Write Test"
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

function SuggestedTests({ tests, codebasePath, applyChange, appliedChanges, readOnly }: {
    tests: EngineerOutput['suggestedTests'];
    codebasePath: string | null;
    applyChange: ApplyFn;
    appliedChanges: Set<string>;
    readOnly: boolean;
}) {
    if (tests.length === 0) {
        return <p className="text-sm text-gray-500">No test suggestions available.</p>;
    }

    return (
        <div className="space-y-1.5">
            {tests.map((test, i) => (
                <SuggestedTestCard
                    key={`${test.file}-${test.functionName}-${i}`}
                    test={test}
                    codebasePath={codebasePath}
                    applyChange={applyChange}
                    isApplied={appliedChanges.has(testKey(test))}
                    readOnly={readOnly}
                />
            ))}
        </div>
    );
}

export function EngineerReport({ report, codebasePath, applyChange, appliedChanges, readOnly = false }: EngineerReportProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SectionPanel title="Quality Scorecard">
                    <QualityScorecard
                        overallScore={report.overallScore}
                        categoryScores={report.categoryScores}
                    />
                </SectionPanel>

                <SectionPanel title="Priority Breakdown">
                    <div className="space-y-4">
                        <PriorityBreakdown issues={report.issues} />
                        <div className="text-sm text-gray-400">
                            {report.issues.length} issue{report.issues.length !== 1 ? 's' : ''} found across{' '}
                            {new Set(report.issues.map((i) => i.file)).size} file{new Set(report.issues.map((i) => i.file)).size !== 1 ? 's' : ''}
                        </div>
                    </div>
                </SectionPanel>
            </div>

            <SectionPanel title="Issues">
                <IssuesList
                    issues={report.issues}
                    codebasePath={codebasePath}
                    applyChange={applyChange}
                    appliedChanges={appliedChanges}
                    readOnly={readOnly}
                />
            </SectionPanel>

            <SectionPanel title="Test Coverage">
                <TestCoverageMap coverageMap={report.testCoverageMap} />
            </SectionPanel>

            <SectionPanel title="Suggested Tests">
                <SuggestedTests
                    tests={report.suggestedTests}
                    codebasePath={codebasePath}
                    applyChange={applyChange}
                    appliedChanges={appliedChanges}
                    readOnly={readOnly}
                />
            </SectionPanel>
        </div>
    );
}
