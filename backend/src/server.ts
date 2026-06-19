import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { runExplorer } from './agents/explorer.js';
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

    try {
        const files = readCodebase(path);
        const explorerReport = await runExplorer(files);

        return res.status(200).json({
            message: 'Explorer analysis complete',
            fileCount: files.length,
            explorerReport,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed';
        const status = message.includes('GEMINI_API_KEY') ? 503 : 400;
        return res.status(status).json({ message });
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
