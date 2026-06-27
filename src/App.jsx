import { useState } from "react";

const SYSTEM_PROMPT = `You are a pharmaceutical scientist. Respond ONLY with raw valid JSON, no markdown, no explanation, no backticks.

Given a disease or medicine name, return this JSON:
{
  "subject": "name",
  "input_type": "disease or medicine",
  "existing_formulations": [
    {
      "name": "formulation name",
      "type": "dosage form",
      "description": "2-3 sentence description",
      "key_excipients": ["excipient1", "excipient2"],
      "reference": "Author et al., Journal, Year, DOI"
    }
  ],
  "novel_formulation": {
    "name": "novel formulation name",
    "concept": "1 sentence innovation concept",
    "why_novel": "2-3 sentences on novelty and non-obviousness",
    "patentability": "2-3 sentences on patent eligibility",
    "steps": [
      {"step": 1, "title": "title", "detail": "instruction"},
      {"step": 2, "title": "title", "detail": "instruction"},
      {"step": 3, "title": "title", "detail": "instruction"},
      {"step": 4, "title": "title", "detail": "instruction"},
      {"step": 5, "title": "title", "detail": "instruction"}
    ],
    "components": ["component1", "component2", "component3"],
    "industrial_use": "1-2 sentences on industrial application",
    "references": ["Ref 1: Author, Journal, Year", "Ref 2: Author, Journal, Year"]
  }
}
Limit existing_formulations to 3 entries. Keep all text concise.`;

