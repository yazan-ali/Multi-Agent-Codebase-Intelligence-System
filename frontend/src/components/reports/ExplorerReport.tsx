import type { ExplorerOutput } from '../../types/agent.types';
import { SectionPanel } from '../SectionPanel';
import { ScoreBar } from '../ScoreBar';
import { DependencyGraph } from '../DependencyGraph';
import { MarkdownContent } from '../MarkdownContent';

interface ExplorerReportProps {
    report: ExplorerOutput;
}

function StackBadges({ stack }: { stack: ExplorerOutput['stack'] }) {
    const groups = [
        { label: 'Languages', items: stack.languages, color: 'border-blue-600 bg-blue-900/30 text-blue-200' },
        { label: 'Frameworks', items: stack.frameworks, color: 'border-purple-600 bg-purple-900/30 text-purple-200' },
        { label: 'Libraries', items: stack.libraries, color: 'border-gray-600 bg-gray-800 text-gray-200' },
        { label: 'Testing', items: stack.testFrameworks, color: 'border-pink-600 bg-pink-900/30 text-pink-200' },
    ].filter((g) => g.items.length > 0);

    return (
        <div className="space-y-2">
            {groups.map((group) => (
                <div key={group.label} className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 w-20 shrink-0">{group.label}</span>
                    {group.items.map((item) => (
                        <span
                            key={item}
                            className={`rounded-full border px-3 py-0.5 text-xs font-medium ${group.color}`}
                        >
                            {item}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}

function ArchitectureLayers({ layers }: { layers: ExplorerOutput['architectureLayers'] }) {
    return (
        <div className="space-y-3">
            {layers.map((layer) => (
                <div key={layer.layer}>
                    <h4 className="text-sm font-medium text-gray-200 mb-1">{layer.layer}</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {layer.files.map((file) => (
                            <span key={file} className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400 font-mono">
                                {file}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function FileComplexity({ files }: { files: ExplorerOutput['fileComplexity'] }) {
    const sortedFiles = [...files].sort((a, b) => b.score - a.score);

    return (
        <div className="space-y-2.5">
            {sortedFiles.map((file) => (
                <div key={file.file}>
                    <ScoreBar score={file.score} max={10} label={file.file} />
                    <p className="mt-0.5 ml-43 text-xs text-gray-500">{file.reason}</p>
                </div>
            ))}
        </div>
    );
}

function EntryPoints({ entries }: { entries: string[] }) {
    return (
        <div className="flex flex-wrap gap-2">
            {entries.map((entry) => (
                <span key={entry} className="rounded bg-blue-900/30 border border-blue-700/50 px-2.5 py-1 text-xs text-blue-300 font-mono">
                    {entry}
                </span>
            ))}
        </div>
    );
}

function HighCouplingFlags({ flags }: { flags: string[] }) {
    if (flags.length === 0) {
        return <p className="text-sm text-gray-500">No high coupling detected.</p>;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {flags.map((flag) => (
                <span key={flag} className="rounded bg-amber-900/30 border border-amber-700/50 px-2.5 py-1 text-xs text-amber-300 font-mono">
                    {flag}
                </span>
            ))}
        </div>
    );
}

export function ExplorerReport({ report }: ExplorerReportProps) {
    return (
        <div className="space-y-4">
            <SectionPanel title="Tech Stack">
                <StackBadges stack={report.stack} />
            </SectionPanel>

            <SectionPanel title="Architecture Summary">
                <MarkdownContent content={report.architectureSummary} />
            </SectionPanel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SectionPanel title="Entry Points">
                    <EntryPoints entries={report.entryPoints} />
                </SectionPanel>

                <SectionPanel title="High Coupling Flags">
                    <HighCouplingFlags flags={report.highCouplingFlags} />
                </SectionPanel>
            </div>

            <SectionPanel title="Dependency Graph">
                <DependencyGraph
                    dependencyMap={report.dependencyMap}
                    architectureLayers={report.architectureLayers}
                    fileComplexity={report.fileComplexity}
                    entryPoints={report.entryPoints}
                />
            </SectionPanel>

            <SectionPanel title="Architecture Layers">
                <ArchitectureLayers layers={report.architectureLayers} />
            </SectionPanel>

            <SectionPanel title="File Complexity">
                <FileComplexity files={report.fileComplexity} />
            </SectionPanel>
        </div>
    );
}
