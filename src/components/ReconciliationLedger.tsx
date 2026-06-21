import React, { useState, useEffect } from "react";
import { 
  History, Search, RefreshCw, Layers, CheckCircle, Clock, 
  UserCheck, ShieldAlert, Coins, ExternalLink, Calendar, Landmark
} from "lucide-react";
import { motion } from "motion/react";
import { ProcessedDataset } from "../types";

export default function ReconciliationLedger() {
  const [datasets, setDatasets] = useState<ProcessedDataset[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [statusMsg, setStatusMsg] = useState("");

  const fetchLedgerData = async () => {
    setLoading(true);
    setStatusMsg("");
    try {
      const response = await fetch("/api/reconciliation");
      const data = await response.json();
      setDatasets(data.datasets || []);
      setProfiles(data.profiles || []);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Failed to fetch reconciliation records.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, []);

  // Simulates a back-office dataset review approval to release funds immediately
  const handleApproveDisbursement = async (datasetId: string) => {
    try {
      setStatusMsg(`Initiating release of escrow holdings for ${datasetId}...`);
      const res = await fetch("/api/admin/payout-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId }),
      });
      if (res.ok) {
        setStatusMsg("Escrow released successfully! Fund state updated on WiPay Ledger.");
        await fetchLedgerData();
      }
    } catch (e) {
      console.error("Failed to mock back-office clearing approve", e);
    }
  };

  // Filter dataset log entries
  const filteredDatasets = datasets.filter((d) => {
    const matchesSearch = 
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.purifiedFileName.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === "ALL") return matchesSearch;
    if (statusFilter === "PENDING") return matchesSearch && d.status === "Pending Review";
    if (statusFilter === "APPROVED") return matchesSearch && d.status === "Approved";
    if (statusFilter === "DISBURSED") return matchesSearch && d.status === "Disbursed";
    return matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in" id="compliance-reconciliation-ledger">
      
      {/* Top Ledger Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-[#0a1020] p-6 rounded-2xl border border-slate-850 hover:border-emerald-500/30 transition-all flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-950/70 text-emerald-400 border border-emerald-900/30">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-white">
              XCD {datasets.reduce((acc, curr) => acc + curr.payoutAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
            </div>
            <div className="text-[10px] tracking-widest font-mono font-bold text-slate-400 uppercase">Settlement Pool</div>
          </div>
        </div>

        <div className="bg-[#0a1020] p-6 rounded-2xl border border-slate-850 hover:border-emerald-500/30 transition-all flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-teal-950/70 text-teal-400 border border-teal-900/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-white">{datasets.length}</div>
            <div className="text-[10px] tracking-widest font-mono font-bold text-slate-400 uppercase">Scanned Datasets</div>
          </div>
        </div>

        <div className="bg-[#0a1020] p-6 rounded-2xl border border-slate-850 hover:border-emerald-500/30 transition-all flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-indigo-950/70 text-indigo-400 border border-indigo-900/30">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-white">{profiles.length}</div>
            <div className="text-[10px] tracking-widest font-mono font-bold text-slate-400 uppercase">Linked Identity Keys</div>
          </div>
        </div>

        <div className="bg-[#0a1020] p-6 rounded-2xl border border-emerald-950/15 group hover:border-amber-500/30 transition-all flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-amber-950/70 text-amber-400 border border-amber-900/30">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-amber-300">7 - 14 Days</div>
            <div className="text-[10px] tracking-widest font-mono font-bold text-amber-400 uppercase">Compliance Lock</div>
          </div>
        </div>
      </div>

      {/* Main Ledger Database view */}
      <div className="bg-[#0a1020] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-display font-extrabold text-white mt-1 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                Durable Dataset Reconciliation Ledger
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time transaction checks, verified Escrow states, and secure Gateway records.
              </p>
            </div>
            
            <button
              onClick={fetchLedgerData}
              disabled={loading}
              id="btn-ledger-refresh"
              className="px-4 py-2 bg-[#0d1425] hover:bg-[#15203b] text-slate-300 text-xs rounded-xl font-bold border border-slate-800 transition-all flex items-center gap-1.5 self-start select-none disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>REFRESH HARVEST DIALECTS</span>
            </button>
          </div>

          {/* Search bar controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-emerald-500/65" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lookup by Dataset hash, UserId token, Email profile, or File name..."
                className="w-full pl-10 pr-4 py-3 bg-[#060a13] border border-slate-850 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-100 placeholder-slate-600"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#050810] p-1 rounded-xl border border-slate-800 shrink-0">
              {["ALL", "PENDING", "APPROVED", "DISBURSED"].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider transition-all uppercase ${
                    statusFilter === f 
                      ? "bg-[#1e293b] text-white" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {statusMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 text-xs rounded-xl font-mono tracking-wide animate-pulse">
              {statusMsg}
            </div>
          )}
        </div>

        {/* List of Datasets & Payouts */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#050810] border-b border-slate-850 text-slate-500 font-mono font-bold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Dataset Hash / Date</th>
                <th className="py-4 px-4">User ID Compliance Record</th>
                <th className="py-4 px-4 text-center">Linguistic Quality Matrix</th>
                <th className="py-4 px-4">Escrow Status</th>
                <th className="py-4 px-6 text-right">WiPay Ledger Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 bg-[#070b14]/50">
              {filteredDatasets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-500 font-mono">
                    No matching compliance logs found in records. Refine filters or harvest new blocks.
                  </td>
                </tr>
              ) : (
                filteredDatasets.map((d) => (
                  <tr key={d.id} className="hover:bg-[#0c152a]/60">
                    {/* Dataset details */}
                    <td className="py-5 px-6 space-y-1 max-w-xs">
                      <div className="font-bold text-white font-mono text-sm tracking-tight">{d.id}</div>
                      <div className="text-[10px] font-mono text-slate-400 leading-normal truncate" title={d.purifiedFileName}>
                        {d.purifiedFileName}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                        <Calendar className="w-3 h-3 text-emerald-500" />
                        <span>{new Date(d.timestamp).toLocaleDateString()} {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>

                    {/* User ID / Profile info */}
                    <td className="py-5 px-4 space-y-1">
                      <div className="bg-emerald-950/40 text-emerald-300 font-mono text-[10px] px-2.5 py-0.5 rounded-md w-fit font-bold border border-emerald-900/30">
                        {d.userId}
                      </div>
                      <div className="text-slate-300 font-semibold text-[11px] font-sans">{d.userEmail}</div>
                      <div className="text-slate-500 text-[10px] font-mono">{d.userPhone}</div>
                    </td>

                    {/* Evaluation Rating */}
                    <td className="py-5 px-4 space-y-1 text-center">
                      <div className="inline-block bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
                        <span className="text-emerald-400 font-mono font-bold text-sm">
                          {d.metadata.suitabilityScore}%
                        </span>
                        <span className="text-[9px] text-slate-500 block">suitability</span>
                      </div>
                      <div className="text-slate-400 text-[10px] font-medium block">
                        {d.metadata.totalUsefulLines} / {d.metadata.totalLinesAnalyzed} fine-tuning segments
                      </div>
                    </td>

                    {/* Compensation Status */}
                    <td className="py-5 px-4 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          d.status === "Pending Review" 
                            ? "bg-amber-400 animate-pulse" 
                            : d.status === "Approved" 
                              ? "bg-blue-400" 
                              : "bg-emerald-400"
                        }`} />
                        <span className="font-bold text-slate-200 font-mono text-[11px] uppercase tracking-wide">{d.status}</span>
                      </div>

                      {/* Mock backoffice approval */}
                      {d.status === "Approved" && (
                        <button
                          onClick={() => handleApproveDisbursement(d.id)}
                          className="px-2.5 py-1 text-[9px] bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 font-bold rounded-lg border border-emerald-900/30 block cursor-pointer"
                          title="Simulate backoffice audit approval to release fund escrow limits immediately"
                        >
                          Manual Approve Escrow Release
                        </button>
                      )}
                    </td>

                    {/* WiPay Logs */}
                    <td className="py-5 px-6 text-right space-y-1">
                      {d.transaction ? (
                        <>
                          <div className="text-white font-display font-extrabold text-sm">
                            {d.currency} {d.payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 truncate max-w-[140px] inline-block" title={d.transaction.transactionId}>
                            {d.transaction.transactionId}
                          </div>
                          <div className="flex items-center gap-1 justify-end text-[9px] font-semibold text-slate-400 font-mono">
                            <Landmark className="w-3 h-3 text-slate-500" />
                            <span className={d.transaction.status === "PENDING" ? "text-amber-400" : "text-emerald-450"}>
                              {d.transaction.wipayResponse?.recipient?.account_number || "Escrow Link"} ({d.transaction.status})
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-550 text-[11px] italic font-mono">- No active claims -</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Information Card */}
      <div className="p-6 sm:p-7 bg-slate-950 text-slate-200 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-amber-300">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h4 className="text-sm font-bold uppercase font-display tracking-widest text-[#f59e0b]">WiPay Escrow Clearing Regulatory Charter</h4>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Due to Anti-Money Laundering (AML) controls and corporate data training mandates, all harvested dial datasets logged on this browser's records receive a standard <strong>7 to 14 days clearing window</strong>. The regulatory board approves entries mapping directly to valid WiPay Merchant ID records matching registered phone and email indexes on-chain.
        </p>
      </div>

    </div>
  );
}
