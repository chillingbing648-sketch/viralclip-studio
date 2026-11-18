import React, { useState, useRef } from "react";
import { Upload, FileVideo, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { api, SourceVideo, BACKEND_SERVER_URL } from "../services/api";
import { NavSection } from "../components/Sidebar";

interface VideoUploadViewProps {
  onNavigate: (section: NavSection, meta?: any) => void;
}

export const VideoUploadView: React.FC<VideoUploadViewProps> = ({ onNavigate }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [creatorName, setCreatorName] = useState("Streamer / Creator");
  const [rightsStatus, setRightsStatus] = useState("owner_provided");
  const [rightsNotes, setRightsNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedSource, setUploadedSource] = useState<SourceVideo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/") || file.name.match(/\.(mp4|mov|mkv|avi|webm)$/i)) {
        setSelectedFile(file);
      } else {
        setError("Please drop a valid video file (MP4, MOV, MKV, WebM).");
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setUploadedSource(null);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("creator_name", creatorName.trim() || "Creator");
    formData.append("rights_status", rightsStatus);
    formData.append("rights_notes", rightsNotes);

    try {
      setUploadProgress(50);
      const res = await api.uploadVideo(formData);
      setUploadProgress(100);
      setUploadedSource(res);
    } catch (err: any) {
      setError(err.message || "Failed to upload video.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Upload className="w-6 h-6 text-brand-400" />
          <h1 className="text-xl font-black text-white">Local Video Ingestion & Metadata Analysis</h1>
        </div>
        <p className="text-xs text-slate-400">
          Upload creator stream recordings or gameplay VODs. FFmpeg extracts frame rate, duration, resolution, audio streams and generates thumbnails.
        </p>
      </div>

      {/* Upload Box */}
      <form onSubmit={handleUpload} className="space-y-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragging
              ? "border-brand bg-brand/5 scale-[0.99]"
              : selectedFile
              ? "border-emerald-500/50 bg-[#0c0f17]"
              : "border-[#232d42] bg-[#0c0f17] hover:border-brand/40 hover:bg-[#111622]"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="video/*,.mp4,.mov,.mkv,.avi,.webm"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
            }}
          />

          <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-400 mb-4 shadow-lg shadow-brand/20">
            {selectedFile ? <FileVideo className="w-7 h-7 text-emerald-400" /> : <Upload className="w-7 h-7" />}
          </div>

          {selectedFile ? (
            <div className="text-center space-y-1">
              <span className="text-sm font-bold text-white block">{selectedFile.name}</span>
              <span className="text-xs text-emerald-400 font-mono">
                {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • Click or drag another file to replace
              </span>
            </div>
          ) : (
            <div className="text-center space-y-1">
              <span className="text-sm font-bold text-white block">Drop video file here or click to browse</span>
              <span className="text-xs text-slate-500">Supports MP4, MOV, MKV, WebM up to 4GB</span>
            </div>
          )}
        </div>

        {/* Creator & Rights Details Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e]">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Creator / Channel Name</label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="e.g. TenZ, Pokimane, Asmongold"
              className="w-full px-3.5 py-2.5 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Rights & Clearance Status</label>
            <select
              value={rightsStatus}
              onChange={(e) => setRightsStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white focus:outline-none focus:border-brand"
            >
              <option value="owner_provided">Owner Provided / Direct Creator Upload</option>
              <option value="authorized">Licensed / Authorized Streamer Partnership</option>
              <option value="pending_review">Pending Rights Review</option>
              <option value="restricted">Restricted (Testing Only)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Rights Clearance Notes (Optional)</label>
            <input
              type="text"
              value={rightsNotes}
              onChange={(e) => setRightsNotes(e.target.value)}
              placeholder="e.g. Streamer partnership signed Nov 2026, monetization cleared"
              className="w-full px-3.5 py-2.5 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedFile || uploading}
          className="w-full py-3 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-brand/30 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Ingesting & Analyzing Video Streams...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Ingest Video & Inspect Metadata
            </>
          )}
        </button>
      </form>

      {/* Success Ingest Card */}
      {uploadedSource && (
        <div className="p-6 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#171e2e] pb-3">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Media Ingested & Verified
            </span>
            <span className="text-[11px] font-mono text-slate-500">ID: {uploadedSource.id}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {uploadedSource.thumbnail_path && (
              <img
                src={`${BACKEND_SERVER_URL}/storage/previews/${uploadedSource.thumbnail_path.split(/[\\/]/).pop()}`}
                alt="Thumbnail"
                className="w-40 h-24 object-cover rounded-xl border border-[#232d42] shrink-0"
              />
            )}
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-bold text-white">{uploadedSource.title}</h3>
              <p className="text-xs text-slate-400">Creator: <span className="text-slate-200">{uploadedSource.creator_name}</span></p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono text-slate-400">
                <div>Duration: <span className="text-white">{Math.round(uploadedSource.duration_seconds)}s</span></div>
                <div>Res: <span className="text-white">{uploadedSource.width}x{uploadedSource.height}</span></div>
                <div>FPS: <span className="text-white">{uploadedSource.fps}</span></div>
                <div>Codec: <span className="text-white">{uploadedSource.video_codec}</span></div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#171e2e] flex items-center justify-between">
            <span className="text-xs text-slate-400">Ready to detect viral moments:</span>
            <button
              onClick={() => onNavigate("highlight_detector", { sourceId: uploadedSource.id })}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white font-bold text-xs transition-all shadow-md shadow-brand/20 flex items-center gap-1.5"
            >
              Analyze Highlights With AI <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
