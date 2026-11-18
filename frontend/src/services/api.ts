export const API_BASE_URL = "http://localhost:8000/api/v1";
export const BACKEND_SERVER_URL = "http://localhost:8000";

export interface SourceVideo {
  id: string;
  source_type: "upload" | "youtube" | "live_feed";
  title: string;
  creator_name: string;
  channel_name?: string;
  source_url?: string;
  external_id?: string;
  file_path?: string;
  thumbnail_path?: string;
  duration_seconds: number;
  width: number;
  height: number;
  fps: number;
  bitrate?: number;
  video_codec?: string;
  audio_codec?: string;
  file_size_bytes?: number;
  rights_status: string;
  rights_notes?: string;
  status: string;
  created_at: string;
}

export interface HighlightCandidate {
  id: string;
  source_video_id: string;
  start_time: number;
  end_time: number;
  duration: number;
  hook: string;
  reason: string;
  category: string;
  hook_score: number;
  emotion_score: number;
  entertainment_score: number;
  context_score: number;
  editing_potential_score: number;
  overall_score: number;
  tier: "priority" | "strong" | "possible" | "low";
  context_summary?: string;
  transcript_snippet?: string;
  status: "candidate" | "approved" | "rejected" | "edited" | "rendered";
  created_at: string;
}

export interface ClipProject {
  id: string;
  source_video_id: string;
  candidate_id?: string;
  title: string;
  preset_name: string;
  start_time: number;
  end_time: number;
  crop_x_offset_pct: number;
  tracking_mode: string;
  enable_zooms: boolean;
  zoom_intensity: number;
  enable_captions: boolean;
  caption_style_json?: string;
  dead_air_removal_enabled: boolean;
  sound_effects_enabled: boolean;
  status: string;
  preview_path?: string;
  rendered_path?: string;
  created_at: string;
}

export interface RenderJob {
  id: string;
  clip_project_id: string;
  target_platform: string;
  preset_name: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress_pct: number;
  stage_description: string;
  output_path?: string;
  output_thumbnail_path?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  qc_status: "pending" | "passed" | "warning" | "failed";
  qc_notes?: string;
  error_message?: string;
  completed_at?: string;
  created_at: string;
}

export interface CreatorRights {
  id: string;
  creator_name: string;
  channel_id?: string;
  authorization_type: string;
  music_license_status: string;
  distribution_rights: boolean;
  monetization_rights: boolean;
  notes?: string;
  created_at: string;
}

export interface DashboardMetrics {
  total_source_videos: number;
  total_detected_highlights: number;
  clips_awaiting_review: number;
  approved_clips: number;
  rejected_clips: number;
  completed_exports: number;
  rendering_jobs: number;
  ready_to_publish: number;
  published_count: number;
  average_viral_score: number;
  approval_rate_pct: number;
}

export interface PublishingMetadata {
  id: string;
  clip_project_id: string;
  target_platform: string;
  generated_title: string;
  alternate_titles?: string[];
  generated_description: string;
  hashtags: string[];
  pinned_comment?: string;
  thumbnail_text?: string;
  approval_status: string;
  published_status: string;
  published_url?: string;
}

export interface TranscriptData {
  id: string;
  source_video_id: string;
  language: string;
  duration_seconds: number;
  raw_text: string;
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    speaker: string;
    words: Array<{ word: string; start: number; end: number; probability: number }>;
  }>;
  total_segments: number;
}

