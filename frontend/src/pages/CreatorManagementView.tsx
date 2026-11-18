import React, { useState, useEffect } from "react";
import { ShieldCheck, Plus, CheckCircle2, XCircle, AlertTriangle, UserCheck } from "lucide-react";
import { api, CreatorRights } from "../services/api";

export const CreatorManagementView: React.FC = () => {
  const [rightsList, setRightsList] = useState<CreatorRights[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [creatorName, setCreatorName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [authType, setAuthType] = useState("streamer_partnership");
  const [musicStatus, setMusicStatus] = useState("royalty_free");
  const [distRights, setDistRights] = useState(true);
  const [monetRights, setMonetRights] = useState(true);
  const [notes, setNotes] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadRights = async () => {
    try {
      const data = await api.getRights();
      setRightsList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRights();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorName.trim()) return;

    try {
      const rec = await api.createRights({
        creator_name: creatorName.trim(),
        channel_id: channelId.trim() || undefined,
        authorization_type: authType,
        music_license_status: musicStatus,
        distribution_rights: distRights,
        monetization_rights: monetRights,
        notes: notes.trim() || undefined,
      });
      setRightsList([rec, ...rightsList.filter((r) => r.id !== rec.id)]);
      setShowAddForm(false);
      setCreatorName("");
      setStatusMsg("Creator license registered successfully.");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-brand-400" />
            <h1 className="text-xl font-black text-white">Creator Rights & Licensing Ledger</h1>
          </div>
          <p className="text-xs text-slate-400">
            Governance, streamer authorizations, music licenses, and commercial distribution rights.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-brand/30"
        >
          <Plus className="w-4 h-4" /> Add Creator Agreement
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
          {statusMsg}
        </div>
      )}

      {/* Add Agreement Form Modal/Collapse */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="p-6 rounded-2xl bg-[#0c0f17] border border-[#232d42] space-y-4 animate-in fade-in">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Register New Creator License</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Creator / Streamer Name</label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g. Tarik, Pokimane, Shroud"
                className="w-full px-3.5 py-2.5 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Channel ID / Handle</label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="e.g. @tarik or UC..."
                className="w-full px-3.5 py-2.5 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Authorization Agreement Type</label>
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white"
              >
                <option value="streamer_partnership">Streamer Partnership (Revenue Share)</option>
                <option value="direct_license">Direct Written License</option>
                <option value="self_owned">Original Content (Self-Owned)</option>
                <option value="fair_use_commentary">Fair Use Commentary / Transformative</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Audio / Music Clearance</label>
              <select
                value={musicStatus}
                onChange={(e) => setMusicStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white"
              >
                <option value="royalty_free">Royalty-Free Streamer Audio Only</option>
                <option value="cleared">Commercial Music Cleared</option>
                <option value="platform_audio_library">Platform Shorts Audio Library Only</option>
                <option value="unauthorized">Unauthorized (Mute background audio)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={distRights}
                onChange={(e) => setDistRights(e.target.checked)}
                className="w-4 h-4 accent-brand"
              />
              Distribution Rights Granted (YouTube Shorts & IG Reels)
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={monetRights}
                onChange={(e) => setMonetRights(e.target.checked)}
                className="w-4 h-4 accent-brand"
              />
              Monetization Rights Cleared
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">License Notes / Terms</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Agreement renewed annually, credit required in description"
              className="w-full px-3.5 py-2 bg-[#111622] border border-[#232d42] rounded-xl text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-[#111622] text-slate-400 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand/30"
            >
              Save Agreement
            </button>
          </div>
        </form>
      )}

      {/* Ledger Table */}
      <div className="rounded-2xl bg-[#0c0f17] border border-[#171e2e] overflow-hidden">
        <div className="p-4 border-b border-[#171e2e] flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>Active Creator Authorizations ({rightsList.length})</span>
          <span>Compliance Enforcement: Active</span>
        </div>

        {rightsList.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No creator agreements recorded. Add an agreement above.
          </div>
        ) : (
          <div className="divide-y divide-[#171e2e]">
            {rightsList.map((r) => (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-sm">{r.creator_name}</span>
                    {r.channel_id && <span className="text-[11px] font-mono text-slate-400">{r.channel_id}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span className="capitalize text-brand-400">{r.authorization_type.replace(/_/g, " ")}</span>
                    <span>•</span>
                    <span>Music: <strong className="text-cyan-400">{r.music_license_status}</strong></span>
                    {r.notes && <span>• {r.notes}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {r.distribution_rights ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Distribution Cleared
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 font-semibold">
                        <XCircle className="w-3.5 h-3.5" /> No Distribution
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    {r.monetization_rights ? (
                      <span className="text-amber-400 font-semibold">Monetization: Yes</span>
                    ) : (
                      <span className="text-slate-500">Monetization: No</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
