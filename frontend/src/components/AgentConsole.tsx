import type { AgentName, AgentState } from '../types/agent.types';
import { AgentCard } from './AgentCard';

export type TabName = AgentName | 'report';

interface AgentConsoleProps {
    agents: AgentState[];
    activeTab: TabName;
    onTabChange: (tab: TabName) => void;
    hasReport: boolean;
}

export function AgentConsole({ agents, activeTab, onTabChange, hasReport }: AgentConsoleProps) {
    return (
        <div className="flex gap-3 flex-wrap">
            {agents.map((agent) => (
                <AgentCard
                    key={agent.name}
                    agent={agent}
                    isActive={activeTab === agent.name}
                    onClick={() => onTabChange(agent.name)}
                />
            ))}
            <button
                onClick={() => onTabChange('report')}
                disabled={!hasReport}
                className={`
                    flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all
                    ${activeTab === 'report'
                        ? 'border-blue-500 bg-blue-950/30'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }
                    ${!hasReport ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                <span className="text-xl">📋</span>
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-white">Final Report</span>
                    <span className={`text-xs ${hasReport ? 'text-emerald-300' : 'text-gray-500'}`}>
                        {hasReport ? 'Ready' : 'Locked'}
                    </span>
                </div>
            </button>
        </div>
    );
}
