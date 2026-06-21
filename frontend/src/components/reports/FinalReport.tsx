import type { FinalReport as FinalReportType, Issue } from '../../types/agent.types';
import { SectionPanel } from '../SectionPanel';
import { StatusBadge } from '../StatusBadge';
import { MarkdownContent } from '../MarkdownContent';

interface FinalReportProps {
    report: FinalReportType;
}

const SEVERITY_STYLES = {
    Critical: 'border-rose-500 bg-rose-900/30 text-rose-300',
    High: 'border-red-600 bg-red-900/30 text-red-300',
    Medium: 'border-amber-600 bg-amber-900/30 text-amber-300',
    Low: 'border-gray-600 bg-gray-800 text-gray-300',
} as const;

const SOURCE_STYLES = {
    explorer: 'text-blue-300 bg-blue-900/30 border-blue-700/50',
    engineer: 'text-purple-300 bg-purple-900/30 border-purple-700/50',
    security: 'text-red-300 bg-red-900/30 border-red-700/50',
} as const;

function IssueRow({ issue, index }: { issue: Issue; index: number }) {
    return (
        <li className="flex items-start gap-3 text-sm">
            <span className="text-amber-400 font-mono shrink-0 mt-0.5 w-5 text-right">{index}.</span>
            <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_STYLES[issue.severity]}`}>
                {issue.severity}
            </span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-gray-300">
                        {issue.file}{issue.line != null ? `:${issue.line}` : ''}
                    </span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] capitalize ${SOURCE_STYLES[issue.source]}`}>
                        {issue.source}
                    </span>
                </div>
                <p className="text-gray-400 mt-0.5">{issue.description}</p>
            </div>
        </li>
    );
}

export function FinalReport({ report }: FinalReportProps) {
    return (
        <div className="space-y-4">
            <SectionPanel title="Executive Summary">
                <MarkdownContent content={report.executiveSummary} />
            </SectionPanel>

            <SectionPanel title="Agent Status">
                <div className="flex gap-4">
                    {Object.entries(report.agentStatus).map(([agent, status]) => (
                        <div key={agent} className="flex items-center gap-2">
                            <span className="text-sm text-gray-300 capitalize">{agent}</span>
                            <StatusBadge status={status} />
                        </div>
                    ))}
                </div>
            </SectionPanel>

            {report.topPriorityIssues.length > 0 && (
                <SectionPanel title="Top Priority Issues">
                    <ul className="space-y-3">
                        {report.topPriorityIssues.map((issue, i) => (
                            <IssueRow key={`${issue.file}-${issue.line}-${i}`} issue={issue} index={i + 1} />
                        ))}
                    </ul>
                </SectionPanel>
            )}
        </div>
    );
}
