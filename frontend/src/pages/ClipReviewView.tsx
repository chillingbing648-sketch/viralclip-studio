import React, { useState, useEffect } from "react";
import { CheckSquare, CheckCircle, XCircle, Clock, Edit2, Play, ArrowRight, Filter } from "lucide-react";
import { api, HighlightCandidate, SourceVideo } from "../services/api";
import { NavSection } from "../components/Sidebar";

interface ClipReviewViewProps {
  onNavigate: (section: NavSection, meta?: any) => void;
}

export const ClipReviewView: React.FC<ClipReviewViewProps> = ({ onNavigate }) => {
  const [sources, setSources] = useState<SourceVideo[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [candidates, setCandidates] = useState<HighlightCandidate[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "priority" | "strong" | "possible">("all");
  const [editingCandId, setEditingCandId] = useState<string | null>(null);
  const [editTimes, setEditTimes] = useState<{ start: number; end: number; hook: string }>({ start: 0, end: 0, hook: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const srcList = await api.getSources();
        setSources(srcList);
        if (srcList.length > 0) {
          setSelectedSourceId(srcList[0].id);
          const cands = await api.getHighlights(srcList[0].id);
          setCandidates(cands);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSourceChange = async (sourceId: string) => {
    setSelectedSourceId(sourceId);
    try {
      const cands = await api.getHighlights(sourceId);
      setCandidates(cands);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusUpdate = async (id: string, status: "approved" | "rejected") => {
    try {
      const updated = await api.updateCandidateStatus(id, status);
      setCandidates((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAdjustment = async (id: string) => {
    try {
      const updated = await api.adjustCandidateTimestamps(id, editTimes.start, editTimes.end, editTimes.hook);
      setCandidates((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingCandId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async (cand: HighlightCandidate) => {
    try {
      const proj = await api.createProjectFromCandidate(cand.id, "STREAMER_HYPE");
      onNavigate("video_editor", { projectId: proj.id });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (activeTab === "all") return true;
    return c.tier === activeTab;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header & Source Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-black text-white">Clip Review & Timestamp Fine-Tuning</h1>
          </div>
          <p className="text-xs text-slate-400">
            Review AI highlight candidates, adjust sentence boundaries, approve viral moments, and convert to 9:16 editor projects.
          </p>
        </div>

        {/* Source selector */}
        <select
          value={selectedSourceId}
          onChange={(e) => handleSourceChange(e.target.value)}
          className="px-3.5 py-2.5 bg-[#0c0f17] border border-[#232d42] rounded-xl text-xs text-white focus:outline-none focus:border-brand"
        >
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* Tier Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#171e2e] pb-3">
        {(["all", "priority", "strong", "possible"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? "bg-brand text-white shadow-sm shadow-brand/40"
                : "bg-[#0c0f17] text-slate-400 hover:text-white border border-[#171e2e]"
            }`}
          >
            {tab} Candidates ({tab === "all" ? candidates.length : candidates.filter((c) => c.tier === tab).length})
          </button>
        ))}
      </div>

      {/* Candidates List */}
      {filteredCandidates.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-2">
          <p className="text-xs text-slate-400">No candidates found for selected tier or video.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCandidates.map((cand) => {
            const isEditing = editingCandId === cand.id;

            return (
              <div
                key={cand.id}
                className={`p-5 rounded-2xl bg-[#0c0f17] border transition-all ${
                  cand.status === "approved"
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : cand.status === "rejected"
                    ? "border-red-500/30 opacity-60"
                    : "border-[#171e2e] hover:border-[#232d42]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#111622] border border-[#232d42] text-[10px] font-mono uppercase text-cyan-400 font-bold">
                      {cand.category}
                    </span>
                    <span className="text-xs font-bold text-white">Score: {cand.overall_score}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-brand/10 text-brand-400 border border-brand/30">
                      {cand.tier}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase ml-2">Status: {cand.status}</span>
                  </div>

                  {/* Approve / Reject / Edit Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusUpdate(cand.id, "approved")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        cand.status === "approved"
                          ? "bg-emerald-500 text-black"
                          : "bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/30"
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>

                    <button
                      onClick={() => handleStatusUpdate(cand.id, "rejected")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        cand.status === "rejected"
                          ? "bg-red-500 text-white"
                          : "bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30"
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>

                    <button
                      onClick={() => {
                        if (isEditing) {
                          setEditingCandId(null);
                        } else {
                          setEditingCandId(cand.id);
                          setEditTimes({ start: cand.start_time, end: cand.end_time, hook: cand.hook });
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#111622] hover:bg-[#171e2e] text-slate-300 border border-[#232d42] text-xs font-medium flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> {isEditing ? "Cancel" : "Adjust"}
                    </button>

                    <button
                      onClick={() => handleCreateProject(cand)}
                      className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-brand/30"
                    >
                      Convert to Project <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Edit Form or Display Hook */}
                {isEditing ? (
                  <div className="p-4 rounded-xl bg-[#111622] border border-[#232d42] space-y-3 mb-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Hook Title</label>
                      <input
                        type="text"
                        value={editTimes.hook}
                        onChange={(e) => setEditTimes({ ...editTimes, hook: e.target.value })}
                        className="w-full px-3 py-1.5 bg-[#07090e] border border-[#232d42] rounded-lg text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Start Time (s)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editTimes.start}
                          onChange={(e) => setEditTimes({ ...editTimes, start: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-1.5 bg-[#07090e] border border-[#232d42] rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">End Time (s)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editTimes.end}
                          onChange={(e) => setEditTimes({ ...editTimes, end: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-1.5 bg-[#07090e] border border-[#232d42] rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleSaveAdjustment(cand.id)}
                        className="px-4 py-1.5 rounded-lg bg-brand text-white font-bold text-xs hover:bg-brand-600"
                      >
                        Save Timestamps
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">"{cand.hook}"</h3>
                    <p className="text-xs text-slate-400 mb-2">{cand.reason}</p>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span>Window: <strong className="text-white">{cand.start_time}s → {cand.end_time}s</strong></span>
                      <span>Duration: <strong className="text-cyan-400">{cand.duration}s</strong></span>
                    </div>
                  </div>
                )}

                {cand.transcript_snippet && (
                  <div className="p-2.5 rounded-xl bg-[#111622] border border-[#171e2e] text-[11px] text-slate-300 italic mt-2">
                    "{cand.transcript_snippet}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
