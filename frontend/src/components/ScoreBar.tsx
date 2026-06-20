interface ScoreBarProps {
    score: number;
    max: number;
    label: string;
    showValue?: boolean;
}

function getColor(ratio: number): string {
    if (ratio >= 0.7) return 'bg-red-500';
    if (ratio >= 0.4) return 'bg-amber-500';
    return 'bg-emerald-500';
}

export function ScoreBar({ score, max, label, showValue = true }: ScoreBarProps) {
    const ratio = score / max;
    const pct = Math.round(ratio * 100);

    return (
        <div className="flex items-center gap-3">
            <span title={label} className="w-40 shrink-0 text-sm text-gray-300 truncate">{label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-gray-700">
                <div
                    className={`h-2.5 rounded-full transition-all ${getColor(ratio)}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            {showValue && (
                <span className="w-12 text-right text-xs font-mono text-gray-400">
                    {score}/{max}
                </span>
            )}
        </div>
    );
}
