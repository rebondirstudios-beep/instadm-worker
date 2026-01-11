"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageSquare, Search, Copy, Plus, Download } from "lucide-react";

export default function LeadDiscoveryPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/login");
    }
  }, [isLoaded, router, user]);

  const [prompt, setPrompt] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [isSearching, setIsSearching] = useState(false);
  const [usernames, setUsernames] = useState<string[]>([]);
  const [raw, setRaw] = useState("");
  const [warning, setWarning] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [listName, setListName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const usernamesText = useMemo(() => usernames.join("\n"), [usernames]);

  const handleDownload = () => {
    const csv = "username\n" + usernames.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      window.alert("Copied to clipboard");
    } catch {
      window.alert("Copy failed");
    }
  };

  const handleCopyForGoogleSheets = async () => {
    const column = usernames.map(u => `@${u}`).join('\n');
    try {
      await navigator.clipboard.writeText(column);
      window.alert("Copied for Google Sheets (paste into a column)");
    } catch {
      window.alert("Copy failed");
    }
  };

  const handleSearch = async () => {
    const q = prompt.trim();
    if (!q) return;

    setIsSearching(true);
    try {
      const res = await fetch("/api/perplexity/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q, maxResults }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Search failed (HTTP ${res.status})`);

      setUsernames(Array.isArray(data?.usernames) ? data.usernames : []);
      setRaw(typeof data?.raw === "string" ? data.raw : "");
      setWarning(typeof data?.warning === "string" ? data.warning : "");
    } catch (e: any) {
      window.alert(e?.message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleVerify = async () => {
    if (!usernames.length) return;
    setIsVerifying(true);
    try {
      const res = await fetch("/api/perplexity/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialUsernames: usernames, verify: true, maxResults }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Verification failed (HTTP ${res.status})`);

      const verified = Array.isArray(data?.usernames) ? data.usernames : [];
      setUsernames(verified);
      setWarning(typeof data?.warning === "string" ? data.warning : "");
      window.alert(`Verification complete. ${verified.length} of ${usernames.length} usernames are valid.`);
    } catch (e: any) {
      window.alert(e?.message || "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    const name = listName.trim();
    if (!name) {
      window.alert("List name is required");
      return;
    }
    if (!usernames.length) {
      window.alert("No usernames to save");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/lead-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, usernames }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Save failed (HTTP ${res.status})`);

      window.alert(`Saved list "${name}"`);
      setListName("");
      setShowSaveDialog(false);
    } catch (e: any) {
      // Fallback: save to localStorage
      const savedLists = JSON.parse(localStorage.getItem("leadLists") || "[]");
      const exists = savedLists.find((l: any) => l.name === name);
      if (exists) {
        window.alert("A list with this name already exists (saved locally)");
      } else {
        savedLists.push({ id: Date.now().toString(), name, usernames, createdAt: new Date().toISOString() });
        localStorage.setItem("leadLists", JSON.stringify(savedLists));
        window.alert(`Saved list "${name}" locally (server error: ${e?.message})`);
        setListName("");
        setShowSaveDialog(false);
      }
    } finally {
      setIsSaving(false);
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
              <Link href="/campaigns" className="text-gray-600 hover:text-gray-900">Campaigns</Link>
              <Link href="/accounts" className="text-gray-600 hover:text-gray-900">Accounts</Link>
              <Link href="/templates" className="text-gray-600 hover:text-gray-900">Templates</Link>
              <Link href="/leads" className="text-purple-600 font-medium">Leads</Link>
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

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/leads" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Leads</span>
          </Link>

          <Link
            href="/campaigns/new"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create Campaign</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Discover Leads (AI)</h1>
          <p className="text-gray-600 mt-1">
            Describe your ideal leads and get a list of Instagram usernames.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search prompt</label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g. Instagram usernames of architects in Bangalore (usernames only)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max results</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxResults}
                onChange={(e) => setMaxResults(Math.max(1, Math.min(100, Number(e.target.value) || 20)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />

              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearching || !prompt.trim()}
                className="mt-4 w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Search className="h-5 w-5" />
                <span>{isSearching ? "Searching..." : "Find Usernames"}</span>
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Usernames</h2>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying || usernames.length === 0}
                    className="text-purple-600 hover:text-purple-900 text-sm flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" />
                    <span>{isVerifying ? "Verifying..." : "Verify"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveDialog(true)}
                    disabled={usernames.length === 0}
                    className="text-purple-600 hover:text-purple-900 text-sm flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Save to List</span>
                  </button>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleCopyForGoogleSheets}
                      disabled={usernames.length === 0}
                      className="text-purple-600 hover:text-purple-900 text-sm flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copy to Google Sheets</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(usernamesText)}
                      className="text-purple-600 hover:text-purple-900 text-sm flex items-center space-x-2"
                      disabled={usernames.length === 0}
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copy all</span>
                    </button>
                  </div>
                </div>
              </div>
              <textarea
                rows={12}
                readOnly
                value={usernamesText}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder="Usernames will appear here"
              />
              {warning ? <p className="text-xs text-amber-700 mt-2">{warning}</p> : null}
              <p className="text-xs text-gray-500 mt-2">
                Tip: paste this into a Campaign's "Brand usernames" box, then Save → Queue.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Raw output</h2>
                <button
                  type="button"
                  onClick={() => handleCopy(raw)}
                  className="text-gray-600 hover:text-gray-900 text-sm flex items-center space-x-2"
                  disabled={!raw}
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </button>
              </div>
              <textarea
                rows={12}
                readOnly
                value={raw}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder="Perplexity response will appear here"
              />
            </div>
          </div>
        </div>
      </main>

      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save to List</h3>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="List name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !listName.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
