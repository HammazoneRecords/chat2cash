import React, { useState, useRef } from "react";
import { 
  Upload, FileText, CheckCircle2, AlertCircle, Sparkles, 
  HelpCircle, Download, CreditCard, Clock, RefreshCw, Eye, Tag, ListFilter, HelpCircle as HelpIcon, FileCheck
} from "lucide-react";
import JSZip from "jszip";
import { motion } from "motion/react";
import { ProcessedDataset, UserProfile } from "../types";

interface FileProcessorProps {
  user: UserProfile;
  onDatasetCreated: (dataset: ProcessedDataset) => void;
}

export default function FileProcessor({ user, onDatasetCreated }: FileProcessorProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  
  // Cleaned evaluation review state
  const [activeDataset, setActiveDataset] = useState<ProcessedDataset | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'useful' | 'noise'>('all');
  const [previewTab, setPreviewTab] = useState<'dialogue' | 'lines'>('dialogue');
  
  // Fund release status state
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccessMessage, setPayoutSuccessMessage] = useState("");
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const publicAccountCode = user.userId ? `acct-${user.userId.slice(-6)}` : "acct-review";
  const whatsappExportHelp = "In WhatsApp, open the chat, tap More or Export Chat, choose Export Chat, select Without Media, then upload the .zip or .txt file here.";

  const fetchReceipt = async (datasetId: string) => {
    try {
      const res = await fetch(`/api/my-receipt/${datasetId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.receiptNumber) setReceiptNumber(data.receiptNumber);
      }
    } catch {}
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (selectedFile: File) => {
    setError("");
    setActiveDataset(null);
    setPayoutSuccessMessage("");
    
    const isTxt = selectedFile.name.endsWith(".txt");
    const isZip = selectedFile.name.endsWith(".zip");
    const isJson = selectedFile.name.endsWith(".json");

    if (!isTxt && !isZip && !isJson) {
      setError(`Please select a WhatsApp text (.txt), zipped (.zip), or reviewed JSON (.json) file. ${whatsappExportHelp}`);
      return;
    }

    setFile(selectedFile);
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setStatusMessage("Extracting and reading conversation text payload...");
    setError("");

    try {
      if (file.name.endsWith(".json")) {
        setStatusMessage("Validating reviewed anonymized JSON...");
        const jsonText = await file.text();
        const response = await fetch("/api/upload-json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: jsonText,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Invalid reviewed JSON.");
        setActiveDataset(result.draft);
        setStatusMessage(result.draft?.metadata?.duplicatePreview?.message || "Reviewed JSON validated. Inspect the draft before submitting.");
        return;
      }

      let chatText = "";

      if (file.name.endsWith(".zip")) {
        setStatusMessage("Unzipping archive bundle via JSZip...");
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);
        
        // Find the first text file in the zip
        const txtFile = Object.values(loadedZip.files).find(
          (f) => f.name.endsWith(".txt") && !f.name.startsWith("__MACOSX/")
        );

        if (!txtFile) {
          throw new Error(`No WhatsApp .txt file was found inside that ZIP. ${whatsappExportHelp}`);
        }

        chatText = await txtFile.async("string");
      } else {
        chatText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string || "");
          reader.onerror = (err) => reject(err);
          reader.readAsText(file);
        });
      }

      if (!chatText.trim()) {
        throw new Error(`The WhatsApp export file is empty or corrupted. Re-export the chat without media and upload the new .zip or .txt file.`);
      }

      setStatusMessage("Running local speaker masking & initiating AI quality evaluation...");
      
      const response = await fetch("/api/process-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatText,
            fileName: file.name,
            userId: user.userId,
            draftOnly: true,
          }),
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.error === "account_flagged") {
          throw new Error("Your account has been flagged for suspicious activity. Contact support to appeal.");
        }
        if (result.error === "duplicate") {
          const strikeMsg = result.accountFlagged
            ? " Your account is now locked."
            : result.strikes ? ` Strike ${result.strikes}/4.` : "";
          throw new Error((result.message || "Duplicate submission detected.") + strikeMsg);
        }
        throw new Error(result.error || "Anonymization server error");
      }

      // Partial duplicate — show warning but still proceed
      if (result.warning === "partial_duplicate") {
        setStatusMessage(result.message || "Partial duplicate detected — payout adjusted to new content only.");
      } else {
        setStatusMessage("");
      }

      setActiveDataset(result.dataset);
      onDatasetCreated(result.dataset);
      fetchReceipt(result.dataset.id);
    } catch (err: any) {
      setError(err?.message || "Failed to process chat dataset. Verify formatting.");
    } finally {
      setLoading(false);
    }
  };

  // Secure export to JSON format
  const handleDownloadJSON = () => {
    if (!activeDataset) return;
    const metadata = activeDataset.metadata as any;
    const cleanData = {
      schemaVersion: "c2c-json-v1",
      draftId: activeDataset.id,
      contentHash: (activeDataset as any).contentHash || metadata.contentHash || null,
      hashVersion: (activeDataset as any).hashVersion || metadata.hashVersion || "v1",
      reviewMetadata: {
        evaluatorVersion: metadata.evaluatorVersion || null,
        segmentationVersion: metadata.segmentationVersion || null,
        anonymizationRules: metadata.anonymizationRules || [],
        warnings: metadata.warnings || [],
        evaluationSummary: metadata.evaluationSummary || "",
        totals: {
          linesAnalyzed: metadata.totalLinesAnalyzed || 0,
          usefulTurns: metadata.totalUsefulLines || 0,
          uniqueTokens: metadata.uniqueUserTokens || 0,
          estimatedTokens: metadata.estimatedTokens || 0,
        },
        segments: metadata.segments || [],
        contextSignals: metadata.contextSignals || [],
        grades: metadata.grades || [],
        payoutPreview: metadata.payout || null,
      },
      trainingData: activeDataset.dialogues.map((d, index) => ({
        id: `dialogue-${index}`,
        prompt: d.prompt,
        response: d.response,
      })),
    };

    const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeDataset.purifiedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmitReviewedDraft = async () => {
    if (!activeDataset || activeDataset.status !== "Draft") return;
    setPayoutSuccessMessage("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/submit-json-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trainingData: activeDataset.dialogues.map((d) => ({ prompt: d.prompt, response: d.response })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error === "duplicate") {
          const strikeMsg = result.accountFlagged
            ? " Your account is now locked."
            : result.strikes ? ` Strike ${result.strikes}/4.` : "";
          throw new Error((result.message || "Duplicate submission detected.") + strikeMsg);
        }
        throw new Error(result.message || result.error || "Draft submission failed.");
      }
      setActiveDataset(result.dataset);
      setStatusMessage(
        result.warning === "partial_duplicate"
          ? result.message || "Partial duplicate detected — payout adjusted to new content only."
          : result.idempotent
            ? "Existing submission restored. This duplicate was already counted under your account."
            : "Anonymous dataset submitted for review with pricing applied."
      );
      fetchReceipt(result.dataset.id);
    } catch (err: any) {
      setError(err?.message || "Draft submission failed.");
    } finally {
      setLoading(false);
    }
  };

  // Secure export to CSV format
  const handleDownloadCSV = () => {
    if (!activeDataset) return;
    const headers = ["Prompt", "Response", "Is Useful", "Instructional Score", "Category"];
    const rows = activeDataset.dialogues.map((d) => [
      `"${d.prompt.replace(/"/g, '""')}"`,
      `"${d.response.replace(/"/g, '""')}"`,
      d.isUseful ? "TRUE" : "FALSE",
      d.score.toString(),
      d.category,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeDataset.purifiedFileName.replace(".json", ".csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Confirm the submitted dataset should remain in the moderator payout review queue.
  const handleInitiatePayout = async () => {
    if (!activeDataset) return;
    setPayoutLoading(true);
    setError("");
    setPayoutSuccessMessage("");

    try {
      const res = await fetch("/api/payout-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: activeDataset.id }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Payout review request failed.");
      }

      const updated = result.dataset ? { ...activeDataset, ...result.dataset } : activeDataset;
      fetchReceipt(activeDataset!.id);
      setActiveDataset(updated);
      onDatasetCreated(updated);
      setPayoutSuccessMessage(result.message || "Payout review request confirmed. Moderator approval is required before payment is queued.");
    } catch (err: any) {
      setError(err?.message || "Failed to request payout review.");
    } finally {
      setPayoutLoading(false);
    }
  };

  const filteredDialogues = activeDataset?.dialogues.filter(d => {
    if (previewFilter === 'useful') return d.isUseful;
    if (previewFilter === 'noise') return !d.isUseful;
    return true;
  }) || [];

  const filteredLines = (activeDataset?.originalLinesPreview || []).filter(l => {
    if (previewFilter === 'useful') return l.isUseful;
    if (previewFilter === 'noise') return !l.isUseful;
    return true;
  }) || [];

  return (
    <div className="space-y-8 animate-fade-in" id="file-processor-root">
      
      {/* Upload Zone & Instructions */}
      {!activeDataset && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a1020] p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 relative"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500/40 via-teal-500/80 to-emerald-500/40" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/85 pb-5">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#10b981] uppercase block">Purification Terminal</span>
              <h2 className="text-xl font-display font-extrabold text-white mt-1">Anonymize Your Conversation</h2>
              <p className="text-xs text-slate-400 mt-1">
                Account Code: <strong className="text-emerald-400 font-mono text-[11px] font-bold">{publicAccountCode}</strong>
              </p>
            </div>
            <div className="text-xs bg-emerald-950/40 text-emerald-300 px-3 py-1.5 rounded-xl font-mono border border-emerald-900/30 self-start">
              WiPay Wallet Destination: <span className="font-bold">{user.wipayAccount} ({user.country === "JM" ? "JMD" : user.country === "BB" ? "BBD" : "TTD"})</span>
            </div>
          </div>

          <div id="upload-review-submit-guide" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-[#060a13] p-4">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">1. Upload</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Use a WhatsApp export made with <strong>Without Media</strong>. ZIP and TXT are raw chat exports.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#060a13] p-4">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">2. Review</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Check the original-to-anonymized preview. You can download JSON or CSV before submitting.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#060a13] p-4">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">3. Submit</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Final submit stores only sanitized content, recomputes scoring, and sends it to payout review.</p>
            </div>
          </div>

          <div id="whatsapp-export-checklist" className="rounded-2xl border border-emerald-900/30 bg-emerald-950/15 p-4 text-xs leading-relaxed text-slate-300">
            <strong className="text-emerald-300">WhatsApp export:</strong> Open chat, tap More or Export Chat, choose Export Chat, select <strong>Without Media</strong>, then upload the downloaded .zip or .txt.
          </div>

          {/* Drag and Drop Box */}
          <div
            id="drag-file-zone"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all flex flex-col items-center justify-center space-y-4 ${
              dragActive 
                ? "border-emerald-500 bg-emerald-950/30 scale-98" 
                : file 
                  ? "border-emerald-700 bg-emerald-950/10" 
                  : "border-slate-800 hover:border-slate-700 hover:bg-[#070b14]"
            }`}
          >
            <input
              ref={fileInputRef}
              id="chat-file-picker"
              type="file"
               accept=".txt,.zip,.json"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className={`p-4 rounded-2xl ${file ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-slate-900 text-slate-500 border border-slate-800"}`}>
              {file ? <FileCheck className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-200">
                {file ? file.name : "Select or drag your exported WhatsApp chat"}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                 Supports raw <strong>.txt</strong>, clean <strong>.zip</strong>, or reviewed anonymized <strong>.json</strong> files.
              </p>
            </div>

            {file && (
              <span className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800 px-3 py-1 rounded-full font-mono font-bold">
                SIZE: {(file.size / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          {/* Actions & Alerts */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/45 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between pt-2">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Browser reads the file first; submitted records store sanitized dialogue, not raw source lines.</span>
            </div>

            <button
              id="btn-process-analyze"
              disabled={!file || loading}
              onClick={handleUploadAndAnalyze}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-slate-800 disabled:to-slate-900 text-slate-950 font-bold text-xs tracking-wider transition-all uppercase flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{statusMessage || "Processing dialogue stream..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>ANALYZE INTERACTION POOL</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Dataset Results, Secure Preview & WiPay Clearing Hub */}
      {activeDataset && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          {/* Main Stats Header */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Core Payout Card */}
            <div className="lg:col-span-1 bg-[#0a1020] p-6 sm:p-7 rounded-3xl border border-teal-900/30 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">Estimated Payout</span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider ${
                    activeDataset.status === "Pending Review" 
                      ? "bg-amber-950/70 text-amber-300 border border-amber-900/50" 
                      : "bg-emerald-950/70 text-emerald-300 border border-emerald-900/50"
                  }`}>
                    {activeDataset.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-4xl font-display font-extrabold text-white flex items-baseline gap-1.5">
                    <span className="text-lg font-bold bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-900/40 font-mono">
                      {activeDataset.currency}
                    </span>
                    <span>{activeDataset.payoutAmount.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    Average accepted rate: <span className="font-bold text-emerald-400">${activeDataset.metadata.payoutRatePerUsefulLine}</span> per accepted chat pair.
                  </p>
                </div>

                <div className="p-3.5 bg-[#050810]/75 rounded-xl space-y-2 border border-slate-800 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Account Code:</span>
                    <strong className="font-mono text-white">{user.wipayAccount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Review Window:</span>
                    <span className="font-mono font-bold text-amber-300 flex items-center gap-1">7 - 14 Days</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-800 mt-5 space-y-3">
                {activeDataset.status === "Pending Review" ? (
                  <button
                    id="btn-claim-wipay-payout"
                    disabled={payoutLoading}
                    onClick={handleInitiatePayout}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {payoutLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>CONFIRMING REVIEW REQUEST...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 text-slate-950" />
                        <span>CONFIRM PAYOUT REVIEW</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-4 bg-emerald-950/40 rounded-xl border border-emerald-900/40 text-[11px] text-emerald-300 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{activeDataset.status === "Disbursed" ? "Chat2Cash Funds Issued" : "Approved For Payout Queue"}</span>
                    </div>
                    {activeDataset.status === "Disbursed" ? (
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Payment has been marked disbursed by an admin. Transaction reference: <strong className="font-mono text-emerald-300 break-all">{activeDataset.transaction?.transactionId || "pending receipt sync"}</strong>.
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Moderator approval is complete. Admin must queue the WiPay payout, disburse it, and add receipt proof before this is marked paid.
                      </p>
                    )}
                    {receiptNumber ? (
                      <div className="mt-2 p-2.5 bg-emerald-900/30 rounded-lg border border-emerald-700/30 space-y-1">
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">WiPay Receipt</div>
                        <div className="font-mono font-bold text-emerald-300 text-sm break-all">{receiptNumber}</div>
                        <div className="text-[9px] text-slate-500">Keep this for your records. This confirms payment was issued from our side.</div>
                      </div>
                    ) : (
                      <div className="mt-2 p-2.5 bg-slate-900/40 rounded-lg border border-slate-800 text-[10px] text-slate-500">
                        Receipt pending — payment usually issued within 7–14 days. Check back here once confirmed.
                      </div>
                    )}
                  </div>
                )}

                {payoutSuccessMessage && (
                  <div className="p-2.5 text-center text-[10px] text-emerald-300 bg-emerald-950/40 border border-emerald-900/35 rounded-lg">
                    {payoutSuccessMessage}
                  </div>
                )}
              </div>
            </div>

            {/* AI Score Card */}
            <div className="lg:col-span-2 bg-[#0a1020] p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between space-y-6 relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex justify-between items-start border-b border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                    Fine-Tuning Utility Assessment
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Linguistic parsing &amp; dialogue density ratings from AI evaluation engine</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-display font-extrabold text-emerald-400">{activeDataset.metadata.suitabilityScore}</div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Suitability Rating</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#050810] p-3.5 rounded-xl border border-slate-800">
                  <div className="text-lg font-mono font-bold text-slate-200">{activeDataset.metadata.totalLinesAnalyzed}</div>
                  <div className="text-[10px] text-slate-500 font-semibold font-mono">Lines Checked</div>
                </div>
                <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-900/30">
                  <div className="text-lg font-mono font-bold text-emerald-400">{activeDataset.metadata.totalUsefulLines}</div>
                  <div className="text-[10px] text-emerald-500 font-semibold font-mono">Useful Turns</div>
                </div>
                <div className="bg-[#050810] p-3.5 rounded-xl border border-slate-800">
                  <div className="text-lg font-mono font-bold text-slate-200">{activeDataset.metadata.uniqueUserTokens}</div>
                  <div className="text-[10px] text-slate-500 font-semibold font-mono">Unique Words</div>
                </div>
                <div className="bg-[#050810] p-3.5 rounded-xl border border-slate-800">
                  <div className="text-lg font-mono font-bold text-slate-200">{activeDataset.metadata.estimatedTokens}</div>
                  <div className="text-[10px] text-slate-500 font-semibold font-mono">Total Tokens</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#050810] border border-slate-800/80 text-xs">
                <span className="font-bold text-slate-300 block mb-1 font-mono text-[10px] uppercase tracking-wide">AI EVALUATION RECONCILIATION SUMMARY:</span>
                <p className="text-slate-400 leading-relaxed italic">
                  &ldquo;{activeDataset.metadata.evaluationSummary}&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Explainable context and payout review */}
          {((activeDataset.metadata as any).segments || (activeDataset.metadata as any).grades || (activeDataset.metadata as any).contextSignals || (activeDataset.metadata as any).payout) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-[#0a1020] rounded-3xl border border-slate-800 p-5 sm:p-7 space-y-5">
                <div>
                  <span className="text-emerald-400 text-[10px] font-mono font-bold tracking-widest uppercase">Context review</span>
                  <h3 className="text-lg font-display font-bold text-white mt-1">Conversation boundaries and follow-ups</h3>
                  <p className="text-xs text-slate-400 mt-1">Later messages are linked as context so a correction or topic change can change the interpretation of an earlier turn.</p>
                </div>
                <div className="space-y-3">
                  {(((activeDataset.metadata as any).segments || []) as any[]).map((segment) => (
                    <div key={segment.id} className="rounded-xl border border-slate-800 bg-[#050810] p-3.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-200">{segment.id} · {segment.topicLabel}</span>
                        <span className="text-[10px] font-mono text-amber-300">Boundary confidence {Math.round((segment.boundaryConfidence || 0) * 100)}%</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(segment.boundaryReasons || []).map((reason: string) => <span key={reason} className="text-[10px] px-2 py-1 rounded-md bg-slate-800 text-slate-400">{reason}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {(((activeDataset.metadata as any).contextSignals || []) as any[]).map((signal) => (
                    <div key={`${signal.fromMessage}-${signal.toMessage}-${signal.kind}`} className="flex flex-wrap items-center gap-2 text-xs rounded-lg border border-amber-900/40 bg-amber-950/20 p-3">
                      <span className="font-mono font-bold text-amber-300 uppercase">{signal.kind}</span>
                      <span className="text-slate-400">message {signal.fromMessage} → {signal.toMessage}</span>
                      <span className="text-[10px] text-slate-500">{Math.round(signal.confidence * 100)}% confidence</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0a1020] rounded-3xl border border-slate-800 p-5 sm:p-7 space-y-5">
                <div>
                  <span className="text-emerald-400 text-[10px] font-mono font-bold tracking-widest uppercase">Explainable grading</span>
                  <h3 className="text-lg font-display font-bold text-white mt-1">Score dimensions and payout tiers</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(((activeDataset.metadata as any).grades || []) as any[]).flatMap((item) => Object.entries(item.grade?.dimensions || {}).map(([name, dimension]: [string, any]) => ({ name, dimension, segment: item.segment?.id }))).map((item) => (
                    <div key={`${item.segment}-${item.name}`} className="rounded-xl border border-slate-800 bg-[#050810] p-3">
                      <div className="flex justify-between gap-2 text-[10px] uppercase font-mono text-slate-500"><span>{item.name}</span><span className="text-emerald-300">{item.dimension.score}/100</span></div>
                      <div className="h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${item.dimension.score}%` }} /></div>
                      <div className="text-[10px] text-slate-500 mt-2">Confidence {Math.round(item.dimension.confidence * 100)}% · evidence {item.dimension.evidence?.join(", ") || "none"}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {(((activeDataset.metadata as any).payout?.breakdown || []) as any[]).map((tier) => (
                    <div key={tier.tier} className="flex flex-wrap justify-between gap-2 text-xs border-b border-slate-800 pb-2"><span className="text-slate-400 capitalize">{tier.tier} · {tier.units} unit(s)</span><strong className="text-emerald-300">{tier.amount} {activeDataset.currency}</strong></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Secure Live Preview Segment */}
          <div className="bg-[#0a1020] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
            {/* Tab header */}
            <div className="bg-[#050810]/95 p-6 sm:p-8 space-y-6 border-b border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-emerald-400 text-xs font-mono font-bold tracking-widest uppercase block">Anonymized Review</span>
                  <h2 className="text-2xl font-display font-black text-white">Review Before Download or Submit</h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Check the sanitized prompt-response pairs, download JSON/CSV if you want to inspect them offline, then submit only when you are ready.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {activeDataset.status === "Draft" && (
                    <button
                      id="btn-submit-reviewed-json"
                      onClick={handleSubmitReviewedDraft}
                      disabled={loading}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 select-none cursor-pointer"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Submit Anonymous Dataset</span>
                    </button>
                  )}
                  <button
                    id="btn-download-json"
                    onClick={handleDownloadJSON}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 select-none cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON</span>
                  </button>
                  <button
                    id="btn-download-csv"
                    onClick={handleDownloadCSV}
                    className="px-4 py-2.5 bg-[#0e172a] hover:bg-[#182542] text-slate-200 font-bold rounded-xl text-xs border border-slate-800 transition-all flex items-center gap-1.5 select-none cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>

              {(activeDataset.metadata as any).duplicatePreview && (
                <div className={`rounded-xl border p-3 text-xs ${
                  (activeDataset.metadata as any).duplicatePreview.wouldStrikeOnSubmit
                    ? "bg-red-950/30 border-red-900/45 text-red-200"
                    : (activeDataset.metadata as any).duplicatePreview.status === "partial_duplicate"
                      ? "bg-amber-950/30 border-amber-900/45 text-amber-200"
                      : "bg-emerald-950/25 border-emerald-900/35 text-emerald-200"
                }`}>
                  <div className="font-bold uppercase tracking-wider font-mono text-[10px] mb-1">Duplicate preview before final submit</div>
                  <p className="leading-relaxed">{(activeDataset.metadata as any).duplicatePreview.message}</p>
                  {(activeDataset.metadata as any).duplicatePreview.wouldStrikeOnSubmit && (
                    <p className="mt-2 font-bold">Submitting this duplicate will add a strike to this account.</p>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-slate-800 bg-[#050810] p-3 text-[11px] text-slate-400 leading-relaxed">
                JSON files are for review and portability. On submit, the server recomputes anonymization checks, duplicate hashes, scoring, and payout; client-provided score, payout, status, role, and identity fields are ignored.
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800/80 justify-between">
                <div className="flex items-center gap-1 bg-[#020408] p-1.5 rounded-xl border border-slate-800">
                  <button
                    id="btn-tab-dialog"
                    onClick={() => setPreviewTab('dialogue')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      previewTab === 'dialogue' ? "bg-[#1e293b] text-white shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Chatbot Dialogue Pairs
                  </button>
                  <button
                    id="btn-tab-raw"
                    onClick={() => setPreviewTab('lines')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      previewTab === 'lines' ? "bg-[#1e293b] text-white shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Line-by-Line Highlight Preview
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs font-mono flex items-center gap-1.5">
                    <ListFilter className="w-3.5 h-3.5 text-[#10b981]" /> Quality Filter:
                  </span>
                  <div className="bg-[#020408] p-1.5 rounded-xl border border-slate-800 flex gap-1">
                    {(['all', 'useful', 'noise'] as const).map((filter) => (
                      <button
                        key={filter}
                        id={`btn-filter-${filter}`}
                        onClick={() => setPreviewFilter(filter)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold capitalize transition-all ${
                          previewFilter === filter 
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30" 
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* List entries */}
            <div className="p-6 max-h-[500px] overflow-y-auto bg-[#070b14]/55 terminal-scroll">
              {previewTab === 'dialogue' ? (
                /* Prompt / Response Dialogue Pairs View */
                <div className="space-y-4">
                  {filteredDialogues.length === 0 ? (
                    <div className="text-center p-12 text-slate-500 text-xs font-mono">
                      No matching dialogue nodes fit current criteria or rating guidelines.
                    </div>
                  ) : (
                    filteredDialogues.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`p-5 rounded-2xl border bg-[#050810]/90 transition-all space-y-4 relative overflow-hidden ${
                          item.isUseful ? "border-emerald-900/40" : "border-slate-900/90 opacity-60"
                        }`}
                      >
                        {/* Prompt (Speaker text left) */}
                        <div className="flex items-start gap-3">
                          <span className="px-2 py-1 rounded bg-[#1e293b] text-slate-300 font-mono text-[9px] uppercase font-bold shrink-0 mt-0.5">
                            PROMPT
                          </span>
                          <p className="text-sm text-slate-300 leading-relaxed font-mono">
                            {item.prompt}
                          </p>
                        </div>
                        
                        {/* Response (Speaker text response) */}
                        <div className="flex items-start gap-4 border-t border-slate-900/80 pt-3">
                          <span className="px-2 py-1 rounded bg-emerald-950/60 text-emerald-400 font-mono text-[9px] uppercase font-bold shrink-0 mt-0.5 border border-emerald-900/30">
                            RESPONSE
                          </span>
                          <p className="text-sm text-slate-100 leading-relaxed font-bold font-mono">
                            {item.response}
                          </p>
                        </div>

                        {/* Top-right Tag details */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed border-slate-900 text-[10px] justify-between text-slate-400 font-mono">
                          <span className="flex items-center gap-1 font-semibold text-slate-400" title={item.explanation}>
                            Category: <strong className="text-white bg-[#0e172a] px-2 py-0.5 rounded border border-slate-850">{item.category}</strong>
                          </span>
                          <span>
                            Fine-Tuning Density Rating: <strong className={item.isUseful ? "text-emerald-400" : "text-amber-500"}>{item.score}%</strong>
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[8px] ${
                            item.isUseful ? "bg-emerald-950/50 text-emerald-450 border border-emerald-900/30" : "bg-slate-900 text-slate-500"
                          }`}>
                            {item.isUseful ? "Recommended Training Node" : "Noise Segment"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Line Sanitizer (Side-by-side WhatsApp line to purified line) */
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1e293b] text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                      <th className="pb-3 pl-2">Original Text (DANGER - Unsanitized, personal)</th>
                      <th className="pb-3 pr-2">Masked Dialogue Output (SAFE)</th>
                      <th className="pb-3 pr-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0c152a] text-xs font-mono">
                    {filteredLines.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-slate-500 font-mono">
                          No matching sanitization logs to display. Check quality filters.
                        </td>
                      </tr>
                    ) : (
                      filteredLines.map((line) => (
                        <tr key={line.id} className="hover:bg-[#0e172b]/55">
                          <td className="py-3.5 px-2 max-w-xs sm:max-w-md truncate text-red-400 bg-red-955/5 border-r border-[#1c293c]">
                            {line.originalText}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-emerald-300">
                            {line.cleanedText}
                          </td>
                          <td className="py-3.5 pr-2 text-right">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[8px] uppercase font-bold tracking-wider ${
                              line.isUseful ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30" : "bg-slate-900 text-slate-550"
                            }`}>
                              {line.isUseful ? "Useful turn" : "Chit-Chat Noise"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 bg-[#050810]/50 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-3">
              <span>Preview displays top sample dialog blocks. Complete download output contains the entire dataset.</span>
              <button 
                id="btn-process-another"
                onClick={() => {
                  setFile(null);
                  setActiveDataset(null);
                  setError("");
                }}
                className="text-xs text-sm font-bold text-slate-400 hover:text-white underline cursor-pointer select-none"
              >
                Anonymize another conversation archive
              </button>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
