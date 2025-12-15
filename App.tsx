import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Network, Share2, Users, Activity, Upload, BrainCircuit, RotateCcw, FileText, Download, FileJson, FileSpreadsheet, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ReactMarkdown from 'react-markdown';

import NetworkGraph, { NetworkGraphHandle } from './components/NetworkGraph';
import MetricCard from './components/MetricCard';
import { generateSampleData, calculateMetrics, buildGraphFromLinks } from './services/graphUtils';
import { analyzeNetworkWithGemini } from './services/geminiService';
import { exportEdgesCSV, exportNodesCSV, exportGraphJSON } from './services/exportUtils';
import { GraphData, NetworkMetrics, Node, AnalysisState } from './types';

const INITIAL_METRICS: NetworkMetrics = {
  nodeCount: 0,
  edgeCount: 0,
  density: 0,
  avgDegree: 0,
  diameter: '-',
  modularity: 0,
};

function App() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [metrics, setMetrics] = useState<NetworkMetrics>(INITIAL_METRICS);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [analysisReport, setAnalysisReport] = useState<string>("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>(AnalysisState.IDLE);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'code'>('dashboard');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  
  const graphRef = useRef<NetworkGraphHandle>(null);

  const processGraph = useCallback((data: GraphData) => {
    const { updatedNodes, metrics: newMetrics } = calculateMetrics(data);
    setGraphData({ nodes: updatedNodes, links: data.links });
    setMetrics(newMetrics);
    setAnalysisReport("");
    setAnalysisState(AnalysisState.IDLE);
    setSelectedNode(null);
  }, []);

  const handleLoadSample = () => {
    const data = generateSampleData(60); // 60 nodes for good demo visualization
    processGraph(data);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Simple CSV parser: assume header, format "source,target"
      const lines = text.split('\n');
      const links = lines
        .slice(1) // Skip header
        .filter(l => l.trim() !== '')
        .map(line => {
          const [source, target] = line.split(',');
          return { source: source.trim(), target: target.trim() };
        })
        .filter(l => l.source && l.target);
      
      const rawData = buildGraphFromLinks(links);
      processGraph(rawData);
    };
    reader.readAsText(file);
  };

  const runGeminiAnalysis = async () => {
    if (metrics.nodeCount === 0) return;
    setAnalysisState(AnalysisState.PROCESSING);
    const report = await analyzeNetworkWithGemini(graphData, metrics);
    setAnalysisReport(report);
    setAnalysisState(AnalysisState.ANALYZED);
  };

  const handleExport = (type: 'nodes' | 'edges' | 'json' | 'png') => {
    if (metrics.nodeCount === 0) return;
    setIsExportMenuOpen(false);

    switch(type) {
        case 'nodes':
            exportNodesCSV(graphData.nodes);
            break;
        case 'edges':
            exportEdgesCSV(graphData.links);
            break;
        case 'json':
            exportGraphJSON(graphData.nodes, graphData.links);
            break;
        case 'png':
            if (graphRef.current) {
                graphRef.current.exportPNG();
            }
            break;
    }
  };

  // Prepare chart data
  const degreeDistribution = useMemo(() => {
    if (!graphData.nodes.length) return [];
    const counts: Record<number, number> = {};
    graphData.nodes.forEach(n => {
      const d = Math.floor(n.degree);
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([k, v]) => ({ degree: parseInt(k), count: v }))
      .sort((a, b) => a.degree - b.degree);
  }, [graphData]);

  const topInfluencers = useMemo(() => {
    return [...graphData.nodes]
      .sort((a, b) => b.pagerank - a.pagerank)
      .slice(0, 5);
  }, [graphData]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800" onClick={() => isExportMenuOpen && setIsExportMenuOpen(false)}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Network size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">TwitterNet Analyst</h1>
            <p className="text-xs text-slate-500 font-medium">Social Network Analysis Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Dashboard
                </button>
                <button 
                    onClick={() => setActiveTab('code')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'code' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Python Logic
                </button>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-2"></div>

            {/* Export Dropdown */}
            <div className="relative">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExportMenuOpen(!isExportMenuOpen);
                    }}
                    disabled={metrics.nodeCount === 0}
                    className={`flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition ${metrics.nodeCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Download size={16} />
                    <span>Export</span>
                    <ChevronDown size={14} />
                </button>
                
                {isExportMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</div>
                        <button 
                            onClick={() => handleExport('nodes')}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center text-slate-700"
                        >
                            <FileSpreadsheet size={16} className="mr-2 text-green-600" />
                            Node Metrics (CSV)
                        </button>
                        <button 
                            onClick={() => handleExport('edges')}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center text-slate-700"
                        >
                            <FileSpreadsheet size={16} className="mr-2 text-blue-600" />
                            Edge List (CSV)
                        </button>
                        
                        <div className="my-1 border-t border-slate-100"></div>
                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Graph</div>
                        
                        <button 
                            onClick={() => handleExport('png')}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center text-slate-700"
                        >
                            <ImageIcon size={16} className="mr-2 text-purple-600" />
                            Graph Image (PNG)
                        </button>
                         <button 
                            onClick={() => handleExport('json')}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center text-slate-700"
                        >
                            <FileJson size={16} className="mr-2 text-orange-600" />
                            Graph Data (JSON)
                        </button>
                    </div>
                )}
            </div>

          <button 
            onClick={handleLoadSample}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">Sample</span>
          </button>
          
          <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer text-sm font-medium transition shadow-sm">
            <Upload size={16} />
            <span className="hidden sm:inline">Upload CSV</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-12 gap-6">
        
        {activeTab === 'dashboard' ? (
            <>
        {/* Left Col: Graph & Chart */}
        <div className="col-span-12 lg:col-span-8 flex flex-col space-y-6">
          
          {/* Main Vis */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <Share2 className="w-5 h-5 mr-2 text-blue-500" />
                Network Topology
              </h2>
              <div className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                Force-Directed Layout (D3.js)
              </div>
            </div>
            
            {graphData.nodes.length > 0 ? (
               <NetworkGraph 
                ref={graphRef}
                data={graphData} 
                onNodeClick={setSelectedNode} 
                selectedNode={selectedNode}
               />
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <Network size={48} className="text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">No Data Loaded</p>
                    <p className="text-slate-400 text-sm mt-1">Upload a CSV or load sample data to begin.</p>
                </div>
            )}
          </div>

          {/* Bottom Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Degree Distribution */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-purple-500" />
                    Degree Distribution
                </h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={degreeDistribution}>
                            <XAxis 
                                dataKey="degree" 
                                tickLine={false} 
                                axisLine={false}
                                label={{ value: 'Degree (k)', position: 'insideBottom', offset: -5, style: { fontSize: 10, fill: '#64748b' } }} 
                                tick={{fontSize: 10}}
                            />
                            <YAxis 
                                tickLine={false} 
                                axisLine={false}
                                tick={{fontSize: 10}}
                            />
                            <Tooltip 
                                cursor={{fill: '#f1f5f9'}}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
             </div>

             {/* Influencers Table */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-green-500" />
                    Top Influencers (PageRank)
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-3 py-2">Rank</th>
                                <th className="px-3 py-2">Node ID</th>
                                <th className="px-3 py-2 text-right">PR Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topInfluencers.map((node, i) => (
                                <tr key={node.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    <td className="px-3 py-2 text-slate-400 font-mono">#{i + 1}</td>
                                    <td className="px-3 py-2 font-medium text-slate-700">{node.id}</td>
                                    <td className="px-3 py-2 text-right text-slate-600 font-mono">
                                        {node.pagerank.toFixed(4)}
                                    </td>
                                </tr>
                            ))}
                            {topInfluencers.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-3 py-4 text-center text-slate-400 italic">No data available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
        </div>

        {/* Right Col: Metrics & AI */}
        <div className="col-span-12 lg:col-span-4 flex flex-col space-y-6">
            
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
                <MetricCard 
                    title="Nodes" 
                    value={metrics.nodeCount} 
                    icon={<Users size={16} />}
                />
                <MetricCard 
                    title="Edges" 
                    value={metrics.edgeCount} 
                    icon={<Share2 size={16} />}
                />
                <MetricCard 
                    title="Density" 
                    value={metrics.density.toFixed(4)} 
                    description={metrics.density < 0.1 ? "Sparse Network" : "Dense Network"}
                />
                <MetricCard 
                    title="Avg Degree" 
                    value={metrics.avgDegree.toFixed(2)} 
                    description="Avg friends per user"
                />
                <MetricCard 
                    title="Communities" 
                    value={new Set(graphData.nodes.map(n => n.group)).size} 
                    description="Detected clusters"
                />
                 <MetricCard 
                    title="Modularity" 
                    value={metrics.modularity.toFixed(2)} 
                    description="Cluster quality"
                />
            </div>

            {/* AI Analyst Panel */}
            <div className="bg-white rounded-xl shadow-lg border border-purple-100 flex-1 flex flex-col overflow-hidden ring-1 ring-purple-50">
                <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <BrainCircuit size={20} />
                        <h2 className="font-bold">AI Analyst Insight</h2>
                    </div>
                    {graphData.nodes.length > 0 && (
                        <button 
                            onClick={runGeminiAnalysis}
                            disabled={analysisState === AnalysisState.PROCESSING}
                            className={`text-xs px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 font-medium transition flex items-center ${analysisState === AnalysisState.PROCESSING ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {analysisState === AnalysisState.PROCESSING ? 'Analyzing...' : 'Generate Report'}
                        </button>
                    )}
                </div>
                
                <div className="p-6 flex-1 bg-slate-50/50 custom-scrollbar overflow-y-auto">
                    {analysisState === AnalysisState.IDLE && !analysisReport && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-3 p-4">
                            <BrainCircuit size={48} className="opacity-20" />
                            <p className="text-sm">Run the simulation to calculate metrics, then ask the AI to interpret the network structure.</p>
                        </div>
                    )}
                    
                    {analysisState === AnalysisState.PROCESSING && (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                            <p className="text-sm text-purple-600 font-medium animate-pulse">Consulting Gemini Model...</p>
                        </div>
                    )}

                    {analysisReport && (
                        <div className="prose prose-sm prose-slate max-w-none">
                            <ReactMarkdown>{analysisReport}</ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
        ) : (
            <div className="col-span-12 bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-slate-100">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Python Methodology</h2>
                            <p className="text-slate-500">How you would implement this analysis in a Jupyter Notebook.</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-slate-800">1. Loading Data & Building Graph</h3>
                            <p className="text-slate-600 text-sm">Use Pandas to read the edge list and NetworkX to construct the graph object.</p>
                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm font-mono custom-scrollbar">
{`import pandas as pd
import networkx as nx

# Load data
df = pd.read_csv('followers.csv')

# Create Directed Graph from DataFrame
G = nx.from_pandas_edgelist(
    df, 
    source='source', 
    target='target', 
    create_using=nx.DiGraph()
)

print(nx.info(G))`}
                            </pre>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-slate-800">2. Centrality Analysis</h3>
                            <p className="text-slate-600 text-sm">Compute PageRank to find influencers and Betweenness to find bridges.</p>
                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm font-mono custom-scrollbar">
{`# Calculate PageRank (Influence)
pagerank_scores = nx.pagerank(G, alpha=0.85)

# Calculate Betweenness (Bridges)
# Note: For large graphs, use k= for approximation
betweenness_scores = nx.betweenness_centrality(G, k=100) 

# Sort top 5 influencers
top_influencers = sorted(
    pagerank_scores.items(), 
    key=lambda x: x[1], 
    reverse=True
)[:5]`}
                            </pre>
                        </div>

                         <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-slate-800">3. Community Detection</h3>
                            <p className="text-slate-600 text-sm">Detect clusters using Label Propagation or Louvain.</p>
                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm font-mono custom-scrollbar">
{`from networkx.algorithms import community

# Label Propagation (Fast)
communities = list(community.label_propagation_communities(G))

# Add community attribute to nodes for visualization
for i, comm in enumerate(communities):
    for node in comm:
        G.nodes[node]['group'] = i`}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

export default App;