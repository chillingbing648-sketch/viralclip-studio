import React, { useState, useEffect } from "react";
import { Sparkles, Play, CheckCircle2, Flame, Loader2, ArrowRight, Video, Filter, BarChart2 } from "lucide-react";
import { api, SourceVideo, HighlightCandidate, BACKEND_SERVER_URL } from "../services/api";
import { NavSection } from "../components/Sidebar";

interface HighlightDetectorViewProps {
  onNavigate: (section: NavSection, meta?: any) => void;
  initialSourceId?: string;
}

export const HighlightDetectorView: React.FC<HighlightDetectorViewProps> = ({
  onNavigate,
  initialSourceId,
}) => {
  const [sources, setSources] = useState<SourceVideo[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>(initialSourceId || "");
  const [candidates, setCandidates] = useState<HighlightCandidate[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const list = await api.getSources();
        setSources(list);
        if (list.length > 0 && !selectedSourceId) {
          setSelectedSourceId(list[0].id);
        }
      } catch (err) {
        console.error("Error loading sources:", err);
      } finally {
        setLoadingSources(false);
      }
    };
    fetchSources();
  }, []);

  useEffect(() => {
    if (selectedSourceId) {
      loadHighlights(selectedSourceId);
    }
  }, [selectedSourceId]);

  const loadHighlights = async (id: string) => {
    try {
      const cands = await api.getHighlights(id);
      setCandidates(cands);
    } catch (err) {
      console.error("Failed to load highlights:", err);
    }
  };

  const handleRunDetection = async () => {
    if (!selectedSourceId) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await api.detectHighlights(selectedSourceId);
      setCandidates(res.candidates || []);
    } catch (err: any) {
      setError(err.message || "Detection failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateProject = async (cand: HighlightCandidate) => {
    try {
      const proj = await api.createProjectFromCandidate(cand.id, "STREAMER_HYPE");
      onNavigate("video_editor", { projectId: proj.id });
    } catch (err: any) {
      setError(err.message || "Failed to create editor project.");
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (selectedCategory === "all") return true;
    return c.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const selectedSource = sources.find((s) => s.id === selectedSourceId);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-black text-white">AI Highlight Detection Agent</h1>
          </div>
          <p className="text-xs text-slate-400">
            Multi-signal dialogue analysis, emotional reaction intensity, audio energy surges, and shot cut boundaries.
          </p>
        </div>

        {/* Source Video Dropdown Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSourceId}
            onChange={(e) => setSelectedSourceId(e.target.value)}
            className="px-3.5 py-2.5 bg-[#0c0f17] border border-[#232d42] rounded-xl text-xs text-white focus:outline-none focus:border-brand font-medium"
          >
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({Math.round(s.duration_seconds)}s)
              </option>
            ))}
          </select>

          <button
            onClick={handleRunDetection}
            disabled={analyzing || !selectedSourceId}
            className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-brand/30 flex items-center gap-2 shrink-0"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Signals...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" /> Run AI Detection
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Selected Video Summary Banner */}
      {selectedSource && (
        <div className="p-4 rounded-2xl bg-[#0c0f17] border border-[#171e2e] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-10 rounded-lg bg-black overflow-hidden relative shrink-0 border border-[#232d42]">
              {selectedSource.thumbnail_path && (
                <img
                  src={
                    selectedSource.thumbnail_path.startsWith("http")
                      ? selectedSource.thumbnail_path
                      : `${BACKEND_SERVER_URL}/storage/previews/${selectedSource.thumbnail_path.split(/[\\/]/).pop()}`
                  }
                  alt={selectedSource.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-white line-clamp-1">{selectedSource.title}</h3>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                <span>Creator: <strong className="text-slate-200">{selectedSource.creator_name}</strong></span>
                <span>•</span>
                <span>{selectedSource.width}x{selectedSource.height} ({selectedSource.fps} FPS)</span>
                <span>•</span>
                <span>Status: <strong className="text-emerald-400 uppercase">{selectedSource.status}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Found <strong className="text-white font-bold">{candidates.length}</strong> highlight moments
            </span>
          </div>
        </div>
      )}

      {/* Filter Category Tabs */}
      {candidates.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["all", "reaction", "gaming", "screaming", "punchline", "storytelling", "educational"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 ${
                selectedCategory === cat
                  ? "bg-brand text-white shadow-sm shadow-brand/40"
                  : "bg-[#0c0f17] text-slate-400 hover:text-white border border-[#171e2e]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Candidate Moments Grid */}
      {filteredCandidates.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-2">
          <Sparkles className="w-8 h-8 text-amber-400/50 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Highlights Detected Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click "Run AI Detection" above to analyze dialogue hooks, emotional reactions, and peak moments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCandidates.map((cand) => {
            const tierColors = {
              priority: "border-amber-500/50 bg-amber-500/5 text-amber-400",
              strong: "border-brand/50 bg-brand/5 text-brand-400",
              possible: "border-cyan-500/50 bg-cyan-500/5 text-cyan-400",
              low: "border-slate-700 bg-slate-800/20 text-slate-400",
            };

            return (
              <div
                key={cand.id}
                className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e] hover:border-[#232d42] transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Category & Overall Score Tier */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#111622] border border-[#232d42] text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                      {cand.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">{cand.overall_score}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${tierColors[cand.tier]}`}>
                        {cand.tier}
                      </span>
                    </div>
                  </div>

                  {/* Hook & Reason */}
                  <h3 className="text-sm font-bold text-white mb-1">"{cand.hook}"</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{cand.reason}</p>

                  {/* 5-Pillar Visual Score Bars */}
                  <div className="grid grid-cols-5 gap-1.5 pt-3 pb-2 text-[10px] text-slate-400 font-mono">
                    <div>
                      <div className="flex justify-between text-[9px] mb-0.5">
                        <span>Hook</span>
                        <span className="text-white">{cand.hook_score}</span>
                      </div>
                      <div className="h-1 bg-[#171e2e] rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400" style={{ width: `${cand.hook_score}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] mb-0.5">
                        <span>Emotion</span>
                        <span className="text-white">{cand.emotion_score}</span>
                      </div>
                      <div className="h-1 bg-[#171e2e] rounded-full overflow-hidden">
                        <div className="h-full bg-red-400" style={{ width: `${cand.emotion_score}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] mb-0.5">
                        <span>Ent.</span>
                        <span className="text-white">{cand.entertainment_score}</span>
                      </div>
                      <div className="h-1 bg-[#171e2e] rounded-full overflow-hidden">
                        <div className="h-full bg-brand-400" style={{ width: `${cand.entertainment_score}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] mb-0.5">
                        <span>Context</span>
                        <span className="text-white">{cand.context_score}</span>
                      </div>
                      <div className="h-1 bg-[#171e2e] rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400" style={{ width: `${cand.context_score}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] mb-0.5">
                        <span>Editing</span>
                        <span className="text-white">{cand.editing_potential_score}</span>
                      </div>
                      <div className="h-1 bg-[#171e2e] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400" style={{ width: `${cand.editing_potential_score}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Transcript Snippet */}
                  {cand.transcript_snippet && (
                    <div className="p-2.5 rounded-xl bg-[#111622] border border-[#171e2e] text-[11px] text-slate-300 italic line-clamp-2 mt-2">
                      "{cand.transcript_snippet}"
                    </div>
                  )}
                </div>

                {/* Footer Controls: Timestamps & Action */}
                <div className="pt-3 border-t border-[#171e2e] flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400 text-[11px]">
                    {cand.start_time}s → {cand.end_time}s ({cand.duration}s)
                  </span>
                  <button
                    onClick={() => handleCreateProject(cand)}
                    className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-brand/30"
                  >
                    Open In Editor <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
