import React, { useState } from "react";
import { Shield, Sparkles, DollarSign, ArrowRight, HelpCircle, FileText, CheckCircle2, Globe, Server, Mic, Bell, Mail } from "lucide-react";
import { motion } from "motion/react";
import HelpFaq from "./HelpFaq";

interface LandingHeroProps {
  onStart: () => void;
  registeredUser: any;
}

export default function LandingHero({ onStart, registeredUser }: LandingHeroProps) {
  const [voiceEmail, setVoiceEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleVoiceSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (voiceEmail.trim()) {
      // Store locally or just toggle simulated state
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

  return (
    <div id="landing-hero" className="py-8 px-2 max-w-5xl mx-auto space-y-16">
      
      {/* Hero Header Block */}
      <div className="text-center space-y-6 relative py-4">
        {/* Abstract vector backdrops */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#022c22] rounded-full blur-3xl opacity-30 -z-10 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/65 text-emerald-300 text-xs font-mono font-bold tracking-wider border border-emerald-900/50"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          CHAT2CASH SECURE DATA HUB
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="text-4xl sm:text-6xl font-display font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto"
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
          Convert your text chat threads into clean, instruction-optimized training samples for custom LLM models. Strip names, numbers, and dates locally. Get rewarded instantly via <span className="font-semibold text-emerald-400">WiPay Caribbean</span>.
        </motion.p>

        {/* Cta Row */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4"
        >
          <button
            id="btn-get-started"
            onClick={onStart}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold border border-emerald-300/30 transition-all shadow-lg shadow-emerald-950/50 inline-flex items-center justify-center gap-2.5 text-sm cursor-pointer"
          >
            {registeredUser ? "Go to Processing Dashboard" : "Initiate Verification Profile"}
            <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </button>
          
          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-6 py-4 rounded-xl bg-[#0d1425] hover:bg-[#131d36] text-slate-300 font-bold border border-slate-800 transition-all text-xs inline-flex items-center justify-center"
          >
            Review Core Guidelines &rarr;
          </a>
        </motion.div>
      </div>

      {/* Trust & Policy Grid - Highly Professional Cards */}
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
            All names, physical mobile numbers, and emails are stripped locally and mapped to random pseudonym tags (e.g., Speaker A, Speaker B) before checking dialogue structure on our server.
          </p>
        </div>

        <div className="bg-[#080d19]/80 p-6 sm:p-7 rounded-2xl border border-[#1e293b] hover:border-emerald-500/30 transition-all space-y-4">
          <div className="p-3 rounded-xl bg-teal-950/60 text-teal-400 w-fit border border-teal-900/40">
            <DollarSign className="w-5 h-5" />
          </div>
          <h3 className="text-md sm:text-lg font-display font-bold text-white">Linguistic Density Valuation</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Our embedded evaluation engine uses Gemini AI to gauge context structure, response quality, and informative density to calculate real-time reward tokens.
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

      {/* Guide section */}
      <div id="how-it-works" className="border-t border-[#1e293b] pt-16 space-y-12">
        {/* Payout Calculation Banner */}
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-900/30 rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <h3 className="text-xl font-display font-bold text-white flex items-center justify-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            How Your Payout is Calculated
          </h3>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
            Your compensation is strictly based on the quality and volume of instruction-following pairs extracted from your conversation. Each dialogue turn is evaluated by our AI for its training utility.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-emerald-400">$0.50 - $1.00</div>
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
              <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-2">Disbursed to WiPay</div>
            </div>
          </div>
        </div>

        <div className="text-center max-w-xl mx-auto space-y-3 pt-8">
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
              <h4 className="text-md font-bold text-white">Disburse via WiPay</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Submit your unique registered <strong>UserId</strong> index. Log rewards securely and check real-time audit milestones on our public reconciliation ledger transparently.
              </p>
            </div>
          </div>

          {/* Secure interactive voice note notification banner card */}
          <div className="space-y-4 bg-[#090f1d] p-5 rounded-2xl border border-emerald-900 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-3 z-10">
              <div className="flex justify-between items-center">
                <div className="text-xs font-mono font-bold text-emerald-400">STEP // 04</div>
                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded uppercase font-mono tracking-wide font-bold">Vocal Audio</span>
              </div>
              <h4 className="text-md font-bold text-white flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-emerald-400 group-hover:animate-pulse" />
                Vocal Audio Payouts
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Accent-rich Caribbean voice notes represent highly demanded audio training models. Enter your email below to be notified instantly on support launch.
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
      
      {/* Help & FAQs Section inside the Home View / Footer Area */}
      <HelpFaq />
    </div>
  );
}
