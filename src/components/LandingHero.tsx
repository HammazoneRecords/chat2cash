import React, { useState, useEffect } from "react";
import { Shield, Sparkles, DollarSign, ArrowRight, HelpCircle, CheckCircle2, Mic, Bell, Mail, X, MapPin, Play } from "lucide-react";
import DynamicBackground from "./DynamicBackground";
import { motion, AnimatePresence } from "motion/react";
import HelpFaq from "./HelpFaq";

interface LandingHeroProps {
  onStart: () => void;
  registeredUser: any;
}

interface Stats {
  totalChats: number;
  totalMessages: number;
  totalPaidJMD: number;
}

export default function LandingHero({ onStart, registeredUser }: LandingHeroProps) {
  // Step 04 quick email capture (inline card)
  const [voiceEmail, setVoiceEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Voice notify modal
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceName, setVoiceName] = useState("");
  const [voiceModalEmail, setVoiceModalEmail] = useState("");
  const [voiceTown, setVoiceTown] = useState("");
  const [voiceCountry, setVoiceCountry] = useState("JM");
  const [voiceAge, setVoiceAge] = useState("");
  const [voiceSubmitting, setVoiceSubmitting] = useState(false);
  const [voiceSuccess, setVoiceSuccess] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  // Live stats
  const [stats, setStats] = useState<Stats>({ totalChats: 0, totalMessages: 0, totalPaidJMD: 0 });

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); })
      .catch(() => {});
  }, []);

  const handleVoiceSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (voiceEmail.trim()) {
      const key = "voice_notes_subscribers";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      if (!list.includes(voiceEmail.trim())) {
        list.push(voiceEmail.trim());
        localStorage.setItem(key, JSON.stringify(list));
      }
      setSubscribed(true);
      setVoiceEmail("");
    }
  };

  const handleVoiceModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVoiceError("");
    setVoiceSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: voiceName, email: voiceModalEmail, town: voiceTown, country: voiceCountry, age: voiceAge }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVoiceError(data.error || "Something went wrong.");
      } else {
        setVoiceSuccess(true);
      }
    } catch {
      setVoiceError("Network error. Please try again.");
    } finally {
      setVoiceSubmitting(false);
    }
  };

  return (
    <div id="landing-hero" className="py-8 px-2 max-w-5xl mx-auto space-y-16">

      {/* ── HERO ── */}
      <div className="text-center space-y-6 relative py-4" style={{ overflow: "hidden" }}>
        <DynamicBackground />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#022c22] rounded-full blur-3xl opacity-30 -z-10 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/65 text-emerald-300 text-xs font-mono font-bold tracking-wider border border-emerald-900/50"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          CHAT2CASH SECURE DATA HUB
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="relative z-10 text-4xl sm:text-6xl font-display font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto"
        >
          Anonymize WhatsApp Chats. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
            Payouts in JMD.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
        >
          Convert your text chat threads into clean, instruction-optimized training samples for custom LLM models. Strip names, numbers, and dates locally. Get rewarded via{" "}
          <span className="font-semibold text-emerald-400">WiPay Caribbean</span>.
        </motion.p>

        {/* Price comparison */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
        >
          <div className="px-6 py-3 bg-[#070b14] border border-slate-800 rounded-2xl text-center min-w-[160px]">
            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest mb-1">💬 Text Chats</div>
            <div className="text-lg font-bold text-white">$0.50 – $4 JMD</div>
            <div className="text-[10px] text-slate-500 mt-0.5">per useful dialogue turn</div>
          </div>
          <div className="text-slate-700 text-xl hidden sm:block font-light">→</div>
          <div className="px-6 py-3 bg-emerald-950/30 border border-emerald-700/40 rounded-2xl text-center min-w-[160px] relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] bg-emerald-500 text-slate-950 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap">PREMIUM</div>
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest mb-1">🎙️ Voice Notes</div>
            <div className="text-lg font-bold text-emerald-300">$300 – $7,000 JMD</div>
            <div className="text-[10px] text-slate-500 mt-0.5">per voice clip</div>
          </div>
        </motion.div>

        {/* Voice caveat */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-xs text-slate-500 text-center"
        >
          Yardie accent, country voice, thick Patois — however yuh talk, that's exactly what we need.{" "}
          <span className="text-emerald-400 font-semibold">The more authentic, the higher it scores.</span>
        </motion.p>

        {/* 2 CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="pt-2 flex flex-col sm:flex-row justify-center items-center gap-4"
        >
          <button
            id="btn-get-started"
            onClick={onStart}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold border border-emerald-300/30 transition-all shadow-lg shadow-emerald-950/50 inline-flex items-center justify-center gap-2.5 text-sm cursor-pointer"
          >
            {registeredUser ? "Go to Processing Dashboard" : "Start Earning — Chat2Cash"}
            <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </button>

          <button
            id="btn-voice-notify"
            onClick={() => setShowVoiceModal(true)}
            className="w-full sm:w-auto px-6 py-4 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/50 hover:border-emerald-700/50 transition-all text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Mic className="w-4 h-4 text-emerald-400" />
            Voice Notes — Get Notified
          </button>
        </motion.div>
      </div>

      {/* ── TALLY STATS ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="bg-[#0a1020] p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500/40 via-teal-500/80 to-emerald-500/40" />
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase block">Live Data Pool</span>
            <h3 className="text-lg font-display font-extrabold text-white mt-0.5">What's Been Collected</h3>
          </div>
          <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#050810] p-4 rounded-2xl border border-slate-800 text-center">
            <div className="text-2xl font-mono font-bold text-white">{stats.totalChats.toLocaleString()}</div>
            <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wide mt-1">Chats Submitted</div>
          </div>
          <div className="bg-emerald-950/20 p-4 rounded-2xl border border-emerald-900/30 text-center">
            <div className="text-2xl font-mono font-bold text-emerald-400">{stats.totalMessages.toLocaleString()}</div>
            <div className="text-[10px] font-mono text-emerald-700 font-bold uppercase tracking-wide mt-1">Messages Gathered</div>
          </div>
          <div className="bg-[#050810] p-4 rounded-2xl border border-slate-800 text-center">
            <div className="text-2xl font-mono font-bold text-white">JMD {stats.totalPaidJMD.toLocaleString()}</div>
            <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wide mt-1">Total Paid Out</div>
          </div>
        </div>
      </motion.div>

      {/* ── TRUST CARDS ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-[#080d19]/80 p-6 sm:p-7 rounded-2xl border border-[#1e293b] hover:border-emerald-500/30 transition-all space-y-4">
          <div className="p-3 rounded-xl bg-emerald-950/60 text-emerald-400 w-fit border border-emerald-900/40">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-md sm:text-lg font-display font-bold text-white">Guaranteed Privacy Masking</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            All names, phone numbers, and emails are stripped locally and mapped to random pseudonym tags (e.g., Speaker A, Speaker B) before leaving your device.
          </p>
        </div>

        <div className="bg-[#080d19]/80 p-6 sm:p-7 rounded-2xl border border-[#1e293b] hover:border-emerald-500/30 transition-all space-y-4">
          <div className="p-3 rounded-xl bg-teal-950/60 text-teal-400 w-fit border border-teal-900/40">
            <DollarSign className="w-5 h-5" />
          </div>
          <h3 className="text-md sm:text-lg font-display font-bold text-white">Linguistic Density Valuation</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Our AI evaluation engine gauges context structure, response quality, and informative density to calculate real-time reward tokens.
          </p>
        </div>

        <div className="bg-[#080d19]/80 p-6 sm:p-7 rounded-2xl border border-amber-950/30 bg-amber-950/5 hover:border-amber-500/20 transition-all space-y-4">
          <div className="p-3 rounded-xl bg-amber-950/60 text-amber-400 w-fit border border-amber-900/40">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h3 className="text-md sm:text-lg font-display font-bold text-amber-200">Regulatory Cleared Timeline</h3>
          <p className="text-sm text-slate-400 leading-relaxed italic">
            Disclaimer: Real payouts require a strict <strong>7-14 days clearing window</strong> to thoroughly audit text files for structural integrity, spam detection, and synthetic dialogues.
          </p>
        </div>
      </motion.div>

      {/* ── GUIDE SECTION ── */}
      <div id="how-it-works" className="border-t border-[#1e293b] pt-16 space-y-12">

        {/* Payout Calculation Banner */}
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-900/30 rounded-2xl p-6 sm:p-8 space-y-8">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-display font-bold text-white flex items-center justify-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-400" />
              How Your Payout is Calculated
            </h3>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
              Your compensation is strictly based on the quality and volume of instruction-following pairs extracted from your conversation. Each dialogue turn is evaluated by our AI for its training utility.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-2">
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-emerald-400">$0.50 – $4 JMD</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Per Useful Turn</div>
              </div>
              <div className="hidden sm:block text-slate-700 text-2xl font-light">×</div>
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-emerald-400">Total Valid Pairs</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Verified Density</div>
              </div>
              <div className="hidden sm:block text-slate-700 text-2xl font-light">=</div>
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-white bg-slate-900 px-4 py-1.5 rounded-xl border border-slate-700">Total Payout</div>
                <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-2">JMD via WiPay</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-mono pt-1">
              Currency guide: <span className="text-slate-400">JMD 1,000 ≈ TTD 46 ≈ BBD 8.80</span> &nbsp;·&nbsp; Rates updated monthly
            </div>
          </div>

          {/* Text exchange examples */}
          <div className="space-y-3">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest text-center">Real Exchange Examples</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Short = low payout — multi-turn */}
              <div className="bg-[#050810] rounded-2xl border border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/60">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">Short Exchange</span>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-900/30 px-2 py-0.5 rounded-full">Total ~$1.40 JMD</span>
                </div>
                <div className="p-4 space-y-3">
                  {/* Turn 1 */}
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <span className="text-[9px] font-bold font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded shrink-0 mt-0.5">PROMPT</span>
                      <p className="text-xs text-slate-300 font-mono leading-relaxed italic">"yooo weh gwan? yuh nah link up lukkl more???"</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-bold font-mono text-emerald-600 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded shrink-0 mt-0.5">REPLY</span>
                      <div className="flex-1 flex items-start justify-between gap-2">
                        <p className="text-xs text-slate-300 font-mono leading-relaxed italic">"god alone know."</p>
                        <span className="text-[9px] font-mono font-bold text-amber-500 shrink-0">$0.60</span>
                      </div>
                    </div>
                  </div>
                  {/* Divider */}
                  <div className="border-t border-slate-800/50" />
                  {/* Turn 2 */}
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <span className="text-[9px] font-bold font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded shrink-0 mt-0.5">PROMPT</span>
                      <p className="text-xs text-slate-300 font-mono leading-relaxed italic">"yuh neva seh yuh nah miss da one yah? yuh nuh serious!"</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-bold font-mono text-emerald-600 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded shrink-0 mt-0.5">REPLY</span>
                      <div className="flex-1 flex items-start justify-between gap-2">
                        <p className="text-xs text-slate-300 font-mono leading-relaxed italic">"Nuh seh suuh mayyneeee, a just how di ting come dung"</p>
                        <span className="text-[9px] font-mono font-bold text-amber-500 shrink-0">$0.80</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-slate-800/60">
                    <span className="text-[9px] text-slate-600 font-mono">Low density — casual Patois, short turns · still earns per turn</span>
                  </div>
                </div>
              </div>

              {/* Rich = high payout */}
              <div className="bg-[#050810] rounded-2xl border border-emerald-900/30 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-emerald-900/20 bg-emerald-950/20">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wide">Rich Exchange</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/40 px-2 py-0.5 rounded-full">~$157 JMD</span>
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex gap-2">
                    <span className="text-[9px] font-bold font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded shrink-0 mt-0.5">PROMPT</span>
                    <p className="text-xs text-slate-300 font-mono leading-relaxed italic">"me a try write up me business plan but mi cyaan figure out if mi fi incorporate first or wait till me land more clients and a make some real money — wah you think?"</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[9px] font-bold font-mono text-emerald-600 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded shrink-0 mt-0.5">REPLY</span>
                    <p className="text-xs text-slate-300 font-mono leading-relaxed italic">"Incorporate it fuss. It a go set the tone and mek yuh look serious from day one yuh zimmie. Plus yuh cyaan a open a proppa business account without it. Unless dem change dat but eida way incorporate it"</p>
                  </div>
                  <div className="pt-1 border-t border-emerald-900/20">
                    <span className="text-[9px] text-emerald-700 font-mono">High density — real question, actionable advice, Patois-authentic</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── VOICE NOTES SECTION ── */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-emerald-950/30 to-slate-950/30 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 z-10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-900/40">
                    <Mic className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] bg-emerald-500 text-slate-950 font-extrabold px-2 py-0.5 rounded uppercase tracking-widest">PREMIUM TIER</span>
                </div>
                <h3 className="text-xl font-display font-bold text-white">Voice Notes — Coming Soon</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
                  Caribbean accent audio for TTS/STT/ASR models. Yardie, country, urban — every dialect, every tone. Accent-rich voice notes are the most valuable data in Caribbean AI.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-mono">$300 JMD short clip</span>
                  <span className="text-[10px] bg-emerald-950/60 border border-emerald-900/40 text-emerald-300 px-2.5 py-1 rounded-full font-mono">up to $7,000 JMD</span>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-mono">JMD · TTD · BBD</span>
                </div>
              </div>
              <button
                onClick={() => setShowVoiceModal(true)}
                className="shrink-0 z-10 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Bell className="w-4 h-4" />
                Notify Me
              </button>
            </div>

            {/* Placeholder voice note example cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/50">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest sm:col-span-2">
                Sample Voice Clips (Launching with Voice Notes Phase 2)
              </div>

              <div className="bg-[#050810] rounded-2xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-200">Urban Male Voice · Kingston</div>
                    <div className="text-[10px] text-slate-500 font-mono">0:34 · Patois-heavy</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-900/30 px-2 py-0.5 rounded-full">est. $1,200 JMD</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 opacity-50 cursor-not-allowed">
                    <Play className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-1.5 bg-slate-800 rounded-full" />
                    <div className="flex justify-between text-[9px] font-mono text-slate-700">
                      <span>0:00</span><span>0:34</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600 italic font-mono border-t border-slate-800 pt-2">
                  Sample audio coming with Phase 2 launch
                </div>
              </div>

              <div className="bg-[#050810] rounded-2xl border border-emerald-900/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-200">Female Voice · Rural St. Elizabeth</div>
                    <div className="text-[10px] text-slate-500 font-mono">1:12 · Country dialect</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/40 px-2 py-0.5 rounded-full">est. $3,800 JMD</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 opacity-50 cursor-not-allowed">
                    <Play className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-1.5 bg-slate-800 rounded-full" />
                    <div className="flex justify-between text-[9px] font-mono text-slate-700">
                      <span>0:00</span><span>1:12</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-800 italic font-mono border-t border-emerald-900/20 pt-2">
                  Country dialect · rare accent · high AI training value
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="text-center max-w-xl mx-auto space-y-3 pt-4">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">How It Works</h2>
          <p className="text-slate-400 text-sm">How to package, sanitize, and claim your compensation.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <div className="space-y-4 bg-[#080d1a] p-5 rounded-2xl border border-[#1e293b] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-sm font-mono font-bold text-emerald-400">STEP // 01</div>
              <h4 className="text-md font-bold text-white">Download WhatsApp Chat Archive</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Navigate to WhatsApp on your mobile phone, enter the settings dropdown of your private active chat, click <strong>More</strong> &rarr; <strong>Export Chat</strong>, select <strong>Without Media</strong>, and download the `.zip` payload.
              </p>
            </div>
          </div>

          <div className="space-y-4 bg-[#080d1a] p-5 rounded-2xl border border-[#1e293b] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-sm font-mono font-bold text-teal-400">STEP // 02</div>
              <h4 className="text-md font-bold text-white">Anonymize and Preview Pairs</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Drop the exported chat zip into the secure purification container. Real-time algorithms immediately pseudonymize references to prevent private identity data leaks.
              </p>
            </div>
          </div>

          <div className="space-y-4 bg-[#080d1a] p-5 rounded-2xl border border-[#1e293b] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-sm font-mono font-bold text-emerald-400">STEP // 03</div>
              <h4 className="text-md font-bold text-white">Claim via WiPay</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Submit your unique registered <strong>UserId</strong> index. Log rewards securely and check real-time audit milestones on our public reconciliation ledger.
              </p>
            </div>
          </div>

          <div className="space-y-4 bg-[#090f1d] p-5 rounded-2xl border border-emerald-900 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-3 z-10">
              <div className="flex justify-between items-center">
                <div className="text-xs font-mono font-bold text-emerald-400">STEP // 04</div>
                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded uppercase font-mono tracking-wide font-bold">Voice Audio</span>
              </div>
              <h4 className="text-md font-bold text-white flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-emerald-400 group-hover:animate-pulse" />
                Vocal Audio Payouts
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Accent-rich Caribbean voice notes are highly demanded for audio AI training. Every dialect welcomed — the rarer your voice, the higher it scores.
              </p>
            </div>
            <div className="pt-2 z-10">
              {!subscribed ? (
                <form onSubmit={handleVoiceSubscribe} className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="address@email.com"
                      value={voiceEmail}
                      onChange={(e) => setVoiceEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-[11px] rounded-lg py-2 pl-8 pr-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 px-3 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold font-mono tracking-wider hover:bg-emerald-400 transition-colors uppercase flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Notify Me
                  </button>
                </form>
              ) : (
                <div className="bg-emerald-950/40 border border-emerald-800/40 p-3 rounded-xl text-center space-y-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                  <p className="text-[10px] text-emerald-300 font-semibold uppercase font-mono">Added &amp; Secured</p>
                  <p className="text-[9px] text-slate-400 leading-tight">We will alert you as soon as vocal calculations launch.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <HelpFaq />

      {/* ── VOICE NOTIFY MODAL ── */}
      <AnimatePresence>
        {showVoiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowVoiceModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-[#0a1020] rounded-3xl border border-emerald-900/40 shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-900/40">
                        <Mic className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] bg-emerald-500 text-slate-950 font-extrabold px-2 py-0.5 rounded uppercase tracking-widest">PREMIUM TIER</span>
                    </div>
                    <h2 className="text-xl font-display font-bold text-white">Voice Notes — Get Notified</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Drop your details. You'll be first to know when voice note payouts launch — and first in the payout queue.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowVoiceModal(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all shrink-0 mt-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {voiceSuccess ? (
                  <div className="py-8 text-center space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <div className="text-white font-bold text-lg">You're on the list.</div>
                    <p className="text-sm text-slate-400">We'll reach out when voice notes launch. First come, first paid.</p>
                    <button
                      onClick={() => { setShowVoiceModal(false); setVoiceSuccess(false); }}
                      className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleVoiceModalSubmit} className="space-y-4">
                    {voiceError && (
                      <div className="p-3 bg-red-950/40 border border-red-900/40 text-red-300 text-xs rounded-xl">
                        {voiceError}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wide block">Full Name <span className="text-emerald-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Your name"
                        value={voiceName}
                        onChange={(e) => setVoiceName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#070b16] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wide block">Email <span className="text-emerald-500">*</span></label>
                      <input
                        type="email"
                        required
                        placeholder="you@email.com"
                        value={voiceModalEmail}
                        onChange={(e) => setVoiceModalEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#070b16] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wide block">Town / Parish</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-600" />
                          <input
                            type="text"
                            placeholder="e.g. Kingston"
                            value={voiceTown}
                            onChange={(e) => setVoiceTown(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-[#070b16] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wide block">Age</label>
                        <input
                          type="number"
                          min="16"
                          max="100"
                          placeholder="e.g. 26"
                          value={voiceAge}
                          onChange={(e) => setVoiceAge(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#070b16] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wide block">Country</label>
                      <select
                        value={voiceCountry}
                        onChange={(e) => setVoiceCountry(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#070b16] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/40 transition-all"
                      >
                        <option value="JM">🇯🇲 Jamaica</option>
                        <option value="TT">🇹🇹 Trinidad & Tobago</option>
                        <option value="BB">🇧🇧 Barbados</option>
                        <option value="OTHER">🌍 Other Caribbean</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={voiceSubmitting}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {voiceSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4" />
                          Add Me to the Voice Notes List
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
