import { useMemo, useCallback, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type Node,
    type Edge,
    type NodeMouseHandler,
    Position,
    useNodesState,
    useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ExplorerOutput } from '../types/agent.types';

const LAYER_COLORS: Record<string, string> = {
    'UI': '#3b82f6',
    'Frontend': '#3b82f6',
    'Presentation': '#3b82f6',
    'Logic': '#8b5cf6',
    'Business Logic': '#8b5cf6',
    'Services': '#8b5cf6',
    'Core': '#8b5cf6',
    'Data': '#10b981',
    'Database': '#10b981',
    'Infrastructure': '#f59e0b',
    'Config': '#f59e0b',
    'Configuration': '#f59e0b',
    'Utilities': '#6b7280',
    'Utils': '#6b7280',
    'Testing': '#ec4899',
    'Tests': '#ec4899',
};

function getLayerColor(layerName: string): string {
    for (const [key, color] of Object.entries(LAYER_COLORS)) {
        if (layerName.toLowerCase().includes(key.toLowerCase())) return color;
    }
    return '#6b7280';
}

function getNodeSize(complexityScore: number): { width: number; height: number } {
    const base = 160;
    const scale = 1 + (complexityScore / 10) * 0.5;
    return { width: Math.round(base * scale), height: 36 };
}

function shortenPath(filePath: string): string {
    const parts = filePath.split('/');
    if (parts.length <= 2) return filePath;
    return '.../' + parts.slice(-2).join('/');
}

const NODE_X_GAP = 240;
const LEVEL_Y_GAP = 110;

interface DependencyGraphProps {
    dependencyMap: ExplorerOutput['dependencyMap'];
    architectureLayers: ExplorerOutput['architectureLayers'];
    fileComplexity: ExplorerOutput['fileComplexity'];
    entryPoints: string[];
}

/**
 * BFS from entry points to assign each file a depth level.
 * Entry points = level 0, their imports = level 1, etc.
 * If a file is reachable at multiple depths, it takes the deepest
 * so that it sits below everything that imports it.
 */
function assignLevels(
    entryPoints: string[],
    dependencyMap: Record<string, string[]>,
    allFiles: Set<string>,
): Map<string, number> {
    const levels = new Map<string, number>();
    const queue: string[] = [];

    for (const entry of entryPoints) {
        if (allFiles.has(entry)) {
            levels.set(entry, 0);
            queue.push(entry);
        }
    }

    // Fallback: if no entry points matched, use root files (never imported by anyone)
    if (queue.length === 0) {
        const imported = new Set<string>();
        for (const targets of Object.values(dependencyMap)) {
            for (const t of targets) imported.add(t);
        }
        for (const file of allFiles) {
            if (!imported.has(file)) {
                levels.set(file, 0);
                queue.push(file);
            }
        }
    }

    // Still nothing? Just pick the first file
    if (queue.length === 0 && allFiles.size > 0) {
        const first = allFiles.values().next().value as string;
        levels.set(first, 0);
        queue.push(first);
    }

    // BFS — push children deeper
    while (queue.length > 0) {
        const current = queue.shift()!;
        const currentLevel = levels.get(current)!;
        const children = dependencyMap[current] ?? [];

        for (const child of children) {
            if (!allFiles.has(child)) continue;
            const existingLevel = levels.get(child);
            // Place child at least one level below parent
            if (existingLevel === undefined || existingLevel < currentLevel + 1) {
                levels.set(child, currentLevel + 1);
                queue.push(child);
            }
        }
    }

    // Orphans go to the bottom
    let maxLevel = 0;
    for (const lvl of levels.values()) maxLevel = Math.max(maxLevel, lvl);
    for (const file of allFiles) {
        if (!levels.has(file)) {
            levels.set(file, maxLevel + 1);
        }
    }

    return levels;
}

