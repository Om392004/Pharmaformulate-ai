import { useState, useEffect, useRef } from "react";

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
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem("pharma_api_key") || ""; } catch { return ""; }
  });
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pharma_recent") || "[]"); } catch { return []; }
  });
  const inputRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  const examples = ["Diabetes", "Ibuprofen", "Breast Cancer", "Metformin", "Hypertension", "Paclitaxel", "Alzheimer's", "Rheumatoid Arthritis"];

  function saveToRecent(q) {
    setRecentSearches(prev => {
      const updated = [q, ...prev.filter(x => x !== q)].slice(0, 6);
      try { localStorage.setItem("pharma_recent", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setRawDebug("");
    setActiveTab("existing");

    const key = apiKey.trim();
    if (!key) {
      setShowApiKeyModal(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
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
      if (!match) throw new Error("No JSON found in response.");
      const parsed = JSON.parse(match[0]);
      setResult(parsed);
      saveToRecent(query.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function clearSearch() {
    setQuery("");
    setResult(null);
    setError("");
    setRawDebug("");
    inputRef.current?.focus();
  }

  function saveApiKey() {
    try { localStorage.setItem("pharma_api_key", apiKey); } catch {}
    setShowApiKeyModal(false);
  }

  const card = (children, extra = {}) => ({
    background: "#0d1b3e",
    border: "1px solid #1e3a5f",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
    transition: "all 0.3s ease",
    ...extra
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0f1e",
      color: "#e8f0fe",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      overflowX: "hidden"
    }}>
      
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#0d1b3e", border: "1px solid #1e3a5f",
            borderRadius: 20, padding: 32, maxWidth: 420, width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
          }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, color: "#e8f0fe" }}>🔐 API Key Required</h3>
            <p style={{ color: "#7a9cc4", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              Enter your Anthropic API key to use PharmaFormulate AI. Your key is stored locally in your browser and never sent to our servers.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{
                width: "100%", background: "#060d1f", border: "1px solid #1e3a5f",
                borderRadius: 12, padding: "14px 16px", color: "#e8f0fe",
                fontSize: 14, outline: "none", marginBottom: 16, boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={saveApiKey}
                disabled={!apiKey.trim()}
                style={{
                  flex: 1, background: "linear-gradient(135deg,#4a9eff,#7c3aed)",
                  border: "none", borderRadius: 12, padding: "13px 20px",
                  color: "white", fontWeight: 600, cursor: apiKey.trim() ? "pointer" : "not-allowed",
                  fontSize: 14
                }}
              >
                Save & Continue
              </button>
              <button
                onClick={() => setShowApiKeyModal(false)}
                style={{
                  flex: 1, background: "transparent", border: "1px solid #1e3a5f",
                  borderRadius: 12, padding: "13px 20px", color: "#7a9cc4",
                  fontWeight: 600, cursor: "pointer", fontSize: 14
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animated Background Particles */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: "none", zIndex: 0, overflow: "hidden"
      }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: Math.random() * 4 + 1,
            height: Math.random() * 4 + 1,
            background: "rgba(74, 158, 255, 0.15)",
            borderRadius: "50%",
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${Math.random() * 20 + 15}s infinite ease-in-out`,
            animationDelay: `${Math.random() * 10}s`
          }} />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.6; }
          50% { transform: translateY(-15px) translateX(-10px); opacity: 0.4; }
          75% { transform: translateY(-40px) translateX(5px); opacity: 0.5; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(74, 158, 255, 0.1); }
          50% { box-shadow: 0 0 40px rgba(74, 158, 255, 0.25); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg,#0d1b3e,#112240)",
        borderBottom: "1px solid rgba(30, 58, 95, 0.6)",
        padding: "32px 20px", textAlign: "center",
        position: "relative", zIndex: 1
      }}>
        <div style={{
          fontSize: 11, letterSpacing: 5, color: "#4a9eff",
          textTransform: "uppercase", marginBottom: 8,
          opacity: mounted ? 1 : 0, transition: "opacity 0.8s ease"
        }}>
          Pharmaceutical Intelligence
        </div>
        <h1 style={{
          fontSize: 32, fontWeight: 800, margin: 0,
          background: "linear-gradient(90deg,#4a9eff,#a78bfa,#4a9eff)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          opacity: mounted ? 1 : 0,
          transition: "opacity 1s ease 0.2s"
        }}>
          PharmaFormulate AI
        </h1>
        <p style={{
          color: "#7a9cc4", marginTop: 10, fontSize: 14,
          opacity: mounted ? 1 : 0, transition: "opacity 1s ease 0.4s"
        }}>
          Discover existing formulations & generate novel patentable innovations
        </p>
        
        {/* Settings button */}
        <button
          onClick={() => setShowApiKeyModal(true)}
          style={{
            position: "absolute", top: 20, right: 20,
            background: "rgba(74, 158, 255, 0.1)", border: "1px solid rgba(74, 158, 255, 0.3)",
            borderRadius: 10, padding: "8px 14px", color: "#4a9eff",
            fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
          }}
        >
          ⚙️ {apiKey ? "API Key Set" : "Set API Key"}
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px", position: "relative", zIndex: 1 }}>

        {/* Search Card */}
        <div style={{
          ...card(),
          animation: mounted ? "fadeInUp 0.6s ease-out 0.3s forwards" : "none",
          opacity: mounted ? undefined : 0
        }}>
          <label style={{
            display: "block", fontSize: 11, color: "#7a9cc4",
            marginBottom: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600
          }}>
            Disease / Condition or Medicine / Drug
          </label>
          <div style={{ display: "flex", gap: 12, position: "relative" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="e.g. Diabetes, Ibuprofen, Paclitaxel..."
                style={{
                  width: "100%", background: "#060d1f", border: "1px solid #1e3a5f",
                  borderRadius: 14, padding: "15px 44px 15px 18px", color: "#e8f0fe",
                  fontSize: 15, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.3s, box-shadow 0.3s"
                }}
                onFocus={e => {
                  e.target.style.borderColor = "#4a9eff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(74, 158, 255, 0.15)";
                }}
                onBlur={e => {
                  e.target.style.borderColor = "#1e3a5f";
                  e.target.style.boxShadow = "none";
                }}
              />
              {query && (
                <button
                  onClick={clearSearch}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "#4a6080", fontSize: 18,
                    cursor: "pointer", padding: 4
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              style={{
                background: loading ? "#1e3a5f" : "linear-gradient(135deg,#4a9eff,#7c3aed)",
                border: "none", borderRadius: 14, padding: "15px 28px",
                color: "white", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                fontSize: 15, minWidth: 130,
                boxShadow: loading ? "none" : "0 4px 20px rgba(74, 158, 255, 0.3)",
                transition: "all 0.3s ease",
                display: "flex", alignItems: "center", gap: 8
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 30px rgba(74, 158, 255, 0.4)";
                }
              }}
              onMouseLeave={e => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = loading ? "none" : "0 4px 20px rgba(74, 158, 255, 0.3)";
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                  Analyzing...
                </>
              ) : (
                <>Analyze →</>
              )}
            </button>
          </div>

          {/* Examples */}
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#4a6080", fontWeight: 500 }}>Try:</span>
            {examples.map(q => (
              <button key={q} onClick={() => setQuery(q)}
                style={{
                  background: "#112240", border: "1px solid #1e3a5f",
                  borderRadius: 20, padding: "5px 14px", color: "#7ab3ff",
                  fontSize: 12, cursor: "pointer", transition: "all 0.2s ease",
                  fontWeight: 500
                }}
                onMouseEnter={e => {
                  e.target.style.background = "#1a3050";
                  e.target.style.borderColor = "#4a9eff";
                  e.target.style.color = "#4a9eff";
                }}
                onMouseLeave={e => {
                  e.target.style.background = "#112240";
                  e.target.style.borderColor = "#1e3a5f";
                  e.target.style.color = "#7ab3ff";
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#4a6080", fontWeight: 500 }}>Recent:</span>
              {recentSearches.map(q => (
                <button key={q} onClick={() => setQuery(q)}
                  style={{
                    background: "transparent", border: "1px dashed #2a4060",
                    borderRadius: 20, padding: "4px 12px", color: "#5a80a0",
                    fontSize: 11, cursor: "pointer"
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="fade-in-up" style={{ textAlign: "center", padding: "56px 0" }}>
            <div style={{
              fontSize: 52, marginBottom: 16,
              animation: "pulse-glow 2s infinite"
            }}>⚗️</div>
            <div style={{ color: "#4a9eff", fontSize: 16, marginBottom: 8, fontWeight: 500 }}>
              Analyzing pharmaceutical data...
            </div>
            <div style={{ color: "#4a6080", fontSize: 13 }}>
              This may take 15–30 seconds
            </div>
            <div style={{
              width: 200, height: 3, background: "#1e3a5f",
              borderRadius: 2, margin: "20px auto 0", overflow: "hidden"
            }}>
              <div style={{
                height: "100%", width: "60%", background: "linear-gradient(90deg,#4a9eff,#7c3aed)",
                borderRadius: 2, animation: "shimmer 1.5s infinite"
              }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="fade-in-up" style={{
            background: "linear-gradient(135deg,#1a0808,#1a0a0a)",
            border: "1px solid #5f1e1e", borderRadius: 16, padding: 20, marginBottom: 16
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span style={{ color: "#ff6b6b", fontWeight: 700, fontSize: 15 }}>Error</span>
            </div>
            <div style={{ color: "#cc8888", fontSize: 13, lineHeight: 1.6 }}>{error}</div>
            {rawDebug && (
              <details style={{ marginTop: 12 }}>
                <summary style={{ color: "#7a5a5a", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
                  Raw API response
                </summary>
                <pre style={{
                  color: "#7a5a5a", fontSize: 11, marginTop: 8,
                  whiteSpace: "pre-wrap", wordBreak: "break-all",
                  background: "#0a0f1e", padding: 12, borderRadius: 8
                }}>
                  {rawDebug.slice(0, 600)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="fade-in-up">
            {/* Subject Header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              marginBottom: 20, flexWrap: "wrap", gap: 10
            }}>
              <div>
                <div style={{
                  fontSize: 11, color: "#4a9eff", textTransform: "uppercase",
                  letterSpacing: 2, fontWeight: 600, marginBottom: 6
                }}>
                  {result.input_type === "disease" ? "Disease / Condition" : "Medicine / Drug"}
                </div>
                <h2 style={{ fontSize: 26, margin: "4px 0 0", fontWeight: 700 }}>{result.subject}</h2>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={copyToClipboard}
                  style={{
                    background: copied ? "#1e5f3a" : "#112240",
                    border: `1px solid ${copied ? "#34d399" : "#1e3a5f"}`,
                    borderRadius: 1
