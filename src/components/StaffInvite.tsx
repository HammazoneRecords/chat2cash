import React, { useState } from "react";

export default function StaffInvite() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const accept = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/staff/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, name, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invite acceptance failed.");
      window.location.href = "/admin-dashboard";
    } catch (err: any) {
      setError(err.message || "Invite acceptance failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#060a13", color: "#cbd5e1", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={accept} style={{ width: "100%", maxWidth: 440, background: "#0a1020", border: "1px solid #1e293b", borderRadius: 16, padding: 28, display: "grid", gap: 14 }}>
        <div>
          <div style={{ color: "#10b981", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>CHAT2CASH STAFF</div>
          <h1 style={{ color: "#fff", margin: "8px 0 4px", fontSize: 24 }}>Accept staff invite</h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Create your individual staff login.</p>
        </div>
        {!token && <div style={{ color: "#fca5a5", fontSize: 13 }}>Invite token is missing.</div>}
        {error && <div style={{ color: "#fca5a5", fontSize: 13 }}>{error}</div>}
        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
        <input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (8+ characters)" style={inputStyle} />
        <button disabled={!token || loading} style={buttonStyle}>{loading ? "Creating account..." : "Accept Invite"}</button>
      </form>
    </main>
  );
}

const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: "12px 14px", borderRadius: 10, border: "1px solid #1e293b", background: "#070b16", color: "#fff", fontSize: 14 };
const buttonStyle = { padding: "12px 14px", border: 0, borderRadius: 10, background: "#10b981", color: "#060a13", fontWeight: 800, cursor: "pointer" };
