"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { MessageSquare, Users, Plus, Shield, Settings, MoreHorizontal, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AccountStatus = "connected" | "disconnected" | "error";
type InstagramAccountRow = {
  id: string;
  username: string;
  isActive: boolean;
  lastLogin: string;
  proxy: string | null;
  status: AccountStatus;
  stats: {
    messagesSent: number;
    successRate: number;
    dailyLimit: number;
    dailyUsed: number;
  };
  createdAt: string;
};

export default function AccountsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/login");
    }
  }, [isLoaded, router, user]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [settingsAccount, setSettingsAccount] = useState<InstagramAccountRow | null>(null);
  const [settingsPassword, setSettingsPassword] = useState("");
  const [settingsShowPassword, setSettingsShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [accounts, setAccounts] = useState<InstagramAccountRow[]>([]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/accounts");
        const data = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) throw new Error(data?.error || `Failed to load accounts (HTTP ${res.status})`);
        if (cancelled) return;
        setAccounts(Array.isArray(data?.accounts) ? data.accounts : []);
      } catch (e: any) {
        if (!cancelled) window.alert(e?.message || "Failed to load accounts");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'disconnected':
        return 'bg-red-100 text-red-800';
      case 'error':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = useMemo(() => {
    return {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter(a => a.isActive).length,
      connectedAccounts: accounts.filter(a => a.status === 'connected').length,
      totalMessagesToday: accounts.reduce((sum, a) => sum + a.stats.dailyUsed, 0),
    };
  }, [accounts]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      window.alert("Copied to clipboard");
    } catch {
      window.alert("Copy failed");
    }
  };

  const handleDelete = async (accountId: string) => {
    const ok = window.confirm("Delete this account?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/accounts/${accountId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to delete account (HTTP ${res.status})`);

      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      setOpenMenuId(null);
      if (settingsAccount?.id === accountId) setSettingsAccount(null);
    } catch (e: any) {
      window.alert(e?.message || "Failed to delete account");
    }
  };

  const handleToggleActive = async (accountId: string) => {
    const current = accounts.find((a) => a.id === accountId);
    if (!current) return;

    const nextIsActive = !current.isActive;

    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to update account (HTTP ${res.status})`);

      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, isActive: nextIsActive } : a)));
      setOpenMenuId(null);
      if (settingsAccount?.id === accountId) {
        setSettingsAccount({ ...settingsAccount, isActive: nextIsActive });
      }
    } catch (e: any) {
      window.alert(e?.message || "Failed to update account");
    }
  };

  const handleTest = async (accountId: string) => {
    setTestingId(accountId);
    try {
      const account = accounts.find((a) => a.id === accountId);
      if (account?.username) {
        window.open(`https://www.instagram.com/${account.username}/`, "_blank");
      }
    } finally {
      setTestingId(null);
    }
  };

  const handleSavePassword = async () => {
    if (!settingsAccount) return;
    const pwd = settingsPassword;
    if (!pwd) {
      window.alert("Enter a password first");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/accounts/${settingsAccount.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to save password (HTTP ${res.status})`);
      window.alert("Password saved");
      setSettingsPassword("");
    } catch (e: any) {
      window.alert(e?.message || "Failed to save password");
    } finally {
      setSavingPassword(false);
    }
  };

  if (!isLoaded) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
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
              <Link href="/accounts" className="text-purple-600 font-medium">Accounts</Link>
              <Link href="/templates" className="text-gray-600 hover:text-gray-900">Templates</Link>
              <Link href="/leads" className="text-gray-600 hover:text-gray-900">Leads</Link>
              <Link href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase()}
                </div>
                <span className="text-gray-700">{user.firstName || user.emailAddresses?.[0]?.emailAddress}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Instagram Accounts</h1>
            <p className="text-gray-600">Manage your Instagram accounts and proxy settings</p>
          </div>
          <Link 
            href="/accounts/new"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Account</span>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-purple-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalAccounts}</h3>
            <p className="text-gray-600">Total Accounts</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.activeAccounts}</h3>
            <p className="text-gray-600">Active Accounts</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.connectedAccounts}</h3>
            <p className="text-gray-600">Connected</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="h-8 w-8 text-orange-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalMessagesToday}</h3>
            <p className="text-gray-600">Messages Today</p>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Daily Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proxy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-semibold">
                            {account.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            @{account.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            {account.stats.messagesSent.toLocaleString()} total messages
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(account.status)}
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(account.status)}`}>
                          {account.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="text-sm text-gray-900">
                            {account.stats.dailyUsed} / {account.stats.dailyLimit}
                          </div>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${
                                (account.stats.dailyUsed / account.stats.dailyLimit) > 0.8 
                                  ? 'bg-red-600' 
                                  : (account.stats.dailyUsed / account.stats.dailyLimit) > 0.6 
                                  ? 'bg-yellow-600' 
                                  : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min((account.stats.dailyUsed / account.stats.dailyLimit) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">{account.stats.successRate}%</div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${account.stats.successRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.proxy || 'No proxy'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.lastLogin ? new Date(account.lastLogin).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2 relative">
                        <button
                          type="button"
                          disabled={testingId === account.id}
                          onClick={() => handleTest(account.id)}
                          className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                        >
                          {testingId === account.id ? "Testing..." : "Test"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsAccount(account);
                            setSettingsPassword("");
                            setSettingsShowPassword(false);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((prev) => (prev === account.id ? null : account.id))}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {openMenuId === account.id && (
                          <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-gray-200 bg-white shadow-md">
                            <button
                              type="button"
                              onClick={() => window.open(`https://instagram.com/${account.username}`, "_blank")}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Open Instagram Profile
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(`@${account.username}`)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Copy Username
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(account.id)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              {account.isActive ? "Disable" : "Enable"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(account.id)}
                              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {settingsAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => {
                setSettingsAccount(null);
                setSettingsPassword("");
                setSettingsShowPassword(false);
              }}
            />
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsAccount(null);
                    setSettingsPassword("");
                    setSettingsShowPassword(false);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div>
                  <span className="text-gray-500">Username:</span> @{settingsAccount.username}
                </div>
                <div>
                  <span className="text-gray-500">Status:</span> {settingsAccount.status}
                </div>
                <div>
                  <span className="text-gray-500">Active:</span> {settingsAccount.isActive ? "Yes" : "No"}
                </div>
                <div>
                  <span className="text-gray-500">Proxy:</span> {settingsAccount.proxy || "No proxy"}
                </div>
                <div>
                  <span className="text-gray-500">Daily Limit:</span> {settingsAccount.stats.dailyLimit}
                </div>
                <div>
                  <span className="text-gray-500">Daily Used:</span> {settingsAccount.stats.dailyUsed}
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="text-sm font-medium text-gray-900 mb-2">Instagram Password (for Playwright)</div>
                <div className="flex items-center space-x-2">
                  <input
                    type={settingsShowPassword ? "text" : "password"}
                    value={settingsPassword}
                    onChange={(e) => setSettingsPassword(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setSettingsShowPassword((v) => !v)}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {settingsShowPassword ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    disabled={savingPassword}
                    onClick={handleSavePassword}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {savingPassword ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => handleTest(settingsAccount.id)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(settingsAccount.id)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {settingsAccount.isActive ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {accounts.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Instagram accounts yet</h3>
            <p className="text-gray-500 mb-6">Add your first Instagram account to get started</p>
            <Link 
              href="/accounts/new"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add Account</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
