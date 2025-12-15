import { Node, Link } from '../types';

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportNodesCSV = (nodes: Node[]) => {
  const headers = ['id', 'degree', 'inDegree', 'outDegree', 'pagerank', 'betweenness', 'community_group'];
  const rows = nodes.map(n => [
    `"${n.id}"`, // Quote IDs to handle potential commas
    n.degree,
    n.inDegree,
    n.outDegree,
    n.pagerank.toFixed(6),
    n.betweenness.toFixed(6),
    n.group
  ].join(','));
  
  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadFile(csvContent, 'network_metrics.csv', 'text/csv');
};

export const exportEdgesCSV = (links: Link[]) => {
  const headers = ['source', 'target'];
  const rows = links.map(l => {
     const source = typeof l.source === 'object' ? (l.source as Node).id : l.source;
     const target = typeof l.target === 'object' ? (l.target as Node).id : l.target;
     return `"${source}","${target}"`;
  });
  
  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadFile(csvContent, 'edge_list.csv', 'text/csv');
};

export const exportGraphJSON = (nodes: Node[], links: Link[]) => {
    const cleanLinks = links.map(l => ({
        source: typeof l.source === 'object' ? (l.source as Node).id : l.source,
        target: typeof l.target === 'object' ? (l.target as Node).id : l.target
    }));
    
    // Remove d3 simulation properties to keep JSON clean
    const cleanNodes = nodes.map(({ x, y, vx, vy, ...rest }) => rest);
    
    const data = {
        meta: {
            generatedAt: new Date().toISOString(),
            tool: "TwitterNet Analyst"
        },
        nodes: cleanNodes,
        links: cleanLinks
    };
    
    downloadFile(JSON.stringify(data, null, 2), 'network_graph.json', 'application/json');
};