function buildGraph(
    dependencyMap: ExplorerOutput['dependencyMap'],
    architectureLayers: ExplorerOutput['architectureLayers'],
    fileComplexity: ExplorerOutput['fileComplexity'],
    entryPoints: string[],
): { nodes: Node[]; edges: Edge[] } {
    const fileToLayer = new Map<string, string>();
    for (const layer of architectureLayers) {
        for (const file of layer.files) {
            fileToLayer.set(file, layer.layer);
        }
    }

    const complexityMap = new Map<string, number>();
    for (const fc of fileComplexity) {
        complexityMap.set(fc.file, fc.score);
    }

    const allFiles = new Set<string>();
    for (const [source, targets] of Object.entries(dependencyMap)) {
        allFiles.add(source);
        for (const t of targets) allFiles.add(t);
    }

    const levels = assignLevels(entryPoints, dependencyMap, allFiles);
    const entrySet = new Set(entryPoints);

    // Group files by level and sort within each level for consistency
    const levelGroups = new Map<number, string[]>();
    for (const [file, level] of levels) {
        if (!levelGroups.has(level)) levelGroups.set(level, []);
        levelGroups.get(level)!.push(file);
    }
    for (const files of levelGroups.values()) {
        files.sort();
    }

    // Position nodes: centered per level, flowing top-to-bottom
    const nodes: Node[] = [];
    for (const [level, files] of levelGroups) {
        const totalWidth = files.length * NODE_X_GAP;
        const startX = -totalWidth / 2 + NODE_X_GAP / 2;

        files.forEach((file, i) => {
            const layer = fileToLayer.get(file) ?? 'Other';
            const color = getLayerColor(layer);
            const score = complexityMap.get(file) ?? 3;
            const size = getNodeSize(score);
            const isEntry = entrySet.has(file);

            nodes.push({
                id: file,
                position: {
                    x: startX + i * NODE_X_GAP,
                    y: level * LEVEL_Y_GAP,
                },
                data: { label: shortenPath(file) },
                sourcePosition: Position.Bottom,
                targetPosition: Position.Top,
                style: {
                    background: `${color}20`,
                    border: `${isEntry ? 2.5 : 1.5}px solid ${color}`,
                    borderRadius: '8px',
                    color: '#e5e7eb',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    padding: '6px 12px',
                    width: size.width,
                    height: size.height,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isEntry ? `0 0 14px ${color}50` : 'none',
                },
            });
        });
    }

    // Edges flow top → bottom; back-edges (circular) are dashed red
    const edges: Edge[] = [];
    for (const [source, targets] of Object.entries(dependencyMap)) {
        for (const target of targets) {
            if (!allFiles.has(target)) continue;

            const sourceLevel = levels.get(source) ?? 0;
            const targetLevel = levels.get(target) ?? 0;
            const isBackEdge = targetLevel <= sourceLevel;

            edges.push({
                id: `${source}->${target}`,
                source,
                target,
                animated: isBackEdge,
                style: {
                    stroke: isBackEdge ? '#ef4444' : '#4b556380',
                    strokeWidth: isBackEdge ? 2 : 1.5,
                    strokeDasharray: isBackEdge ? '5 3' : undefined,
                },
            });
        }
    }

    return { nodes, edges };
}

export function DependencyGraph({ dependencyMap, architectureLayers, fileComplexity, entryPoints }: DependencyGraphProps) {
    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => buildGraph(dependencyMap, architectureLayers, fileComplexity, entryPoints),
        [dependencyMap, architectureLayers, fileComplexity, entryPoints],
    );

    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
        setSelectedFile((prev) => (prev === node.id ? null : node.id));
    }, []);

    const selectedData = useMemo(() => {
        if (!selectedFile) return null;
        const complexity = fileComplexity.find((f) => f.file === selectedFile);
        const layer = architectureLayers.find((l) => l.files.includes(selectedFile));
        const imports = dependencyMap[selectedFile] ?? [];
        const importedBy = Object.entries(dependencyMap)
            .filter(([, targets]) => targets.includes(selectedFile))
            .map(([source]) => source);
        return { file: selectedFile, complexity, layer: layer?.layer, imports, importedBy };
    }, [selectedFile, fileComplexity, architectureLayers, dependencyMap]);

    const layerNames = useMemo(() => {
        const unique = new Set<string>();
        for (const layer of architectureLayers) unique.add(layer.layer);
        return Array.from(unique);
    }, [architectureLayers]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-xs items-center">
                {layerNames.map((layer) => (
                    <span key={layer} className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: getLayerColor(layer) }} />
                        <span className="text-gray-400">{layer}</span>
                    </span>
                ))}
                <span className="flex items-center gap-1.5 border-l border-gray-700 pl-3">
                    <span className="w-4 border-t-2 border-dashed border-red-500" />
                    <span className="text-gray-500">circular</span>
                </span>
            </div>

            <div className="h-[550px] rounded-lg border border-gray-700 overflow-hidden">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    fitView
                    fitViewOptions={{ padding: 0.25 }}
                    minZoom={0.15}
                    maxZoom={2}
                    proOptions={{ hideAttribution: true }}
                    style={{ background: '#0a0a0f' }}
                >
                    <Background color="#1f2937" gap={20} />
                    <Controls
                        showInteractive={false}
                        style={{ background: '#1f2937', borderColor: '#374151' }}
                    />
                    <MiniMap
                        nodeStrokeWidth={3}
                        style={{ background: '#111827', borderColor: '#374151' }}
                    />
                </ReactFlow>
            </div>

            {selectedData && (
                <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-sm space-y-2">
                    <h4 className="font-mono text-blue-300">{selectedData.file}</h4>
                    <div className="flex flex-wrap gap-4 text-gray-400 text-xs">
                        {selectedData.layer && <span>Layer: <span className="text-gray-200">{selectedData.layer}</span></span>}
                        {selectedData.complexity && (
                            <span>Complexity: <span className="text-gray-200">{selectedData.complexity.score}/10</span> — {selectedData.complexity.reason}</span>
                        )}
                    </div>
                    {selectedData.imports.length > 0 && (
                        <div>
                            <span className="text-xs text-gray-500">Imports:</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {selectedData.imports.map((f) => (
                                    <span key={f} className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300 font-mono">{f}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {selectedData.importedBy.length > 0 && (
                        <div>
                            <span className="text-xs text-gray-500">Imported by:</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {selectedData.importedBy.map((f) => (
                                    <span key={f} className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300 font-mono">{f}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
