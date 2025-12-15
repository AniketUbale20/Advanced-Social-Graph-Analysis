import { Node, Link, GraphData, NetworkMetrics } from '../types';

// Helper to create a unique list of nodes from links
export const buildGraphFromLinks = (links: { source: string; target: string }[]): GraphData => {
  const nodeMap = new Map<string, Node>();
  const processedLinks: Link[] = [];

  links.forEach(link => {
    if (!nodeMap.has(link.source)) {
      nodeMap.set(link.source, {
        id: link.source,
        degree: 0,
        inDegree: 0,
        outDegree: 0,
        betweenness: 0,
        pagerank: 0,
        group: 0
      });
    }
    if (!nodeMap.has(link.target)) {
      nodeMap.set(link.target, {
        id: link.target,
        degree: 0,
        inDegree: 0,
        outDegree: 0,
        betweenness: 0,
        pagerank: 0,
        group: 0
      });
    }
    processedLinks.push({ source: link.source, target: link.target });
  });

  return {
    nodes: Array.from(nodeMap.values()),
    links: processedLinks
  };
};

export const calculateMetrics = (data: GraphData): { updatedNodes: Node[], metrics: NetworkMetrics } => {
  const nodes = [...data.nodes];
  const links = data.links;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // 1. Degree Centrality
  nodes.forEach(n => {
    n.degree = 0;
    n.inDegree = 0;
    n.outDegree = 0;
  });

  links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? (link.source as Node).id : link.source;
    const targetId = typeof link.target === 'object' ? (link.target as Node).id : link.target;
    
    const sourceNode = nodeMap.get(sourceId as string);
    const targetNode = nodeMap.get(targetId as string);

    if (sourceNode && targetNode) {
      sourceNode.outDegree++;
      sourceNode.degree++;
      targetNode.inDegree++;
      targetNode.degree++;
    }
  });

  // 2. PageRank (Simplified Iterative)
  // Init
  nodes.forEach(n => n.pagerank = 1 / nodes.length);
  const damping = 0.85;
  for (let i = 0; i < 20; i++) { // 20 iterations
    const newRanks = new Map<string, number>();
    nodes.forEach(n => newRanks.set(n.id, (1 - damping) / nodes.length));
    
    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as Node).id : link.source as string;
      const targetId = typeof link.target === 'object' ? (link.target as Node).id : link.target as string;
      const source = nodeMap.get(sourceId);
      
      if (source && source.outDegree > 0) {
        const share = (source.pagerank * damping) / source.outDegree;
        const targetRank = newRanks.get(targetId) || 0;
        newRanks.set(targetId, targetRank + share);
      }
    });
    
    nodes.forEach(n => n.pagerank = newRanks.get(n.id) || 0);
  }

  // 3. Community Detection (Label Propagation)
  // Init each node with its own label
  const labels = new Map<string, string>();
  nodes.forEach((n, i) => labels.set(n.id, i.toString()));

  // Run propagation
  for (let i = 0; i < 5; i++) {
    const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
    shuffledNodes.forEach(node => {
        const neighborLabels: string[] = [];
        
        // Find neighbors
        links.forEach(l => {
             const sId = typeof l.source === 'object' ? (l.source as Node).id : l.source as string;
             const tId = typeof l.target === 'object' ? (l.target as Node).id : l.target as string;
             if (sId === node.id) neighborLabels.push(labels.get(tId)!);
             if (tId === node.id) neighborLabels.push(labels.get(sId)!);
        });

        if (neighborLabels.length > 0) {
            // Find most frequent label
            const frequency: Record<string, number> = {};
            let maxFreq = 0;
            let bestLabel = labels.get(node.id)!;
            
            neighborLabels.forEach(lbl => {
                frequency[lbl] = (frequency[lbl] || 0) + 1;
                if (frequency[lbl] > maxFreq) {
                    maxFreq = frequency[lbl];
                    bestLabel = lbl;
                }
            });
            labels.set(node.id, bestLabel);
        }
    });
  }
  
  // Assign numeric group IDs based on labels
  const uniqueLabels = Array.from(new Set(labels.values()));
  nodes.forEach(n => {
    n.group = uniqueLabels.indexOf(labels.get(n.id)!);
  });

  // 4. Global Metrics
  const density = links.length / (nodes.length * (nodes.length - 1));
  const avgDegree = links.length / nodes.length;

  return {
    updatedNodes: nodes,
    metrics: {
      nodeCount: nodes.length,
      edgeCount: links.length,
      density: density,
      avgDegree: avgDegree,
      diameter: "N/A (Compute Heavy)",
      modularity: uniqueLabels.length / nodes.length // Rough proxy
    }
  };
};

export const generateSampleData = (n: number = 50): GraphData => {
  // Barabási–Albert model simplified
  const nodes: Node[] = [];
  const links: Link[] = [];

  // Create initial fully connected graph
  const m0 = 5;
  for (let i = 0; i < m0; i++) {
    nodes.push({ id: `User_${i}`, degree: 0, inDegree: 0, outDegree: 0, betweenness: 0, pagerank: 0, group: 0 });
    for (let j = i + 1; j < m0; j++) {
      links.push({ source: `User_${i}`, target: `User_${j}` });
    }
  }

  // Add remaining nodes
  for (let i = m0; i < n; i++) {
    const newNodeId = `User_${i}`;
    nodes.push({ id: newNodeId, degree: 0, inDegree: 0, outDegree: 0, betweenness: 0, pagerank: 0, group: 0 });
    
    // Preferential attachment
    const degrees = nodes.map(n => {
        // Calculate current degree in the building graph
        const d = links.filter(l => l.source === n.id || l.target === n.id).length;
        return d + 1; // Smoothing
    });
    const totalDegree = degrees.reduce((a, b) => a + b, 0);
    
    let addedLinks = 0;
    const targetLinks = 2; // m param
    
    while (addedLinks < targetLinks) {
        let rand = Math.random() * totalDegree;
        let cumulative = 0;
        for (let j = 0; j < nodes.length - 1; j++) { // exclude self
            cumulative += degrees[j];
            if (cumulative >= rand) {
                // Check if link exists
                const targetId = nodes[j].id;
                const exists = links.some(l => 
                    (l.source === newNodeId && l.target === targetId) ||
                    (l.source === targetId && l.target === newNodeId)
                );
                
                if (!exists) {
                    links.push({ source: newNodeId, target: targetId });
                    addedLinks++;
                }
                break;
            }
        }
    }
  }

  return buildGraphFromLinks(links.map(l => ({ source: l.source as string, target: l.target as string })));
};