import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
    CacheManifest,
    CachedSession,
    CodeFile,
    FinalReport,
    SSEEmitter,
} from '../types/codebase.types.js';

const CACHE_ROOT = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../cache/data',
);

function hashPath(inputPath: string): string {
    const normalized = path.resolve(inputPath);
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

function getCacheDir(pathHash: string): string {
    return path.join(CACHE_ROOT, pathHash);
}

function buildManifest(absolutePath: string, files: CodeFile[]): CacheManifest {
    return {
        path: path.resolve(absolutePath),
        analyzedAt: new Date().toISOString(),
        fileCount: files.length,
        files: files.map((file) => ({
            name: file.name,
            lastModified: file.lastModified,
            size: file.size,
        })),
    };
}

function manifestsMatch(cached: CacheManifest, current: CacheManifest): boolean {
    if (cached.fileCount !== current.fileCount) return false;
    if (cached.files.length !== current.files.length) return false;

    const cachedByName = new Map(cached.files.map((file) => [file.name, file]));

    for (const file of current.files) {
        const cachedFile = cachedByName.get(file.name);
        if (!cachedFile) return false;
        if (cachedFile.lastModified !== file.lastModified) return false;
        if (cachedFile.size !== file.size) return false;
    }

    return true;
}

async function loadManifest(pathHash: string): Promise<CacheManifest | null> {
    try {
        const raw = await fs.readFile(path.join(getCacheDir(pathHash), 'manifest.json'), 'utf8');
        return JSON.parse(raw) as CacheManifest;
    } catch {
        return null;
    }
}

async function isCacheValid(pathHash: string, currentManifest: CacheManifest): Promise<boolean> {
    const cachedManifest = await loadManifest(pathHash);
    if (!cachedManifest) return false;
    return manifestsMatch(cachedManifest, currentManifest);
}

async function load(pathHash: string): Promise<CachedSession | null> {
    const cacheDir = getCacheDir(pathHash);

    try {
        const [manifestRaw, explorerRaw, engineerRaw, securityRaw, finalReportRaw] = await Promise.all([
            fs.readFile(path.join(cacheDir, 'manifest.json'), 'utf8'),
            fs.readFile(path.join(cacheDir, 'explorer.json'), 'utf8'),
            fs.readFile(path.join(cacheDir, 'engineer.json'), 'utf8'),
            fs.readFile(path.join(cacheDir, 'security.json'), 'utf8'),
            fs.readFile(path.join(cacheDir, 'finalReport.json'), 'utf8'),
        ]);

        return {
            manifest: JSON.parse(manifestRaw) as CacheManifest,
            explorerReport: JSON.parse(explorerRaw),
            engineerReport: JSON.parse(engineerRaw),
            securityReport: JSON.parse(securityRaw),
            finalReport: JSON.parse(finalReportRaw) as FinalReport,
        };
    } catch {
        return null;
    }
}

async function save(pathHash: string, session: CachedSession): Promise<void> {
    const cacheDir = getCacheDir(pathHash);
    await fs.mkdir(cacheDir, { recursive: true });

    await Promise.all([
        fs.writeFile(path.join(cacheDir, 'manifest.json'), JSON.stringify(session.manifest, null, 2)),
        fs.writeFile(path.join(cacheDir, 'explorer.json'), JSON.stringify(session.explorerReport, null, 2)),
        fs.writeFile(path.join(cacheDir, 'engineer.json'), JSON.stringify(session.engineerReport, null, 2)),
        fs.writeFile(path.join(cacheDir, 'security.json'), JSON.stringify(session.securityReport, null, 2)),
        fs.writeFile(path.join(cacheDir, 'finalReport.json'), JSON.stringify(session.finalReport, null, 2)),
    ]);
}

async function replayCached(pathHash: string, emit: SSEEmitter): Promise<FinalReport> {
    const session = await load(pathHash);
    if (!session) {
        throw new Error('Cached session not found');
    }

    await wait(1000); // to simulate the time it takes to run the agent
    emit('status', { agent: 'explorer', status: 'running' });
    if (session.explorerReport) {
        await wait(2000);
        emit('result', { agent: 'explorer', data: session.explorerReport });
        emit('status', { agent: 'explorer', status: 'done' });

        emit('status', { agent: 'engineer', status: 'running' });
        emit('status', { agent: 'security', status: 'running' });

        const engineerPromise = session.engineerReport
            ? wait(1000).then(() => {
                emit('result', { agent: 'engineer', data: session.engineerReport });
                emit('status', { agent: 'engineer', status: 'done' });
            })
            : Promise.resolve().then(() => {
                emit('status', { agent: 'engineer', status: 'failed' });
            });

        const securityPromise = session.securityReport
            ? wait(1000).then(() => {
                emit('result', { agent: 'security', data: session.securityReport });
                emit('status', { agent: 'security', status: 'done' });
            })
            : Promise.resolve().then(() => {
                emit('status', { agent: 'security', status: 'failed' });
            });

        await Promise.all([engineerPromise, securityPromise]);
    } else {
        emit('status', { agent: 'explorer', status: 'failed' });
    }

    return session.finalReport;
}

async function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export {
    hashPath,
    buildManifest,
    isCacheValid,
    load,
    save,
    replayCached,
};
