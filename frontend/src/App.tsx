import React, { useState, useEffect } from "react";
import { Sidebar, NavSection } from "./components/Sidebar";
import { DashboardView } from "./pages/DashboardView";
import { YouTubeImportView } from "./pages/YouTubeImportView";
import { VideoUploadView } from "./pages/VideoUploadView";
import { LiveClippingView } from "./pages/LiveClippingView";
import { HighlightDetectorView } from "./pages/HighlightDetectorView";
import { ClipReviewView } from "./pages/ClipReviewView";
import { VideoEditorView } from "./pages/VideoEditorView";
import { RenderingQueueView } from "./pages/RenderingQueueView";
import { ExportLibraryView } from "./pages/ExportLibraryView";
import { CreatorManagementView } from "./pages/CreatorManagementView";
import { AnalyticsView } from "./pages/AnalyticsView";
import { SettingsView } from "./pages/SettingsView";
import { api } from "./services/api";

export const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<NavSection>("dashboard");
  const [navMeta, setNavMeta] = useState<any>({});
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [renderCount, setRenderCount] = useState<number>(0);

  const fetchBadgeCounts = async () => {
    try {
      const metrics = await api.getDashboardMetrics();
      setReviewCount(metrics.clips_awaiting_review || 0);
      setRenderCount(metrics.rendering_jobs || 0);
    } catch (err) {
      // Backend polling error ignored
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (section: NavSection, meta?: any) => {
    setCurrentSection(section);
    if (meta) {
      setNavMeta(meta);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07090e] text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={(sec) => handleNavigate(sec)}
        pendingReviewCount={reviewCount}
        activeRenderCount={renderCount}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 h-screen overflow-y-auto bg-[#07090e]">
        {currentSection === "dashboard" && <DashboardView onNavigate={handleNavigate} />}
        {currentSection === "youtube_import" && <YouTubeImportView onNavigate={handleNavigate} />}
        {currentSection === "video_upload" && <VideoUploadView onNavigate={handleNavigate} />}
        {currentSection === "live_clipping" && <LiveClippingView onNavigate={handleNavigate} />}
        {currentSection === "highlight_detector" && (
          <HighlightDetectorView
            onNavigate={handleNavigate}
            initialSourceId={navMeta.sourceId}
          />
        )}
        {currentSection === "clip_review" && <ClipReviewView onNavigate={handleNavigate} />}
        {currentSection === "video_editor" && (
          <VideoEditorView
            onNavigate={handleNavigate}
            initialProjectId={navMeta.projectId}
          />
        )}
        {currentSection === "rendering_queue" && (
          <RenderingQueueView
            onNavigate={handleNavigate}
            activeJobId={navMeta.jobId}
          />
        )}
        {currentSection === "export_library" && <ExportLibraryView onNavigate={handleNavigate} />}
        {currentSection === "creator_management" && <CreatorManagementView />}
        {currentSection === "analytics" && <AnalyticsView />}
        {currentSection === "settings" && <SettingsView />}
      </main>
    </div>
  );
};

export default App;
