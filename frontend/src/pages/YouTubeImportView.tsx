import React, { useState } from "react";
import { PlaySquare, Search, CheckCircle2, AlertTriangle, Upload, FileVideo, ExternalLink, ShieldAlert } from "lucide-react";
import { api, BACKEND_SERVER_URL } from "../services/api";
import { NavSection } from "../components/Sidebar";

interface YouTubeImportViewProps {
  onNavigate: (section: NavSection, meta?: any) => void;
}

export const YouTubeImportView: React.FC<YouTubeImportViewProps> = ({ onNavigate }) => {
  const [url, setUrl] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [importedRecord, setImportedRecord] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // File attachment state
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachSuccess, setAttachSuccess] = useState(false);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setImportedRecord(null);
    setAttachSuccess(false);

    try {
      const data = await api.importYouTube(url.trim(), creatorName.trim() || undefined);
      setImportedRecord(data);
    } catch (err: any) {
      setError(err.message || "Failed to import YouTube reference.");
    } finally {
      setLoading(false);
    }
  };

  const handleAttachMedia = async () => {
    if (!importedRecord?.source?.id || !attachFile) return;

    setAttaching(true);
    try {
      const formData = new FormData();
      formData.append("file", attachFile);
      const updated = await api.attachMedia(importedRecord.source.id, formData);
      setImportedRecord((prev: any) => ({ ...prev, source: updated }));
      setAttachSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to attach creator media file.");
    } finally {
      setAttaching(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PlaySquare className="w-6 h-6 text-red-500" />
          <h1 className="text-xl font-black text-white">YouTube URL Metadata Importer</h1>
        </div>
        <p className="text-xs text-slate-400">
          Import verified metadata references from YouTube videos or livestreams, and attach authorized creator files.
        </p>
      </div>

      {/* Compliance / DRM Notice Alert */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Rights & Platform Compliance:</span> In compliance with Google & YouTube terms of service, YouTube URLs are ingested as authorized metadata references. To perform AI clipping and vertical video rendering, attach the creator-provided original video or authorized feed below.
        </div>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleImport} className="p-6 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            YouTube Video or Livestream URL
          </label>
          <div className="relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
              className="w-full px-4 py-3 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand pr-24"
              required
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="absolute right-2 top-2 bottom-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              {loading ? "Verifying..." : "Fetch Info"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Creator or Streamer Name (Optional Override)
          </label>
          <input
            type="text"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            placeholder="e.g. Tarik, Pokimane, Shroud"
            className="w-full px-4 py-2.5 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand"
          />
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Imported Result Card */}
      {importedRecord && (
        <div className="p-6 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#171e2e] pb-3">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Metadata Verified & Recorded
            </span>
            <span className="text-[11px] font-mono text-slate-500">ID: {importedRecord.source?.id}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {importedRecord.source?.thumbnail_path && (
              <img
                src={importedRecord.source.thumbnail_path}
                alt="Thumbnail"
                className="w-full sm:w-48 h-28 object-cover rounded-xl border border-[#232d42] shrink-0"
              />
            )}
            <div className="space-y-1.5 flex-1">
              <h3 className="font-bold text-sm text-white">{importedRecord.source?.title}</h3>
              <p className="text-xs text-slate-400">Creator: <span className="text-slate-200 font-semibold">{importedRecord.source?.creator_name}</span></p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Duration: {Math.round(importedRecord.source?.duration_seconds || 0)}s</span>
                <span>•</span>
                <span>Status: <span className="text-amber-400 font-medium">{importedRecord.source?.rights_status}</span></span>
              </div>
              <p className="text-[11px] text-cyan-400 font-medium bg-cyan-950/40 p-2 rounded-lg border border-cyan-800/40">
                {importedRecord.source_access_status}
              </p>
            </div>
          </div>

          {/* Attach Creator Media File Section */}
          <div className="pt-4 border-t border-[#171e2e] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-brand-400" /> Attach Creator-Provided Video File
            </h4>
            <p className="text-[11px] text-slate-400">
              Attach the authorized video file (MP4/MOV) provided by the creator or studio to start AI highlight clipping.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setAttachFile(e.target.files?.[0] || null)}
                className="w-full sm:w-auto flex-1 text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand/10 file:text-brand-400 hover:file:bg-brand/20 cursor-pointer"
              />
              <button
                type="button"
                onClick={handleAttachMedia}
                disabled={attaching || !attachFile}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                {attaching ? "Attaching Media..." : "Attach & Activate AI"}
              </button>
            </div>

            {attachSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
                <span>Media file attached successfully! Source is ready for AI clipping.</span>
                <button
                  onClick={() => onNavigate("highlight_detector", { sourceId: importedRecord.source.id })}
                  className="px-3 py-1 rounded-lg bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors"
                >
                  Launch AI Detector →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
