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

const EngineerOutputSchema = z.object({
    overallScore: z.number().int().min(0).max(100),
    categoryScores: z.object({
        readability: z.number().int().min(0).max(100),
        testCoverage: z.number().int().min(0).max(100),
        duplication: z.number().int().min(0).max(100),
        patterns: z.number().int().min(0).max(100),
    }),
    issues: z.array(z.object({
        file: z.string(),
        line: z.number(),
        priority: z.enum(["High", "Medium", "Low"]),
        category: z.string(),
        description: z.string(),
        before: z.string(),
        after: z.string(),
    })),
    testCoverageMap: z.array(z.object({
        file: z.string(),
        hasTests: z.boolean(),
        testFile: z.string().nullable(),
    })),
    suggestedTests: z.array(z.object({
        file: z.string(),
        functionName: z.string(),
        targetTestFile: z.string(),
        testCode: z.string(),
    })),
});

type EngineerOutput = z.infer<typeof EngineerOutputSchema>;

const SecurityOutputSchema = z.object({
    riskScore: z.number().int().min(0).max(100),
    summary: z.string(),
    vulnerabilities: z.array(z.object({
        file: z.string(),
        line: z.number(),
        severity: z.enum(["Critical", "High", "Medium", "Low"]),
        owaspCategory: z.string(),
        description: z.string(),
        fix: z.string(),
        before: z.string(),
        after: z.string(),
    })),
    hardcodedSecrets: z.array(z.object({
        file: z.string(),
        line: z.number(),
        type: z.string(),
    })),
    missingAuthGuards: z.array(z.object({
        file: z.string(),
        endpoint: z.string(),
        description: z.string(),
    })),
    insecureDependencies: z.array(z.object({
        package: z.string(),
        version: z.string(),
        reason: z.string(),
    })),
});

type SecurityOutput = z.infer<typeof SecurityOutputSchema>;

export {
    ExplorerOutputSchema,
    ExplorerOutput,
    EngineerOutputSchema,
    EngineerOutput,
    SecurityOutputSchema,
    SecurityOutput
};