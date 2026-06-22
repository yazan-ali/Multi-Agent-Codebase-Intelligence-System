import path from 'path'

export function resolveSafeFile(root: string, relativePath: string): string {
    const resolved = path.resolve(root, relativePath);
    const normalizedRoot = path.resolve(root) + path.sep;
    if (!resolved.startsWith(normalizedRoot) && resolved !== path.resolve(root)) {
        throw new Error('Path escapes codebase root');
    }
    return resolved;
}