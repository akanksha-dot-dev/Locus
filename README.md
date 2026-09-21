# AI Customer Support Knowledge Agent (Swytchcode Hackathon)

> **Track 1 Winner Submission: Build with Swytchcode Hackathon**  
> An autonomous end-to-end customer support resolution agent powered by **Swytchcode**, **LangGraph**, and **Google Gemini**, with an interactive **Streamlit Dashboard** and companion **Google Chrome Extension**.

---

## 📁 Repository Structure

- [`support-agent/`](./support-agent) — Full project source code, agent nodes, and integrations
  - [`src/`](./support-agent/src) — LangGraph state machine & 7 specialized workflow nodes
  - [`dashboard/`](./support-agent/dashboard) — Real-time interactive Streamlit web dashboard
  - [`extension/`](./support-agent/extension) — Chrome Extension (Manifest V3) for Gmail integration
  - [`server.py`](./support-agent/server.py) — FastAPI backend server for Chrome Extension API
  - [`main.py`](./support-agent/main.py) — CLI runner supporting demo, verification, and live modes
  - [`policies.json`](./support-agent/policies.json) — Production Swytchcode security & execution policies
  - [`beginner_setup_guide.md`](./support-agent/beginner_setup_guide.md) — Step-by-step setup guide for beginners
  - [`README.md`](./support-agent/README.md) — Comprehensive technical documentation & architecture

---

## 🚀 Quick Start

For detailed setup, architectural diagrams, and feature walkthroughs, please see the **[Support Agent Documentation](./support-agent/README.md)**.
