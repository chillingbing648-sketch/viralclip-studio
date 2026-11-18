import React, { useState, useEffect } from "react";
import {
  FolderDown,
  Download,
  Play,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Tag,
  MessageSquare,
  Sparkles,
  ExternalLink,
  X,
  FileCheck
} from "lucide-react";
import { api, API_BASE_URL, BACKEND_SERVER_URL, PublishingMetadata } from "../services/api";
import { NavSection } from "../components/Sidebar";

interface ExportLibraryViewProps {
  onNavigate: (section: NavSection, meta?: any) => void;
}

export const ExportLibraryView: React.FC<ExportLibraryViewProps> = ({ onNavigate }) => {
  const [exportsList, setExportsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [publishingProjectId, setPublishingProjectId] = useState<string | null>(null);
  const [pubData, setPubData] = useState<PublishingMetadata | null>(null);
  const [pubLoading, setPubLoading] = useState(false);
  const [pubStatusMsg, setPubStatusMsg] = useState<string | null>(null);

  const loadExports = async () => {
    try {
      const data = await api.getExports();
      setExportsList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExports();
  }, []);

  const openPublishing = async (projectId: string) => {
    setPublishingProjectId(projectId);
    setPubLoading(true);
    setPubStatusMsg(null);
    try {
      const data = await api.getPublishingMetadata(projectId);
      setPubData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setPubLoading(false);
    }
  };

  const handleApprovePublish = async () => {
    if (!publishingProjectId) return;
    try {
      await api.approvePublishing(publishingProjectId);
      if (pubData) {
        setPubData({ ...pubData, approval_status: "approved" });
      }
      setPubStatusMsg("Publishing package approved by user!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecutePublish = async () => {
    if (!publishingProjectId) return;
    try {
      const res = await api.executePublish(publishingProjectId);
      if (pubData) {
        setPubData({
          ...pubData,
          published_status: "published",
          published_url: res.published_url,
        });
      }
      setPubStatusMsg("Successfully published to channel!");
    } catch (err: any) {
      setPubStatusMsg(`Publishing failed: ${err.message}`);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FolderDown className="w-6 h-6 text-brand-400" />
          <h1 className="text-xl font-black text-white">Export Library & Distribution Hub</h1>
        </div>
        <p className="text-xs text-slate-400">
          QC-verified 1080x1920 vertical Shorts and Reels ready for high-energy distribution.
        </p>
      </div>

      {/* Grid of Rendered Clips */}
      {exportsList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-3">
          <FolderDown className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Rendered Clips in Library</h3>
          <p className="text-xs text-slate-400">Render clips from the Video Editor to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {exportsList.map((item) => {
            const videoUrl = `${BACKEND_SERVER_URL}/storage/exports/${item.output_path.split(/[\\/]/).pop()}`;
            const thumbUrl = item.thumbnail_path
              ? `${BACKEND_SERVER_URL}/storage/previews/${item.thumbnail_path.split(/[\\/]/).pop()}`
              : null;

            return (
              <div
                key={item.job_id}
                className="rounded-2xl bg-[#0c0f17] border border-[#171e2e] hover:border-[#232d42] overflow-hidden flex flex-col justify-between transition-all"
              >
                {/* 9:16 Thumbnail Card */}
                <div className="relative aspect-[9/16] bg-black max-h-72 w-full overflow-hidden group">
                  {thumbUrl && (
                    <img src={thumbUrl} alt={item.title} className="w-full h-full object-cover" />
                  )}

                  {/* Play Overlay */}
                  <div
                    onClick={() => setActivePreviewUrl(videoUrl)}
                    className="absolute inset-0 bg-black/40 group-hover:bg-black/60 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-brand/90 group-hover:scale-110 flex items-center justify-center text-white shadow-xl transition-transform">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 right-2 flex justify-between items-center pointer-events-none">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-cyan-400 uppercase border border-cyan-500/30">
                      {item.preset_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/90 text-black">
                      {item.qc_status.toUpperCase()}
                    </span>
                  </div>

                  {/* Bottom Duration Badge */}
                  <div className="absolute bottom-2 right-2 pointer-events-none">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/80 text-white font-bold">
                      {item.duration_seconds}s
                    </span>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white line-clamp-1">{item.title}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                      <span>1080x1920 (9:16)</span>
                      <span>•</span>
                      <span>{((item.file_size_bytes || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                    <p className="text-[10px] text-emerald-400 mt-1 line-clamp-1">{item.qc_notes}</p>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="pt-3 border-t border-[#171e2e] grid grid-cols-2 gap-2">
                    <a
                      href={`${API_BASE_URL}/render/exports/${item.job_id}/download`}
                      download
                      className="px-3 py-2 rounded-xl bg-[#111622] hover:bg-[#171e2e] text-slate-200 border border-[#232d42] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-brand-400" /> Download
                    </a>

                    <button
                      onClick={() => openPublishing(item.project_id)}
                      className="px-3 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-brand/30"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Publish
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Player Modal */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0f17] border border-[#232d42] rounded-3xl p-4 max-w-sm w-full relative space-y-3 shadow-2xl">
            <button
              onClick={() => setActivePreviewUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#171e2e] text-slate-400 hover:text-white z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-[280px] h-[498px] mx-auto rounded-2xl overflow-hidden bg-black border border-[#232d42]">
              <video src={activePreviewUrl} controls autoPlay className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      )}

      {/* Publishing Assistant Drawer / Modal */}
      {publishingProjectId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0f17] border border-[#232d42] rounded-3xl p-6 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#171e2e] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">AI Publishing Assistant & Governance</h3>
              </div>
              <button
                onClick={() => setPublishingProjectId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pubLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Generating AI high-CTR title, viral hashtags, and metadata...
              </div>
            ) : pubData ? (
              <div className="space-y-4 text-xs">
                {/* Generated Title */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Generated Title (High CTR)</label>
                  <input
                    type="text"
                    value={pubData.generated_title}
                    onChange={(e) => setPubData({ ...pubData, generated_title: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#111622] border border-[#232d42] rounded-xl text-white font-bold"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Short Description</label>
                  <textarea
                    rows={3}
                    value={pubData.generated_description}
                    onChange={(e) => setPubData({ ...pubData, generated_description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#111622] border border-[#232d42] rounded-xl text-white font-mono text-[11px]"
                  />
                </div>

                {/* Hashtags */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Trending Hashtags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {pubData.hashtags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-brand/10 text-brand-400 font-mono text-[11px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pinned Engagement Comment */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Pinned Engagement Comment</label>
                  <input
                    type="text"
                    value={pubData.pinned_comment || ""}
                    onChange={(e) => setPubData({ ...pubData, pinned_comment: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#111622] border border-[#232d42] rounded-xl text-white"
                  />
                </div>

                {/* Suggested Thumbnail Text */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Suggested Thumbnail Curiosity Hook</label>
                  <input
                    type="text"
                    value={pubData.thumbnail_text || ""}
                    onChange={(e) => setPubData({ ...pubData, thumbnail_text: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#111622] border border-[#232d42] rounded-xl text-white font-black uppercase text-amber-300"
                  />
                </div>

                {/* Approval & Publish Actions */}
                <div className="pt-3 border-t border-[#171e2e] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Approval Status: <strong className="uppercase text-white">{pubData.approval_status}</strong>
                    </span>

                    {pubData.approval_status !== "approved" ? (
                      <button
                        onClick={handleApprovePublish}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs"
                      >
                        Approve Publishing Package
                      </button>
                    ) : (
                      <button
                        onClick={handleExecutePublish}
                        className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand/40"
                      >
                        Publish to Channel Now
                      </button>
                    )}
                  </div>

                  {pubStatusMsg && (
                    <p className="text-center text-xs text-emerald-400 font-medium pt-1">{pubStatusMsg}</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
