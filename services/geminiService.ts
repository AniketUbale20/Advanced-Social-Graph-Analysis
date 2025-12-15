import { GoogleGenAI } from "@google/genai";
import { GraphData, NetworkMetrics } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeNetworkWithGemini = async (
  graphData: GraphData,
  metrics: NetworkMetrics
): Promise<string> => {
  try {
    const topInfluencers = [...graphData.nodes]
      .sort((a, b) => b.pagerank - a.pagerank)
      .slice(0, 5)
      .map(n => `${n.id} (PageRank: ${n.pagerank.toFixed(3)})`)
      .join(", ");

    const communities = new Set(graphData.nodes.map(n => n.group)).size;
    
    const prompt = `
      Act as a Senior Data Analyst specializing in Social Network Analysis (SNA).
      I have performed a network analysis on a Twitter follower dataset using NetworkX-like algorithms.
      
      Here are the computed metrics:
      - Total Nodes: ${metrics.nodeCount}
      - Total Edges: ${metrics.edgeCount}
      - Graph Density: ${metrics.density.toFixed(4)}
      - Average Degree: ${metrics.avgDegree.toFixed(2)}
      - Detected Communities: ${communities}
      
      Top Influencers (by PageRank):
      ${topInfluencers}
      
      Please provide a concise but professional analysis report (approx 200 words) covering:
      1. **Network Structure**: Is it dense/sparse? What does this imply about information flow?
      2. **Key Players**: Who are the opinion leaders?
      3. **Community Insight**: Interpretation of the community count.
      
      Format the output with Markdown headers. Use data analyst terminology (e.g., "clustering", "centrality", "bridge nodes").
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Analysis generation failed.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate AI analysis at this time. Please check your API key.";
  }
};