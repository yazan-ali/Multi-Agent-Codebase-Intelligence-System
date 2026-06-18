import pathModule from 'path';

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage'];

const IGNORED_FILES = ['.env', '.env.local', '.env.production', 'package-lock.json'];

const BINARY_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
    '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.exe', '.dll', '.so', '.dylib', '.bin',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.lock',
];

export function isIgnored(filePath: string): boolean {
    const segments = filePath.replace(/\\/g, '/').split('/');
    const fileName = pathModule.basename(filePath);
    const ext = pathModule.extname(filePath).toLowerCase();

    if (segments.some((segment) => IGNORED_DIRS.includes(segment))) {
        return true;
    }

    if (IGNORED_FILES.includes(fileName)) {
        return true;
    }

    if (BINARY_EXTENSIONS.includes(ext)) {
        return true;
    }

    return false;
}
