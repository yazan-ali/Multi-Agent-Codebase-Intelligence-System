import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import 'dotenv/config';
import { runOrchestrator } from './agents/orchestrator.js';
import { SSEEmitter } from './types/codebase.types.js';
import { readCodebase } from './core/fileReader.js';
import { runApplyFix } from './agents/applyFixAgent.js';
import { resolveSafeFile } from './helpers/helpers.js';

const app: Application = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});

app.post('/api/analyze', async (req: Request, res: Response) => {
    const path = req.body?.path;

    if (!path) {
        return res.status(400).json({ message: 'Path is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const emit: SSEEmitter = (event: string, data: unknown) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
        const codebaseFiles = readCodebase(path);
        const finalReport = await runOrchestrator(path, codebaseFiles, emit);
        emit("complete", { finalReport });
        res.end();
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed';
        emit("error", { message });
        res.end();
    }
});

app.post('/api/apply-change', async (req: Request, res: Response) => {
    const { codebasePath, type, file, before, after, description, targetTestFile, testCode } = req.body ?? {};

    if (!codebasePath || !type) {
        return res.status(400).json({ success: false, file: '', message: 'codebasePath and type are required' });
    }

    try {
        const rootStat = await fs.stat(codebasePath);
        if (!rootStat.isDirectory()) {
            return res.status(400).json({ success: false, file: '', message: 'codebasePath is not a directory' });
        }
    } catch {
        return res.status(400).json({ success: false, file: '', message: 'codebasePath does not exist' });
    }

    try {
        if (type === 'issue-fix') {
            if (!file || !before || !after) {
                return res.status(400).json({ success: false, file: file ?? '', message: 'file, before, and after are required for issue-fix' });
            }

            const absolutePath = resolveSafeFile(codebasePath, file);
            const fileContent = await fs.readFile(absolutePath, 'utf8');

            const corrected = await runApplyFix({
                mode: 'issue-fix',
                fileContent,
                filePath: file,
                description: description ?? '',
                before,
                after,
            });

            if (!corrected || corrected.trim().length === 0) {
                return res.json({ success: false, file, message: 'Apply agent returned empty content — fix not applied' });
            }

            await fs.writeFile(absolutePath, corrected, 'utf8');
            return res.json({ success: true, file, message: 'Fix applied successfully' });

        } else if (type === 'test-file') {
            if (!targetTestFile || !testCode) {
                return res.status(400).json({ success: false, file: targetTestFile ?? '', message: 'targetTestFile and testCode are required for test-file' });
            }

            const absolutePath = resolveSafeFile(codebasePath, targetTestFile);

            let exists = false;
            try {
                await fs.access(absolutePath);
                exists = true;
            } catch { /* file does not exist */ }

            if (exists) {
                const existing = await fs.readFile(absolutePath, 'utf8');
                const merged = await runApplyFix({
                    mode: 'test-merge',
                    filePath: targetTestFile,
                    fileContent: existing,
                    newTestCode: testCode,
                });

                if (!merged || merged.trim().length === 0) {
                    return res.json({ success: false, file: targetTestFile, message: 'Merge agent returned empty content — test not applied' });
                }

                await fs.writeFile(absolutePath, merged, 'utf8');
                return res.json({ success: true, file: targetTestFile, message: 'Test code merged into existing file' });
            } else {
                await fs.mkdir(path.dirname(absolutePath), { recursive: true });
                await fs.writeFile(absolutePath, testCode, 'utf8');
                return res.json({ success: true, file: targetTestFile, message: 'Test file created' });
            }

        } else {
            return res.status(400).json({ success: false, file: '', message: `Unknown type: ${type}` });
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Apply failed';
        return res.status(500).json({ success: false, file: file ?? targetTestFile ?? '', message });
    }
});

app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            message: 'Invalid JSON in request body',
        });
    }

    next(err);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
