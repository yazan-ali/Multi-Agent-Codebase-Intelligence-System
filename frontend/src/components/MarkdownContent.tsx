import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
    content: string;
    className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
    return (
        <div className={`space-y-3 text-sm leading-relaxed ${className}`}>
            <ReactMarkdown
                components={{
                    h2: ({ children }) => (
                        <h2 className="text-base font-semibold text-gray-100 mt-4 first:mt-0 mb-2">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-sm font-semibold text-gray-200 mt-3 mb-1">{children}</h3>
                    ),
                    p: ({ children }) => <p className="text-gray-300">{children}</p>,
                    ul: ({ children }) => (
                        <ul className="list-disc space-y-1.5 pl-5 text-gray-300">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal space-y-1.5 pl-5 text-gray-300">{children}</ol>
                    ),
                    li: ({ children }) => <li className="text-gray-300">{children}</li>,
                    strong: ({ children }) => (
                        <strong className="font-semibold text-gray-100">{children}</strong>
                    ),
                    code: ({ children }) => (
                        <code className="rounded bg-gray-800 px-1.5 py-0.5 text-xs font-mono text-blue-300">
                            {children}
                        </code>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
