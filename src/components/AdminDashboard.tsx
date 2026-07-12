import React, { useState, useEffect } from "react";
import { authClient } from "../../lib/auth-client";

type Dataset = {
  id: string; userId: string; status: string; payoutAmount: number;
  currency: string; createdAt: string; dupStatus: string;
  fullName: string; email: string; wipayLink: string;
  metadata: any; dialogues: any[];
};

type FlaggedDataset = Dataset & { dupStatus: "duplicate" | "partial" | "flagged" };

type Tab = "datasets" | "flagged" | "accounts" | "staff" | "audit";

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("datasets");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [flagged, setFlagged] = useState<FlaggedDataset[]>([]);
  const [flaggedAccounts, setFlaggedAccounts] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [receiptInputs, setReceiptInputs] = useState<Record<string, string>>({});
  const [expandedDatasetId, setExpandedDatasetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [dsRes, flRes, acRes, auRes, staffRes] = await Promise.all([
        fetch("/api/admin/datasets", { credentials: "include" }),
        fetch("/api/admin/flagged", { credentials: "include" }),
        fetch("/api/admin/flagged-accounts", { credentials: "include" }),
        fetch("/api/admin/audit", { credentials: "include" }),
        fetch("/api/admin/staff", { credentials: "include" }),
      ]);
      if (dsRes.ok) setDatasets(await dsRes.json());
      if (flRes.ok) setFlagged(await flRes.json());
      if (acRes.ok) setFlaggedAccounts(await acRes.json());
      if (auRes.ok) setAuditLog(await auRes.json());
      if (staffRes.ok) setStaff(await staffRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = statusFilter === "ALL" ? datasets : datasets.filter(d => d.status === statusFilter);

  const exportDataset = (id: string) => {
    window.open(`/api/admin/datasets/${id}/export`, "_blank");
  };

  const exportAll = () => {
    window.open("/api/admin/export-all", "_blank");
  };

  const approvePayout = async (datasetId: string, userId: string, amount: number) => {
    await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasetId, userId, amount, currency: "JMD" }),
      credentials: "include",
    });
    load();
  };

  const markDisbursed = async (datasetId: string) => {
    await fetch("/api/admin/payout-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasetId }),
      credentials: "include",
    });
    load();
  };

  const decideModeration = async (datasetId: string, decision: "approve" | "reject" | "hold" | "correction") => {
    await fetch("/api/moderation/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasetId, decision, reason: `Admin dashboard decision: ${decision}` }),
      credentials: "include",
    });
    load();
  };

  const addProof = async (datasetId: string) => {
    const receiptNumber = receiptInputs[datasetId];
    if (!receiptNumber?.trim()) return;
    await fetch("/api/admin/payout-proof", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasetId, receiptNumber }),
      credentials: "include",
    });
    load();
  };

  const clearStrikes = async (userId: string) => {
    await fetch("/api/admin/clear-strikes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
      credentials: "include",
    });
    load();
  };

  const addStrike = async (userId: string, reason: string) => {
    await fetch("/api/admin/add-strike", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, reason }),
      credentials: "include",
    });
    load();
  };

  const clearFlag = async (datasetId: string) => {
    await fetch("/api/admin/flag-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasetId }),
      credentials: "include",
    });
    load();
  };

  const inviteStaff = async () => {
    const email = window.prompt("Staff email");
    const role = window.prompt("Role: moderator or admin", "moderator");
    if (!email || !role) return;
    await fetch("/api/admin/staff/invite", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ email, role }),
    });
    load();
  };

  const staffAction = async (path: string, userId: string, body: any = {}) => {
    await fetch(path, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ userId, ...body }),
    });
    load();
  };

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  const card = (label: string, value: string | number) => (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b", borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    </div>
  );

  const totalPaid = datasets.filter(d => d.status === "Disbursed").reduce((s, d) => s + (d.payoutAmount || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#060a13", color: "#cbd5e1", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>Chat2Cash Admin</div>
            <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>Admin Dashboard</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={exportAll} style={btnStyle("#1e293b", "#94a3b8")}>Export All</button>
            <button onClick={handleLogout} style={btnStyle("#7f1d1d", "#fca5a5")}>Logout</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 28 }}>
          {card("Total datasets", datasets.length)}
          {card("Pending review", datasets.filter(d => d.status === "Pending Review").length)}
          {card("Disbursed", datasets.filter(d => d.status === "Disbursed").length)}
          {card("JMD paid out", `$${Math.round(totalPaid).toLocaleString()}`)}
          {card("Flagged datasets", flagged.length)}
          {card("Flagged accounts", flaggedAccounts.length)}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #1e293b", paddingBottom: 12 }}>
          {(["datasets", "flagged", "accounts", "staff", "audit"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700,
              cursor: "pointer",
              background: tab === t ? "#10b981" : "transparent",
              color: tab === t ? "#060a13" : "#64748b",
            }}>
              {t === "datasets" ? "Datasets"
                : t === "flagged" ? `Flagged (${flagged.length})`
                : t === "accounts" ? `Accounts (${flaggedAccounts.length} flagged)`
                : t === "staff" ? `Staff (${staff.length})`
                : "Audit Log"}
            </button>
          ))}
        </div>

        {loading && <div style={{ color: "#64748b", fontFamily: "monospace", fontSize: 13 }}>Loading...</div>}

        {/* Datasets tab */}
        {!loading && tab === "datasets" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {["ALL", "Pending Review", "Approved", "Disbursed"].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  padding: "4px 12px", borderRadius: 6, border: "1px solid #1e293b", fontSize: 12,
                  cursor: "pointer", fontWeight: 600,
                  background: statusFilter === s ? "#1e293b" : "transparent",
                  color: statusFilter === s ? "#fff" : "#64748b",
                }}>
                  {s}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(d => (
                <div key={d.id} style={{
                  background: "#080d1a", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: "#10b981", marginBottom: 4 }}>{d.id}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{d.fullName || d.userId}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{d.email}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 700,
                        background: d.status === "Disbursed" ? "#14532d" : d.status === "Approved" ? "#1e3a5f" : "#1e293b",
                        color: d.status === "Disbursed" ? "#86efac" : d.status === "Approved" ? "#93c5fd" : "#94a3b8",
                      }}>
                        {d.status}
                      </span>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#10b981" }}>
                        ${(d.payoutAmount || 0).toFixed(2)} {d.currency}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button onClick={() => exportDataset(d.id)} style={btnStyle("#1e293b", "#94a3b8")}>Export JSON</button>
                    <button onClick={() => setExpandedDatasetId(expandedDatasetId === d.id ? null : d.id)} style={btnStyle("#0f3460", "#93c5fd")}>
                      {expandedDatasetId === d.id ? "Hide Review" : "Review Evidence"}
                    </button>

                    {d.wipayLink && (
                      <a href={d.wipayLink} target="_blank" rel="noreferrer" style={{ ...btnStyle("#0f3460", "#60a5fa"), textDecoration: "none", display: "inline-block" }}>
                        WiPay Link ↗
                      </a>
                    )}

                    {d.status === "Pending Review" && (
                      <>
                        <button onClick={() => decideModeration(d.id, "approve")} style={btnStyle("#14532d", "#86efac")}>
                          Approve Review
                        </button>
                        <button onClick={() => decideModeration(d.id, "hold")} style={btnStyle("#3f2f12", "#fbbf24")}>
                          Hold
                        </button>
                        <button onClick={() => decideModeration(d.id, "correction")} style={btnStyle("#1e293b", "#93c5fd")}>
                          Request Correction
                        </button>
                        <button onClick={() => decideModeration(d.id, "reject")} style={btnStyle("#7f1d1d", "#fca5a5")}>
                          Reject
                        </button>
                      </>
                    )}

                    {d.status === "Approved" && (
                      <>
                        <button onClick={() => approvePayout(d.id, d.userId, d.payoutAmount)} style={btnStyle("#14532d", "#86efac")}>
                          Queue Payout
                        </button>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            placeholder="Receipt #"
                            value={receiptInputs[d.id] || ""}
                            onChange={e => setReceiptInputs(p => ({ ...p, [d.id]: e.target.value }))}
                            style={{
                              padding: "4px 10px", background: "#0d1527", border: "1px solid #1e293b",
                              borderRadius: 6, color: "#fff", fontSize: 12, fontFamily: "monospace", width: 130,
                            }}
                          />
                          <button onClick={() => addProof(d.id)} style={btnStyle("#1e293b", "#fbbf24")}>Add Proof</button>
                        </div>
                        <button onClick={() => markDisbursed(d.id)} style={btnStyle("#1a3a1a", "#4ade80")}>Mark Disbursed</button>
                      </>
                    )}
                  </div>

                  {expandedDatasetId === d.id && (
                    <div style={{ marginTop: 14, padding: 14, background: "#050810", border: "1px solid #1e293b", borderRadius: 8, display: "grid", gap: 12 }}>
                      <div>
                        <div style={evidenceLabel}>Context signals</div>
                        {d.metadata?.contextSignals?.length ? d.metadata.contextSignals.map((signal: any, index: number) => (
                          <div key={index} style={evidenceRow}>{signal.kind} · message {signal.fromMessage} → {signal.toMessage} · {Math.round((signal.confidence || 0) * 100)}%</div>
                        )) : <div style={evidenceEmpty}>No context signals were detected.</div>}
                      </div>
                      <div>
                        <div style={evidenceLabel}>Conversation segments</div>
                        {d.metadata?.segments?.length ? d.metadata.segments.map((segment: any) => (
                          <div key={segment.id} style={evidenceRow}>{segment.id} · {segment.topicLabel} · boundary confidence {Math.round((segment.boundaryConfidence || 0) * 100)}%</div>
                        )) : <div style={evidenceEmpty}>No segmentation metadata is available.</div>}
                      </div>
                      <div>
                        <div style={evidenceLabel}>Score evidence</div>
                        {d.metadata?.grades?.length ? d.metadata.grades.map((entry: any, index: number) => (
                          <div key={index} style={evidenceRow}>segment {entry.segment?.id} · overall {entry.grade?.overallScore ?? "-"}/100 · confidence {Math.round((entry.grade?.confidence || 0) * 100)}%</div>
                        )) : <div style={evidenceEmpty}>No grading metadata is available.</div>}
                      </div>
                      <div>
                        <div style={evidenceLabel}>Payout tiers</div>
                        {d.metadata?.payout?.breakdown?.length ? d.metadata.payout.breakdown.map((tier: any) => (
                          <div key={tier.tier} style={evidenceRow}>{tier.tier} · {tier.units} unit(s) · {tier.amount} {d.currency}</div>
                        )) : <div style={evidenceEmpty}>No tier breakdown is available.</div>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Flagged tab */}
        {!loading && tab === "flagged" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {flagged.length === 0 && <div style={{ color: "#64748b", fontSize: 13 }}>No flagged submissions.</div>}
            {flagged.map(d => (
              <div key={d.id} style={{ background: "#0d0a08", border: "1px solid #7c3a1e", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#fb923c", marginBottom: 4 }}>{d.id}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{d.fullName || d.userId}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Flag: <span style={{ color: "#fb923c", fontWeight: 700 }}>{d.dupStatus}</span></div>
                  </div>
                  <button onClick={() => clearFlag(d.id)} style={btnStyle("#1a3a1a", "#4ade80")}>Clear Flag</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flagged accounts tab */}
        {!loading && tab === "accounts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {flaggedAccounts.length === 0 && <div style={{ color: "#64748b", fontSize: 13 }}>No flagged accounts.</div>}
            {flaggedAccounts.map((a: any) => (
              <div key={a.userId} style={{ background: "#0d0a08", border: "1px solid #7c3a1e", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{a.fullName}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{a.email}</div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "#fb923c", marginTop: 4 }}>
                      {a.strikes}/4 strikes · flagged {a.flaggedAt?.slice(0, 10)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => addStrike(a.userId, "Manual — admin")} style={btnStyle("#7c3a1e", "#fb923c")}>
                      +Strike
                    </button>
                    <button onClick={() => clearStrikes(a.userId)} style={btnStyle("#1a3a1a", "#4ade80")}>
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "staff" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={inviteStaff} style={btnStyle("#14532d", "#86efac")}>Invite Staff Member</button>
            {staff.map((member: any) => (
              <div key={member.id} style={{ background: "#080d1a", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700 }}>{member.name}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{member.email} · {member.role}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {member.role !== "owner" && <button onClick={() => staffAction("/api/admin/staff/disable", member.id, { disabled: true })} style={btnStyle("#7f1d1d", "#fca5a5")}>Disable</button>}
                  {member.role !== "owner" && <button onClick={() => staffAction("/api/admin/staff/disable", member.id, { disabled: false })} style={btnStyle("#1a3a1a", "#4ade80")}>Enable</button>}
                  {member.role !== "owner" && <button onClick={() => staffAction("/api/admin/staff/revoke-sessions", member.id)} style={btnStyle("#3f2f12", "#fbbf24")}>Revoke Sessions</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Audit log tab */}
        {!loading && tab === "audit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {auditLog.map((entry: any) => (
              <div key={entry.id} style={{ display: "flex", gap: 12, padding: "8px 12px", background: "#080d1a", borderRadius: 8, fontSize: 12 }}>
                <span style={{ color: "#64748b", fontFamily: "monospace", minWidth: 140 }}>{entry.createdAt?.slice(0, 16)}</span>
                <span style={{ color: "#10b981", fontWeight: 700 }}>{entry.action}</span>
                <span style={{ color: "#94a3b8" }}>{entry.targetId}</span>
                <span style={{ color: "#64748b" }}>{entry.note}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const evidenceLabel = {
  color: "#10b981", fontSize: 10, fontWeight: 800, letterSpacing: 0.8,
  textTransform: "uppercase" as const, marginBottom: 5,
};

const evidenceRow = {
  color: "#cbd5e1", fontSize: 12, lineHeight: 1.5,
};

const evidenceEmpty = {
  color: "#64748b", fontSize: 12,
};

function btnStyle(bg: string, color: string) {
  return {
    padding: "5px 12px", background: bg, color, border: "none",
    borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" as const,
  };
}
