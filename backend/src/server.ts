import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { runOrchestrator } from './agents/orchestrator.js';
import { SSEEmitter } from './types/codebase.types.js';
import { readCodebase } from './core/fileReader.js';

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
