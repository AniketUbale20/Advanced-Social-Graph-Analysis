export interface Node {
  id: string;
  label?: string;
  group?: number; // Community ID
  // Metrics
  degree: number;
  inDegree: number;
  outDegree: number;
  betweenness: number;
  pagerank: number;
  // Simulation props
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface Link {
  source: string | Node;
  target: string | Node;
  value?: number;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface NetworkMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgDegree: number;
  diameter: string; // "Approx. X"
  modularity: number;
}

export interface AnalysisReport {
  summary: string;
  influencers: string;
  communities: string;
}

export enum AnalysisState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  ANALYZED = 'ANALYZED',
}