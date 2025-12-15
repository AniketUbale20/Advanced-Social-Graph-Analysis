# 🕸️ Social Pulse: Advanced Twitter Network Analysis

### Beyond standard metrics: Analyze "Relationship Vibes" and Simulate Virality.

**Social Pulse** is not just a follower graph; it's a behavioral analysis tool. It uses Python, NetworkX, and Pandas to uncover the *quality* of connections, not just the quantity.
# 🕸️ Social Pulse: Advanced Twitter Network Analysis

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![D3.js](https://img.shields.io/badge/D3.js-F9A03C?style=for-the-badge&logo=d3.js&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

**Social Pulse** (also known as *TwitterNet Analyst*) is a professional Network Analysis Dashboard designed to bridge the gap between complex data science and actionable insights. It combines client-side graph algorithms with **Generative AI** to visualize communities, identify influencers, and narrate the story behind the data.

> **Live Demo:** [Insert Link Here if deployed]

---

## 🚀 Key Features

### 📊 Interactive Network Topology
* **Force-Directed Graph:** Built with **D3.js**, featuring physics-based interactions (drag, zoom, pan).
* **Community Detection:** Automatically clusters users into color-coded communities using the **Label Propagation** algorithm.
* **Influencer Sizing:** Nodes are sized dynamically based on their **PageRank** score.
* **Ego-Net View:** Click any node to isolate its direct connections and inspect its local network.

### 🧠 AI Analyst (Powered by Google Gemini)
* **Automated Reporting:** Instead of just showing numbers, the app sends graph metrics to **Google's Gemini 2.5 Flash** model.
* **Narrative Insights:** Generates a professional textual analysis covering network density, key opinion leaders, and community structure.

### 🎓 Educational "Code Mode"
* **Learn as you Analyze:** A dedicated tab shows the equivalent **Python (NetworkX/Pandas)** code for the operations happening in the UI. Perfect for users learning Data Science.

### 💾 Export & Sharing
* **Data Export:** Download node metrics and edge lists as **CSV**.
* **Visual Export:** Capture high-resolution **PNG** images of the current graph state.
* **Graph Data:** Export the full structure as **JSON**.

---

## 🛠️ Tech Stack

* **Frontend:** React 19, TypeScript, Vite
* **Visualization:** D3.js (Force Simulation, Zoom, Drag)
* **Styling:** Tailwind CSS
* **AI Integration:** Google GenAI SDK (`@google/genai`)
* **Icons:** Lucide React

---

## 📦 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/yourusername/social-pulse.git](https://github.com/yourusername/social-pulse.git)
    cd social-pulse
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure API Key:**
    * Create a file named `.env.local` in the root directory.
    * Add your Google Gemini API key:
        ```env
        GEMINI_API_KEY=your_api_key_here
        ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open in Browser:**
    Navigate to `http://localhost:3000`

---

## 📂 Usage Guide

### 1. Load Data
* **Sample Data:** Click the "Refresh/Sample" button to load a generated **Barabási–Albert** scale-free network.
* **Upload CSV:** Upload your own edge list. The CSV must have `source` and `target` columns (header optional).
    ```csv
    source,target
    user_a,user_b
    user_b,user_c
    ```

### 2. Analyze
* The dashboard automatically calculates **Degree**, **PageRank**, **Density**, and **Modularity**.
* Click **"Generate Report"** in the AI Analyst panel to get a written summary of the network.

### 3. Explore
* **Hover** over nodes to see specific metrics.
* **Click** a node to focus on its connections.
* **Switch Tabs** to view the underlying Python logic.

---

## 🔮 Roadmap (Future Features)

* [ ] **Relationship Flavor Map:** Analyze tweet content to color-code edges (Hostile vs. Supportive) using Sentiment Analysis.
* [ ] **Virality Simulator:** A "What-If" sandbox to simulate how a message spreads from a specific node.
* [ ] **Bridge Recommender:** Suggest specific users to connect to bridge two opposing communities.

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any features or bug fixes.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
