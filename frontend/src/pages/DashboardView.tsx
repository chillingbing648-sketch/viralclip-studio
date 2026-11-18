import React, { useEffect, useState } from "react";
import {
  Video,
  Sparkles,
  Clock,
  CheckCircle2,
  FolderCheck,
  Cpu,
  Share2,
  Upload,
  PlaySquare,
  Radio,
  ArrowRight,
  TrendingUp,
  Flame,
  AlertCircle
} from "lucide-react";
import { api, DashboardMetrics, SourceVideo, RenderJob, BACKEND_SERVER_URL } from "../services/api";
import { NavSection } from "../components/Sidebar";

interface DashboardViewProps {
  onNavigate: (section: NavSection, meta?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentSources, setRecentSources] = useState<SourceVideo[]>([]);
  const [recentExports, setRecentExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [m, s, e] = await Promise.all([
        api.getDashboardMetrics(),
        api.getSources(),
        api.getExports(),
      ]);
      setMetrics(m);
      setRecentSources(s.slice(0, 5));
      setRecentExports(e.slice(0, 4));
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#111622] via-[#171e2e] to-brand/10 border border-[#232d42]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand/20 text-brand-400 font-mono tracking-wider">
              STREAMER WORKSTATION
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live Processing Engine Active
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            ViralClip Studio Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Transform horizontal long-form footage into high-energy 9:16 Shorts and Reels.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("video_upload")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-600 text-white font-semibold text-xs transition-all shadow-md shadow-brand/30"
          >
            <Upload className="w-4 h-4" /> Upload Video
          </button>
          <button
            onClick={() => onNavigate("youtube_import")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171e2e] hover:bg-[#232d42] text-slate-200 border border-[#232d42] font-semibold text-xs transition-all"
          >
            <PlaySquare className="w-4 h-4 text-red-500" /> YouTube Import
          </button>
        </div>
      </div>

      {/* Real Database Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Sources */}
        <div className="p-4 rounded-xl bg-[#0c0f17] border border-[#171e2e] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">Sources</span>
            <Video className="w-4 h-4 text-brand-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">{metrics?.total_source_videos ?? 0}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Authorized media</span>
        </div>

        {/* Highlights Detected */}
        <div className="p-4 rounded-xl bg-[#0c0f17] border border-[#171e2e] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">AI Highlights</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">{metrics?.total_detected_highlights ?? 0}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Multi-signal moments</span>
        </div>

        {/* Awaiting Review */}
        <div className="p-4 rounded-xl bg-[#0c0f17] border border-[#171e2e] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">Awaiting Review</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">{metrics?.clips_awaiting_review ?? 0}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Pending approval</span>
        </div>

        {/* Approved Clips */}
        <div className="p-4 rounded-xl bg-[#0c0f17] border border-[#171e2e] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-400">{metrics?.approved_clips ?? 0}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Ready for editing</span>
        </div>

        {/* Rendering Jobs */}
        <div className="p-4 rounded-xl bg-[#0c0f17] border border-[#171e2e] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">Rendering</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">{metrics?.rendering_jobs ?? 0}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Active worker queue</span>
        </div>

        {/* Completed Exports */}
        <div className="p-4 rounded-xl bg-[#0c0f17] border border-[#171e2e] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">Exports</span>
            <FolderCheck className="w-4 h-4 text-brand-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">{metrics?.completed_exports ?? 0}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">QC passed 9:16</span>
        </div>

        {/* Published */}
        <div className="p-4 rounded-xl bg-[#0c0f17] border border-[#171e2e] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">Published</span>
            <Share2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">{metrics?.published_count ?? 0}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Shorts & Reels</span>
        </div>
      </div>

      {/* Quick Action Workflow Cards */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Production Workflows</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate("video_upload")}
            className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e] hover:border-brand/50 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-400 mb-3 group-hover:bg-brand group-hover:text-white transition-all">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm group-hover:text-brand-400 transition-colors">Local Video Upload</h3>
              <p className="text-xs text-slate-400 mt-1">
                Upload long-form MP4, MOV or stream recordings. Automatically extracts FPS, resolution & generates thumbnail.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-brand-400">
              Start upload <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div
            onClick={() => onNavigate("youtube_import")}
            className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e] hover:border-red-500/50 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3 group-hover:bg-red-500 group-hover:text-white transition-all">
                <PlaySquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">YouTube Reference Import</h3>
              <p className="text-xs text-slate-400 mt-1">
                Import YouTube video or live URL references with official metadata, and attach authorized creator footage.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-red-400">
              Import YouTube URL <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div
            onClick={() => onNavigate("live_clipping")}
            className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e] hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">Live Clipping Studio</h3>
              <p className="text-xs text-slate-400 mt-1">
                Capture live RTMP or HLS stream feeds in rolling segments. Clip highlights in real-time while stream continues.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-cyan-400">
              Open live studio <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Sources & Recent Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Source Videos */}
        <div className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-brand-400" /> Recent Source Videos
            </h3>
            <button
              onClick={() => onNavigate("highlight_detector")}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              Analyze Highlights
            </button>
          </div>

          {recentSources.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No videos ingested yet. Upload a video or import a YouTube reference to begin.
            </div>
          ) : (
            <div className="space-y-3">
              {recentSources.map((src) => (
                <div
                  key={src.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#111622] border border-[#171e2e] hover:border-[#232d42] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-9 rounded-lg bg-black overflow-hidden relative shrink-0">
                      {src.thumbnail_path ? (
                        <img
                          src={src.thumbnail_path.startsWith("http") ? src.thumbnail_path : `${BACKEND_SERVER_URL}/storage/previews/${src.thumbnail_path.split(/[\\/]/).pop()}`}
                          alt={src.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Video className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{src.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{src.creator_name}</span>
                        <span>•</span>
                        <span>{Math.round(src.duration_seconds)}s</span>
                        <span>•</span>
                        <span className="capitalize text-emerald-400">{src.status}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate("highlight_detector", { sourceId: src.id })}
                    className="px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand text-brand-400 hover:text-white text-xs font-semibold transition-all shrink-0"
                  >
                    AI Detect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completed Exports */}
        <div className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <FolderCheck className="w-4 h-4 text-emerald-400" /> Completed Exports
            </h3>
            <button
              onClick={() => onNavigate("export_library")}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              View Library
            </button>
          </div>

          {recentExports.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No exports rendered yet. Detect highlights and render your first 9:16 clip.
            </div>
          ) : (
            <div className="space-y-3">
              {recentExports.map((exp) => (
                <div
                  key={exp.job_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#111622] border border-[#171e2e]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-12 rounded-lg bg-black overflow-hidden relative shrink-0 border border-[#232d42]">
                      {exp.thumbnail_path && (
                        <img
                          src={`${BACKEND_SERVER_URL}/storage/previews/${exp.thumbnail_path.split(/[\\/]/).pop()}`}
                          alt={exp.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{exp.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-mono text-cyan-400">{exp.preset_name}</span>
                        <span>•</span>
                        <span>{exp.duration_seconds}s</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold">{exp.qc_status.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate("export_library")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white text-xs font-semibold transition-all shrink-0"
                  >
                    Watch & Share
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
