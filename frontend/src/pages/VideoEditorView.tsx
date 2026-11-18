import React, { useState, useEffect, useRef } from "react";
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  Scissors,
  Sparkles,
  Sliders,
  Type,
  Volume2,
  Cpu,
  Copy,
  CheckCircle2,
  Layers,
  ZoomIn,
  MoveHorizontal,
  Flame,
  ArrowRight
} from "lucide-react";
import { api, ClipProject, SourceVideo, BACKEND_SERVER_URL } from "../services/api";
import { NavSection } from "../components/Sidebar";

interface VideoEditorViewProps {
  onNavigate: (section: NavSection, meta?: any) => void;
  initialProjectId?: string;
}

export const VideoEditorView: React.FC<VideoEditorViewProps> = ({
  onNavigate,
  initialProjectId,
}) => {
  const [projects, setProjects] = useState<ClipProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || "");
  const [projectData, setProjectData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Form Editor Controls
  const [title, setTitle] = useState("");
  const [presetName, setPresetName] = useState("STREAMER_HYPE");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [cropOffset, setCropOffset] = useState(50);
  const [trackingMode, setTrackingMode] = useState("face_tracker");
  const [enableZooms, setEnableZooms] = useState(true);
  const [zoomIntensity, setZoomIntensity] = useState(1.20);
  const [enableCaptions, setEnableCaptions] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [deadAirRemoval, setDeadAirRemoval] = useState(false);
  const [targetPlatform, setTargetPlatform] = useState<"youtube_shorts" | "instagram_reels">("youtube_shorts");
  const [rendering, setRendering] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const list = await api.getProjects();
        setProjects(list);
        if (list.length > 0 && !selectedProjectId) {
          setSelectedProjectId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectDetails(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadProjectDetails = async (id: string) => {
    try {
      const data = await api.getProject(id);
      setProjectData(data);
      const p = data.project;
      setTitle(p.title);
      setPresetName(p.preset_name);
      setStartTime(p.start_time);
      setEndTime(p.end_time);
      setCropOffset(p.crop_x_offset_pct);
      setTrackingMode(p.tracking_mode);
      setEnableZooms(p.enable_zooms);
      setZoomIntensity(p.zoom_intensity);
      setEnableCaptions(p.enable_captions);
      setSoundEffects(p.sound_effects_enabled);
      setDeadAirRemoval(p.dead_air_removal_enabled);
      setCurrentTime(p.start_time);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      setCurrentTime(t);
      if (t >= endTime) {
        videoRef.current.currentTime = startTime;
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
          videoRef.current.currentTime = startTime;
        }
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSave = async () => {
    if (!selectedProjectId) return;
    setSaveStatus("Saving changes...");
    try {
      await api.updateProject(selectedProjectId, {
        title,
        preset_name: presetName,
        start_time: startTime,
        end_time: endTime,
        crop_x_offset_pct: cropOffset,
        tracking_mode: trackingMode,
        enable_zooms: enableZooms,
        zoom_intensity: zoomIntensity,
        enable_captions: enableCaptions,
        sound_effects_enabled: soundEffects,
        dead_air_removal_enabled: deadAirRemoval,
      });
      setSaveStatus("Changes saved successfully!");
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err) {
      setSaveStatus("Failed to save changes.");
    }
  };

  const handleDuplicate = async () => {
    if (!selectedProjectId) return;
    try {
      const dup = await api.duplicateProject(selectedProjectId);
      setProjects([dup, ...projects]);
      setSelectedProjectId(dup.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartRender = async () => {
    if (!selectedProjectId) return;
    setRendering(true);
    try {
      // First save current project updates
      await api.updateProject(selectedProjectId, {
        title,
        preset_name: presetName,
        start_time: startTime,
        end_time: endTime,
        crop_x_offset_pct: cropOffset,
        tracking_mode: trackingMode,
        enable_zooms: enableZooms,
        zoom_intensity: zoomIntensity,
        enable_captions: enableCaptions,
        sound_effects_enabled: soundEffects,
        dead_air_removal_enabled: deadAirRemoval,
      });

      // Start render job
      const job = await api.startRender(selectedProjectId, targetPlatform);
      onNavigate("rendering_queue", { jobId: job.job_id });
    } catch (err: any) {
      alert(`Render error: ${err.message || "Failed to start render"}`);
      setRendering(false);
    }
  };

  const activeVideoSrc = projectData?.source_video?.file_path
    ? `${BACKEND_SERVER_URL}/storage/originals/${projectData.source_video.file_path.split(/[\\/]/).pop()}`
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Project Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#171e2e] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Film className="w-6 h-6 text-brand-400" />
            <h1 className="text-xl font-black text-white">Interactive 9:16 Clip Workstation</h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time reframing, word-by-word animated captions, streamer hype zooms, and platform-compliant rendering.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3.5 py-2 bg-[#0c0f17] border border-[#232d42] rounded-xl text-xs text-white focus:outline-none focus:border-brand font-medium"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.preset_name})
              </option>
            ))}
          </select>

          <button
            onClick={handleDuplicate}
            title="Duplicate project"
            className="p-2 rounded-xl bg-[#111622] hover:bg-[#171e2e] text-slate-300 border border-[#232d42] transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Workstation Grid: Video Player on Left, Controls on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 9:16 Vertical Preview Monitor & Timeline (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-[#0c0f17] border border-[#171e2e] flex flex-col items-center">
            {/* 9:16 Vertical Phone Aspect Ratio Container */}
            <div className="w-[280px] h-[498px] rounded-3xl bg-black border-4 border-[#232d42] relative overflow-hidden shadow-2xl flex items-center justify-center">
              {activeVideoSrc ? (
                <video
                  ref={videoRef}
                  src={activeVideoSrc}
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full object-cover transition-transform duration-200"
                  style={{
                    objectPosition: `${cropOffset}% center`,
                    transform: enableZooms ? `scale(${zoomIntensity})` : "scale(1.0)",
                  }}
                  playsInline
                />
              ) : (
                <div className="text-center p-4 text-xs text-slate-500">
                  Select a project with source media to preview.
                </div>
              )}

              {/* Safe Area Guides Overlay */}
              <div className="absolute inset-0 pointer-events-none border border-cyan-500/20 m-4 rounded-xl flex flex-col justify-between p-2">
                <div className="text-[9px] font-mono text-cyan-400/60 uppercase">9:16 Safe Frame</div>

                {/* Animated Subtitles Live Preview Box */}
                {enableCaptions && (
                  <div className="text-center space-y-1 mb-8">
                    <span className="inline-block px-3 py-1 rounded bg-black/80 font-black text-xs text-amber-300 uppercase tracking-wide border border-black shadow-lg">
                      {projectData?.sync_transcript?.[0]?.text?.slice(0, 30) || "BRO WAIT LOOK AT THIS!"}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>UI Safe Area</span>
                  <span>1080x1920</span>
                </div>
              </div>

              {/* Play / Pause Center Watermark */}
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
              >
                {!isPlaying && (
                  <div className="w-12 h-12 rounded-full bg-brand/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                )}
              </button>
            </div>

            {/* Transport Bar */}
            <div className="w-full mt-3 flex items-center justify-between text-xs font-mono text-slate-400 px-2">
              <button onClick={togglePlay} className="p-1.5 rounded-lg bg-[#111622] hover:bg-[#171e2e] text-white">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              </button>
              <span>{currentTime.toFixed(1)}s / {endTime.toFixed(1)}s</span>
              <span className="text-brand-400 font-bold">{presetName}</span>
            </div>
          </div>

          {/* Timeline Range Scrub Bar */}
          <div className="p-4 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5 text-brand-400" /> Timeline Window</span>
              <span className="font-mono text-cyan-400">Duration: {(endTime - startTime).toFixed(1)}s</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Start: {startTime.toFixed(1)}s</span>
                <span>End: {endTime.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0"
                max={projectData?.source_video?.duration_seconds || 120}
                step="0.1"
                value={startTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val < endTime) setStartTime(val);
                }}
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max={projectData?.source_video?.duration_seconds || 120}
                step="0.1"
                value={endTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val > startTime) setEndTime(val);
                }}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Editing Controls & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Preset Selector */}
          <div className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Editing Preset Configuration
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "STREAMER_HYPE", label: "Streamer Hype", desc: "Punch-in zooms & bold subtitles" },
                { id: "PODCAST_CLEAN", label: "Podcast Clean", desc: "Clean centered dialogue" },
                { id: "GAMING_REACTION", label: "Gaming Reaction", desc: "Clutch zooms & neon tags" },
                { id: "CINEMATIC_STORY", label: "Cinematic Story", desc: "Smooth narrative pacing" },
                { id: "EDUCATIONAL_SHORT", label: "Educational", desc: "Upper/lower third cards" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPresetName(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    presetName === p.id
                      ? "border-brand bg-brand/10 text-white shadow-sm shadow-brand/20"
                      : "border-[#171e2e] bg-[#111622] text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="text-xs font-bold block">{p.label}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 line-clamp-1">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reframing & Crop Controls */}
          <div className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <MoveHorizontal className="w-4 h-4 text-cyan-400" /> Smart Reframing & 9:16 Anchor
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tracking Mode</label>
                <select
                  value={trackingMode}
                  onChange={(e) => setTrackingMode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white"
                >
                  <option value="face_tracker">AI Face & Speaker Tracker</option>
                  <option value="center_anchor">Fixed Center Anchor</option>
                  <option value="manual_crop">Manual Crop Offset</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
                  <span>Horizontal Anchor Offset</span>
                  <span className="text-cyan-400 font-mono">{cropOffset}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropOffset}
                  onChange={(e) => setCropOffset(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Zooms & Effects */}
          <div className="p-5 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ZoomIn className="w-4 h-4 text-brand-400" /> Dynamic Zooms & Audio
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#111622] border border-[#232d42]">
                <span className="text-xs font-semibold text-white">Punch-in Zooms</span>
                <input
                  type="checkbox"
                  checked={enableZooms}
                  onChange={(e) => setEnableZooms(e.target.checked)}
                  className="w-4 h-4 accent-brand cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#111622] border border-[#232d42]">
                <span className="text-xs font-semibold text-white">Animated Captions</span>
                <input
                  type="checkbox"
                  checked={enableCaptions}
                  onChange={(e) => setEnableCaptions(e.target.checked)}
                  className="w-4 h-4 accent-brand cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#111622] border border-[#232d42]">
                <span className="text-xs font-semibold text-white">Sound Effects Design</span>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => setSoundEffects(e.target.checked)}
                  className="w-4 h-4 accent-brand cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#111622] border border-[#232d42]">
                <span className="text-xs font-semibold text-white">Dead Air Cut</span>
                <input
                  type="checkbox"
                  checked={deadAirRemoval}
                  onChange={(e) => setDeadAirRemoval(e.target.checked)}
                  className="w-4 h-4 accent-brand cursor-pointer"
                />
              </div>
            </div>

            {enableZooms && (
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
                  <span>Zoom Punch Intensity</span>
                  <span className="text-brand-400 font-mono">{zoomIntensity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1.05"
                  max="1.35"
                  step="0.01"
                  value={zoomIntensity}
                  onChange={(e) => setZoomIntensity(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Target Platform & Render Trigger */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#111622] to-[#171e2e] border border-[#232d42] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Target Export Profile</h3>
                <p className="text-xs text-slate-400">Resolution: 1080x1920 • H.264 MP4 • AAC Audio</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTargetPlatform("youtube_shorts")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    targetPlatform === "youtube_shorts"
                      ? "bg-red-600 text-white"
                      : "bg-[#0c0f17] text-slate-400 border border-[#232d42]"
                  }`}
                >
                  YouTube Shorts
                </button>
                <button
                  onClick={() => setTargetPlatform("instagram_reels")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    targetPlatform === "instagram_reels"
                      ? "bg-purple-600 text-white"
                      : "bg-[#0c0f17] text-slate-400 border border-[#232d42]"
                  }`}
                >
                  Instagram Reels
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#232d42]">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-[#111622] hover:bg-[#232d42] text-slate-200 border border-[#232d42] font-semibold text-xs"
                >
                  Save Settings
                </button>
                {saveStatus && <span className="text-xs text-emerald-400">{saveStatus}</span>}
              </div>

              <button
                onClick={handleStartRender}
                disabled={rendering}
                className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-lg shadow-brand/40 flex items-center gap-2"
              >
                <Cpu className="w-4 h-4" />
                {rendering ? "Queueing Render..." : "Render 1080x1920 Short Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
