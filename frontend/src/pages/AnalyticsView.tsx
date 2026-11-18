import React, { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Flame, CheckCircle, PieChart, Video, FolderCheck } from "lucide-react";
import { api, DashboardMetrics } from "../services/api";

export const AnalyticsView: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const m = await api.getDashboardMetrics();
        setMetrics(m);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-6 h-6 text-brand-400" />
          <h1 className="text-xl font-black text-white">Performance Analytics & Conversion Funnel</h1>
        </div>
        <p className="text-xs text-slate-400">
          Real-time database metrics tracking candidate discovery, review efficiency, and platform export throughput.
        </p>
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Average Viral Score</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {metrics?.average_viral_score || 0}
            <span className="text-xs font-normal text-slate-500 ml-1">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-500">Across all detected candidate moments</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Candidate Approval Rate</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {metrics?.approval_rate_pct || 0}%
          </div>
          <p className="text-[11px] text-slate-500">
            {metrics?.approved_clips || 0} approved out of {metrics?.total_detected_highlights || 0} candidates
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Production Render Output</span>
            <FolderCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-400">
            {metrics?.completed_exports || 0}
          </div>
          <p className="text-[11px] text-slate-500">Shorts & Reels QC-verified</p>
        </div>
      </div>

      {/* Conversion Funnel Visualization */}
      <div className="p-6 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Editorial Conversion Funnel
        </h3>

        <div className="space-y-3">
          {/* Step 1: Sources */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">1. Source Videos Ingested</span>
              <span className="font-mono text-white font-bold">{metrics?.total_source_videos || 0}</span>
            </div>
            <div className="h-3 bg-[#111622] rounded-full overflow-hidden border border-[#171e2e]">
              <div className="h-full bg-brand-400" style={{ width: "100%" }}></div>
            </div>
          </div>

          {/* Step 2: Detected Moments */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">2. AI Highlights Discovered</span>
              <span className="font-mono text-white font-bold">{metrics?.total_detected_highlights || 0}</span>
            </div>
            <div className="h-3 bg-[#111622] rounded-full overflow-hidden border border-[#171e2e]">
              <div
                className="h-full bg-amber-400"
                style={{
                  width: `${Math.min(100, Math.max(10, ((metrics?.total_detected_highlights || 0) / Math.max(1, metrics?.total_source_videos || 1)) * 30))}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Step 3: Approved */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">3. Human Approved Moments</span>
              <span className="font-mono text-white font-bold">{metrics?.approved_clips || 0}</span>
            </div>
            <div className="h-3 bg-[#111622] rounded-full overflow-hidden border border-[#171e2e]">
              <div
                className="h-full bg-emerald-400"
                style={{
                  width: `${Math.min(100, Math.max(5, ((metrics?.approved_clips || 0) / Math.max(1, metrics?.total_detected_highlights || 1)) * 100))}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Step 4: Rendered */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">4. Completed QC 9:16 Exports</span>
              <span className="font-mono text-white font-bold">{metrics?.completed_exports || 0}</span>
            </div>
            <div className="h-3 bg-[#111622] rounded-full overflow-hidden border border-[#171e2e]">
              <div
                className="h-full bg-cyan-400"
                style={{
                  width: `${Math.min(100, Math.max(5, ((metrics?.completed_exports || 0) / Math.max(1, metrics?.approved_clips || 1)) * 100))}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
