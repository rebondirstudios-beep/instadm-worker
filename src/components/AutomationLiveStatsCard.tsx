"use client";

import { useEffect, useMemo, useState } from "react";

type LiveStats = {
  pending: number;
  sentToday: number;
  failedToday: number;
  lastSentAt: string | null;
  lastSentTo: string | null;
  serverTime: string;
};

function formatTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function AutomationLiveStatsCard() {
  const [data, setData] = useState<LiveStats | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const lastUpdated = useMemo(() => formatTime(data?.serverTime ?? null), [data?.serverTime]);

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/automation/live-stats", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) throw new Error(json?.error || `Request failed (HTTP ${res.status})`);
        if (!mounted) return;
        setData(json as LiveStats);
        setError("");
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load live stats");
      } finally {
        if (!mounted) return;
        setIsLoading(false);
      }
    };

    fetchStats();
    const id = window.setInterval(fetchStats, 5000);

    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Pending Messages</span>
          <span className="text-lg font-semibold text-orange-600">…</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Sent Today</span>
          <span className="text-lg font-semibold text-green-600">…</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Failed Today</span>
          <span className="text-lg font-semibold text-red-600">…</span>
        </div>
        <div className="text-xs text-gray-400">Updating…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="text-sm text-red-600">{error}</div>
        <div className="mt-2 text-xs text-gray-500">Auto-retrying every 5 seconds</div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Pending Messages</span>
          <span className="text-lg font-semibold text-orange-600">{data?.pending ?? 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Sent Today</span>
          <span className="text-lg font-semibold text-green-600">{data?.sentToday ?? 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Failed Today</span>
          <span className="text-lg font-semibold text-red-600">{data?.failedToday ?? 0}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">Last update: {lastUpdated}</div>
        <div className="mt-1 text-xs text-gray-500">
          Last sent: {formatTime(data?.lastSentAt ?? null)}
          {data?.lastSentTo ? ` → @${data.lastSentTo}` : ""}
        </div>
      </div>
    </div>
  );
}
