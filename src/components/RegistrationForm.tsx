import React, { useState, useRef, useEffect } from "react";
import { User, Mail, Phone, Landmark, ShieldCheck, Globe, HelpCircle, Lock, Camera, RefreshCw, Upload, Image as ImageIcon, ShieldAlert, Trash2, MapPin, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { authClient } from "../../lib/auth-client";

interface RegistrationFormProps {
  onRegisterSuccess: (profile: any) => void;
  onSwitchToLogin?: () => void;
  defaultProfile?: any;
}

export default function RegistrationForm({ onRegisterSuccess, onSwitchToLogin, defaultProfile }: RegistrationFormProps) {
  const [fullName, setFullName] = useState(defaultProfile?.fullName || "");
  const [email, setEmail] = useState(defaultProfile?.email || "");
  const [phone, setPhone] = useState(defaultProfile?.phone || "");
  const [wipayAccount, setWipayAccount] = useState(defaultProfile?.wipayAccount || "");
  const [wipayLink, setWipayLink] = useState(defaultProfile?.wipayLink || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [country, setCountry] = useState(defaultProfile?.country || "JM");
  const [town, setTown] = useState(defaultProfile?.town || "");
  const [age, setAge] = useState(defaultProfile?.age || "");
  const [gender, setGender] = useState(defaultProfile?.gender || "");
  const [educationLevel, setEducationLevel] = useState(defaultProfile?.educationLevel || "");
  const [school, setSchool] = useState(defaultProfile?.school || "");
  const [singleParentHome, setSingleParentHome] = useState(defaultProfile?.singleParentHome || false);
  const [demographicOptIn, setDemographicOptIn] = useState(defaultProfile?.demographicOptIn || false);
  const [idPhoto, setIdPhoto] = useState(defaultProfile?.idPhoto || "");
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraMode, setCameraMode] = useState<"leftFace" | "rightFace" | "manual">("leftFace");
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const countries = [
    { code: "TT", name: "Trinidad & Tobago", flag: "🇹🇹" },
    { code: "JM", name: "Jamaica", flag: "🇯🇲" },
    { code: "BB", name: "Barbados", flag: "🇧🇧" },
    { code: "US", name: "Cayman/International", flag: "🇰🇾" },
  ];

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setError("Could not access camera. Please upload an image instead or grant camera permission.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Create high resolution canvas relative to video size
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Draw raw camera feed to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply permanent privacy masks on top of the image to censor face & TRN!
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.fillStyle = "rgba(15, 23, 42, 0.98)"; // Slate cover box
    
    // Face box
    if (cameraMode === "leftFace") {
      ctx.fillRect(w * 0.05, h * 0.20, w * 0.35, h * 0.65);
      // Label text
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(12, Math.floor(h * 0.04))}px sans-serif`;
      ctx.fillText("FACE REDACTED", w * 0.08, h * 0.5);
    } else if (cameraMode === "rightFace") {
      ctx.fillRect(w * 0.60, h * 0.20, w * 0.35, h * 0.65);
      // Label text
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(12, Math.floor(h * 0.04))}px sans-serif`;
      ctx.fillText("FACE REDACTED", w * 0.63, h * 0.5);
    } else {
      // Manual hide center
      ctx.fillRect(w * 0.20, h * 0.25, w * 0.60, h * 0.50);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(12, Math.floor(h * 0.04))}px sans-serif`;
      ctx.fillText("KYC REDACTION ACTIVE", w * 0.30, h * 0.5);
    }
    
    // TRN box
    ctx.fillStyle = "rgba(15, 23, 42, 0.98)";
    if (cameraMode === "leftFace") {
      ctx.fillRect(w * 0.50, h * 0.15, w * 0.42, h * 0.25);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(10, Math.floor(h * 0.035))}px monospace`;
      ctx.fillText("[ TRN REDACTED ]", w * 0.55, h * 0.28);
    } else {
      ctx.fillRect(w * 0.05, h * 0.15, w * 0.42, h * 0.25);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(10, Math.floor(h * 0.035))}px monospace`;
      ctx.fillText("[ TRN REDACTED ]", w * 0.10, h * 0.28);
    }
    
    // Save to Base64
    const base64Img = canvas.toDataURL("image/jpeg", 0.85);
    setIdPhoto(base64Img);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width || 800;
        canvas.height = img.height || 500;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Apply identical privacy masks on top of the uploaded picture
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = "rgba(15, 23, 42, 0.98)";
        
        // Standard Left face & top right TRN covering
        if (cameraMode === "leftFace") {
          ctx.fillRect(w * 0.05, h * 0.20, w * 0.35, h * 0.65);
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.max(12, Math.floor(h * 0.04))}px sans-serif`;
          ctx.fillText("FACE REDACTED", w * 0.08, h * 0.5);
          
          ctx.fillStyle = "rgba(15, 23, 42, 0.98)";
          ctx.fillRect(w * 0.50, h * 0.15, w * 0.42, h * 0.25);
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.max(10, Math.floor(h * 0.035))}px monospace`;
          ctx.fillText("[ TRN REDACTED ]", w * 0.55, h * 0.28);
        } else if (cameraMode === "rightFace") {
          ctx.fillRect(w * 0.60, h * 0.20, w * 0.35, h * 0.65);
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.max(12, Math.floor(h * 0.04))}px sans-serif`;
          ctx.fillText("FACE REDACTED", w * 0.63, h * 0.5);
          
          ctx.fillStyle = "rgba(15, 23, 42, 0.98)";
          ctx.fillRect(w * 0.05, h * 0.15, w * 0.42, h * 0.25);
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.max(10, Math.floor(h * 0.035))}px monospace`;
          ctx.fillText("[ TRN REDACTED ]", w * 0.10, h * 0.28);
        } else {
          ctx.fillRect(w * 0.15, h * 0.20, w * 0.70, h * 0.60);
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.max(14, Math.floor(h * 0.04))}px sans-serif`;
          ctx.fillText("KYC REDACTION ACTIVE", w * 0.30, h * 0.5);
        }
        
        const base64Img = canvas.toDataURL("image/jpeg", 0.85);
        setIdPhoto(base64Img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !phone.trim() || !age || !gender.trim() || !town.trim()) {
      setError("Please complete all required fields: name, email, phone, town, age, and gender. You can add WiPay details before final submission.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (demographicOptIn && !idPhoto) {
      setError("Compliance check incomplete: Please capture or upload a redacted Photo ID to qualify for the 2x Payout Multiplier. Or scale down and untick the 'Opt-in for 2x Payout Multiplier' option.");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create Better Auth account (session cookie set automatically)
      const { data: authData, error: authError } = await authClient.signUp.email({
        email,
        password,
        name: fullName,
      });

      if (authError) {
        throw new Error(authError.message || "Account creation failed.");
      }

      // Step 2: Save contributor-specific profile data (session cookie authenticates)
      const profileRes = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone, wipayAccount, wipayLink, country, town,
          age, gender, educationLevel, school, singleParentHome, demographicOptIn, idPhoto,
        }),
      });

      const profileData = await profileRes.json();
      if (!profileRes.ok) {
        throw new Error(profileData.error || "Profile update failed.");
      }

      onRegisterSuccess(profileData.user);
    } catch (err: any) {
      setError(err?.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-xl mx-auto bg-[#0a1020] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden p-8 sm:p-10 space-y-8 relative glow-auth"
      id="registration-container"
    >
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
      
      <div className="space-y-2 text-center sm:text-left">
        <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-widest block">WHO ARE YOU?</span>
        <h2 className="text-2xl font-bold font-display text-white tracking-tight">Create Your Seller Profile</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Create an account to preview anonymization and review your cleaned JSON. WiPay details are only required before final paid submission.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Full Name */}
        <div className="space-y-2">
          <label htmlFor="reg-fullName" className="text-xs font-bold text-slate-300 font-mono tracking-wide block">FULL LEGAL NAME (ID CARD)</label>
          <div className="relative">
            <User className="absolute left-3 top-3.5 w-4 h-4 text-emerald-500/60" />
            <input
              id="reg-fullName"
              type="text"
              placeholder="Johnathon Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#070b16] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-100 placeholder-slate-600 font-medium"
              required
            />
          </div>
        </div>

        {/* Email Address */}
        <div className="space-y-2">
          <label htmlFor="reg-email" className="text-xs font-bold text-slate-300 font-mono tracking-wide block">EMAIL ADDRESS (WIPAY REGISTERED USERNAME)</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-emerald-500/60" />
            <input
              id="reg-email"
              type="email"
              placeholder="e.g. john@yourdomain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#070b16] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-100 placeholder-slate-600 font-medium"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="reg-password" className="text-xs font-bold text-slate-300 font-mono tracking-wide block">PASSWORD <span className="text-emerald-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-emerald-500/60" />
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-[#070b16] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-100 placeholder-slate-600 font-medium"
                required
              />
              <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="reg-confirm-password" className="text-xs font-bold text-slate-300 font-mono tracking-wide block">CONFIRM PASSWORD <span className="text-emerald-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-emerald-500/60" />
              <input
                id="reg-confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#070b16] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-100 placeholder-slate-600 font-medium"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Phone Number */}
          <div className="space-y-2">
            <label htmlFor="reg-phone" className="text-xs font-bold text-slate-300 font-mono tracking-wide block">MOBILE PHONE</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-4 h-4 text-emerald-500/60" />
              <input
                id="reg-phone"
                type="tel"
                placeholder="+1 (868) 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#070b16] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-100 placeholder-slate-600 font-mono"
                required
              />
            </div>
          </div>

          {/* Country Currency Selection */}
          <div className="space-y-2">
            <label htmlFor="reg-country" className="text-xs font-bold text-slate-300 font-mono tracking-wide block">PROFILE COUNTRY</label>
            <div className="relative">
              <Globe className="absolute left-3 top-3.5 w-4 h-4 text-emerald-500/60" />
              <select
                id="reg-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#070b16] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-100 font-medium"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#0a1020] text-white">
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Text-chat payout estimates are shown and cleared in JMD for launch. Country helps with profile context and future local settlement support.
            </p>
          </div>

          {/* Town Field */}
          <div className="space-y-2">
            <label htmlFor="reg-town" className="text-xs font-bold text-slate-300 font-mono tracking-wide block">TOWN / CITY <span className="text-emerald-500">*</span></label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-emerald-500/60" />
              <input
                id="reg-town"
                type="text"
                placeholder="e.g. Kingston, San Fernando"
                value={town}
                onChange={(e) => setTown(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#070b16] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-100 placeholder-slate-600 font-medium"
                required
              />
            </div>
          </div>

          {/* Age Selection */}
          <div className="space-y-2">
            <label htmlFor="reg-age" className="text-xs font-bold text-slate-300 font-mono tracking-wide block">AGE <span className="text-emerald-500">*</span></label>
            <input
              id="reg-age"
              type="number"
              min="18"
              max="100"
              placeholder="e.g. 25"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-4 py-3 bg-[#070b16] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-100 placeholder-slate-600 font-medium"
              required
            />
          </div>
          
          {/* Gender Selection */}
          <div className="space-y-2">
            <label htmlFor="reg-gender" className="text-xs font-bold text-slate-300 font-mono tracking-wide block">GENDER <span className="text-emerald-500">*</span></label>
            <select
              id="reg-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-3 bg-[#070b16] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-100 font-medium"
              required
            >
              <option value="" disabled className="bg-[#0a1020] text-slate-400">Select Gender...</option>
              <option value="Male" className="bg-[#0a1020] text-white">Male</option>
              <option value="Female" className="bg-[#0a1020] text-white">Female</option>
              <option value="Intersex (formerly referred to locally as Hermaphrodite)" className="bg-[#0a1020] text-white">Intersex (formerly referred to locally as Hermaphrodite)</option>
            </select>
          </div>
        </div>

        {/* 2x Opt-in demographic section */}
        <div className="bg-[#080c1a] border border-emerald-900/30 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-emerald-900/20 bg-gradient-to-r from-emerald-950/20 to-teal-950/20 flex items-start gap-3">
            <div className="pt-0.5">
              <input 
                type="checkbox" 
                id="reg-demographicOptIn"
                checked={demographicOptIn}
                onChange={(e) => setDemographicOptIn(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label htmlFor="reg-demographicOptIn" className="text-sm font-bold text-emerald-300 flex items-center gap-2 cursor-pointer">
                Opt-in for 2x Payout Multiplier
                <span className="text-[10px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded uppercase font-mono tracking-wide">Beta</span>
              </label>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Leave this unchecked for standard payout with no ID upload. Turn it on only if you want to share extra demographic proof for multiplier review.
              </p>
            </div>
          </div>
          {!demographicOptIn && (
            <div id="standard-payout-no-id-note" className="px-5 py-3 border-t border-slate-800/50 bg-slate-950/35 text-xs leading-relaxed text-slate-400">
              Standard payout is available without a photo ID. You can finish signup, preview anonymization, and submit paid chats after payout setup.
            </div>
          )}
          
          {demographicOptIn && (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in border-t border-slate-800/50">
               {/* Education Level */}
               <div className="space-y-2">
                <label htmlFor="reg-edu" className="text-xs font-bold text-slate-400 font-mono tracking-wide block">EDUCATION LEVEL</label>
                <select
                  id="reg-edu"
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full px-4 py-3 bg-[#050810] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-200 font-medium"
                >
                  <option value="" className="bg-[#0a1020] text-slate-400">Select Level...</option>
                  <option value="High School" className="bg-[#0a1020] text-white">High School (CXC/CSEC)</option>
                  <option value="College/CAPE" className="bg-[#0a1020] text-white">CAPE / Community College</option>
                  <option value="Bachelors" className="bg-[#0a1020] text-white">Bachelor's Degree</option>
                  <option value="Masters+" className="bg-[#0a1020] text-white">Master's Degree or Higher</option>
                </select>
              </div>

               {/* School Name */}
              <div className="space-y-2">
                <label htmlFor="reg-school" className="text-xs font-bold text-slate-400 font-mono tracking-wide block">SCHOOL/INSTITUTION</label>
                <input
                  id="reg-school"
                  type="text"
                  placeholder="e.g. UWI Mona"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-4 py-3 bg-[#050810] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-200 placeholder-slate-600 font-medium"
                />
              </div>

              {/* Single Parent */}
              <div className="sm:col-span-2 pt-2 flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="reg-singleParent"
                  checked={singleParentHome}
                  onChange={(e) => setSingleParentHome(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50"
                />
                <label htmlFor="reg-singleParent" className="text-xs text-slate-300 font-medium cursor-pointer">
                  I grew up in a single-parent household (Optional demographic study)
                </label>
              </div>
            </div>
          )}
        </div>

        {/* WiPay Account Details */}
        <div className="space-y-2.5 p-5 rounded-2xl bg-emerald-950/20 border border-emerald-900/40">
          <div className="flex items-center justify-between">
            <label htmlFor="reg-wipayAccount" className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 font-mono">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              WIPAY MERCHANT ACCOUNT NUMBER <span className="text-slate-500">(required before final submit)</span>
            </label>
            <span className="text-[9px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800/40 font-mono font-semibold">CAN ADD LATER</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Add this now if you have it. You can still create an account and preview anonymization without it, but paid submission is locked until this is complete.
          </p>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-3.5 w-4 h-4 text-emerald-400" />
            <input
              id="reg-wipayAccount"
              type="text"
              placeholder="e.g. 1908273"
              value={wipayAccount}
              onChange={(e) => setWipayAccount(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#050810] border border-emerald-900/50 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 transition-all text-white placeholder-emerald-900/60"
            />
          </div>
        </div>

        {/* WiPay Payout Link */}
        <div className="space-y-2.5 p-5 rounded-2xl bg-emerald-950/20 border border-emerald-900/40">
          <label htmlFor="reg-wipayLink" className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 font-mono">
            <Landmark className="w-3.5 h-3.5 text-emerald-400" />
            WIPAY PAYOUT LINK <span className="text-slate-500">(required before final submit)</span>
          </label>
          <p className="text-[11px] text-slate-400 leading-normal">
            Provide your personalized WiPay payout link before paid submission. <a href="https://wipaycaribbean.com/jamaica" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">Get your link</a>
          </p>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-3.5 w-4 h-4 text-emerald-400" />
            <input
              id="reg-wipayLink"
              type="url"
              placeholder="https://pay.wipaycaribbean.com/..."
              value={wipayLink}
              onChange={(e) => setWipayLink(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#050810] border border-emerald-900/50 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 transition-all text-white placeholder-emerald-900/60"
            />
          </div>
        </div>

         {/* Secure Compliance Photo ID Section - Only displayed when opt-in is selected to optimize space */}
        {demographicOptIn && (
          <div className="space-y-4 p-5 rounded-2xl bg-[#090f1d] border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                PHOTO ID FOR MULTIPLIER REVIEW <span className="text-emerald-500 font-bold">(2X OPT-IN ONLY)*</span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded border font-mono text-emerald-400 bg-emerald-950/40 border-emerald-900/60 font-bold">
                REQUIRED
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-normal">
              This is not required for standard payout. It is only used to review multiplier eligibility. The browser applies solid blackout frames over your face and Taxpayer Registration Number before upload; the server stores only a one-way verification marker.
            </p>

            {/* Mask Options */}
            <div className="bg-[#040810] p-3 rounded-xl border border-slate-900 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-400 font-mono uppercase">Id Alignment Theme:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setCameraMode("leftFace")}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                    cameraMode === "leftFace" ? "bg-emerald-500 text-slate-950" : "bg-slate-950 text-slate-400 border border-slate-800"
                  }`}
                >
                  Face Left (Standard Licence)
                </button>
                <button
                  type="button"
                  onClick={() => setCameraMode("rightFace")}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                    cameraMode === "rightFace" ? "bg-emerald-500 text-slate-950" : "bg-slate-950 text-slate-400 border border-slate-800"
                  }`}
                >
                  Face Right
                </button>
                <button
                  type="button"
                  onClick={() => setCameraMode("manual")}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                    cameraMode === "manual" ? "bg-emerald-500 text-slate-950" : "bg-slate-950 text-slate-400 border border-slate-800"
                  }`}
                >
                  Full Center Cover
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3" id="id-upload-actions">
              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="py-3 px-4 bg-[#0a152d] hover:bg-[#0f1d3e] border border-[#1e3a6a] hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-sky-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Capture with Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="py-3 px-4 bg-red-950/30 hover:bg-red-950/50 border border-red-900/40 hover:border-red-500/50 rounded-xl text-xs font-semibold text-red-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Close Camera Feed
                </button>
              )}

              <label className="py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer text-center">
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Upload Document</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Camera Streaming Panel with Dynamic Simulated Cover Frames */}
            {isCameraActive && (
              <div className="relative border border-dashed border-emerald-500/40 rounded-xl overflow-hidden bg-slate-950 aspect-[1.586/1]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                
                {/* Dynamic Overlay Shields to Cover Sensitive Data */}
                {cameraMode === "leftFace" && (
                  <>
                    {/* Left Face cover */}
                    <div className="absolute left-[5%] top-[20%] w-[35%] h-[65%] bg-slate-950/95 border-2 border-dashed border-red-500/60 flex flex-col items-center justify-center text-center p-1.5 rounded-lg">
                      <ShieldCheck className="w-5 h-5 text-red-500 mb-1" />
                      <span className="text-[9px] font-bold text-red-400 font-mono leading-tight">FACE AREA COVERED</span>
                    </div>
                    {/* Top-Right TRN cover */}
                    <div className="absolute right-[5%] top-[15%] w-[42%] h-[25%] bg-slate-950/95 border-2 border-dashed border-yellow-500/60 flex flex-col items-center justify-center text-center p-1 rounded-md">
                      <span className="text-[9px] font-bold text-yellow-400 font-mono leading-tight">TRN REDACTED</span>
                    </div>
                  </>
                )}

                {cameraMode === "rightFace" && (
                  <>
                    {/* Right Face cover */}
                    <div className="absolute right-[5%] top-[20%] w-[35%] h-[65%] bg-slate-950/95 border-2 border-dashed border-red-500/60 flex flex-col items-center justify-center text-center p-1.5 rounded-lg">
                      <ShieldCheck className="w-5 h-5 text-red-500 mb-1" />
                      <span className="text-[9px] font-bold text-red-400 font-mono leading-tight">FACE AREA COVERED</span>
                    </div>
                    {/* Top-Left TRN cover */}
                    <div className="absolute left-[5%] top-[15%] w-[42%] h-[25%] bg-slate-950/95 border-2 border-dashed border-yellow-500/60 flex flex-col items-center justify-center text-center p-1 rounded-md">
                      <span className="text-[9px] font-bold text-yellow-400 font-mono leading-tight">TRN REDACTED</span>
                    </div>
                  </>
                )}

                {cameraMode === "manual" && (
                  <div className="absolute left-[15%] top-[20%] w-[70%] h-[60%] bg-slate-950/95 border-2 border-dashed border-red-500/60 flex flex-col items-center justify-center text-center p-1.5 rounded-lg">
                    <ShieldCheck className="w-7 h-7 text-red-500 mb-1" />
                    <span className="text-[10px] font-bold text-red-400 font-mono uppercase">Privacy cover region</span>
                  </div>
                )}

                {/* Bottom bar inside video screen */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-slate-950/80 backdrop-blur-sm p-1.5 rounded-lg">
                  <span className="text-[9px] text-emerald-400 font-mono font-medium">📷 Align ID & Tap Snap</span>
                  <button
                    type="button"
                    onClick={takeSnapshot}
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-extrabold rounded-md uppercase transition-all"
                  >
                    Snap & Redact
                  </button>
                </div>
              </div>
            )}

            {/* Preview of Taken / Uploaded Base64 ID Photo */}
            {idPhoto && (
              <div className="space-y-2" id="id-photo-preview-box">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wide">Secure Anonymized ID Output:</span>
                  <button
                    type="button"
                    onClick={() => setIdPhoto("")}
                    className="text-[10px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 transition-all pointer-events-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                </div>
                <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-slate-950 aspect-[1.586/1] flex items-center justify-center">
                  <img
                    src={idPhoto}
                    alt="Anonymized ID Compliance Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-1 bg-emerald-950/90 border border-emerald-800 text-emerald-400 font-mono text-[9px] rounded flex items-center gap-1 leading-none">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>SECURELY STRIPPED & ENCRYPTED</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          id="btn-register-submit"
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-sm font-bold shadow-lg shadow-emerald-950/50 disabled:opacity-40 transition-all outline-none cursor-pointer"
        >
          {loading ? "Creating your account..." : "CREATE PREVIEW ACCOUNT"}
        </button>

        <div className="pt-3 border-t border-slate-800 flex items-start gap-2.5 text-slate-500 text-[11px] leading-relaxed">
          <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            Payouts take <strong>7-14 business days</strong> — this is to verify submissions are genuine and not synthetic. Your data is never shared or sold beyond the stated purpose.
          </span>
        </div>

        {onSwitchToLogin && (
          <p className="text-center text-xs text-slate-400">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
            >
              Sign in →
            </button>
          </p>
        )}
      </form>
    </motion.div>
  );
}
