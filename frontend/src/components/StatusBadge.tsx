import type { AgentStatus } from '../types/agent.types';

const STATUS_CONFIG: Record<AgentStatus, { label: string; bg: string; text: string; dot: string }> = {
    idle: { label: 'Idle', bg: 'bg-gray-800', text: 'text-gray-400', dot: 'bg-gray-500' },
    running: { label: 'Running...', bg: 'bg-blue-900/40', text: 'text-blue-300', dot: 'bg-blue-400 animate-pulse' },
    done: { label: 'Done', bg: 'bg-emerald-900/40', text: 'text-emerald-300', dot: 'bg-emerald-400' },
    failed: { label: 'Failed', bg: 'bg-red-900/40', text: 'text-red-300', dot: 'bg-red-400' },
};

interface StatusBadgeProps {
    status: AgentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status];

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            {config.label}
        </span>
    );
}
