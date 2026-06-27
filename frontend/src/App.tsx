import { useState } from 'react';
import { IS_DEMO_MODE } from './config';
import { useAnalysis } from './hooks/useAnalysis';
import { PathInput } from './components/PathInput';
import { AgentConsole, type TabName } from './components/AgentConsole';
import { ExplorerReport } from './components/reports/ExplorerReport';
import { EngineerReport } from './components/reports/EngineerReport';
import { SecurityReport } from './components/reports/SecurityReport';
import { FinalReport } from './components/reports/FinalReport';

function App() {
    const { state, analyze, applyChange } = useAnalysis();
    const [activeTab, setActiveTab] = useState<TabName>('explorer');

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
                <h1 className="text-2xl font-bold">Codebase Intelligence</h1>

                {IS_DEMO_MODE && (
                    <div className="rounded-lg border border-blue-700/50 bg-blue-900/20 px-4 py-3 text-sm text-blue-200">
                        Interactive demo — click Analyze to run a simulated analysis on a sample Spring Boot microservice.
                        Apply Fix and Write Test are view-only.
                    </div>
                )}

                <PathInput
                    onAnalyze={analyze}
                    isAnalyzing={state.isAnalyzing}
                    demoMode={IS_DEMO_MODE}
                    demoPath={state.codebasePath ?? ''}
                />

                <AgentConsole
                    agents={state.agents}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    hasReport={state.finalReport !== null}
                />

                {state.error && (
                    <div className="rounded-lg border border-red-700 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                        {state.error}
                    </div>
                )}

                <div className="mt-4">
                    {activeTab === 'explorer' && state.explorerReport && (
                        <ExplorerReport report={state.explorerReport} />
                    )}

                    {activeTab === 'explorer' && !state.explorerReport && !state.isAnalyzing && (
                        <EmptyState message={IS_DEMO_MODE
                            ? 'Click Analyze to start the demo analysis.'
                            : 'Enter a folder path and click Analyze to start.'} />
                    )}

                    {activeTab === 'explorer' && state.isAnalyzing && !state.explorerReport && (
                        <EmptyState message="Explorer agent is analyzing the codebase..." />
                    )}

                    {activeTab === 'engineer' && state.engineerReport && (
                        <EngineerReport
                            report={state.engineerReport}
                            codebasePath={state.codebasePath}
                            applyChange={applyChange}
                            appliedChanges={state.appliedChanges}
                            readOnly={IS_DEMO_MODE}
                        />
                    )}

                    {activeTab === 'engineer' && !state.engineerReport && !state.isAnalyzing && (
                        <EmptyState message={IS_DEMO_MODE
                            ? 'Click Analyze to start the demo analysis.'
                            : 'Run an analysis to see the Engineer report.'} />
                    )}

                    {activeTab === 'engineer' && state.isAnalyzing && !state.engineerReport && (
                        <EmptyState message="Engineer agent is analyzing code quality..." />
                    )}

                    {activeTab === 'security' && state.securityReport && (
                        <SecurityReport
                            report={state.securityReport}
                            codebasePath={state.codebasePath}
                            applyChange={applyChange}
                            appliedChanges={state.appliedChanges}
                            readOnly={IS_DEMO_MODE}
                        />
                    )}

                    {activeTab === 'security' && !state.securityReport && !state.isAnalyzing && (
                        <EmptyState message={IS_DEMO_MODE
                            ? 'Click Analyze to start the demo analysis.'
                            : 'Run an analysis to see the Security report.'} />
                    )}

                    {activeTab === 'security' && state.isAnalyzing && !state.securityReport && (
                        <EmptyState message="Security agent is scanning for vulnerabilities..." />
                    )}

                    {activeTab === 'report' && state.finalReport && (
                        <FinalReport report={state.finalReport} />
                    )}

                    {activeTab === 'report' && !state.finalReport && (
                        <EmptyState message="Final report will be available after analysis completes." />
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-lg border border-gray-800 bg-gray-900 px-8 py-16 text-center text-sm text-gray-500">
            {message}
        </div>
    );
}

export default App;
