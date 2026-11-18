import React, { useState, useEffect } from "react";
import { Cpu, CheckCircle2, Clock, AlertCircle, RefreshCw, FolderDown, ArrowRight } from "lucide-react";
import { api, RenderJob } from "../services/api";
import { NavSection } from "../components/Sidebar";

interface RenderingQueueViewProps {
  onNavigate: (section: NavSection, meta?: any) => void;
  activeJobId?: string;
}

export const RenderingQueueView: React.FC<RenderingQueueViewProps> = ({
  onNavigate,
  activeJobId,
}) => {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    try {
      const list = await api.getRenderJobs();
      setJobs(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-6 h-6 text-brand-400 animate-spin" style={{ animationDuration: '6s' }} />
            <h1 className="text-xl font-black text-white">Rendering Queue & Encoding Jobs</h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time FFmpeg worker status: Smart reframing, ASS subtitle burning, and automated Quality Control (QC).
          </p>
        </div>

        <button
          onClick={loadJobs}
          className="px-3.5 py-2 rounded-xl bg-[#0c0f17] hover:bg-[#111622] text-slate-300 border border-[#232d42] text-xs font-semibold flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-3">
          <Clock className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Render Jobs in Queue</h3>
          <p className="text-xs text-slate-400">Open a clip project in the Video Editor and click Render.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isFinished = job.status === "completed";
            const isFailed = job.status === "failed";
            const isProcessing = job.status === "processing" || job.status === "queued";

            return (
              <div
                key={job.id}
                className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#171e2e] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">Job #{job.id.slice(0, 8)}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#111622] text-cyan-400 uppercase">
                      {job.preset_name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#111622] text-purple-400 uppercase">
                      {job.target_platform}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        isFinished
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : isFailed
                          ? "bg-red-500/10 text-red-400 border border-red-500/30"
                          : "bg-brand/10 text-brand-400 border border-brand/30 animate-pulse"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Stage Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">{job.stage_description || "Processing..."}</span>
                    <span className="font-mono text-cyan-400 font-bold">{job.progress_pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#111622] rounded-full overflow-hidden border border-[#171e2e]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isFinished ? "bg-emerald-400" : isFailed ? "bg-red-500" : "bg-gradient-to-r from-brand to-cyan-400"
                      }`}
                      style={{ width: `${job.progress_pct}%` }}
                    ></div>
                  </div>
                </div>

                {/* QC Status & Output Summary */}
                {isFinished && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{job.qc_notes || "All automated QC checks passed (1080x1920 9:16)."}</span>
                    </div>
                    <button
                      onClick={() => onNavigate("export_library")}
                      className="px-3 py-1 rounded-lg bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <FolderDown className="w-3.5 h-3.5" /> View in Library
                    </button>
                  </div>
                )}

                {isFailed && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Error: {job.error_message || "Encoding pipeline failed."}</span>
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
