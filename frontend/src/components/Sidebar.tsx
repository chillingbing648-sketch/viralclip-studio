import React from "react";
import {
  LayoutDashboard,
  Upload,
  Radio,
  Sparkles,
  CheckSquare,
  Film,
  Cpu,
  FolderDown,
  ShieldCheck,
  BarChart3,
  Settings,
  Flame,
  PlaySquare
} from "lucide-react";

export type NavSection =
  | "dashboard"
  | "youtube_import"
  | "video_upload"
  | "live_clipping"
  | "highlight_detector"
  | "clip_review"
  | "video_editor"
  | "rendering_queue"
  | "export_library"
  | "creator_management"
  | "analytics"
  | "settings";

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  pendingReviewCount?: number;
  activeRenderCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  pendingReviewCount = 0,
  activeRenderCount = 0,
}) => {
  const navItems: Array<{ id: NavSection; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "youtube_import", label: "YouTube Import", icon: <PlaySquare className="w-5 h-5 text-red-500" /> },
    { id: "video_upload", label: "Video Upload", icon: <Upload className="w-5 h-5" /> },
    { id: "live_clipping", label: "Live Clipping", icon: <Radio className="w-5 h-5" /> },
    { id: "highlight_detector", label: "AI Highlight Detector", icon: <Sparkles className="w-5 h-5" /> },
    {
      id: "clip_review",
      label: "Clip Review",
      icon: <CheckSquare className="w-5 h-5" />,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
    },
    { id: "video_editor", label: "Video Editor", icon: <Film className="w-5 h-5" /> },
    {
      id: "rendering_queue",
      label: "Rendering Queue",
      icon: <Cpu className="w-5 h-5" />,
      badge: activeRenderCount > 0 ? activeRenderCount : undefined,
    },
    { id: "export_library", label: "Export Library", icon: <FolderDown className="w-5 h-5" /> },
    { id: "creator_management", label: "Creator Rights", icon: <ShieldCheck className="w-5 h-5" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-5 h-5" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-[#0c0f17] border-r border-[#171e2e] flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#171e2e] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-brand/30">
            <Flame className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              ViralClip <span className="text-xs px-1.5 py-0.5 rounded bg-brand/20 text-brand-400 font-mono font-semibold">STUDIO</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Streamer AI Workstation</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? "bg-brand text-white shadow-md shadow-brand/25 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#111622]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive ? "bg-white text-brand" : "bg-brand/20 text-brand-400"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Profile & Engine Status */}
      <div className="p-4 border-t border-[#171e2e] bg-[#07090e]/60">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-slate-400 text-[11px]">FFmpeg 9.0 & AI Ready</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
