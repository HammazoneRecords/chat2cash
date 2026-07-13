import React, { useEffect, useState } from "react";
import { FileText, RefreshCw, ReceiptText, ShieldCheck } from "lucide-react";

type SubmissionSummary = {
  id: string;
  status: string;
  payoutAmount: number;
  currency: string;
  submittedAt: string;
  purifiedFileName: string;
  contentHash: string;
  hashVersion: string;
  duplicateStatus: string;
  totalLinesAnalyzed: number;
  totalUsefulLines: number;
  suitabilityScore: number | null;
  payoutVersion: string;
  payoutRatePerUsefulLine: number;
  payoutBreakdown: Array<{ tier: string; units: number; amount: number }>;
  receiptNumber: string | null;
  transactionStatus: string | null;
  transactionId: string | null;
  proofAddedAt: string | null;
};

function shortHash(value: string) {
  if (!value) return "pending";
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function statusClass(status: string) {
  if (status === "Disbursed") return "border-emerald-700/50 bg-emerald-950/40 text-emerald-300";
  if (status === "Approved") return "border-sky-700/50 bg-sky-950/40 text-sky-300";
  if (status === "Declined") return "border-red-800/50 bg-red-950/40 text-red-300";
  if (status === "Held" || status === "Correction Requested") return "border-amber-700/50 bg-amber-950/40 text-amber-300";
  return "border-slate-700 bg-slate-900/80 text-slate-300";
}

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSubmissions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/my-submissions", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load submissions.");
      setSubmissions(data.submissions || []);
    } catch (err: any) {
      setError(err?.message || "Could not load submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  return (
    <div className="space-y-6" id="my-submissions-view">
      <div className="rounded-3xl border border-slate-800 bg-[#080d19] p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/40 bg-emerald-950/40 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              <ReceiptText className="h-3.5 w-3.5" />
              My Submissions
            </div>
            <h1 className="text-2xl font-display font-bold text-white">Dataset receipts and payout status</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              This view shows only your submitted dataset receipts, review status, payout estimate, duplicate status, and proof details. Raw chat lines and full anonymized dialogues are not returned here.
            </p>
          </div>
          <button
            onClick={loadSubmissions}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !submissions.length && !error && (
        <div className="rounded-3xl border border-slate-800 bg-[#080d19] p-8 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          <h2 className="text-lg font-bold text-white">No submitted datasets yet</h2>
          <p className="mt-2 text-sm text-slate-400">Submitted datasets will appear here after you review and submit an anonymized draft.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {submissions.map((item) => (
          <article key={item.id} className="rounded-3xl border border-slate-800 bg-[#080d19] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClass(item.status)}`}>
                    {item.status}
                  </span>
                  <span className="rounded-full border border-slate-800 bg-slate-950 px-2.5 py-1 text-[10px] font-mono text-slate-400">
                    {item.duplicateStatus === "clean" ? "unique content" : item.duplicateStatus}
                  </span>
                </div>
                <div>
                  <h2 className="break-all font-mono text-sm font-bold text-white">{item.id}</h2>
                  <p className="mt-1 break-all text-xs text-slate-500">{item.purifiedFileName}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <div className="rounded-2xl border border-slate-800 bg-[#050810] p-3">
                    <div className="text-slate-500">Payout estimate</div>
                    <div className="mt-1 font-mono font-bold text-emerald-300">{item.currency} {item.payoutAmount.toLocaleString()}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-[#050810] p-3">
                    <div className="text-slate-500">Useful pairs</div>
                    <div className="mt-1 font-mono font-bold text-slate-200">{item.totalUsefulLines}/{item.totalLinesAnalyzed}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-[#050810] p-3">
                    <div className="text-slate-500">Score</div>
                    <div className="mt-1 font-mono font-bold text-slate-200">{item.suitabilityScore ?? "pending"}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-[#050810] p-3">
                    <div className="text-slate-500">Hash</div>
                    <div className="mt-1 font-mono font-bold text-slate-200">{shortHash(item.contentHash)}</div>
                  </div>
                </div>
              </div>

              <div className="w-full rounded-2xl border border-slate-800 bg-[#050810] p-4 lg:max-w-xs">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Receipt state
                </div>
                {item.receiptNumber ? (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500">WiPay proof</div>
                    <div className="break-all font-mono text-sm font-bold text-emerald-300">{item.receiptNumber}</div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-slate-400">Receipt proof has not been added yet. Approved datasets still need admin payout queueing, disbursement, and proof entry.</p>
                )}
                <div className="mt-4 border-t border-slate-800 pt-3 text-[11px] text-slate-500">
                  Transaction: <span className="font-mono text-slate-300">{item.transactionStatus || "not queued"}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
