"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { MessageSquare, Play, Pause, Square, Activity, Clock, Send, AlertCircle, Settings } from "lucide-react";
import Link from "next/link";

type Campaign = {
  id: string;
  name: string;
  status: string;
};

type Account = {
  id: string;
  username: string;
  isActive: boolean;
  dailyLimit: number;
};

type AutomationStatus = {
  isRunning: boolean;
  lastRun?: string;
  nextRun?: string;
  processed: number;
  sent: number;
  failed: number;
};

export default function AutomationPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [automationStatus, setAutomationStatus] = useState<Record<string, AutomationStatus>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [outboxCounts, setOutboxCounts] = useState<{ pending: number; sent: number; failed: number; total: number } | null>(null);

  const [senderMode, setSenderMode] = useState<"simulated" | "playwright">("simulated");
  const [playwrightHeadless, setPlaywrightHeadless] = useState(false);

  const [logs, setLogs] = useState<Array<{ ts: string; level: "info" | "warn" | "error"; message: string }>>([]);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const stopFlagsRef = useRef<Record<string, boolean>>({});
  const timersRef = useRef<Record<string, number | null>>({});
  const autoQueueAttemptsRef = useRef<Record<string, number>>({});

  const appendLog = (level: "info" | "warn" | "error", message: string) => {
    const ts = new Date().toISOString();
    setLogs((prev) => {
      const next = [...prev, { ts, level, message }];
      return next.length > 500 ? next.slice(next.length - 500) : next;
    });
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  useEffect(() => {
    if (senderMode === "playwright") {
      setPlaywrightHeadless(false);
    }
  }, [senderMode]);
  
  // Humanization settings
  const [humanizationEnabled, setHumanizationEnabled] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [humanConfig, setHumanConfig] = useState({
    minDelay: 45000,
    maxDelay: 300000,
    typingDelay: 3000,
    readDelay: 15000,
    sessionRotation: true,
    messageVariation: true,
    warmupTime: 600000,
    activeHours: { start: 9, end: 21 },
  });

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchData = async () => {
      try {
        const [campaignsRes, accountsRes] = await Promise.all([
          fetch("/api/campaigns"),
          fetch("/api/accounts"),
        ]);

        const [campaignsData, accountsData] = await Promise.all([
          campaignsRes.json(),
          accountsRes.json(),
        ]);

        setCampaigns(campaignsData.campaigns || []);
        setAccounts(
          (Array.isArray(accountsData.accounts) ? accountsData.accounts : []).map((a: any) => ({
            id: a.id,
            username: a.username,
            isActive: Boolean(a.isActive),
            dailyLimit: Number(a?.stats?.dailyLimit ?? a?.dailyLimit ?? 50),
          }))
        );
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, [isLoaded, user]);

  const refreshOutboxCounts = async (campaignId: string, accountId: string) => {
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/messages?instagramAccountId=${encodeURIComponent(accountId)}`
      );
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to load outbox (HTTP ${res.status})`);

      const messages = Array.isArray(data?.messages) ? data.messages : [];
      let pending = 0;
      let sent = 0;
      let failed = 0;
      for (const m of messages) {
        const s = String((m as any)?.status || "").toLowerCase();
        if (s === "pending") pending++;
        else if (s === "sent") sent++;
        else if (s === "failed") failed++;
      }
      const counts = { pending, sent, failed, total: messages.length };
      setOutboxCounts(counts);
      return counts;
    } catch {
      setOutboxCounts(null);
      return null;
    }
  };

  useEffect(() => {
    if (!selectedCampaign || !selectedAccount) {
      setOutboxCounts(null);
      return;
    }
    void refreshOutboxCounts(selectedCampaign, selectedAccount);
  }, [selectedCampaign, selectedAccount]);

  const startAutomation = async (campaignId: string, accountId: string) => {
    const statusKey = `${campaignId}-${accountId}`;
    if (timersRef.current[statusKey] !== undefined && timersRef.current[statusKey] !== null) return;

    appendLog("info", `Start requested for campaign=${campaignId} account=${accountId}`);
    appendLog("info", `Sender mode=${senderMode}${senderMode === "playwright" ? ` headless=${playwrightHeadless}` : ""}`);

    stopFlagsRef.current[statusKey] = false;
    autoQueueAttemptsRef.current[statusKey] = 0;
    // Sentinel value so repeated clicks don't spawn multiple loops
    timersRef.current[statusKey] = 0;
    setIsLoading(true);
    setAutomationStatus((prev) => ({
      ...prev,
      [statusKey]: {
        isRunning: true,
        lastRun: new Date().toISOString(),
        nextRun: undefined,
        processed: prev[statusKey]?.processed || 0,
        sent: prev[statusKey]?.sent || 0,
        failed: prev[statusKey]?.failed || 0,
      },
    }));

    const step = async () => {
      if (stopFlagsRef.current[statusKey]) {
        timersRef.current[statusKey] = null;
        appendLog("warn", `Stopped (flag) for campaign=${campaignId} account=${accountId}`);
        return;
      }

      try {
        const res = await fetch("/api/automation/send-messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            instagramAccountId: accountId,
            maxToProcess: 1,
            skipDelay: true,
            senderMode,
            headless: playwrightHeadless,
          }),
        });

        const data = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) {
          if (res.status === 429) {
            appendLog("warn", String(data?.error || "Daily limit reached"));
            stopFlagsRef.current[statusKey] = true;
            if (timersRef.current[statusKey]) {
              window.clearTimeout(timersRef.current[statusKey] as number);
            }
            timersRef.current[statusKey] = null;
            setAutomationStatus((prev) => ({
              ...prev,
              [statusKey]: {
                ...(prev[statusKey] || { processed: 0, sent: 0, failed: 0 }),
                isRunning: false,
                nextRun: undefined,
                lastRun: new Date().toISOString(),
              },
            }));
            const counts = await refreshOutboxCounts(campaignId, accountId);
            if (counts) {
              appendLog(
                "info",
                `Outbox: pending=${counts.pending} sent=${counts.sent} failed=${counts.failed}`
              );
            }
            alert(data?.error || "Daily limit reached");
            return;
          }
          throw new Error(data?.error || `HTTP ${res.status}`);
        }

        if (data?.message === "No pending messages to send" || (data?.processed ?? 0) === 0) {
          appendLog("info", "No pending messages to send");

          const attempts = autoQueueAttemptsRef.current[statusKey] || 0;
          if (attempts < 1) {
            autoQueueAttemptsRef.current[statusKey] = attempts + 1;
            appendLog("info", "Outbox empty: auto-queueing more usernames...");

            const qRes = await fetch(`/api/campaigns/${campaignId}/queue`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ instagramAccountId: accountId, limit: 50 }),
            });
            const qData = (await qRes.json().catch(() => ({}))) as any;
            const queued = typeof qData?.queued === "number" ? qData.queued : 0;

            if (qRes.ok && queued > 0) {
              appendLog("info", `Auto-queued ${queued} messages. Continuing...`);
              const counts = await refreshOutboxCounts(campaignId, accountId);
              if (counts) {
                appendLog(
                  "info",
                  `Outbox: pending=${counts.pending} sent=${counts.sent} failed=${counts.failed}`
                );
              }

              // Immediately continue (do not wait for humanization delay right after queueing)
              setAutomationStatus((prev) => ({
                ...prev,
                [statusKey]: {
                  ...(prev[statusKey] || { processed: 0, sent: 0, failed: 0 }),
                  isRunning: true,
                  nextRun: new Date().toISOString(),
                },
              }));
              appendLog("info", "Next step in 0s");
              timersRef.current[statusKey] = window.setTimeout(() => {
                void step();
              }, 0);
              return;
            } else {
              const msg = String(qData?.error || "No new usernames to queue");
              const diag =
                typeof qData?.leadCount === "number" || typeof qData?.alreadyUsedInCampaign === "number" || typeof qData?.availableToday === "number"
                  ? ` (leadCount=${qData?.leadCount ?? "?"} usedInCampaign=${qData?.alreadyUsedInCampaign ?? "?"} availableToday=${qData?.availableToday ?? "?"})`
                  : "";
              appendLog("warn", `${msg}${diag}`);
              stopFlagsRef.current[statusKey] = true;
              if (timersRef.current[statusKey]) {
                window.clearTimeout(timersRef.current[statusKey] as number);
              }
              timersRef.current[statusKey] = null;
              setAutomationStatus((prev) => ({
                ...prev,
                [statusKey]: {
                  ...(prev[statusKey] || { processed: 0, sent: 0, failed: 0 }),
                  isRunning: false,
                  nextRun: undefined,
                  lastRun: new Date().toISOString(),
                },
              }));
              const counts = await refreshOutboxCounts(campaignId, accountId);
              if (counts) {
                appendLog(
                  "info",
                  `Outbox: pending=${counts.pending} sent=${counts.sent} failed=${counts.failed}`
                );
              }
              return;
            }
          } else {
            stopFlagsRef.current[statusKey] = true;
            if (timersRef.current[statusKey]) {
              window.clearTimeout(timersRef.current[statusKey] as number);
            }
            timersRef.current[statusKey] = null;
            setAutomationStatus((prev) => ({
              ...prev,
              [statusKey]: {
                ...(prev[statusKey] || { processed: 0, sent: 0, failed: 0 }),
                isRunning: false,
                nextRun: undefined,
                lastRun: new Date().toISOString(),
              },
            }));
            const counts = await refreshOutboxCounts(campaignId, accountId);
            if (counts) {
              appendLog(
                "info",
                `Outbox: pending=${counts.pending} sent=${counts.sent} failed=${counts.failed}`
              );
            }
            return;
          }
        }

        const attemptUser = typeof data?.attemptRecipientUsername === "string" ? data.attemptRecipientUsername : data?.lastRecipientUsername;
        const attemptOutcome = typeof data?.attemptOutcome === "string" ? data.attemptOutcome : null;
        const attemptMs = typeof data?.attemptMs === "number" ? data.attemptMs : null;
        const modeStr = data?.mode ? ` mode=${String(data.mode)}` : "";
        const hard = data?.hardFailure === true;
        const lastErr = typeof data?.attemptError === "string" && data.attemptError.length
          ? data.attemptError
          : typeof data?.lastError === "string"
            ? data.lastError
            : "";

        appendLog(
          "info",
          `Step: processed=${data?.processed || 0} sent=${data?.sent || 0} failed=${data?.failed || 0}` +
            (attemptUser ? ` recipient=@${attemptUser}` : "") +
            (attemptOutcome ? ` outcome=${attemptOutcome}` : "") +
            (attemptMs !== null ? ` time=${Math.round(attemptMs)}ms` : "") +
            (hard ? " hard_failure=true" : "") +
            modeStr
        );

        if ((data?.failed ?? 0) > 0 && lastErr) {
          appendLog(hard ? "error" : "warn", `${hard ? "Hard" : "Soft"} failure: ${lastErr}`);
        }

        const debugTrace = Array.isArray(data?.attemptDebugTrace) ? (data.attemptDebugTrace as string[]) : null;
        const screenshotPath = typeof data?.attemptScreenshotPath === "string" ? data.attemptScreenshotPath : "";
        if (debugTrace && debugTrace.length) {
          appendLog("info", `Playwright trace (last ${debugTrace.length}):`);
          for (const line of debugTrace.slice(-15)) {
            appendLog("info", `  ${line}`);
          }
        }
        if (screenshotPath) {
          appendLog("info", `Playwright screenshot: ${screenshotPath}`);
        }

        setAutomationStatus((prev) => ({
          ...prev,
          [statusKey]: {
            ...(prev[statusKey] || { processed: 0, sent: 0, failed: 0 }),
            isRunning: true,
            lastRun: new Date().toISOString(),
            processed: (prev[statusKey]?.processed || 0) + (data?.processed || 0),
            sent: (prev[statusKey]?.sent || 0) + (data?.sent || 0),
            failed: (prev[statusKey]?.failed || 0) + (data?.failed || 0),
          },
        }));

        const counts = await refreshOutboxCounts(campaignId, accountId);
        if (counts) {
          appendLog(
            "info",
            `Outbox: pending=${counts.pending} sent=${counts.sent} failed=${counts.failed}`
          );
        }

        const isTrueHard = lastErr && (
          lastErr.includes("Instagram requires verification") ||
          lastErr.includes("Login failed") ||
          lastErr.includes("step=login_form") ||
          lastErr.includes("Executable doesn't exist") ||
          lastErr.includes("Playwright is not available") ||
          lastErr.includes("Cannot find module 'playwright'") ||
          lastErr.includes("browserType.launch")
        );
        const shouldStop = (data?.mode === "playwright" || senderMode === "playwright") && data?.hardFailure === true && isTrueHard;

        if (shouldStop) {
          stopFlagsRef.current[statusKey] = true;
          if (timersRef.current[statusKey]) {
            window.clearTimeout(timersRef.current[statusKey] as number);
          }
          timersRef.current[statusKey] = null;
          setAutomationStatus((prev) => ({
            ...prev,
            [statusKey]: {
              ...(prev[statusKey] || { processed: 0, sent: 0, failed: 0 }),
              isRunning: false,
              nextRun: undefined,
              lastRun: new Date().toISOString(),
            },
          }));
          appendLog("warn", "Stopped: hard Playwright failure (login/verification/browser). Fix it and restart.");
          return;
        }

        if ((data?.mode === "playwright" || senderMode === "playwright") && (data?.failed ?? 0) > 0 && !shouldStop) {
          appendLog("info", "Continuing: soft failure, moving to next pending username.");
        }
      } catch (e) {
        appendLog("error", e instanceof Error ? e.message : "Automation failed");
        stopFlagsRef.current[statusKey] = true;
        if (timersRef.current[statusKey]) {
          window.clearTimeout(timersRef.current[statusKey] as number);
        }
        timersRef.current[statusKey] = null;
        setAutomationStatus((prev) => ({
          ...prev,
          [statusKey]: {
            ...(prev[statusKey] || { processed: 0, sent: 0, failed: 0 }),
            isRunning: false,
            nextRun: undefined,
            lastRun: new Date().toISOString(),
          },
        }));
        return;
      }

      const delay = humanizationEnabled
        ? Math.floor(Math.random() * (humanConfig.maxDelay - humanConfig.minDelay + 1)) + humanConfig.minDelay
        : 0;
      const next = delay ? new Date(Date.now() + delay).toISOString() : undefined;
      appendLog("info", `Next step in ${Math.round(delay / 1000)}s`);
      setAutomationStatus((prev) => ({
        ...prev,
        [statusKey]: {
          ...(prev[statusKey] || { processed: 0, sent: 0, failed: 0 }),
          isRunning: true,
          nextRun: next,
        },
      }));

      timersRef.current[statusKey] = window.setTimeout(() => {
        void step();
      }, delay);
    };

    setIsLoading(false);
    void step();
  };

  const queueMessages = async (campaignId: string, accountId: string) => {
    try {
      appendLog("info", `Queue requested for campaign=${campaignId} account=${accountId}`);
      const res = await fetch(`/api/campaigns/${campaignId}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramAccountId: accountId, limit: 50 }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to queue (HTTP ${res.status})`);
      appendLog("info", `Queued ${data?.queued ?? 0} messages`);
      alert(`Queued ${data?.queued ?? 0} messages`);
      const counts = await refreshOutboxCounts(campaignId, accountId);
      if (counts) {
        appendLog(
          "info",
          `Outbox: pending=${counts.pending} sent=${counts.sent} failed=${counts.failed}`
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to queue messages";
      if (typeof msg === "string" && msg.startsWith("No new usernames to queue")) {
        appendLog("warn", msg);
      } else {
        appendLog("error", msg);
      }
      alert(e instanceof Error ? e.message : "Failed to queue messages");
    }
  };

  const stopAutomation = async (campaignId: string, accountId: string) => {
    try {
      const statusKey = `${campaignId}-${accountId}`;
      appendLog("warn", `Stop requested for campaign=${campaignId} account=${accountId}`);
      stopFlagsRef.current[statusKey] = true;
      if (timersRef.current[statusKey]) {
        window.clearTimeout(timersRef.current[statusKey] as number);
        timersRef.current[statusKey] = null;
      }
      setAutomationStatus(prev => ({
        ...prev,
        [`${campaignId}-${accountId}`]: {
          ...prev[`${campaignId}-${accountId}`],
          isRunning: false,
          nextRun: undefined,
        },
      }));
    } catch (error) {
      console.error("Stop automation error:", error);
      appendLog("error", "Stop automation error");
    }
  };

  const checkAutomationStatus = async (campaignId: string, accountId: string) => {
    try {
      const response = await fetch(
        `/api/automation/status?campaignId=${campaignId}&instagramAccountId=${accountId}`
      );
      const result = await response.json();

      if (response.ok) {
        setAutomationStatus(prev => ({
          ...prev,
          [`${campaignId}-${accountId}`]: {
            isRunning: prev[`${campaignId}-${accountId}`]?.isRunning || false,
            processed: result.statistics?.total || 0,
            sent: result.statistics?.sent || 0,
            failed: result.statistics?.failed || 0,
          },
        }));
      }
    } catch (error) {
      console.error("Status check error:", error);
    }
  };

  if (!isLoaded) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <MessageSquare className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900">Rebondir Studios</span>
            </Link>
            
            <div className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link href="/campaigns" className="text-gray-600 hover:text-gray-900">Campaigns</Link>
              <Link href="/accounts" className="text-gray-600 hover:text-gray-900">Accounts</Link>
              <Link href="/automation" className="text-purple-600 font-medium">Automation</Link>
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Message Automation</h1>
          <p className="text-gray-600">Configure and monitor automated message sending for your campaigns.</p>
        </div>

        {/* Setup Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Configuration Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
              <Settings className="h-5 w-5 text-purple-600" />
              <span>Configuration</span>
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign</label>
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                >
                  <option value="">Choose a campaign...</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instagram Account</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                >
                  <option value="">Choose an account...</option>
                  {accounts.filter(a => a.isActive).map(account => (
                    <option key={account.id} value={account.id}>
                      @{account.username} (Limit: {account.dailyLimit}/day)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Send Mode Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
              <Send className="h-5 w-5 text-purple-600" />
              <span>Send Mode</span>
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                  <input
                    type="radio"
                    name="senderMode"
                    checked={senderMode === "simulated"}
                    onChange={() => setSenderMode("simulated")}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Simulated (DB only)</div>
                    <div className="text-sm text-gray-500">For testing; no real DMs sent</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                  <input
                    type="radio"
                    name="senderMode"
                    checked={senderMode === "playwright"}
                    onChange={() => setSenderMode("playwright")}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Playwright (Real DM)</div>
                    <div className="text-sm text-gray-500">Sends actual Instagram DMs</div>
                  </div>
                </label>
              </div>

              {senderMode === "playwright" && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={playwrightHeadless}
                      onChange={(e) => setPlaywrightHeadless(e.target.checked)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                    />
                    <span>Headless mode</span>
                  </label>
                  <div className="text-xs text-gray-500 mt-1">
                    Turn off for 2FA/verification prompts
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Humanization Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <span>Humanization</span>
            </h2>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={humanizationEnabled}
                  onChange={(e) => setHumanizationEnabled(e.target.checked)}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                />
                <span>Enable humanization</span>
              </label>
              
              {humanizationEnabled && (
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Min delay:</span>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={Math.round(humanConfig.minDelay / 1000)}
                      onChange={(e) => setHumanConfig(prev => ({ ...prev, minDelay: Number(e.target.value) * 1000 }))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded"
                    />
                    <span>seconds</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max delay:</span>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={Math.round(humanConfig.maxDelay / 1000)}
                      onChange={(e) => setHumanConfig(prev => ({ ...prev, maxDelay: Number(e.target.value) * 1000 }))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded"
                    />
                    <span>seconds</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Start Automation</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedCampaign && selectedAccount
                  ? "Ready to start with selected campaign and account"
                  : "Select a campaign and account above"}
              </p>
            </div>
            <button
              onClick={() => {
                if (selectedCampaign && selectedAccount) {
                  startAutomation(selectedCampaign, selectedAccount);
                } else {
                  alert("Please select a campaign and Instagram account");
                }
              }}
              disabled={!selectedCampaign || !selectedAccount || isLoading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin"></div>
                  <span>Starting...</span>
                </div>
              ) : (
                "Start Automation"
              )}
            </button>
          </div>
        </div>

        {/* Active Automations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <span>Active Automations</span>
            </h2>
          </div>
          
          <div className="p-6">
            {Object.keys(automationStatus).length === 0 ? (
              <div className="text-center py-8">
                <Square className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No automations running</p>
                <p className="text-gray-400 text-sm mt-2">Configure and start an automation above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(automationStatus).map(([key, status]) => {
                  const [campaignId, accountId] = key.split("-");
                  const campaign = campaigns.find(c => c.id === campaignId);
                  const account = accounts.find(a => a.id === accountId);
                  
                  if (!campaign || !account) return null;
                  
                  return (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                          <p className="text-sm text-gray-500">via @{account.username}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {status.isRunning ? (
                            <>
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-sm text-green-600 font-medium">Running</span>
                              <button
                                onClick={() => stopAutomation(campaignId, accountId)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                <Pause className="h-4 w-4 inline" />
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                              <span className="text-sm text-gray-600 font-medium">Stopped</span>
                              <button
                                onClick={() => selectedCampaign === campaignId && selectedAccount === accountId && startAutomation(campaignId, accountId)}
                                className="text-green-600 hover:text-green-700 text-sm"
                              >
                                <Play className="h-4 w-4 inline" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-gray-500">Processed</div>
                          <div className="font-semibold text-gray-900">{status.processed}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500">Sent</div>
                          <div className="font-semibold text-green-600">{status.sent}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500">Failed</div>
                          <div className="font-semibold text-red-600">{status.failed}</div>
                        </div>
                      </div>
                      
                      {status.lastRun && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs text-gray-500">
                            Last run: {new Date(status.lastRun).toLocaleString()}
                          </div>
                          {status.nextRun && (
                            <div className="text-xs text-gray-500 mt-1">
                              Next run: {new Date(status.nextRun).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <span>Automation Logs</span>
            </h2>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setLogs([])}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={async () => {
                  const text = logs
                    .map((l) => `${l.ts} [${l.level.toUpperCase()}] ${l.message}`)
                    .join("\n");
                  try {
                    await navigator.clipboard.writeText(text);
                    appendLog("info", "Copied logs to clipboard");
                  } catch {
                    appendLog("error", "Failed to copy logs");
                  }
                }}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click Queue or Start Automation to begin.</div>
            ) : (
              logs.map((l, idx) => (
                <div
                  key={idx}
                  className={
                    l.level === "error"
                      ? "text-red-700"
                      : l.level === "warn"
                        ? "text-amber-700"
                        : "text-gray-900"
                  }
                >
                  {l.ts} [{l.level.toUpperCase()}] {l.message}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Settings className="h-5 w-5 text-purple-600" />
            <span>Humanization Settings</span>
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={humanizationEnabled}
                  onChange={(e) => setHumanizationEnabled(e.target.checked)}
                  className="h-4 w-4 text-purple-600"
                />
                <span className="text-sm font-medium text-gray-700">Enable Humanization</span>
              </label>

              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-purple-600 hover:text-purple-700 text-sm"
              >
                {showAdvancedSettings ? "Hide" : "Show"} Advanced
              </button>
            </div>

            {showAdvancedSettings && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Advanced Configuration</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Delay (seconds)</label>
                    <input
                      type="number"
                      value={Math.round(humanConfig.minDelay / 1000)}
                      onChange={(e) =>
                        setHumanConfig((prev) => ({
                          ...prev,
                          minDelay: parseInt(e.target.value || "0", 10) * 1000,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min="30"
                      max="300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Delay (seconds)</label>
                    <input
                      type="number"
                      value={Math.round(humanConfig.maxDelay / 1000)}
                      onChange={(e) =>
                        setHumanConfig((prev) => ({
                          ...prev,
                          maxDelay: parseInt(e.target.value || "0", 10) * 1000,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min="60"
                      max="600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Typing Simulation (seconds)</label>
                    <input
                      type="number"
                      value={Math.round(humanConfig.typingDelay / 1000)}
                      onChange={(e) =>
                        setHumanConfig((prev) => ({
                          ...prev,
                          typingDelay: parseInt(e.target.value || "0", 10) * 1000,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min="0"
                      max="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Read Delay (seconds)</label>
                    <input
                      type="number"
                      value={Math.round(humanConfig.readDelay / 1000)}
                      onChange={(e) =>
                        setHumanConfig((prev) => ({
                          ...prev,
                          readDelay: parseInt(e.target.value || "0", 10) * 1000,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min="5"
                      max="60"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Warmup Time (minutes)</label>
                    <input
                      type="number"
                      value={Math.round(humanConfig.warmupTime / 60000)}
                      onChange={(e) =>
                        setHumanConfig((prev) => ({
                          ...prev,
                          warmupTime: parseInt(e.target.value || "0", 10) * 60000,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min="0"
                      max="30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Active Hours</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={humanConfig.activeHours.start}
                        onChange={(e) =>
                          setHumanConfig((prev) => ({
                            ...prev,
                            activeHours: {
                              ...prev.activeHours,
                              start: parseInt(e.target.value || "0", 10),
                            },
                          }))
                        }
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                        min="0"
                        max="23"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="number"
                        value={humanConfig.activeHours.end}
                        onChange={(e) =>
                          setHumanConfig((prev) => ({
                            ...prev,
                            activeHours: {
                              ...prev.activeHours,
                              end: parseInt(e.target.value || "0", 10),
                            },
                          }))
                        }
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                        min="0"
                        max="23"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center space-x-6">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={humanConfig.sessionRotation}
                        onChange={(e) => setHumanConfig((prev) => ({ ...prev, sessionRotation: e.target.checked }))}
                        className="h-4 w-4 text-purple-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Session Rotation</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={humanConfig.messageVariation}
                        onChange={(e) => setHumanConfig((prev) => ({ ...prev, messageVariation: e.target.checked }))}
                        className="h-4 w-4 text-purple-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Message Variation</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
