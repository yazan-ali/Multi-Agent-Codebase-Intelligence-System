import express, { Application, NextFunction, Request, Response } from 'express';
import { readCodebase } from './core/fileReader';

const app: Application = express();
const PROT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ message: 'Server is running' });
});

app.post('/api/analyze', (req: Request, res: Response) => {
    const path = req.body?.path;

    if (!path) {
        return res.status(400).json({
            message: 'Path is required',
            example: { path: 'D:/Assignment' },
        });
    }

    try {
        const codebaseTree = readCodebase(path);
        return res.status(200).json({ message: 'Codebase tree read successfully', codebaseTree });
    } catch (err: any) {
        return res.status(400).json({ message: err.message });
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

app.listen(PROT, () => {
    console.log(`Server is running on port ${PROT}`);
});