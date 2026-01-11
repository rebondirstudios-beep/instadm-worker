"use client";

import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { MessageSquare, ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CampaignStatus = "active" | "completed" | "paused" | "draft";

type Campaign = {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  messageTemplateId: string | null;
  targetCriteria: any;
  schedule?: any;
  settings?: any;
  createdAt: string;
  updatedAt: string;
  stats: {
    messagesSent: number;
    messagesDelivered: number;
    messagesRead: number;
    successRate: number;
  };
};

type AccountRow = {
  id: string;
  username: string;
  isActive: boolean;
  stats: {
    dailyLimit: number;
    dailyUsed: number;
  };
};

type OutboxMessage = {
  id: string;
  instagramAccountId: string;
  recipientUsername: string;
  content: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  error: string | null;
};

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoaded } = useUser();

  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leadsText, setLeadsText] = useState("");

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [outbox, setOutbox] = useState<OutboxMessage[]>([]);
  const [isQueuing, setIsQueuing] = useState(false);
  const [isRefreshingOutbox, setIsRefreshingOutbox] = useState(false);

  const [isSessionRunning, setIsSessionRunning] = useState(false);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionError, setSessionError] = useState<string>("");
  const [isSessionExpanded, setIsSessionExpanded] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const igWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/login");
    }
  }, [isLoaded, router, user]);

  const idParam = params?.id;
  const campaignId = Array.isArray(idParam) ? idParam[0] : idParam;

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (!campaignId) return;

    let cancelled = false;

    (async () => {
      setIsFetching(true);
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`);
        const data = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) throw new Error(data?.error || `Failed to load campaign (HTTP ${res.status})`);
        if (cancelled) return;

        const c = (data?.campaign ?? null) as Campaign | null;
        setCampaign(c);

        const stored = (c as any)?.settings?.leadUsernames;
        if (Array.isArray(stored)) {
          setLeadsText(stored.join("\n"));
        } else {
          setLeadsText("");
        }
      } catch (e: any) {
        if (!cancelled) window.alert(e?.message || "Failed to load campaign");
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId, isLoaded, user]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/accounts");
        const data = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) throw new Error(data?.error || `Failed to load accounts (HTTP ${res.status})`);
        if (cancelled) return;
        const rows: AccountRow[] = Array.isArray(data?.accounts) ? data.accounts : [];
        setAccounts(rows);
        if (!selectedAccountId && rows[0]?.id) setSelectedAccountId(rows[0].id);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, selectedAccountId]);

  const refreshOutbox = useCallback(async () => {
    if (!campaignId) return;
    if (!selectedAccountId) return;

    setIsRefreshingOutbox(true);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/messages?instagramAccountId=${encodeURIComponent(selectedAccountId)}`
      );
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to load outbox (HTTP ${res.status})`);
      setOutbox(Array.isArray(data?.messages) ? data.messages : []);
    } catch (e: any) {
      window.alert(e?.message || "Failed to load outbox");
    } finally {
      setIsRefreshingOutbox(false);
    }
  }, [campaignId, selectedAccountId]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (!campaignId) return;
    if (!selectedAccountId) return;
    refreshOutbox();
  }, [campaignId, isLoaded, refreshOutbox, selectedAccountId, user]);

  const playBeep = useCallback(() => {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.03;

      o.connect(g);
      g.connect(ctx.destination);
      o.start();

      setTimeout(() => {
        try {
          o.stop();
          ctx.close();
        } catch {
          // ignore
        }
      }, 90);
    } catch {
      // ignore
    }
  }, [isSoundEnabled]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      window.alert("Copied to clipboard");
    } catch {
      window.alert("Copy failed");
    }
  };

  const handleSend = async (recipientUsername: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      window.alert("Copy failed");
    }

    const dmUrl = `https://ig.me/m/${encodeURIComponent(recipientUsername)}`;
    // Reuse a single Instagram window so you can send 50 DMs without spawning 50 tabs.
    // Keep a reference so we can navigate/focus it reliably.
    try {
      if (igWindowRef.current && !igWindowRef.current.closed) {
        igWindowRef.current.location.href = dmUrl;
        igWindowRef.current.focus();
      } else {
        igWindowRef.current = window.open(dmUrl, "ig_dm");
        if (!igWindowRef.current) window.location.href = dmUrl;
      }
    } catch {
      igWindowRef.current = window.open(dmUrl, "ig_dm");
      if (!igWindowRef.current) window.location.href = dmUrl;
    }
    playBeep();
  };

  const pendingOutbox = useMemo(() => {
    return outbox.filter((m) => m.status !== "sent");
  }, [outbox]);

  const currentSessionMessage = useMemo(() => {
    if (!isSessionRunning) return null;
    return pendingOutbox[sessionIndex] ?? null;
  }, [isSessionRunning, pendingOutbox, sessionIndex]);

  const startSession = async () => {
    setSessionError("");
    if (!selectedAccountId) {
      window.alert("Select an account first");
      return;
    }

    if (outbox.length === 0) {
      window.alert("Queue messages first");
      return;
    }

    const idx = pendingOutbox.findIndex((m) => m.status !== "sent");
    const nextIndex = idx >= 0 ? idx : 0;
    if (!pendingOutbox[nextIndex]) {
      window.alert("No pending messages");
      return;
    }

    setSessionIndex(nextIndex);
    setIsSessionRunning(true);
    await handleSend(pendingOutbox[nextIndex].recipientUsername, pendingOutbox[nextIndex].content);
  };

  const stopSession = () => {
    setIsSessionRunning(false);
    setSessionError("");
    setIsSessionExpanded(false);
  };

  const advanceSession = async (nextIndex: number) => {
    setSessionError("");
    if (!pendingOutbox[nextIndex]) {
      setIsSessionRunning(false);
      return;
    }
    setSessionIndex(nextIndex);
    await handleSend(pendingOutbox[nextIndex].recipientUsername, pendingOutbox[nextIndex].content);
  };

  const markSentAndNext = async () => {
    const m = currentSessionMessage;
    if (!m) return;
    try {
      await updateMessageStatus(m.id, "sent");
      await refreshOutbox();
      await advanceSession(sessionIndex);
    } catch (e: any) {
      setSessionError(e?.message || "Failed to mark sent");
    }
  };

  const skipNext = async () => {
    await advanceSession(sessionIndex + 1);
  };

  useEffect(() => {
    if (!isSessionRunning) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        stopSession();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        void markSentAndNext();
        return;
      }

      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        void markSentAndNext();
        return;
      }

      if (e.code === "Space") {
        const m = currentSessionMessage;
        if (!m) return;
        e.preventDefault();
        void handleSend(m.recipientUsername, m.content);
        return;
      }

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        void skipNext();
        return;
      }

      if (e.key.toLowerCase() === "o") {
        const m = currentSessionMessage;
        if (!m) return;
        e.preventDefault();
        void handleSend(m.recipientUsername, m.content);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentSessionMessage, isSessionRunning, markSentAndNext, skipNext]);

  const handleQueue = async () => {
    if (!campaignId) return;
    if (!selectedAccountId) {
      window.alert("Select an account first");
      return;
    }

    setIsQueuing(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramAccountId: selectedAccountId, limit: 50 }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to queue (HTTP ${res.status})`);
      await refreshOutbox();
    } catch (e: any) {
      window.alert(e?.message || "Failed to queue messages");
    } finally {
      setIsQueuing(false);
    }
  };

  const handleQueueAll = async () => {
    if (!campaignId) return;
    if (!selectedAccountId) {
      window.alert("Select an account first");
      return;
    }
    const usernames = (campaign?.settings as any)?.leadUsernames || [];
    if (!usernames.length) {
      window.alert("No lead usernames to queue");
      return;
    }

    setIsQueuing(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramAccountId: selectedAccountId, usernames }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to queue all (HTTP ${res.status})`);
      await refreshOutbox();
    } catch (e: any) {
      window.alert(e?.message || "Failed to queue all messages");
    } finally {
      setIsQueuing(false);
    }
  };

  const updateMessageStatus = async (messageId: string, status: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to update message (HTTP ${res.status})`);
      setOutbox((prev) => prev.map((m) => (m.id === messageId ? { ...m, status } : m)));
    } catch (e: any) {
      window.alert(e?.message || "Failed to update message");
    }
  };

  const handleDeleteUsername = (usernameToDelete: string) => {
    const updated = parsedLeads.filter(u => u !== usernameToDelete);
    setLeadsText(updated.join('\n'));
  };

  const parsedLeads = useMemo(() => {
    const lines = leadsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith("@") ? s.slice(1) : s));

    const uniq: string[] = [];
    const seen = new Set<string>();
    for (const l of lines) {
      const key = l.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(l);
    }
    return uniq;
  }, [leadsText]);

  const canSave = useMemo(() => {
    if (!campaign) return false;
    if (!campaign.name.trim()) return false;
    return true;
  }, [campaign]);

  const handleSave = async () => {
    if (!campaign) return;

    setIsSaving(true);
    try {
      const nextSettings = {
        ...(campaign.settings ?? {}),
        leadUsernames: parsedLeads,
      };

      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          settings: nextSettings,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to save campaign (HTTP ${res.status})`);

      const c = (data?.campaign ?? null) as Campaign | null;
      setCampaign(c);
      window.alert("Saved");
    } catch (e: any) {
      window.alert(e?.message || "Failed to save campaign");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;
    const ok = window.confirm("Delete this campaign?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to delete campaign (HTTP ${res.status})`);
      router.push("/campaigns");
    } catch (e: any) {
      window.alert(e?.message || "Failed to delete campaign");
    }
  };

  if (!isLoaded) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <MessageSquare className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900">Rebondir Studios</span>
            </Link>

            <div className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link href="/campaigns" className="text-purple-600 font-medium">Campaigns</Link>
              <Link href="/accounts" className="text-gray-600 hover:text-gray-900">Accounts</Link>
              <Link href="/templates" className="text-gray-600 hover:text-gray-900">Templates</Link>
              <Link href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0]?.toUpperCase()}
                </div>
                <span className="text-gray-700">{user.firstName || user.emailAddresses[0]?.emailAddress}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/campaigns" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Campaigns</span>
          </Link>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 rounded-lg border border-gray-300 text-red-600 hover:bg-red-50 flex items-center space-x-2"
              disabled={!campaign}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              disabled={!campaign || isSaving || !canSave}
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save"}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {isFetching && !campaign ? (
            <div className="text-gray-600">Loading...</div>
          ) : !campaign ? (
            <div className="text-gray-600">Campaign not found.</div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={campaign.name}
                    onChange={(e) => setCampaign((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={campaign.status}
                    onChange={(e) => setCampaign((prev) => (prev ? { ...prev, status: e.target.value as any } : prev))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="completed">completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  rows={3}
                  value={campaign.description}
                  onChange={(e) => setCampaign((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Brand usernames</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{parsedLeads.length} usernames</span>
                    {parsedLeads.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setLeadsText('')}
                        className="text-xs text-red-600 hover:text-red-700 transition-colors"
                      >
                        Delete All
                      </button>
                    )}
                  </div>
                </div>
                <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 min-h-[240px] max-h-[240px] overflow-y-auto">
                  {parsedLeads.length === 0 ? (
                    <div className="text-gray-400 text-sm">No usernames added yet.</div>
                  ) : (
                    <div className="space-y-1">
                      {parsedLeads.map((username) => (
                        <div key={username} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-100 transition-colors">
                          <span className="text-sm text-gray-900">@{username}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteUsername(username)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Delete username"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <textarea
                  rows={1}
                  value={leadsText}
                  onChange={(e) => setLeadsText(e.target.value)}
                  className="sr-only"
                  aria-label="Raw usernames input"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Paste usernames here, save, then use the Outbox below to send manually on Instagram Web in Chrome.
              </p>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Outbox</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={startSession}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      disabled={!selectedAccountId || outbox.length === 0}
                    >
                      Start Session
                    </button>
                    <button
                      type="button"
                      onClick={refreshOutbox}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      disabled={!selectedAccountId || isRefreshingOutbox}
                    >
                      {isRefreshingOutbox ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  Use <span className="font-medium">Copy + Open</span> to copy the DM and open the Instagram message window.
                  Then paste + send manually in Instagram Web, and click <span className="font-medium">Mark Sent</span> here.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sending Account</label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select account...</option>
                      {accounts
                        .filter((a) => a.isActive)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            @{a.username} ({a.stats.dailyUsed}/{a.stats.dailyLimit} today)
                          </option>
                        ))}
                    </select>
                    {accounts.length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        No accounts yet. Add one on the Accounts page.
                      </p>
                    )}
                  </div>

                  <div className="flex items-end space-x-2">
                    <button
                      type="button"
                      onClick={handleQueue}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      disabled={!selectedAccountId || isQueuing}
                    >
                      {isQueuing ? "Queuing..." : "Queue Up To 50"}
                    </button>
                    <button
                      type="button"
                      onClick={handleQueueAll}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      disabled={!selectedAccountId || isQueuing}
                    >
                      {isQueuing ? "Queuing..." : "Queue All"}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {outbox.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">@{m.recipientUsername}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{m.status}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="max-w-md line-clamp-2">{m.content}</div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm">
                              <div className="flex items-center justify-end space-x-3">
                                <button
                                  type="button"
                                  className="text-purple-600 hover:text-purple-900"
                                  onClick={() => handleCopy(m.content)}
                                >
                                  Copy
                                </button>
                                <button
                                  type="button"
                                  className="text-blue-600 hover:text-blue-800"
                                  onClick={() => handleSend(m.recipientUsername, m.content)}
                                >
                                  Copy + Open
                                </button>
                                <button
                                  type="button"
                                  className="text-green-600 hover:text-green-800"
                                  onClick={() => updateMessageStatus(m.id, "sent")}
                                  disabled={m.status === "sent"}
                                >
                                  Mark Sent
                                </button>
                                <button
                                  type="button"
                                  className="text-red-600 hover:text-red-800"
                                  onClick={() => updateMessageStatus(m.id, "failed")}
                                >
                                  Fail
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {outbox.length === 0 && (
                    <div className="p-6 text-sm text-gray-500">
                      No messages queued for this account yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-500">
                <div>Created: {new Date(campaign.createdAt).toLocaleString()}</div>
                <div>Updated: {new Date(campaign.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>

        {isSessionRunning && currentSessionMessage && (
          <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)]">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">Sending session</div>
                    <div className="font-semibold text-gray-900 truncate">
                      @{currentSessionMessage.recipientUsername}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {sessionIndex + 1}/{pendingOutbox.length} pending
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsSoundEnabled((v) => !v)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {isSoundEnabled ? "Sound: On" : "Sound: Off"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSessionExpanded((v) => !v)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {isSessionExpanded ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={stopSession}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Stop
                    </button>
                  </div>
                </div>

                {isSessionExpanded && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-700 mb-2">Message</div>
                    <div className="whitespace-pre-wrap text-sm text-gray-800 border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-48 overflow-auto">
                      {currentSessionMessage.content}
                    </div>
                    {sessionError && <div className="text-sm text-red-600 mt-2">{sessionError}</div>}
                    <div className="text-[11px] text-gray-500 mt-2">
                      Shortcuts: Enter/S = Sent & Next, N = Next, O/Space = Copy + Open, Esc = Stop
                    </div>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSend(currentSessionMessage.recipientUsername, currentSessionMessage.content)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Copy + Open
                  </button>
                  <button
                    type="button"
                    onClick={skipNext}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    onClick={markSentAndNext}
                    className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Sent & Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
