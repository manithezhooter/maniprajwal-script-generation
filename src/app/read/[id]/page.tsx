"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { ArrowLeft, Download, Eye, Sparkles, BookOpen, Clock, FileText, Check, ArrowRight } from "lucide-react";

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

export default function ScriptReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [script, setScript] = useState<ScriptType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("wwdc");

  // Focus mode state: index of the draft currently viewed in full page (null means side-by-side)
  const [focusedDraftIndex, setFocusedDraftIndex] = useState<number | null>(null);

  // Fetch script details and apply theme
  useEffect(() => {
    // Restore theme from localStorage
    const savedTheme = localStorage.getItem("liquid_generator_theme") || "wwdc";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    const fetchScript = async () => {
      try {
        const res = await fetch(`/api/generate/read/${id}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to load script");
          return;
        }
        const data = await res.json();
        setScript(data.script);
      } catch (err) {
        setError("Error connecting to server");
      } finally {
        setLoading(false);
      }
    };

    fetchScript();
  }, [id]);

  const handleSelectDraft = async (draftId: string) => {
    if (!script) return;
    try {
      const res = await fetch(`/api/generate/read/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedDraftId: draftId }),
      });
      if (res.ok) {
        const data = await res.json();
        setScript(data.script);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update selection");
      }
    } catch (err) {
      alert("Error updating draft selection");
    }
  };

  const downloadPDF = (draftIndex: number) => {
    if (!script) return;
    
    const selectedDraft = script.drafts[draftIndex];
    const parts = selectedDraft.body.split("[ENDING_SPLIT]");
    const bodyText = parts[0];
    const endingText = parts[1] || "";

    const doc = new jsPDF();
    
    // Header colors based on active theme
    if (theme === "cyber") {
      doc.setFillColor(0, 242, 254);
    } else if (theme === "golden") {
      doc.setFillColor(249, 115, 22);
    } else if (theme === "emerald") {
      doc.setFillColor(16, 185, 129);
    } else {
      doc.setFillColor(30, 80, 255);
    }
    doc.rect(0, 0, 210, 10, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(2, 0, 16);
    doc.text(`VIRAL SCRIPT - VARIATION ${draftIndex + 1}`, 20, 32);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Generated on: ${new Date(script.createdAt).toLocaleDateString()}`, 20, 42);
    doc.text(`Prompt: ${script.prompt}`, 20, 48, { maxWidth: 170 });
    doc.text(`Niche: ${script.niche}  |  Language: ${script.language}  |  Duration: ${script.duration}s`, 20, 60);
    doc.text(`Reading Level: ${script.readingLevel}`, 20, 66);
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(220, 220, 220);
    doc.line(20, 72, 190, 72);
    
    // Hook
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 80, 255);
    doc.text("HOOK (First 3 Seconds)", 20, 82);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(selectedDraft.hook, 20, 90, { maxWidth: 170 });
    
    const hookLines = doc.splitTextToSize(selectedDraft.hook, 170);
    const hookHeight = hookLines.length * 6;
    const bodyY = 102 + hookHeight;
    
    // Body
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 100, 20);
    doc.text("BODY SCRIPT & VISUAL CUES", 20, bodyY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(bodyText, 20, bodyY + 8, { maxWidth: 170 });

    const bodyLines = doc.splitTextToSize(bodyText, 170);
    const bodyHeight = bodyLines.length * 6;
    const endingY = bodyY + 18 + bodyHeight;

    // Ending Script Outro in PDF
    if (endingText) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(139, 69, 19); // Brown Outro Accent
      doc.text("ENDING SCRIPT & OUTRO CTA", 20, endingY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(endingText, 20, endingY + 8, { maxWidth: 170 });
    }
    
    doc.save(`script_${script.niche.replace(/\s+/g, "_")}_v${draftIndex + 1}.pdf`);
  };

  const renderScriptBody = (text: string) => {
    if (!text) return "";
    const parts = text.split(/(\[[^\]]+\])/g);
    return parts.map((part, index) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        const cue = part.slice(1, -1);
        return (
          <span key={index} className="bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded text-[11px] font-bold mx-1 inline-block uppercase tracking-wider">
            {cue}
          </span>
        );
      }
      return part;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white">
        <Sparkles className="w-12 h-12 text-blue-500 mb-4 animate-spin" />
        <p className="text-sm text-gray-400 font-semibold">Opening Comparison Dashboard...</p>
      </div>
    );
  }

  if (error || !script) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white p-6">
        <div className="glass-panel p-8 max-w-md text-center space-y-4">
          <BookOpen className="w-12 h-12 text-red-400 mx-auto" />
          <h3 className="text-xl font-bold">Failed to Load Script</h3>
          <p className="text-sm text-gray-400">{error || "Script not found."}</p>
          <button
            onClick={() => router.push("/")}
            className="magnetic-btn !py-2 !px-4 text-xs"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Define active focused draft details
  const focusedDraft = script.drafts[focusedDraftIndex ?? 0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 md:p-8 relative z-10 w-full">
      {/* Full screen layout container */}
      <div className="w-full max-w-[1800px] space-y-6">
        
        {/* Header Controls */}
        <div className="flex justify-between items-center px-2">
          {focusedDraftIndex === null ? (
            <button
              onClick={() => router.push("/")}
              className="secondary-btn magnetic-btn !py-2.5 !px-4 text-sm flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          ) : (
            <button
              onClick={() => setFocusedDraftIndex(null)}
              className="secondary-btn magnetic-btn !py-2.5 !px-4 text-sm flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Comparison
            </button>
          )}

          {focusedDraftIndex === null ? (
            <div className="flex items-center gap-4">
              <span className="bg-white/10 text-white text-xs border border-white/20 px-3.5 py-1.5 rounded-full font-bold animate-pulse-slow flex items-center gap-1.5">
                Scroll right to view more variations <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-extrabold bg-gradient-to-r from-blue-400 to-orange-400 bg-clip-text text-transparent uppercase tracking-widest hidden md:inline-block">
                6 Drafts Comparison View
              </span>
            </div>
          ) : (
            <span className="text-sm font-extrabold bg-gradient-to-r from-blue-400 to-orange-400 bg-clip-text text-transparent uppercase tracking-widest">
              Full Page Focus Mode
            </span>
          )}
        </div>

        {/* Full-width Metadata Banner */}
        <div className="glass-panel p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-orange-500 opacity-60"></div>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest block mb-1">
                TOPIC PROMPT
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white line-clamp-2">
                {script.prompt}
              </h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 bg-black/25 border border-white/5 rounded-xl px-4 py-2.5 self-start lg:self-auto">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                {script.duration} seconds
              </span>
              <span className="w-px h-3 bg-white/10"></span>
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-orange-400" />
                {script.niche}
              </span>
              <span className="w-px h-3 bg-white/10"></span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                {script.readingLevel}
              </span>
              <span className="w-px h-3 bg-white/10"></span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Language: {script.language}
              </span>
            </div>
          </div>
        </div>

        {/* Conditional Layout Section */}
        {focusedDraftIndex === null ? (
          /* COMPARISON VIEW: Uncongested horizontally scrollable drafts list */
          <div className="flex flex-row overflow-x-auto gap-6 pb-6 w-full snap-x scrollbar-thin scrollbar-thumb-white/20 scroll-smooth pr-2">
            {script.drafts.map((draft, idx) => {
              const isSelected = script.selectedDraftId === draft.id;
              
              // Split body script to retrieve optional ending section
              const parts = draft.body.split("[ENDING_SPLIT]");
              const bodyText = parts[0];
              const endingText = parts[1] || "";

              return (
                <div 
                  key={draft.id || idx} 
                  className={`w-[360px] md:w-[400px] flex-shrink-0 snap-start bg-white rounded-3xl p-6 shadow-2xl flex flex-col justify-between text-gray-900 border transition-all duration-300 hover:-translate-y-2 hover:shadow-orange-500/10 ${
                    isSelected 
                      ? "ring-4 ring-orange-500 border-transparent" 
                      : "border-gray-200"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top card accent */}
                    <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                      <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">
                        Variation {idx + 1}
                      </span>
                      {isSelected && (
                        <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>

                    {/* Hook */}
                    <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4">
                      <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block mb-1">
                        Attention Hook
                      </span>
                      <p className="text-sm font-bold text-slate-900 leading-relaxed">
                        {draft.hook}
                      </p>
                    </div>

                    {/* Body */}
                    <div className="bg-slate-50/30 border border-slate-100/50 rounded-2xl p-4">
                      <span className="text-[9px] font-extrabold text-orange-600 uppercase tracking-widest block mb-1">
                        Body Script
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line h-[160px] overflow-y-auto pr-1">
                        {renderScriptBody(bodyText)}
                      </p>
                    </div>

                    {/* Ending / Outro under brown tag */}
                    {endingText && (
                      <div className="bg-[#7c2d12]/5 border border-[#7c2d12]/15 rounded-2xl p-4 mt-2">
                        <span className="text-[9px] font-extrabold text-[#7c2d12] uppercase tracking-widest block mb-1">
                          Ending / Outro Script
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line h-[110px] overflow-y-auto pr-1">
                          {renderScriptBody(endingText)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card footer controls */}
                  <div className="space-y-2 mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setFocusedDraftIndex(idx)}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      View Full Page
                    </button>

                    <button
                      onClick={() => handleSelectDraft(draft.id!)}
                      disabled={isSelected}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-orange-500 text-white border-transparent cursor-default"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                      }`}
                    >
                      {isSelected ? "Active Draft" : "Select as Active"}
                    </button>

                    <button
                      onClick={() => downloadPDF(idx)}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-500" />
                      Export PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* FOCUS MODE: Full page spacious script card with left/right arrow pagination */
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto py-6">
            {/* Left Navigation Arrow */}
            <button
              onClick={() => setFocusedDraftIndex((focusedDraftIndex - 1 + 6) % 6)}
              className="p-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-xl hover:scale-105 active:scale-95 flex-shrink-0"
              title="Previous Variation"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            {/* SPACIOUS WHITE SCRIPT CARD */}
            {(() => {
              const parts = focusedDraft.body.split("[ENDING_SPLIT]");
              const bodyText = parts[0];
              const endingText = parts[1] || "";

              return (
                <div className="flex-grow bg-white rounded-3xl p-8 md:p-12 shadow-2xl text-gray-900 border border-gray-200 flex flex-col justify-between min-h-[520px]">
                  <div className="space-y-6">
                    {/* Header of focused card */}
                    <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-2">
                      <span className="text-sm font-extrabold text-blue-600 uppercase tracking-widest">
                        Variation {focusedDraftIndex + 1} of 6
                      </span>
                      {script.selectedDraftId === focusedDraft.id && (
                        <span className="bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Active selection
                        </span>
                      )}
                    </div>

                    {/* Hook Line callout */}
                    <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-6">
                      <span className="text-xs font-extrabold text-blue-500 uppercase tracking-widest block mb-2">
                        Attention Hook (0-3 seconds)
                      </span>
                      <p className="text-lg md:text-xl font-bold text-slate-900 leading-relaxed">
                        {focusedDraft.hook}
                      </p>
                    </div>

                    {/* Main Script Body */}
                    <div className="bg-slate-50/30 border border-slate-100/50 rounded-2xl p-6">
                      <span className="text-xs font-extrabold text-orange-600 uppercase tracking-widest block mb-2">
                        Body Script & Expression cues
                      </span>
                      <p className="text-sm md:text-base text-slate-700 leading-loose whitespace-pre-line tracking-wide">
                        {renderScriptBody(bodyText)}
                      </p>
                    </div>

                    {/* Ending Outro under brown tag */}
                    {endingText && (
                      <div className="bg-[#7c2d12]/5 border border-[#7c2d12]/15 rounded-2xl p-6">
                        <span className="text-xs font-extrabold text-[#7c2d12] uppercase tracking-widest block mb-2">
                          Ending Script / Outro CTA
                        </span>
                        <p className="text-sm md:text-base text-slate-700 leading-loose whitespace-pre-line tracking-wide">
                          {renderScriptBody(endingText)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Card Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-gray-150">
                    <button
                      onClick={() => handleSelectDraft(focusedDraft.id!)}
                      disabled={script.selectedDraftId === focusedDraft.id}
                      className={`flex-grow py-3 px-4 rounded-xl font-bold transition-all border flex items-center justify-center gap-1.5 text-sm ${
                        script.selectedDraftId === focusedDraft.id
                          ? "bg-orange-500 text-white border-transparent cursor-default"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {script.selectedDraftId === focusedDraft.id ? "Active Draft" : "Select as Active"}
                    </button>
                    <button
                      onClick={() => downloadPDF(focusedDraftIndex)}
                      className="flex-grow py-3 px-4 rounded-xl font-bold transition-all border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1.5 text-sm"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                      Export PDF
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Right Navigation Arrow */}
            <button
              onClick={() => setFocusedDraftIndex((focusedDraftIndex + 1) % 6)}
              className="p-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-xl hover:scale-105 active:scale-95 flex-shrink-0"
              title="Next Variation"
            >
              <ArrowLeft className="w-6 h-6 rotate-180" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
