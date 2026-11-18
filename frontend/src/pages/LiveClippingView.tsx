import React, { useState, useEffect } from "react";
import { Radio, Play, Square, Scissors, Clock, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { api, SourceVideo } from "../services/api";
import { NavSection } from "../components/Sidebar";

interface LiveClippingViewProps {
  onNavigate: (section: NavSection, meta?: any) => void;
}

export const LiveClippingView: React.FC<LiveClippingViewProps> = ({ onNavigate }) => {
  const [feedName, setFeedName] = useState("Main Stream Feed");
  const [feedUrl, setFeedUrl] = useState("rtmp://localhost/live/stream");
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [clipRange, setClipRange] = useState({ start: 0, end: 30 });
  const [clipTitle, setClipTitle] = useState("Stream Highlight Moment");
  const [isClipping, setIsClipping] = useState(false);
  const [clippedSource, setClippedSource] = useState<SourceVideo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.startLiveSession(feedName, feedUrl);
      setActiveSession(res);
    } catch (err: any) {
      setError(err.message || "Failed to start live session.");
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async () => {
    if (!activeSession) return;
    try {
      await api.stopLiveSession(activeSession.session_id);
      setActiveSession(null);
    } catch (err) {
      console.error(err);
    }
  };

  const pollSegments = async () => {
    if (!activeSession?.session_id) return;
    try {
      const data = await api.getLiveSegments(activeSession.session_id);
      setSegments(data.segments || []);
      if (data.segments && data.segments.length > 0) {
        const last = data.segments[data.segments.length - 1];
        setClipRange((prev) => ({
          start: Math.max(0, last.end_time_sec - 45),
          end: last.end_time_sec,
        }));
      }
    } catch (err) {
      console.error("Segment poll error:", err);
    }
  };

  useEffect(() => {
    if (activeSession) {
      const timer = setInterval(pollSegments, 3000);
      return () => clearInterval(timer);
    }
  }, [activeSession]);

  const handleClipRange = async () => {
    if (!activeSession) return;
    setIsClipping(true);
    setError(null);
    try {
      const res = await api.clipLiveSegment(
        activeSession.session_id,
        clipRange.start,
        clipRange.end,
        clipTitle
      );
      setClippedSource(res.source);
    } catch (err: any) {
      setError(err.message || "Failed to assemble live clip range.");
    } finally {
      setIsClipping(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Radio className="w-6 h-6 text-cyan-400 animate-pulse" />
          <h1 className="text-xl font-black text-white">Live Clipping & Rolling Buffer Studio</h1>
        </div>
        <p className="text-xs text-slate-400">
          Capture authorized live feeds (RTMP/HLS) in rolling segments. Mark moments in real-time and extract clips without stopping the stream.
        </p>
      </div>

      {/* Stream Control Panel */}
      <div className="p-6 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Live Ingestion Feed Settings</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Feed Identifier</label>
            <input
              type="text"
              value={feedName}
              onChange={(e) => setFeedName(e.target.value)}
              disabled={!!activeSession}
              className="w-full px-3.5 py-2.5 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Feed URL (RTMP, HLS, or Video Feed)</label>
            <input
              type="text"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              disabled={!!activeSession}
              placeholder="rtmp://... or https://...m3u8"
              className="w-full px-3.5 py-2.5 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeSession ? "bg-cyan-400 animate-ping" : "bg-slate-600"
              }`}
            ></span>
            <span className="text-slate-400">
              {activeSession ? "Rolling Buffer Active (Segment duration: 30s)" : "Feed Inactive"}
            </span>
          </div>

          {activeSession ? (
            <button
              onClick={stopSession}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Square className="w-3.5 h-3.5" /> Stop Capture
            </button>
          ) : (
            <button
              onClick={startSession}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-600/30"
            >
              <Play className="w-4 h-4 fill-white" /> Start Rolling Buffer
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Rolling Segments Visualizer & Clip Range Selector */}
      {activeSession && (
        <div className="p-6 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#171e2e] pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" /> Rolling Stream Buffer ({segments.length} segments recorded)
            </h3>
            <button onClick={pollSegments} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {/* Buffer Timeline Segment Bars */}
          <div className="space-y-2">
            <div className="h-10 bg-[#111622] rounded-xl border border-[#232d42] p-1 flex items-center gap-1 overflow-x-auto">
              {segments.length === 0 ? (
                <span className="text-[11px] text-slate-500 px-3">Waiting for first 30s segment to finalize...</span>
              ) : (
                segments.map((s, idx) => (
                  <div
                    key={s.segment_id}
                    title={`Segment #${idx + 1}: ${s.start_time_sec}s - ${s.end_time_sec}s`}
                    className="h-full bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/40 rounded px-2 flex items-center justify-center shrink-0 cursor-pointer text-[10px] font-mono text-cyan-300"
                    onClick={() => {
                      setClipRange({ start: s.start_time_sec, end: s.end_time_sec });
                    }}
                  >
                    #{idx + 1} ({s.start_time_sec}s-{s.end_time_sec}s)
                  </div>
                ))
              )}
            </div>
            <p className="text-[10px] text-slate-500 text-right">Click any chunk above to preset clip boundaries</p>
          </div>

          {/* Range Selection Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time (Seconds)</label>
              <input
                type="number"
                min="0"
                value={clipRange.start}
                onChange={(e) => setClipRange({ ...clipRange, start: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">End Time (Seconds)</label>
              <input
                type="number"
                min="0"
                value={clipRange.end}
                onChange={(e) => setClipRange({ ...clipRange, end: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Clip Title</label>
              <input
                type="text"
                value={clipTitle}
                onChange={(e) => setClipTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400 font-mono">
              Clip Duration: {Math.max(0, clipRange.end - clipRange.start)} seconds
            </span>
            <button
              onClick={handleClipRange}
              disabled={isClipping || clipRange.end <= clipRange.start}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-600/30"
            >
              <Scissors className="w-4 h-4" />
              {isClipping ? "Extracting from Buffer..." : "Extract Clip to Source Library"}
            </button>
          </div>
        </div>
      )}

      {/* Clipped Success Card */}
      {clippedSource && (
        <div className="p-6 rounded-2xl bg-[#0c0f17] border border-cyan-500/30 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Live Range Successfully Clipped & Saved
            </span>
            <span className="text-[11px] font-mono text-slate-500">ID: {clippedSource.id}</span>
          </div>
          <p className="text-xs text-slate-300">
            "{clippedSource.title}" ({Math.round(clippedSource.duration_seconds)}s) is registered in the source library and ready for AI viral analysis.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => onNavigate("highlight_detector", { sourceId: clippedSource.id })}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white font-bold text-xs transition-colors"
            >
              Analyze Highlights Now →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
