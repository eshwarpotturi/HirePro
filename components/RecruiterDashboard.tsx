import React, { useState, useMemo, useEffect } from 'react';
import { generateSimulationTasks } from '../services/geminiService';
import { Simulation, Tool, Task, PerformanceReport, TaskGroup, SimulationTemplate, TaskType } from '../types';
import { TrashIcon, PlusIcon, SpinnerIcon, CalendarIcon, CheckCircleIcon, ChartBarIcon, DocumentTextIcon, PhotographIcon, VolumeUpIcon, VideoCameraIcon, ClipboardIcon, CollectionIcon, CheckBadgeIcon, AcademicCapIcon, ClockIcon } from './Icons';
import TaskAssetDisplay from './TaskAssetDisplay';

interface RecruiterDashboardProps {
  onCreateSimulation: (simulation: Simulation) => void;
  createdSimulation: Simulation | null;
  previousSimulations: Simulation[];
  completedReports: Record<string, PerformanceReport>;
  onViewReport: (report: PerformanceReport) => void;
}

type Step = 'form' | 'validate' | 'created';
type RecruiterTab = 'create' | 'analytics';

const RecruiterDashboard: React.FC<RecruiterDashboardProps> = (props) => {
  const [activeTab, setActiveTab] = useState<RecruiterTab>('create');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Recruiter Dashboard</h2>
        <div className="bg-slate-800 p-1 rounded-lg flex gap-1 border border-slate-700">
           <TabButton
            label="Create"
            icon={<PlusIcon className="w-5 h-5" />}
            isActive={activeTab === 'create'}
            onClick={() => setActiveTab('create')}
          />
          <TabButton
            label="Analytics"
            icon={<ChartBarIcon className="w-5 h-5" />}
            isActive={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
          />
        </div>
      </div>
      
      {activeTab === 'create' ? (
        <CreateSimulationView {...props} onSwitchTab={setActiveTab} />
      ) : (
        <AnalyticsView simulations={props.previousSimulations} reports={Object.values(props.completedReports)} onViewReport={props.onViewReport} />
      )}
    </div>
  );
};

const TabButton: React.FC<{label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void}> = ({ label, icon, isActive, onClick}) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
    {icon}
    {label}
  </button>
);

const TaskTypeIcon = ({ type }: { type: TaskType }) => {
    switch (type) {
        case TaskType.TEXT:
            return <DocumentTextIcon title="Text Task" className="w-5 h-5 text-slate-400" />;
        case TaskType.IMAGE:
            return <PhotographIcon title="Image Upload Task" className="w-5 h-5 text-slate-400" />;
        case TaskType.AUDIO:
            return <VolumeUpIcon title="Audio Upload Task" className="w-5 h-5 text-slate-400" />;
        case TaskType.VIDEO:
            return <VideoCameraIcon title="Video Upload Task" className="w-5 h-5 text-slate-400" />;
        default:
            return null;
    }
};

interface CreateSimulationViewProps extends RecruiterDashboardProps {
  onSwitchTab: (tab: RecruiterTab) => void;
}

