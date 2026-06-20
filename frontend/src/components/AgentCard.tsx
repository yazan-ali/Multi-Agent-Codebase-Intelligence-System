import type { AgentState } from '../types/agent.types';
import { StatusBadge } from './StatusBadge';

const AGENT_ICONS: Record<string, string> = {
    explorer: '🗺️',
    engineer: '🔧',
    security: '🔒',
};

interface AgentCardProps {
    agent: AgentState;
    isActive: boolean;
    onClick: () => void;
}

export function AgentCard({ agent, isActive, onClick }: AgentCardProps) {
    return (
        <button
            onClick={onClick}
            disabled={agent.status === 'idle'}
            className={`
                flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all
                ${isActive
                    ? 'border-blue-500 bg-blue-950/30'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                }
                ${agent.status === 'idle' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            <span className="text-xl">{AGENT_ICONS[agent.name] ?? '🤖'}</span>
            <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-white">{agent.label}</span>
                <StatusBadge status={agent.status} />
            </div>
        </button>
    );
}
