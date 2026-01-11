"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageSquare, Download, Trash2, Plus } from "lucide-react";

type LeadList = {
  id: string;
  name: string;
  usernames: string[];
  createdAt: string;
  updatedAt: string;
};

export default function LeadListsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/login");
    }
  }, [isLoaded, router, user]);

  const [lists, setLists] = useState<LeadList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const res = await fetch("/api/lead-lists");
        const data = (await res.json().catch(() => ({}))) as any;
        setLists(Array.isArray(data?.lists) ? data.lists : []);
      } catch (e) {
        console.error("Failed to fetch lists", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLists();
  }, []);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      window.alert("Copied to clipboard");
    } catch {
      window.alert("Copy failed");
    }
  };

  const handleDownload = (list: LeadList) => {
    const csv = "username\n" + list.usernames.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${list.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_leads.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm("Delete this list?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/lead-lists/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setLists((prev) => prev.filter((l) => l.id !== id));
    } catch (e: any) {
      window.alert(e?.message || "Delete failed");
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
            href="/leads/discover"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Discover (AI)</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Lead Lists</h1>
          <p className="text-gray-600 mt-1">Reusable lead buckets for campaigns</p>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading lists...</p>
            </div>
          ) : lists.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No lists yet. Go to Discover (AI) to create one.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {lists.map((list) => (
                <div key={list.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{list.name}</h3>
                      <p className="text-sm text-gray-600">
                        {list.usernames.length} usernames • Created {new Date(list.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(list.usernames.join("\n"))}
                        className="text-purple-600 hover:text-purple-700 text-sm"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(list)}
                        className="text-purple-600 hover:text-purple-700 text-sm"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(list.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
