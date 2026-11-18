import React, { useState, useEffect } from "react";
import { Settings, Sliders, CheckCircle2, ShieldCheck, Cpu, Database } from "lucide-react";
import { api } from "../services/api";

export const SettingsView: React.FC = () => {
  const [config, setConfig] = useState<any | null>(null);
  const [weights, setWeights] = useState({
    hook: 0.25,
    emotion: 0.25,
    entertainment: 0.20,
    context: 0.20,
    editing_potential: 0.10,
  });
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        setConfig(data);
        if (data.scoring_weights) {
          setWeights(data.scoring_weights);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
  }, []);

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveWeights = async () => {
    try {
      await api.updateWeights(weights);
      setSavedMsg("Viral scoring weights saved dynamically!");
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err) {
      setSavedMsg("Failed to save weights.");
    }
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-6 h-6 text-brand-400" />
          <h1 className="text-xl font-black text-white">System Settings & Viral Scoring Engine</h1>
        </div>
        <p className="text-xs text-slate-400">
          Configure AI highlight detection weights, classification threshold tiers, faster-whisper parameters, and engine paths.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {savedMsg}
        </div>
      )}

      {/* 5-Pillar Scoring Weights */}
      <div className="p-6 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-5">
        <div className="flex items-center justify-between border-b border-[#171e2e] pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-400" /> 5-Pillar Viral Scoring Weights
          </h3>
          <span className="text-xs font-mono text-cyan-400">
            Total Sum: {(totalWeight * 100).toFixed(0)}%
          </span>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-300">Hook Strength Weight</span>
              <span className="font-mono text-amber-400">{(weights.hook * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={weights.hook}
              onChange={(e) => handleWeightChange("hook", parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-300">Emotional Intensity Weight</span>
              <span className="font-mono text-red-400">{(weights.emotion * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={weights.emotion}
              onChange={(e) => handleWeightChange("emotion", parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-300">Entertainment Value Weight</span>
              <span className="font-mono text-brand-400">{(weights.entertainment * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={weights.entertainment}
              onChange={(e) => handleWeightChange("entertainment", parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-300">Context & Payoff Weight</span>
              <span className="font-mono text-cyan-400">{(weights.context * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={weights.context}
              onChange={(e) => handleWeightChange("context", parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-300">Editing Pacing Potential Weight</span>
              <span className="font-mono text-emerald-400">{(weights.editing_potential * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={weights.editing_potential}
              onChange={(e) => handleWeightChange("editing_potential", parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSaveWeights}
            className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand/30"
          >
            Save Weight Calibration
          </button>
        </div>
      </div>

      {/* Classification Tiers Display */}
      <div className="p-6 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Viral Candidate Score Tiers
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <div className="font-bold">90 – 100</div>
            <div className="text-[10px] text-slate-400 uppercase mt-1">Priority Review</div>
          </div>
          <div className="p-3 rounded-xl bg-brand/10 border border-brand/30 text-brand-400">
            <div className="font-bold">75 – 89</div>
            <div className="text-[10px] text-slate-400 uppercase mt-1">Strong Candidate</div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <div className="font-bold">60 – 74</div>
            <div className="text-[10px] text-slate-400 uppercase mt-1">Possible Candidate</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700 text-slate-400">
            <div className="font-bold">&lt; 60</div>
            <div className="text-[10px] text-slate-500 uppercase mt-1">Low Priority</div>
          </div>
        </div>
      </div>

      {/* Engine & Environment Paths */}
      <div className="p-6 rounded-2xl bg-[#0c0f17] border border-[#171e2e] space-y-3 text-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-400" /> Active Video Processing Binaries
        </h3>
        <div className="space-y-2 font-mono text-[11px] text-slate-400 bg-[#111622] p-4 rounded-xl border border-[#232d42]">
          <div>FFmpeg: <span className="text-white break-all">{config?.ffmpeg_bin}</span></div>
          <div>FFprobe: <span className="text-white break-all">{config?.ffprobe_bin}</span></div>
          <div>Whisper Model: <span className="text-cyan-400">{config?.whisper_model}</span> ({config?.whisper_device})</div>
          <div>LLM Integration: <span className="text-emerald-400">{config?.llm_provider}</span></div>
        </div>
      </div>
    </div>
  );
};