const CreateSimulationView: React.FC<CreateSimulationViewProps> = ({ onCreateSimulation, createdSimulation, previousSimulations, completedReports, onSwitchTab }) => {
  const [step, setStep] = useState<Step>('form');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [clientCallEnabled, setClientCallEnabled] = useState(true);
  const [callTimeMin, setCallTimeMin] = useState(10);
  const [callTimeMax, setCallTimeMax] = useState(50);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);


  useEffect(() => {
    if (createdSimulation) {
      const activeSimId = createdSimulation.id;
      if (previousSimulations.length > 0 && previousSimulations[0].id !== activeSimId) {
        setStep('form');
      }
    }
  }, [previousSimulations, createdSimulation]);

  const availableTools: Tool[] = [Tool.CHAT, Tool.EDITOR, Tool.SHEET, Tool.EMAIL];
  
  const isFormValid = useMemo(() => {
    if (!clientCallEnabled) return true;
    return callTimeMin < callTimeMax && callTimeMax <= durationMinutes;
  }, [clientCallEnabled, callTimeMin, callTimeMax, durationMinutes]);

  const handleGenerateTasks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !jobDescription.trim()) {
      setError('Job title and description cannot be empty.');
      return;
    }
    if (!isFormValid) {
        setError('Please fix the errors in the form before continuing.');
        return;
    }
    setError('');
    setLoadingAction('Generating tasks...');

    try {
      const generatedTasks = await generateSimulationTasks(jobTitle, jobDescription);
      
      // Automatically finalize after generation
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const newSimulation: Omit<Simulation, 'recruiterEmail' | 'createdAt'> = {
          id: `SIM-${dateStr}`,
          jobTitle,
          jobDescription,
          tasks: generatedTasks,
          durationMinutes,
          availableTools,
          clientCallEnabled,
          ...(clientCallEnabled && {
              clientCallTimeRange: { min: callTimeMin, max: callTimeMax }
          })
      };
      
      onCreateSimulation(newSimulation as Simulation);
      setStep('created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tasks. Please try again.');
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCopyToClipboard = (id: string, isUrl: boolean = false) => {
    const textToCopy = isUrl ? `${window.location.origin}${window.location.pathname}?simId=${id}` : id;
    navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const renderCreationContent = () => {
    if (step === 'created' && createdSimulation) {
        return (
             <div className="bg-slate-800 p-6 rounded-lg border border-green-500/50 animate-fade-in mb-8">
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-green-400">Simulation Created!</h3>
                    <p className="text-slate-300 mt-2">Share the following link with your candidates:</p>
                    <div className="mt-4 bg-slate-900 p-4 rounded-md font-mono text-xl text-yellow-300 break-all">
                        {`${window.location.origin}${window.location.pathname}?simId=${createdSimulation.id}`}
                    </div>
                    <button onClick={() => handleCopyToClipboard(createdSimulation.id, true)} className="mt-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors">
                        {copiedId === createdSimulation.id ? 'Copied Link!' : 'Copy Shareable Link'}
                    </button>
                </div>

                <div className="border-t border-slate-700 pt-6">
                    <h4 className="text-lg font-semibold text-blue-300 mb-4">Generated Pool (10 Tasks)</h4>
                    <p className="text-sm text-slate-400 mb-4 italic">Note: Each candidate will be randomly assigned 2 tasks from this pool when they start the simulation.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {createdSimulation.tasks.map((task, idx) => (
                            <div key={task.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                <p className="font-semibold text-slate-200 text-sm">Task {idx + 1}: {task.title}</p>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 uppercase tracking-wider font-bold">{task.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-center mt-8 border-t border-slate-700 pt-6">
                    <p className="text-slate-400 text-sm mb-4">You can find this simulation and its analytics in your history below.</p>
                    <button onClick={() => {
                      setStep('form');
                      setJobTitle('');
                      setJobDescription('');
                      setDurationMinutes(60);
                      setCallTimeMin(10);
                      setCallTimeMax(50);
                    }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors">
                        Create Another Simulation
                    </button>
                </div>
            </div>
        )
    }

    if (step === 'validate') {
        // This step is now skipped, but we'll keep the logic minimal just in case of edge cases
        return <div className="text-center p-10"><SpinnerIcon className="w-8 h-8 mx-auto text-blue-400" /><p className="mt-4">Finalizing...</p></div>;
    }

    // Default step: 'form'
    return (
        <div className="relative mb-8 max-w-4xl mx-auto">
             <form onSubmit={handleGenerateTasks} className="space-y-6 bg-slate-800 p-8 rounded-lg border border-slate-700">
                <h2 className="text-2xl font-bold">Create New Simulation</h2>
                {loadingAction && (
                    <div className="absolute inset-0 bg-slate-800/80 flex flex-col items-center justify-center z-10 rounded-lg">
                        <SpinnerIcon className="w-10 h-10 text-blue-400" />
                        <p className="text-white text-lg mt-4">{loadingAction}</p>
                        <p className="text-slate-400 text-sm">This may take a moment.</p>
                    </div>
                )}
                <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-slate-300">Job Title</label>
                    <input
                        type="text"
                        id="jobTitle"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Senior Product Manager"
                    />
                </div>
                <div>
                    <label htmlFor="jobDescription" className="block text-sm font-medium text-slate-300">Job Description</label>
                    <textarea
                        id="jobDescription"
                        rows={5}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe the key responsibilities and required skills for the role."
                    />
                </div>
                 <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-slate-300">Simulation Duration (minutes)</label>
                    <input
                        type="number"
                        id="duration"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value, 10)) || 1)}
                        className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">Enable Random Client Call?</span>
                    <label htmlFor="clientCallToggle" className="inline-flex relative items-center cursor-pointer">
                        <input 
                        type="checkbox" 
                        checked={clientCallEnabled}
                        onChange={() => setClientCallEnabled(!clientCallEnabled)}
                        id="clientCallToggle" 
                        className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                {clientCallEnabled && (
                    <div className="p-4 bg-slate-700/50 rounded-md animate-fade-in space-y-3">
                        <p className="text-sm font-medium text-slate-300">Client Call Timing</p>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label htmlFor="callTimeMin" className="block text-xs text-slate-400">Trigger after (min)</label>
                                <input
                                    type="number"
                                    id="callTimeMin"
                                    value={callTimeMin}
                                    onChange={(e) => setCallTimeMin(parseInt(e.target.value, 10) || 0)}
                                    className="mt-1 block w-full bg-slate-600 border border-slate-500 rounded-md py-1 px-2 text-white text-sm"
                                    min="0"
                                    max={durationMinutes}
                                />
                            </div>
                            <div className="text-slate-400 pt-4">and before</div>
                            <div className="flex-1">
                                <label htmlFor="callTimeMax" className="block text-xs text-slate-400">Max (min)</label>
                                <input
                                    type="number"
                                    id="callTimeMax"
                                    value={callTimeMax}
                                    onChange={(e) => setCallTimeMax(parseInt(e.target.value, 10) || 0)}
                                    className="mt-1 block w-full bg-slate-600 border border-slate-500 rounded-md py-1 px-2 text-white text-sm"
                                    min={callTimeMin}
                                    max={durationMinutes}
                                />
                            </div>
                        </div>
                        {callTimeMax > durationMinutes && <p className="text-xs text-yellow-400">Max call time cannot exceed simulation duration.</p>}
                        {callTimeMin >= callTimeMax && <p className="text-xs text-yellow-400">"Trigger after" time must be less than "Max" time.</p>}
                    </div>
                )}
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div>
                <button
                    type="submit"
                    disabled={!!loadingAction || !isFormValid}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                    {loadingAction || 'Generate Simulation'}
                </button>
                </div>
            </form>
        </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {renderCreationContent()}
      
      <div className="mt-12">
        <h3 className="text-2xl font-bold mb-6">Simulation History</h3>
        {previousSimulations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {previousSimulations.map(sim => {
              const reportsForSim = Object.values(completedReports).filter((r: PerformanceReport) => r.simulationId === sim.id);
              const completionCount = reportsForSim.length;
              return (
                <div key={sim.id} className="bg-slate-800 rounded-lg border border-slate-700 p-5 flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-lg text-blue-300">{sim.jobTitle}</p>
                    <div className="text-sm text-slate-400 mt-2 flex flex-col gap-1">
                        <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> Created: {new Date(sim.createdAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1.5 text-green-400">
                          <CheckCircleIcon className="w-4 h-4" /> 
                          {completionCount} {completionCount === 1 ? 'Completion' : 'Completions'}
                        </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-md">
                            <span className="font-mono text-xs text-slate-400 flex-shrink-0">ID:</span>
                            <input type="text" readOnly value={sim.id} className="font-mono text-xs text-yellow-300 bg-transparent w-full focus:outline-none" />
                            <button onClick={() => handleCopyToClipboard(sim.id)} title="Copy ID" className="p-1 text-slate-400 hover:text-white transition-colors">
                                <ClipboardIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <button onClick={() => handleCopyToClipboard(sim.id, true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                            <ClipboardIcon className="w-3 h-3" />
                            {copiedId === sim.id ? 'Link Copied!' : 'Copy Shareable Link'}
                        </button>
                    </div>
                  </div>
                  {completionCount > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Recent Submissions</div>
                      <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {reportsForSim.slice(0, 5).map(report => (
                          <div key={report.candidateEmail} className="flex items-center justify-between bg-slate-900/40 p-2 rounded border border-slate-700/50">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-200 truncate">{report.candidateName}</p>
                              <p className="text-[10px] text-slate-500 truncate">{report.candidateEmail}</p>
                            </div>
                            <div className="flex items-center gap-3 ml-2">
                              <span className="text-xs font-bold text-blue-400">{report.suitabilityScore}/10</span>
                              <button 
                                onClick={() => onViewReport(report)}
                                className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                              >
                                Report
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => onSwitchTab('analytics')} className="w-full text-center bg-blue-600/20 text-blue-300 border border-blue-500/50 hover:bg-blue-600/40 font-semibold py-2 px-4 rounded-md text-sm transition-colors mt-2">
                          View All Analytics
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
            <div className="text-center py-10 px-6 bg-slate-800 rounded-lg border-2 border-dashed border-slate-700">
                <p className="text-slate-400">You haven't created any simulations yet.</p>
                <p className="text-slate-500 text-sm mt-2">Use the form above to get started.</p>
            </div>
        )}
      </div>
    </div>
  );
};

const AnalyticsView: React.FC<{ simulations: Simulation[], reports: PerformanceReport[], onViewReport: (report: PerformanceReport) => void }> = ({ simulations, reports, onViewReport }) => {
    const [filterText, setFilterText] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const analyticsData = useMemo(() => {
        const totalSims = simulations.length;
        const totalReports = reports.length;
        const completionRate = totalSims > 0 ? (totalReports / totalSims) * 100 : 0;
        
        const avgProblemSolving = reports.reduce((acc, r) => acc + r.problemSolvingScore, 0) / (totalReports || 1);
        const avgCommunication = reports.reduce((acc, r) => acc + r.communicationScore, 0) / (totalReports || 1);
        const avgStress = reports.reduce((acc, r) => acc + r.stressManagementScore, 0) / (totalReports || 1);
        const overallAvgScore = (avgProblemSolving + avgCommunication + avgStress) / 3;

        const scoreDistribution = reports.reduce((acc, r) => {
            const avg = (r.problemSolvingScore + r.communicationScore + r.stressManagementScore) / 3;
            if (avg >= 8) acc.high++;
            else if (avg >= 5) acc.medium++;
            else acc.low++;
            return acc;
        }, { high: 0, medium: 0, low: 0 });

        const detailedReports = reports.map(report => {
            const sim = simulations.find(s => s.id === report.simulationId);
            const overallScore = (report.problemSolvingScore + report.communicationScore + report.stressManagementScore) / 3;
            return { ...report, jobTitle: sim?.jobTitle || 'N/A', overallScore };
        });

        return {
            totalSims,
            totalReports,
            completionRate,
            overallAvgScore,
            scoreDistribution,
            detailedReports,
        };
    }, [simulations, reports]);

    const filteredAndSortedReports = useMemo(() => {
        let sortableItems = [...analyticsData.detailedReports];
        if (filterText) {
            sortableItems = sortableItems.filter(item =>
                item.candidateName.toLowerCase().includes(filterText.toLowerCase()) ||
                item.jobTitle.toLowerCase().includes(filterText.toLowerCase())
            );
        }
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof typeof a];
                const bValue = b[sortConfig.key as keyof typeof b];
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [analyticsData.detailedReports, filterText, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    if (simulations.length === 0) {
      return (
        <div className="text-center py-16 px-6 bg-slate-800 rounded-lg border-2 border-dashed border-slate-700 animate-fade-in">
          <ChartBarIcon className="w-12 h-12 mx-auto text-slate-500 mb-4" />
          <h3 className="text-xl font-bold text-slate-300">No Analytics Yet</h3>
          <p className="text-slate-400 mt-2">Create a simulation and wait for a candidate to complete it to see analytics here.</p>
        </div>
      );
    }
    
    return (
        <div className="space-y-8 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard icon={<CollectionIcon className="w-8 h-8 text-blue-400"/>} title="Total Simulations" value={analyticsData.totalSims} />
                <KpiCard icon={<CheckBadgeIcon className="w-8 h-8 text-green-400"/>} title="Completion Rate" value={`${analyticsData.completionRate.toFixed(1)}%`} />
                <KpiCard icon={<AcademicCapIcon className="w-8 h-8 text-yellow-400"/>} title="Avg. Candidate Score" value={analyticsData.overallAvgScore.toFixed(1)} suffix="/ 10" />
                <KpiCard icon={<ClockIcon className="w-8 h-8 text-indigo-400"/>} title="Completed Sims" value={analyticsData.totalReports} />
            </div>

            {/* Charts */}
            {reports.length > 0 && (
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-bold mb-4">Overall Performance Distribution</h3>
                    <PerformanceChart data={analyticsData.scoreDistribution} total={analyticsData.totalReports} />
                </div>
            )}

            {/* Detailed Table */}
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Completed Simulation Reports</h3>
                    <input
                        type="text"
                        placeholder="Search by name or job..."
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded-md py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                            <tr>
                                <th scope="col" className="p-3 cursor-pointer" onClick={() => requestSort('candidateName')}>Candidate</th>
                                <th scope="col" className="p-3 cursor-pointer" onClick={() => requestSort('candidateEmail')}>Email</th>
                                <th scope="col" className="p-3 cursor-pointer" onClick={() => requestSort('jobTitle')}>Job Title</th>
                                <th scope="col" className="p-3 cursor-pointer" onClick={() => requestSort('completedAt')}>Date</th>
                                <th scope="col" className="p-3 cursor-pointer" onClick={() => requestSort('suitabilityScore')}>Suitability Score</th>
                                <th scope="col" className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedReports.map(report => (
                                <tr key={`${report.simulationId}-${report.candidateEmail}`} className="border-b border-slate-700 hover:bg-slate-700/40">
                                    <td className="p-3 font-medium text-white">{report.candidateName}</td>
                                    <td className="p-3 text-slate-300">{report.candidateEmail}</td>
                                    <td className="p-3 text-slate-300">{report.jobTitle}</td>
                                    <td className="p-3 text-slate-300">{new Date(report.completedAt).toLocaleDateString()}</td>
                                    <td className="p-3 font-semibold text-blue-300">{report.suitabilityScore} / 10</td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => onViewReport(report)} className="font-medium text-blue-400 hover:underline">View Report</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAndSortedReports.length === 0 && (
                        <p className="text-center text-slate-400 py-8">No matching reports found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const KpiCard: React.FC<{ icon: React.ReactNode, title: string, value: string | number, suffix?: string }> = ({ icon, title, value, suffix }) => (
    <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 flex items-center gap-5">
        <div className="flex-shrink-0 bg-slate-700/50 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}<span className="text-base text-slate-400 font-medium">{suffix}</span></p>
        </div>
    </div>
);

const PerformanceChart: React.FC<{ data: { high: number, medium: number, low: number }, total: number }> = ({ data, total }) => {
    const bars = [
        { label: 'Low (0-4.9)', value: data.low, color: 'bg-red-500' },
        { label: 'Medium (5-7.9)', value: data.medium, color: 'bg-yellow-500' },
        { label: 'High (8-10)', value: data.high, color: 'bg-green-500' }
    ];
    return (
        <div className="space-y-3">
            {bars.map(bar => (
                <div key={bar.label} className="flex items-center gap-4">
                    <span className="text-xs text-slate-400 w-24 text-right">{bar.label}</span>
                    <div className="w-full bg-slate-700 rounded-full h-4">
                        <div className={`${bar.color} h-4 rounded-full`} style={{ width: total > 0 ? `${(bar.value / total) * 100}%` : '0%' }}></div>
                    </div>
                    <span className="text-sm font-semibold text-white">{bar.value}</span>
                </div>
            ))}
        </div>
    );
};


export default RecruiterDashboard;