export default function PharmaApp() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("existing");
  const [rawDebug, setRawDebug] = useState("");

  const examples = ["Diabetes", "Ibuprofen", "Breast Cancer", "Metformin", "Hypertension", "Paclitaxel"];

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setRawDebug("");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2500,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: query.trim() }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const raw = (data.content || []).map(b => b.text || "").join("").trim();
      setRawDebug(raw);

      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found in response. Raw: " + raw.slice(0, 200));
      const parsed = JSON.parse(match[0]);
      setResult(parsed);
      setActiveTab("existing");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const card = (children, extra = {}) => ({
    background: "#0d1b3e",
    border: "1px solid #1e3a5f",
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
    ...extra
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e8f0fe", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#0d1b3e,#112240)", borderBottom: "1px solid #1e3a5f", padding: "24px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 12, letterSpacing: 4, color: "#4a9eff", textTransform: "uppercase", marginBottom: 6 }}>Pharmaceutical Intelligence</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, background: "linear-gradient(90deg,#4a9eff,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PharmaFormulate AI</h1>
        <p style={{ color: "#7a9cc4", marginTop: 6, fontSize: 13 }}>Existing formulations + novel patentable innovations</p>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 16px" }}>
        <div style={card({}, { marginBottom: 20 })}>
          <label style={{ display: "block", fontSize: 11, color: "#7a9cc4", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Disease / Condition or Medicine / Drug</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="e.g. Diabetes, Ibuprofen, Paclitaxel..." style={{ flex: 1, background: "#060d1f", border: "1px solid #1e3a5f", borderRadius: 10, padding: "13px 16px", color: "#e8f0fe", fontSize: 15, outline: "none" }} />
            <button onClick={handleSearch} disabled={loading || !query.trim()} style={{ background: loading ? "#1e3a5f" : "linear-gradient(135deg,#4a9eff,#7c3aed)", border: "none", borderRadius: 10, padding: "13px 26px", color: "white", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontSize: 15, minWidth: 110 }}>{loading ? "⏳ Wait..." : "Analyze →"}</button>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#4a6080" }}>Try:</span>
            {examples.map(q => (<button key={q} onClick={() => setQuery(q)} style={{ background: "#112240", border: "1px solid #1e3a5f", borderRadius: 20, padding: "3px 12px", color: "#7ab3ff", fontSize: 12, cursor: "pointer" }}>{q}</button>))}
          </div>
        </div>

        {loading && (<div style={{ textAlign: "center", padding: "48px 0" }}><div style={{ fontSize: 44, marginBottom: 12 }}>⚗️</div><div style={{ color: "#4a9eff", fontSize: 15, marginBottom: 6 }}>Analyzing pharmaceutical data...</div><div style={{ color: "#4a6080", fontSize: 13 }}>This may take 15–30 seconds</div></div>)}

        {error && !loading && (<div style={{ background: "#1a0808", border: "1px solid #5f1e1e", borderRadius: 12, padding: 16, marginBottom: 14 }}><div style={{ color: "#ff6b6b", fontWeight: 600, marginBottom: 6 }}>⚠️ Error</div><div style={{ color: "#cc8888", fontSize: 13 }}>{error}</div></div>)}

        {result && !loading && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 2 }}>{result.input_type === "disease" ? "Disease / Condition" : "Medicine / Drug"}</div>
              <h2 style={{ fontSize: 24, margin: "4px 0 0" }}>{result.subject}</h2>
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "#060d1f", borderRadius: 12, padding: 4 }}>
              {[{ id: "existing", label: `📋 Existing (${result.existing_formulations?.length || 0})` }, { id: "novel", label: "🔬 Novel Formulation" }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "none", background: activeTab === tab.id ? "linear-gradient(135deg,#1e3a5f,#2d1b69)" : "transparent", color: activeTab === tab.id ? "#e8f0fe" : "#4a6080", fontWeight: activeTab === tab.id ? 600 : 400, cursor: "pointer", fontSize: 13 }}>{tab.label}</button>
              ))}
            </div>

            {activeTab === "existing" && (
              <div>
                {result.existing_formulations?.map((f, i) => (
                  <div key={i} style={card()}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 16 }}>{f.name}</h3>
                      <span style={{ padding: "2px 10px", background: "#112240", borderRadius: 20, fontSize: 11, color: "#4a9eff", border: "1px solid #1e3a5f" }}>{f.type}</span>
                    </div>
                    <p style={{ color: "#a0b8d4", fontSize: 13, lineHeight: 1.7, margin: "0 0 12px" }}>{f.description}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                      {f.key_excipients?.map((e, j) => (<span key={j} style={{ background: "#060d1f", border: "1px solid #1e3a5f", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#7ab3ff" }}>{e}</span>))}
                    </div>
                    {f.reference && (<div style={{ background: "#060d1f", borderRadius: 8, padding: "10px 14px", borderLeft: "3px solid #4a9eff", fontSize: 12, color: "#7a9cc4" }}>📄 {f.reference}</div>)}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "novel" && result.novel_formulation && (
              <div>
                <div style={{ ...card(), background: "linear-gradient(135deg,#1a0a3e,#0d1b3e)", border: "1px solid #7c3aed" }}>
                  <div style={{ fontSize: 10, color: "#a78bfa", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>💡 Novel Concept</div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{result.novel_formulation.name}</h3>
                  <p style={{ margin: 0, color: "#c4b5fd", fontSize: 14, lineHeight: 1.6 }}>{result.novel_formulation.concept}</p>
                </div>
                <div style={card()}>
                  <div style={{ fontSize: 10, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>🆕 Novelty</div>
                  <p style={{ margin: 0, color: "#a0b8d4", fontSize: 13, lineHeight: 1.7 }}>{result.novel_formulation.why_novel}</p>
                </div>
                <div style={{ ...card(), border: "1px solid #1e5f3a" }}>
                  <div style={{ fontSize: 10, color: "#34d399", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>⚖️ Patentability</div>
                  <p style={{ margin: "0 0 10px", color: "#a0b8d4", fontSize: 13, lineHeight: 1.7 }}>{result.novel_formulation.patentability}</p>
                  <div style={{ background: "#060d1f", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#7ab3ff" }}>🏭 {result.novel_formulation.industrial_use}</div>
                </div>
                <div style={card()}>
                  <div style={{ fontSize: 10, color: "#fbbf24", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>🧪 Method of Preparation</div>
                  {result.novel_formulation.steps?.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                      <div style={{ minWidth: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#d97706,#92400e)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{s.step}</div>
                      <div><div style={{ fontWeight: 600, color: "#fbbf24", fontSize: 13, marginBottom: 3 }}>{s.title}</div><div style={{ color: "#a0b8d4", fontSize: 13, lineHeight: 1.6 }}>{s.detail}</div></div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#1a0a0a", border: "1px solid #3a1e1e", borderRadius: 10, padding: 14 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#7a5a5a", lineHeight: 1.6 }}>⚠️ <strong style={{ color: "#ff8a80" }}>Disclaimer:</strong> AI-generated for research ideation only. Consult a patent attorney before filing.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {!result && !loading && !error && (
          <div style={{ textAlign: "center", padding: "56px 0", color: "#2a4060" }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>⚗️</div>
            <div style={{ fontSize: 15, color: "#3a5a80", marginBottom: 6 }}>Enter a disease or medicine name above</div>
            <div style={{ fontSize: 13 }}>Get existing formulations + a novel patentable innovation</div>
          </div>
        )}
      </div>
    </div>
  );
    }
