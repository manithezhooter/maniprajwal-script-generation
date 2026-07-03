"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import {
  Sparkles,
  History,
  Download,
  AlertTriangle,
  TrendingUp,
  User,
  LogOut,
  Settings,
  Shield,
  Eye,
  CheckCircle,
  HelpCircle,
  FileText,
  Clock,
  Languages,
  BookOpen,
  Layout,
  Palette
} from "lucide-react";

// Common language presets
const COMMON_LANGUAGES = [
  "English", "Spanish", "French", "Hindi", "Japanese", 
  "Arabic", "German", "Russian", "Mandarin", "Portuguese", 
  "Italian", "Dutch", "Korean", "Turkish", "Vietnamese", "Bengali"
];

// Available niches
const NICHES = [
  "Tech & Gadgets", "Personal Finance", "Health & Fitness", 
  "Comedy & Entertainment", "Education", "Storytelling & Mystery", 
  "Lifestyle & Vlog", "Business & Marketing", "Motivation & Productivity"
];

// Reading levels
const READING_LEVELS = [
  "5th Grade", "Middle School", "High School", "College", "Professional"
];

interface UserType {
  id: string;
  email: string;
  dob: string;
  role: string;
}

interface DraftType {
  id?: string;
  hook: string;
  body: string;
}

interface ScriptType {
  id: string;
  prompt: string;
  improvedPrompt: string;
  language: string;
  duration: number;
  niche: string;
  readingLevel: string;
  drafts: DraftType[];
  selectedDraftId: string;
  seoKeywords?: string;
  seoHashtags?: string;
  seoCaption?: string;
  seoScore?: number;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  // Authentication states
  const [user, setUser] = useState<UserType | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [role, setRole] = useState("user");
  const [authError, setAuthError] = useState("");

  // Theme state
  const [theme, setTheme] = useState("wwdc");

  // Generator states
  const [prompt, setPrompt] = useState("");
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [language, setLanguage] = useState("English");
  const [duration, setDuration] = useState("30");
  const [niche, setNiche] = useState("Tech & Gadgets");
  const [readingLevel, setReadingLevel] = useState("Middle School");
  
  const [isImproving, setIsImproving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Generated draft results (5-6 drafts)
  const [drafts, setDrafts] = useState<DraftType[]>([]);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);
  const [sensitiveWarning, setSensitiveWarning] = useState(false);
  const [flaggedWords, setFlaggedWords] = useState<string[]>([]);
  const [showAgeWarningModal, setShowAgeWarningModal] = useState(false);
  const [generationMeta, setGenerationMeta] = useState<any>(null);

  // Loaded/Saved Script and SEO State
  const [activeScript, setActiveScript] = useState<ScriptType | null>(null);
  const [history, setHistory] = useState<ScriptType[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Admin stats state
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // 3D Card Hover Ref
  const cardRef = useRef<HTMLDivElement>(null);

  // Load active user and history on start
  useEffect(() => {
    checkUserSession();
    const savedTheme = localStorage.getItem("liquid_generator_theme") || "wwdc";
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setHistory([]);
      setActiveScript(null);
      setIsAdminMode(false);
    }
  }, [user]);

