import type { ReactNode } from 'react';

interface SectionPanelProps {
    title: string;
    children: ReactNode;
    className?: string;
}

export function SectionPanel({ title, children, className = '' }: SectionPanelProps) {
    return (
        <div className={`rounded-lg border border-gray-700 bg-gray-900 ${className}`}>
            <div className="border-b border-gray-700 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}
