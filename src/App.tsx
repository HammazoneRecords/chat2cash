import React, { useState, useEffect } from "react";
import {
  ShieldAlert, Sparkles, LogIn, Database, LogOut, CheckCircle,
  HelpCircle, MessageSquare, ShieldCheck, Heart, User, ExternalLink, Calendar
} from "lucide-react";
import { motion } from "motion/react";
import LandingHero from "./components/LandingHero";
import RegistrationForm from "./components/RegistrationForm";
import LoginForm from "./components/LoginForm";
import FileProcessor from "./components/FileProcessor";
import ReconciliationLedger from "./components/ReconciliationLedger";
import MySubmissions from "./components/MySubmissions";
import DynamicBackground from "./components/DynamicBackground";
import { UserProfile, ProcessedDataset } from "./types";
import { authClient } from "../lib/auth-client";

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'anonymize' | 'submissions' | 'ledger'>('home');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);

  // Scroll to top on active tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [activeTab]);

  // Restore session from Better Auth on mount
  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.user) setUserProfile(data.user); })
      .catch(() => {});

    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setSystemConfig(data))
      .catch((err) => console.error("Failed to load server configuration", err));
  }, []);

  const handleRegisterSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    setActiveTab('anonymize');
  };

  const handleLoginSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    setActiveTab('anonymize');
  };

  const handleLogout = async () => {
    await authClient.signOut();
    setUserProfile(null);
    setActiveTab('home');
  };

  const onNewDatasetCreated = (dataset: ProcessedDataset) => {
    // Optionally trigger any global state changes or simply bubble up logs if required
  };

  const publicAccountCode = userProfile?.userId
    ? `acct-${userProfile.userId.slice(-6)}`
    : "";

  return (
    <div className="min-h-screen bg-[#060a13] text-[#cbd5e1] flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200" id="main-application-frame">

      
      {/* Top Navigation Bar with modern glassmorphism */}
      <nav className="sticky top-0 z-40 relative bg-[#080d1a]/90 backdrop-blur-md border-b border-[#1e293b] px-4 py-4" id="navigation-bar">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('home')}>
            <img src="/chat2cashlogo.png" alt="Chat2Cash" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-display font-extrabold text-md tracking-tight text-white">Chat2Cash</span>
          </div>

          <div className="order-3 flex w-full items-center justify-center gap-1 overflow-x-auto bg-[#02060d]/80 p-1 rounded-xl border border-[#1e293b] sm:order-none sm:w-auto sm:justify-start sm:gap-2">
            <button
              id="nav-tab-home"
              onClick={() => setActiveTab('home')}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'home' 
                  ? "bg-[#1e293b] text-white shadow-sm" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Overview
            </button>
            <button
              id="nav-tab-anonymize"
              onClick={() => {
                setActiveTab('anonymize');
              }}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'anonymize' 
                  ? "bg-[#1e293b] text-white shadow-sm" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Anonymizer Hub
            </button>
            <button
              id="nav-tab-ledger"
              onClick={() => setActiveTab('ledger')}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                activeTab === 'ledger' 
                  ? "bg-[#1e293b] text-white shadow-sm" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Public Ledger
            </button>
            {userProfile && (
              <button
                id="nav-tab-submissions"
                onClick={() => setActiveTab('submissions')}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'submissions'
                    ? "bg-[#1e293b] text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                My Submissions
              </button>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {userProfile ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center gap-3 bg-[#0d1425] px-3 py-1.5 rounded-xl border border-emerald-950/30"
              >
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-200 leading-tight block">{userProfile.fullName}</span>
                  <div className="flex items-center gap-1 justify-end text-[9px] text-slate-400 font-mono mt-0.5">
                    {userProfile.town && <span className="opacity-80">{userProfile.town},</span>}
                    <span className="font-bold text-emerald-500 uppercase">{userProfile.country}</span>
                    <span className="opacity-60 font-medium">({publicAccountCode})</span>
                  </div>
                </div>
                <button
                  id="btn-profile-logout"
                  onClick={handleLogout}
                  title="Disconnect compliance wallet"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="btn-nav-login"
                  onClick={() => { setAuthMode('signin'); setActiveTab('anonymize'); }}
                  className="shrink-0 px-3 py-2 sm:px-4 border border-slate-700 bg-[#0d1527] hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sign In</span>
                </button>
                <button
                  id="btn-nav-register"
                  onClick={() => { setAuthMode('signup'); setActiveTab('anonymize'); }}
                  className="shrink-0 px-3 py-2 sm:px-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10" id="application-body-container">
        {activeTab === 'home' && (
          <LandingHero 
            onStart={() => {
              setActiveTab('anonymize');
            }} 
            registeredUser={userProfile}
          />
        )}

        {activeTab === 'anonymize' && (
          <div className="space-y-6">
            {!userProfile ? (
              <div className="py-2">
                {authMode === 'signin' ? (
                  <LoginForm
                    onLoginSuccess={handleLoginSuccess}
                    onSwitchToRegister={() => setAuthMode('signup')}
                  />
                ) : (
                  <RegistrationForm
                    onRegisterSuccess={handleRegisterSuccess}
                    onSwitchToLogin={() => setAuthMode('signin')}
                  />
                )}
              </div>
            ) : (
              <FileProcessor user={userProfile} onDatasetCreated={onNewDatasetCreated} />
            )}
          </div>
        )}

        {activeTab === 'ledger' && (
          <ReconciliationLedger />
        )}

        {activeTab === 'submissions' && userProfile && (
          <MySubmissions />
        )}
      </main>

      {/* System Footer Alerts */}
      <footer className="bg-[#04070f] border-t border-[#1e293b] text-slate-500 text-xs py-10 px-4" id="application-footer">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 font-bold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="font-display tracking-wide text-sm font-semibold text-white">Durable AI Dataset Compliance Engine</span>
            </div>
            <p className="text-[11px] text-slate-500 max-w-lg leading-relaxed">
              Real-time proper anonymization, strict token evaluation, and secure gateway payout logistics managed via WiPay.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-slate-400 font-semibold text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/45 border border-emerald-900/30 px-3 py-1.5 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              WiPay Systems: Operational
            </span>
            <div className="flex items-center gap-3 text-slate-500">
              <span className="hover:text-slate-300 cursor-pointer">Security Protocol</span>
              <span>&bull;</span>
              <span className="hover:text-slate-300 cursor-pointer">API Ledger</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
