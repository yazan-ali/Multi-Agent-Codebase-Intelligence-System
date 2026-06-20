import type { FinalReport as FinalReportType } from '../../types/agent.types';
import { SectionPanel } from '../SectionPanel';
import { StatusBadge } from '../StatusBadge';
import { MarkdownContent } from '../MarkdownContent';

interface FinalReportProps {
    report: FinalReportType;
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
                    <ul className="space-y-2">
                        {report.topPriorityIssues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                <span className="text-amber-400 font-mono shrink-0">{i + 1}.</span>
                                <span className="font-mono text-xs bg-gray-800 rounded px-2 py-0.5">{issue}</span>
                            </li>
                        ))}
                    </ul>
                </SectionPanel>
            )}
        </div>
    );
}
