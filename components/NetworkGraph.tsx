import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import {
  select,
  scaleOrdinal,
  schemeTableau10,
  zoom as d3Zoom,
  zoomIdentity,
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  drag as d3Drag
} from 'd3';
import { GraphData, Node, Link } from '../types';

interface NetworkGraphProps {
  data: GraphData;
  onNodeClick: (node: Node | null) => void;
  selectedNode: Node | null;
}

export interface NetworkGraphHandle {
    exportPNG: () => void;
}

const NetworkGraph = forwardRef<NetworkGraphHandle, NetworkGraphProps>(({ data, onNodeClick, selectedNode }, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: Node | null;
  }>({ visible: false, x: 0, y: 0, content: null });

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
        if (!svgRef.current || !containerRef.current) return;
        
        const svg = svgRef.current;
        const { width, height } = containerRef.current.getBoundingClientRect();
        
        // Serialize SVG
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        
        // Canvas setup
        const canvas = document.createElement('canvas');
        canvas.width = width * 2; // Retina scale
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(2, 2); // Scale context

        // Create Image
        const img = new Image();
        const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
            // Draw white background
            ctx.fillStyle = '#f8fafc'; // Matches bg-slate-50
            ctx.fillRect(0, 0, width, height);
            
            // Draw image
            ctx.drawImage(img, 0, 0, width, height);
            
            // Trigger download
            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'network_visualization.png';
            link.href = pngUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }
  }));

  useEffect(() => {
    const updateDims = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', updateDims);
    updateDims();
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  useEffect(() => {
    if (!data.nodes.length || !svgRef.current) return;

    // Filter data if a node is selected (Ego-Net)
    let displayNodes = data.nodes;
    let displayLinks = data.links;

    if (selectedNode) {
        const neighborIds = new Set<string>();
        neighborIds.add(selectedNode.id);
        
        data.links.forEach(l => {
            const sId = typeof l.source === 'object' ? (l.source as Node).id : l.source as string;
            const tId = typeof l.target === 'object' ? (l.target as Node).id : l.target as string;
            
            if (sId === selectedNode.id) neighborIds.add(tId);
            if (tId === selectedNode.id) neighborIds.add(sId);
        });

        displayNodes = data.nodes.filter(n => neighborIds.has(n.id));
        displayLinks = data.links.filter(l => {
             const sId = typeof l.source === 'object' ? (l.source as Node).id : l.source as string;
             const tId = typeof l.target === 'object' ? (l.target as Node).id : l.target as string;
             return neighborIds.has(sId) && neighborIds.has(tId);
        });
    }

    const svg = select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const width = dimensions.width;
    const height = dimensions.height;

    // Color scale for communities
    const color = scaleOrdinal(schemeTableau10);

    // Zoom behavior
    const g = svg.append("g");
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoomBehavior);

    // Simulation
    const simulation = forceSimulation(displayNodes as any)
      .force("link", forceLink(displayLinks).id((d: any) => d.id).distance(50))
      .force("charge", forceManyBody().strength(-200))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide().radius((d: any) => Math.sqrt(d.pagerank || 0.01) * 20 + 5));

    // Draw Links
    const link = g.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(displayLinks)
      .join("line")
      .attr("stroke-width", 1.5); // Simplified width

    // Draw Nodes
    // Scale node radius by PageRank
    const nodeRadius = (d: Node) => Math.max(5, Math.sqrt(d.pagerank) * 50);

    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(displayNodes)
      .join("circle")
      .attr("r", (d: any) => nodeRadius(d))
      .attr("fill", (d: any) => color(d.group?.toString() || "0"))
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d === selectedNode ? null : d);
      })
      .on("mouseover", (event, d) => {
        setTooltip({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            content: d
        });
        select(event.currentTarget).attr("stroke", "#3b82f6").attr("stroke-width", 3);
      })
      .on("mousemove", (event) => {
        setTooltip(prev => ({
            ...prev,
            x: event.clientX,
            y: event.clientY
        }));
      })
      .on("mouseout", (event) => {
        setTooltip(prev => ({ ...prev, visible: false }));
        select(event.currentTarget).attr("stroke", "#fff").attr("stroke-width", 1.5);
      })
      .call(d3Drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    // Ticks
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Reset zoom on double click background
    svg.on("dblclick", () => {
        onNodeClick(null);
        svg.transition().duration(750).call(zoomBehavior.transform, zoomIdentity);
    });

  }, [data, dimensions, selectedNode, onNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] bg-slate-50 rounded-xl shadow-inner border border-slate-200 overflow-hidden relative">
        {selectedNode && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-2 rounded shadow border border-blue-200 z-10 text-xs">
                <span className="font-bold text-blue-700">Ego-Net Active:</span> viewing {selectedNode.id}
                <button onClick={() => onNodeClick(null)} className="ml-2 text-red-500 hover:underline">Reset</button>
            </div>
        )}
      <svg ref={svgRef} className="w-full h-full" />
      
      {tooltip.visible && tooltip.content && (
        <div 
            className="fixed z-50 bg-slate-900/90 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-700 pointer-events-none backdrop-blur-sm"
            style={{ 
                left: tooltip.x + 15, 
                top: tooltip.y + 15 
            }}
        >
            <div className="font-bold text-sm mb-1 text-blue-300">{tooltip.content.id}</div>
            <div className="space-y-0.5">
                <div className="flex justify-between gap-4"><span className="text-slate-400">Group:</span> <span>{tooltip.content.group}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-400">PageRank:</span> <span>{tooltip.content.pagerank.toFixed(4)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-400">Degree:</span> <span>{tooltip.content.degree}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-400">Betweenness:</span> <span>{tooltip.content.betweenness.toFixed(4)}</span></div>
            </div>
        </div>
      )}
    </div>
  );
});

export default NetworkGraph;