// API Methods
export const api = {
  // Analytics
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const res = await fetch(`${API_BASE_URL}/analytics/dashboard`);
    return res.json();
  },
  getPresets: async () => {
    const res = await fetch(`${API_BASE_URL}/analytics/presets`);
    return res.json();
  },

  // Sources
  getSources: async (): Promise<SourceVideo[]> => {
    const res = await fetch(`${API_BASE_URL}/sources`);
    return res.json();
  },
  getSource: async (id: string): Promise<SourceVideo> => {
    const res = await fetch(`${API_BASE_URL}/sources/${id}`);
    return res.json();
  },
  uploadVideo: async (formData: FormData): Promise<SourceVideo> => {
    const res = await fetch(`${API_BASE_URL}/sources/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  },
  importYouTube: async (url: string, creator_name?: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/sources/youtube-metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, creator_name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "YouTube Import failed");
    }
    return res.json();
  },
  attachMedia: async (sourceId: string, formData: FormData): Promise<SourceVideo> => {
    const res = await fetch(`${API_BASE_URL}/sources/${sourceId}/attach-media`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Attach media failed");
    }
    return res.json();
  },
  deleteSource: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/sources/${id}`, { method: "DELETE" });
    return res.json();
  },

  // Transcription
  startTranscription: async (sourceId: string) => {
    const res = await fetch(`${API_BASE_URL}/transcripts/start/${sourceId}`, { method: "POST" });
    return res.json();
  },
  getTranscript: async (sourceId: string): Promise<TranscriptData> => {
    const res = await fetch(`${API_BASE_URL}/transcripts/${sourceId}`);
    if (!res.ok) throw new Error("Transcript not ready");
    return res.json();
  },
  searchTranscript: async (sourceId: string, query: string) => {
    const res = await fetch(`${API_BASE_URL}/transcripts/${sourceId}/search?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  // Highlights
  detectHighlights: async (sourceId: string) => {
    const res = await fetch(`${API_BASE_URL}/highlights/detect/${sourceId}`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Highlight detection failed");
    }
    return res.json();
  },
  getHighlights: async (sourceId: string): Promise<HighlightCandidate[]> => {
    const res = await fetch(`${API_BASE_URL}/highlights/${sourceId}`);
    return res.json();
  },
  updateCandidateStatus: async (candidateId: string, status: string): Promise<HighlightCandidate> => {
    const res = await fetch(`${API_BASE_URL}/highlights/${candidateId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },
  adjustCandidateTimestamps: async (candidateId: string, startTime: number, endTime: number, hook?: string) => {
    const res = await fetch(`${API_BASE_URL}/highlights/${candidateId}/adjust`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_time: startTime, end_time: endTime, hook }),
    });
    return res.json();
  },
  createProjectFromCandidate: async (candidateId: string, presetName: string = "STREAMER_HYPE"): Promise<ClipProject> => {
    const res = await fetch(`${API_BASE_URL}/highlights/${candidateId}/create-project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset_name: presetName }),
    });
    return res.json();
  },

  // Editor Projects
  getProjects: async (): Promise<ClipProject[]> => {
    const res = await fetch(`${API_BASE_URL}/projects`);
    return res.json();
  },
  getProject: async (projectId: string) => {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}`);
    return res.json();
  },
  updateProject: async (projectId: string, data: Partial<ClipProject>): Promise<ClipProject> => {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  duplicateProject: async (projectId: string): Promise<ClipProject> => {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/duplicate`, { method: "POST" });
    return res.json();
  },

  // Rendering
  startRender: async (projectId: string, targetPlatform: string = "youtube_shorts") => {
    const res = await fetch(`${API_BASE_URL}/render/start/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_platform: targetPlatform }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Render failed to start");
    }
    return res.json();
  },
  getRenderJobs: async (): Promise<RenderJob[]> => {
    const res = await fetch(`${API_BASE_URL}/render/jobs`);
    return res.json();
  },
  getExports: async () => {
    const res = await fetch(`${API_BASE_URL}/render/exports`);
    return res.json();
  },

  // Rights
  getRights: async (): Promise<CreatorRights[]> => {
    const res = await fetch(`${API_BASE_URL}/rights`);
    return res.json();
  },
  createRights: async (data: any): Promise<CreatorRights> => {
    const res = await fetch(`${API_BASE_URL}/rights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  verifyRights: async (sourceId: string) => {
    const res = await fetch(`${API_BASE_URL}/rights/verify/${sourceId}`, { method: "POST" });
    return res.json();
  },

  // Publishing
  getPublishingMetadata: async (projectId: string, targetPlatform: string = "youtube_shorts"): Promise<PublishingMetadata> => {
    const res = await fetch(`${API_BASE_URL}/publishing/${projectId}?target_platform=${targetPlatform}`);
    return res.json();
  },
  updatePublishingMetadata: async (projectId: string, data: any): Promise<PublishingMetadata> => {
    const res = await fetch(`${API_BASE_URL}/publishing/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  approvePublishing: async (projectId: string) => {
    const res = await fetch(`${API_BASE_URL}/publishing/${projectId}/approve`, { method: "POST" });
    return res.json();
  },
  executePublish: async (projectId: string) => {
    const res = await fetch(`${API_BASE_URL}/publishing/${projectId}/publish`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Publishing blocked");
    }
    return res.json();
  },

  // Live
  startLiveSession: async (feedName: string, feedUrl: string) => {
    const res = await fetch(`${API_BASE_URL}/live/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feed_name: feedName, feed_url: feedUrl }),
    });
    return res.json();
  },
  getLiveSessions: async () => {
    const res = await fetch(`${API_BASE_URL}/live/sessions`);
    return res.json();
  },
  getLiveSegments: async (sessionId: string) => {
    const res = await fetch(`${API_BASE_URL}/live/sessions/${sessionId}/segments`);
    return res.json();
  },
  clipLiveSegment: async (sessionId: string, startSec: number, endSec: number, title: string) => {
    const res = await fetch(`${API_BASE_URL}/live/sessions/${sessionId}/clip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_sec: startSec, end_sec: endSec, title }),
    });
    return res.json();
  },
  stopLiveSession: async (sessionId: string) => {
    const res = await fetch(`${API_BASE_URL}/live/sessions/${sessionId}/stop`, {
      method: "POST",
    });
    return res.json();
  },

  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE_URL}/settings`);
    return res.json();
  },
  updateWeights: async (weights: any) => {
    const res = await fetch(`${API_BASE_URL}/settings/weights`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(weights),
    });
    return res.json();
  },
};