  // Apply theme attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("liquid_generator_theme", theme);
  }, [theme]);

  // Handle mouse move for WWDC 3D Card mouse lighting highlight effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  const checkUserSession = async () => {
    try {
      const res = await fetch("/api/auth/user");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error("Session check error", e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const url = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = authMode === "login" 
      ? { email, password } 
      : { email, password, dob, role };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Authentication failed");
        return;
      }
      if (authMode === "login") {
        setUser(data.user);
      } else {
        // Automatically login after register
        setAuthMode("login");
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          setUser(loginData.user);
        }
      }
    } catch (err) {
      setAuthError("Server communication error");
    }
  };

  const handleGoogleLoginMock = () => {
    // Simulate user with DOB making them 25 years old (18+)
    setUser({
      id: "google-mock-id",
      email: "google.user@gmail.com",
      dob: "2001-05-15T00:00:00.000Z",
      role: "user"
    });
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/generate/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.scripts);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleImprovePrompt = async () => {
    if (!prompt) return;
    setIsImproving(true);
    try {
      const res = await fetch("/api/generate/improve-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (res.ok) {
        setImprovedPrompt(data.improvedPrompt);
      } else {
        alert(data.error || "Failed to improve prompt");
      }
    } catch (e) {
      alert("Error improving prompt");
    } finally {
      setIsImproving(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setDrafts([]);
    setSensitiveWarning(false);
    setFlaggedWords([]);
    setActiveScript(null);
    setGenerationMeta(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          improvedPrompt,
          language,
          duration: parseInt(duration),
          niche,
          readingLevel,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || data.error || "Generation failed");
        return;
      }

      if (data.sensitiveWarning) {
        setSensitiveWarning(true);
        setFlaggedWords(data.flaggedWords);
        setDrafts(data.drafts);
        setSelectedDraftIndex(0);
        setGenerationMeta(data);
        setShowAgeWarningModal(true);
      } else {
        // Automatically save and redirect!
        setIsSaving(true);
        try {
          const saveRes = await fetch("/api/generate/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: data.prompt,
              improvedPrompt: data.improvedPrompt,
              language: data.language,
              duration: data.duration,
              niche: data.niche,
              readingLevel: data.readingLevel,
              drafts: data.drafts,
              selectedDraftIndex: 0,
            }),
          });
          const saveData = await saveRes.json();
          if (saveRes.ok) {
            router.push(`/read/${saveData.script.id}`);
          } else {
            alert(saveData.error || "Failed to auto-save script");
          }
        } catch (saveErr) {
          alert("Error auto-saving script");
        } finally {
          setIsSaving(false);
        }
      }
    } catch (e) {
      alert("Error generating script");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSelectedDraft = async () => {
    if (!generationMeta || drafts.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/generate/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: generationMeta.prompt,
          improvedPrompt: generationMeta.improvedPrompt,
          language: generationMeta.language,
          duration: generationMeta.duration,
          niche: generationMeta.niche,
          readingLevel: generationMeta.readingLevel,
          drafts: drafts,
          selectedDraftIndex: selectedDraftIndex,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveScript(data.script);
        fetchHistory();
        // Clear workspace drafts to show the saved active script
        setDrafts([]);
      } else {
        alert(data.error || "Failed to save script");
      }
    } catch (e) {
      alert("Error saving script");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermitAndProceed = async () => {
    setShowAgeWarningModal(false);
    if (!generationMeta || drafts.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/generate/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: generationMeta.prompt,
          improvedPrompt: generationMeta.improvedPrompt,
          language: generationMeta.language,
          duration: generationMeta.duration,
          niche: generationMeta.niche,
          readingLevel: generationMeta.readingLevel,
          drafts: drafts,
          selectedDraftIndex: 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/read/${data.script.id}`);
      } else {
        alert(data.error || "Failed to auto-save script");
      }
    } catch (e) {
      alert("Error auto-saving script");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadScript = (script: ScriptType) => {
    setIsAdminMode(false);
    setDrafts([]);
    setActiveScript(script);
  };

  const fetchAdminStats = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
        setIsAdminMode(true);
      } else {
        alert("Access Denied: You are not authorized to view this page.");
      }
    } catch (e) {
      alert("Failed to fetch admin stats");
    } finally {
      setAdminLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!activeScript) return;
    
    // Find the selected draft body and hook
    const selectedDraft = activeScript.drafts.find(
      (d) => d.id === activeScript.selectedDraftId
    ) || activeScript.drafts[0];

    const doc = new jsPDF();
    
    // Custom Blue & Orange Header Gradient (Styling representation)
    doc.setFillColor(30, 80, 255);
    doc.rect(0, 0, 210, 10, "F");
    doc.setFillColor(255, 100, 20);
    doc.rect(0, 10, 210, 5, "F");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(2, 0, 16);
    doc.text("VIRAL VIDEO SCRIPT DRAFT", 20, 32);
    
    // Metadata block
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Generated on: ${new Date(activeScript.createdAt).toLocaleDateString()}`, 20, 42);
    doc.text(`Prompt: ${activeScript.prompt}`, 20, 48, { maxWidth: 170 });
    doc.text(`Niche: ${activeScript.niche}  |  Language: ${activeScript.language}  |  Duration: ${activeScript.duration}s`, 20, 60);
    doc.text(`Reading Level: ${activeScript.readingLevel}`, 20, 66);
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(220, 220, 220);
    doc.line(20, 72, 190, 72);
    
    // Hook
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 80, 255); // Blue
    doc.text("HOOK (First 3 Seconds - Grab Attention)", 20, 82);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(selectedDraft.hook, 20, 90, { maxWidth: 170 });
    
    // Space calculation
    const hookLines = doc.splitTextToSize(selectedDraft.hook, 170);
    const hookHeight = hookLines.length * 6;
    const bodyY = 102 + hookHeight;
    
    // Body
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 100, 20); // Orange
    doc.text("BODY SCRIPT (Including expression cues)", 20, bodyY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(selectedDraft.body, 20, bodyY + 8, { maxWidth: 170 });
    
    // SEO footer details
    if (activeScript.seoScore) {
      const bodyLines = doc.splitTextToSize(selectedDraft.body, 170);
      const bodyHeight = bodyLines.length * 6;
      const seoY = bodyY + 18 + bodyHeight;

      if (seoY < 270) {
        doc.setLineWidth(0.3);
        doc.setDrawColor(230, 230, 230);
        doc.line(20, seoY, 190, seoY);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text(`SEO Keywords: ${activeScript.seoKeywords}`, 20, seoY + 8, { maxWidth: 170 });
        doc.text(`Hashtags: ${activeScript.seoHashtags}`, 20, seoY + 16, { maxWidth: 170 });
      }
    }
    
    doc.save(`viral_script_${activeScript.niche.replace(/\s+/g, "_")}.pdf`);
  };

  const renderScriptBody = (text: string) => {
    if (!text) return "";
    const parts = text.split(/(\[[^\]]+\])/g);
    return parts.map((part, index) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        const cue = part.slice(1, -1);
        return (
          <span key={index} className="expression-cue">
            {cue}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col min-h-screen relative z-10">
      {/* Premium Gradient Header: Blue and Orange blended custom navigation */}
      <header className="premium-header">
        <div className="premium-header-logo">
          <Sparkles className="w-6 h-6 text-orange-500 animate-pulse-slow" />
          <span>LIQUID GLASS SCRIPT</span>
        </div>
        
        <div className="premium-header-nav">
          {user && (
            <>
              <span className="text-sm text-gray-300 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                {user.email} {user.role === "admin" && "(Admin)"}
              </span>
              
              {user.role === "admin" && (
                <button
                  onClick={() => isAdminMode ? setIsAdminMode(false) : fetchAdminStats()}
                  className="secondary-btn magnetic-btn !py-2 !px-4 !text-xs"
                >
                  <Settings className="w-3.5 h-3.5" />
                  {isAdminMode ? "Exit Admin View" : "Admin Panel"}
                </button>
              )}

              {/* Theme Settings selector */}
              <div className="flex items-center gap-1 bg-black/30 border border-white/10 rounded-xl px-2 py-1">
                <Palette className="w-3.5 h-3.5 text-orange-400" />
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="bg-transparent border-none text-xs text-white outline-none cursor-pointer pr-4"
                >
                  <option value="wwdc">WWDC Liquid</option>
                  <option value="cyber">Cyber Neon</option>
                  <option value="golden">Golden Hour</option>
                  <option value="emerald">Emerald Lagoon</option>
                </select>
              </div>

              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Layout Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        
        {/* Auth Mode: Glass card Sign-up / Login details */}
        {!user ? (
          <div 
            ref={cardRef}
            onMouseMove={handleMouseMove}
            className="glass-card-interactive w-full max-w-md mx-auto"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-orange-400 bg-clip-text text-transparent">
                {authMode === "login" ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-sm text-gray-400 mt-2">
                Generate high-conversion video scripts in a liquid glass sandbox.
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div>
                <label className="glass-label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div>
                <label className="glass-label">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input"
                />
              </div>

              {authMode === "register" && (
                <>
                  <div>
                    <label className="glass-label">Date of Birth</label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="glass-input"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Required for age verification. Sensitive/mature words restriction applies for under 18.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                    <input
                      type="checkbox"
                      id="adminRole"
                      checked={role === "admin"}
                      onChange={(e) => setRole(e.target.checked ? "admin" : "user")}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="adminRole" className="text-xs text-gray-300 font-medium cursor-pointer">
                      Register as Admin (For testing admin-only dashboard features)
                    </label>
                  </div>
                </>
              )}

              {authError && (
                <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-3 text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button type="submit" className="magnetic-btn w-full !mt-6">
                {authMode === "login" ? "Sign In" : "Register"}
              </button>
            </form>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-xs">or</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <button
              onClick={handleGoogleLoginMock}
              className="secondary-btn magnetic-btn w-full"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign In with Google
            </button>

            <div className="text-center mt-6">
              <button
                onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                className="text-xs text-gray-400 hover:text-white transition-colors underline"
              >
                {authMode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
          </div>
        ) : isAdminMode ? (
          /* Admin Dashboard Dashboard Component */
          <div className="glass-panel w-full max-w-5xl p-8 animate-fadeIn">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-3xl font-extrabold text-orange-400 flex items-center gap-2">
                  <Shield className="w-7 h-7 text-blue-500" />
                  Admin Console
                </h2>
                <p className="text-sm text-gray-400">
                  System users database logs and usage parameters
                </p>
              </div>
              <button
                onClick={() => setIsAdminMode(false)}
                className="secondary-btn magnetic-btn !py-2 !px-4"
              >
                Back to Generator
              </button>
            </div>

            {adminStats ? (
              <div className="space-y-8">
                {/* Stats Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-panel p-5 text-center">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Total System Users</span>
                    <h3 className="text-4xl font-extrabold text-white mt-2">{adminStats.stats.totalUsers}</h3>
                  </div>
                  <div className="glass-panel p-5 text-center">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Scripts Created</span>
                    <h3 className="text-4xl font-extrabold text-white mt-2">{adminStats.stats.totalScripts}</h3>
                  </div>
                  <div className="glass-panel p-5 text-center">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Alternate Drafts Saved</span>
                    <h3 className="text-4xl font-extrabold text-white mt-2">{adminStats.stats.totalDrafts}</h3>
                  </div>
                </div>

                {/* Users List Table */}
                <div>
                  <h4 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-400" />
                    Registered Users Database
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="min-w-full divide-y divide-white/10 bg-black/25">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white/5">
                          <th className="px-6 py-4">User ID</th>
                          <th className="px-6 py-4">Email</th>
                          <th className="px-6 py-4">Date of Birth</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                        {adminStats.users.map((u: any) => (
                          <tr key={u.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs">{u.id}</td>
                            <td className="px-6 py-4 font-semibold text-white">{u.email}</td>
                            <td className="px-6 py-4">{new Date(u.dob).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                u.role === "admin" ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Script Activity */}
                <div>
                  <h4 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-400" />
                    Recent Generation Logs
                  </h4>
                  <div className="space-y-3">
                    {adminStats.recentScripts.map((s: any) => (
                      <div key={s.id} className="glass-panel p-4 flex justify-between items-center text-xs md:text-sm">
                        <div>
                          <p className="font-semibold text-white">{s.prompt}</p>
                          <p className="text-gray-400 text-xs mt-1">
                            By {s.user.email} | Niche: {s.niche} | Lang: {s.language} | {s.duration}s
                          </p>
                        </div>
                        <span className="text-[11px] text-gray-500">
                          {new Date(s.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-400">Loading admin parameters...</p>
            )}
          </div>
        ) : (
          /* Main Workspace Dashboard */
          <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Creator Inputs */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-panel p-6 space-y-5">
                <h3 className="text-lg font-extrabold text-orange-400 flex items-center gap-2 border-b border-white/10 pb-3">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  Creator Controls
                </h3>

                {/* Prompt area */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="glass-label !mb-0">Your Topic Prompt</label>
                    <button
                      type="button"
                      disabled={isImproving || !prompt}
                      onClick={handleImprovePrompt}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors flex items-center gap-1 font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isImproving ? "Enriching..." : "Improve Prompt"}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter script idea (e.g., 3 mistakes programmers make starting out...)"
                    className="glass-input resize-none"
                  />
                </div>

                {/* Optional improved prompt display */}
                {improvedPrompt && (
                  <div className="bg-blue-500/10 border border-blue-500/25 rounded-xl p-3.5">
                    <label className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                      Improved AI Prompt
                    </label>
                    <p className="text-xs text-gray-300 leading-relaxed">{improvedPrompt}</p>
                    <button
                      onClick={() => setImprovedPrompt("")}
                      className="text-[10px] text-gray-500 hover:text-white mt-2 block"
                    >
                      Undo improvement
                    </button>
                  </div>
                )}

                {/* Language selection: All global languages supported */}
                <div>
                  <label className="glass-label">Select Language</label>
                  <div className="relative">
                    <Languages className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      list="languages"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      placeholder="e.g. English, French, Swahili..."
                      className="glass-input !pl-10"
                    />
                    <datalist id="languages">
                      {COMMON_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang} />
                      ))}
                    </datalist>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Type any global language - our AI adapts formatting.
                  </span>
                </div>

                {/* Duration options select */}
                <div>
                  <label className="glass-label">Script Duration (seconds)</label>
                  <div className="glass-tabs">
                    {["15", "30", "45", "60"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDuration(s)}
                        className={`glass-tab ${duration === s ? "active" : ""}`}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Niche select */}
                <div>
                  <label className="glass-label">Content Niche</label>
                  <select
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="glass-input glass-select"
                  >
                    {NICHES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {/* Reading level select */}
                <div>
                  <label className="glass-label">Reading Level</label>
                  <select
                    value={readingLevel}
                    onChange={(e) => setReadingLevel(e.target.value)}
                    className="glass-input glass-select"
                  >
                    {READING_LEVELS.map((rl) => (
                      <option key={rl} value={rl}>{rl}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={isGenerating || !prompt}
                  onClick={handleGenerate}
                  className="magnetic-btn w-full !py-3.5 !mt-4"
                >
                  {isGenerating ? (
                    <span className="loading-dots flex items-center gap-1">
                      Generating Drafts<span>.</span><span>.</span><span>.</span>
                    </span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate 6 Drafts
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Middle Column: Script Reader Workspace */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Shimmer loading layout state */}
              {isGenerating && (
                <div className="glass-panel p-8 space-y-6 animate-pulse">
                  <div className="h-6 bg-white/5 rounded-md w-1/3"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-white/5 rounded-md w-full"></div>
                    <div className="h-4 bg-white/5 rounded-md w-5/6"></div>
                    <div className="h-4 bg-white/5 rounded-md w-4/5"></div>
                  </div>
                  <div className="h-40 bg-white/5 rounded-xl w-full"></div>
                </div>
              )}

              {/* Draft Variations workspace (5-6 drafts generated) */}
              {!isGenerating && drafts.length > 0 && (
                <div className="glass-panel p-6 space-y-6">
                  {/* Tabs selector */}
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h4 className="font-bold text-gray-200">AI Draft Variations</h4>
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Draft {selectedDraftIndex + 1} of {drafts.length}
                    </span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {drafts.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedDraftIndex(i)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          selectedDraftIndex === i
                            ? "bg-gradient-to-r from-blue-500/20 to-orange-500/20 text-white border-orange-500/40"
                            : "bg-white/5 text-gray-400 border-white/5 hover:border-white/10"
                        }`}
                      >
                        Variation {i + 1}
                      </button>
                    ))}
                  </div>

                  {/* Hook and body reader cards */}
                  <div className="space-y-4">
                    <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5">
                      <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest block mb-2">
                        Attention Hook
                      </span>
                      <p className="text-sm font-semibold text-white leading-relaxed">
                        {drafts[selectedDraftIndex].hook}
                      </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest block mb-2">
                        Main Body Script & Visual Cues
                      </span>
                      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                        {renderScriptBody(drafts[selectedDraftIndex].body)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveSelectedDraft}
                    disabled={isSaving}
                    className="magnetic-btn w-full !py-3"
                  >
                    {isSaving ? "Saving..." : "Confirm & Save Selected Draft"}
                  </button>
                </div>
              )}

              {/* Active Script & SEO Analysis Display */}
              {!isGenerating && drafts.length === 0 && activeScript && (
                <div className="space-y-6">
                  {/* Saved Script Display */}
                  <div className="glass-panel p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <div>
                        <span className="text-[10px] font-extrabold text-green-400 uppercase tracking-widest block mb-1">
                          Saved Script
                        </span>
                        <h4 className="font-bold text-gray-200 text-sm">
                          {activeScript.niche} | {activeScript.duration}s
                        </h4>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.location.href = `/read/${activeScript.id}`}
                          className="magnetic-btn !py-2 !px-3 !text-xs flex items-center gap-1"
                          title="Open Focused Reading View"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Read Script
                        </button>
                        <button
                          onClick={downloadPDF}
                          className="secondary-btn magnetic-btn !py-2 !px-3 !text-xs flex items-center gap-1"
                          title="Download as PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export PDF
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Extract active hook */}
                      <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5">
                        <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest block mb-1">
                          Hook Line
                        </span>
                        <p className="text-sm font-semibold text-white">
                          {
                            (activeScript.drafts.find((d) => d.id === activeScript.selectedDraftId) || activeScript.drafts[0]).hook
                          }
                        </p>
                      </div>

                      {/* Extract active body */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest block mb-1">
                          Body & Expression cues
                        </span>
                        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                          {renderScriptBody(
                            (activeScript.drafts.find((d) => d.id === activeScript.selectedDraftId) || activeScript.drafts[0]).body
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SEO tools section */}
                  {activeScript.seoScore && (
                    <div className="glass-panel p-6 space-y-5">
                      <h4 className="font-extrabold text-orange-400 flex items-center gap-2 border-b border-white/10 pb-3 text-sm">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        SEO Analysis & Optimization
                      </h4>

                      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div>
                          <span className="text-xs text-gray-400">Predicted Engagement Score</span>
                          <p className="text-[10px] text-gray-500 mt-0.5">Based on hook strength and retention pacing</p>
                        </div>
                        <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-green-500/50 bg-green-500/10 text-green-300 font-extrabold">
                          {activeScript.seoScore}
                        </div>
                      </div>

                      <div className="space-y-4 text-xs md:text-sm">
                        <div>
                          <label className="glass-label !text-xs">Keywords</label>
                          <p className="bg-black/30 border border-white/5 rounded-xl p-3 text-gray-300 font-mono">
                            {activeScript.seoKeywords}
                          </p>
                        </div>

                        <div>
                          <label className="glass-label !text-xs">Trending Hashtags</label>
                          <p className="bg-black/30 border border-white/5 rounded-xl p-3 text-blue-300 font-semibold tracking-wide">
                            {activeScript.seoHashtags}
                          </p>
                        </div>

                        <div>
                          <label className="glass-label !text-xs">Suggested Post Caption</label>
                          <p className="bg-black/30 border border-white/5 rounded-xl p-3 text-gray-300 italic">
                            {activeScript.seoCaption}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Default Welcome workspace */}
              {!isGenerating && drafts.length === 0 && !activeScript && (
                <div className="glass-panel p-8 text-center text-gray-400 flex flex-col items-center justify-center min-h-[300px]">
                  <Sparkles className="w-12 h-12 text-blue-500/60 mb-4 animate-pulse-slow" />
                  <h4 className="text-lg font-bold text-gray-300">Start Generating</h4>
                  <p className="text-xs text-gray-500 max-w-xs mt-2">
                    Enter a video concept, customize language and niches, and click generate to populate alternative drafts in this viewer.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: History Panel */}
            <div className="lg:col-span-3 space-y-6">
              <div className="glass-panel p-6">
                <h3 className="text-lg font-extrabold text-orange-400 flex items-center gap-2 border-b border-white/10 pb-3">
                  <History className="w-5 h-5 text-blue-500" />
                  Saved History
                </h3>

                {historyLoading ? (
                  <p className="text-xs text-gray-500 text-center py-6">Loading archives...</p>
                ) : history.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-8 italic">No scripts saved yet.</p>
                ) : (
                  <div className="space-y-3 mt-4 max-h-[500px] overflow-y-auto pr-1">
                    {history.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => handleLoadScript(h)}
                        className={`w-full text-left p-3.5 rounded-xl transition-all border flex flex-col gap-1.5 ${
                          activeScript?.id === h.id
                            ? "bg-white/10 border-orange-500/40"
                            : "bg-white/5 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <span className="text-xs font-bold text-white line-clamp-1">
                          {h.prompt}
                        </span>
                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                          <span>{h.niche}</span>
                          <span>{h.duration}s</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sensitive Warning Confirmation Modal (DOB/18+ verify alert dialog) */}
      {showAgeWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="glass-panel p-8 max-w-md w-full mx-4 space-y-6 shadow-2xl border border-red-500/20 bg-slate-950/80 animate-scaleUp">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
              <h3 className="text-xl font-bold tracking-tight">Sensitive Word Alert</h3>
            </div>
            
            <p className="text-sm text-gray-300 leading-relaxed">
              This generation request contains topics flagged as sensitive or mature. As you are 18+ (verified via DOB registration details), you can permit or decline this generation.
            </p>

            <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                Flagged Sensitive Words:
              </span>
              <p className="text-xs text-gray-300 font-semibold font-mono">
                {flaggedWords.join(", ") || "Adult/Mature/Sensitive topics detected"}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePermitAndProceed}
                className="flex-1 magnetic-btn !py-2.5 !text-sm"
              >
                Permit & Proceed
              </button>
              <button
                onClick={() => {
                  setShowAgeWarningModal(false);
                  setDrafts([]);
                  setSensitiveWarning(false);
                  setFlaggedWords([]);
                  setGenerationMeta(null);
                }}
                className="flex-1 secondary-btn magnetic-btn !py-2.5 !text-sm"
              >
                Decline & Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
