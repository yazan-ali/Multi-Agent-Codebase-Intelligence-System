import { useState, type FormEvent } from 'react';

interface PathInputProps {
    onAnalyze: (path: string) => void;
    isAnalyzing: boolean;
}

export function PathInput({ onAnalyze, isAnalyzing }: PathInputProps) {
    const [path, setPath] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = path.trim();
        if (trimmed) onAnalyze(trimmed);
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-3">
            <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="Enter folder path, e.g. D:/projects/my-api"
                className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 transition-colors"
                disabled={isAnalyzing}
            />
            <button
                type="submit"
                disabled={isAnalyzing || !path.trim()}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
        </form>
    );
}
