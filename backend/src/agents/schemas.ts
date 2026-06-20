import { z } from 'zod';

const ExplorerOutputSchema = z.object({
    stack: z.object({
        languages: z.array(z.string()).min(1),
        frameworks: z.array(z.string()),
        libraries: z.array(z.string()),
        testFrameworks: z.array(z.string()),
    }),
    entryPoints: z.array(z.string()).min(1),
    dependencyMap: z.record(z.string(), z.array(z.string())),
    architectureLayers: z.array(
        z.object({
            layer: z.string(),
            files: z.array(z.string()),
        })
    ),
    fileComplexity: z.array(
        z.object({
            file: z.string(),
            score: z.number().int().min(1).max(10),
            reason: z.string(),
        })
    ),
    architectureSummary: z.string(),
    highCouplingFlags: z.array(z.string()),
});

type ExplorerOutput = z.infer<typeof ExplorerOutputSchema>;

export { ExplorerOutputSchema, ExplorerOutput };