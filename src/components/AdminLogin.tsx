import React, { useState, useRef, useCallback } from "react";

const TOTAL_CLICKS = 5;

type ZoneId = "L1" | "V1" | "L2" | "V2" | "R1" | "V3" | "R2";

interface ClickedZone { zone: ZoneId; ts: number }

export default function AdminLogin() {
  const [clicks, setClicks] = useState<ClickedZone[]>([]);
  const [phase, setPhase] = useState<"picture" | "passphrase" | "error">("picture");
  const [passphrase, setPassphrase] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setClicks([]);
      setPhase("picture");
    }, 600);
  };

  const handleZoneClick = useCallback(async (e: React.MouseEvent<SVGElement>) => {
    if (phase !== "picture") return;
    // All clicks count — zone ID or null (non-zone clicks still register as attempts)
    const zone = ((e.target as SVGElement).getAttribute("data-zone") || "XX") as ZoneId;

    const next = [...clicks, { zone, ts: Date.now() }];
    setClicks(next);

    if (next.length < TOTAL_CLICKS) return;

    // Submit sequence to server
    setLoading(true);
    try {
      const res = await fetch("/api/admin/picture-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence: next.map(c => c.zone) }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.token) {
        setTempToken(data.token);
        setPhase("passphrase");
      } else {
        triggerShake();
      }
    } catch {
      triggerShake();
    } finally {
      setLoading(false);
    }
  }, [clicks, phase]);

  const handlePassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, passphrase: passphrase.trim() }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/admin-dashboard";
      } else {
        setPassphrase("");
        setPhase("picture");
        setClicks([]);
        setTempToken("");
        triggerShake();
      }
    } catch {
      setPhase("picture");
      setClicks([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#060a13",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 440,
        animation: shake ? "shake 0.4s ease" : undefined,
      }}>

        {/* Logo — click zones active */}
        <div style={{ position: "relative", marginBottom: 32 }}>
          <svg
            ref={svgRef}
            viewBox="0 0 400 300"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", borderRadius: 16, cursor: phase === "picture" ? "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><text y='20' font-size='20'>☥</text></svg>\") 12 12, auto" : "default" }}
            onClick={phase === "picture" ? handleZoneClick : undefined}
          >
            <rect width="400" height="300" fill="#060a13" rx="12"/>

            <defs>
              <linearGradient id="mwG" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981"/>
                <stop offset="50%" stopColor="#14b8a6"/>
                <stop offset="100%" stopColor="#ef4444"/>
              </linearGradient>
            </defs>

            {/* MW Wave */}
            <path
              d="M 30 220 C 30 220, 50 80, 80 80 C 110 80, 120 160, 140 160 C 160 160, 170 80, 200 80 C 230 80, 240 220, 260 220 C 280 220, 290 80, 320 80 C 350 80, 360 160, 370 220"
              fill="none" stroke="url(#mwG)" strokeWidth="8"
              strokeLinecap="round" strokeLinejoin="round"
            />

            <text x="200" y="265" textAnchor="middle" fill="#1e293b"
              fontFamily="monospace" fontSize="11" letterSpacing="4">MINDWAVE</text>

            {/* Invisible zones */}
            <rect data-zone="L1" x="40" y="60" width="70" height="120" fill="transparent" style={{ cursor: "pointer" }}/>
            <rect data-zone="V1" x="115" y="120" width="50" height="100" fill="transparent" style={{ cursor: "pointer" }}/>
            <rect data-zone="L2" x="155" y="60" width="70" height="120" fill="transparent" style={{ cursor: "pointer" }}/>
            <rect data-zone="V2" x="220" y="160" width="50" height="80" fill="transparent" style={{ cursor: "pointer" }}/>
            <rect data-zone="R1" x="265" y="60" width="55" height="120" fill="transparent" style={{ cursor: "pointer" }}/>
            <rect data-zone="V3" x="315" y="120" width="30" height="100" fill="transparent" style={{ cursor: "pointer" }}/>
            <rect data-zone="R2" x="340" y="60" width="40" height="120" fill="transparent" style={{ cursor: "pointer" }}/>

            {/* No progress indicator — all clicks look the same to the outside */}
          </svg>

        </div>

        {/* Passphrase input — slides in after correct sequence */}
        {phase === "passphrase" && (
          <form onSubmit={handlePassphrase} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              autoFocus
              type="password"
              placeholder="—"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              style={{
                width: "100%", padding: "14px 18px",
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: 10, color: "#e2e8f0",
                fontSize: 18, fontFamily: "monospace",
                letterSpacing: 4, textAlign: "center",
                boxSizing: "border-box" as const,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !passphrase.trim()}
              style={{
                padding: "12px 0", background: "#10b981",
                color: "#060a13", border: "none", borderRadius: 10,
                fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "..." : "Enter"}
            </button>
          </form>
        )}

        {loading && phase === "picture" && (
          <div style={{ textAlign: "center", color: "#10b981", fontSize: 12, fontFamily: "monospace" }}>
            ···
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
}
