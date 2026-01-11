"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { MessageSquare, Users, Search, Filter, Download, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  username: string;
  fullName: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isBusinessAccount: boolean;
  profilePicUrl: string;
  lastScraped: string;
  source: string;
  metadata: {
    engagementRate: number;
    avgLikes: number;
    avgComments: number;
  };
};

export default function LeadsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/login");
    }
  }, [isLoaded, router, user]);

  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [onlyBusiness, setOnlyBusiness] = useState(false);
  const [minFollowers, setMinFollowers] = useState<number | "">("");
  const [maxFollowers, setMaxFollowers] = useState<number | "">("");
  const [menuLeadId, setMenuLeadId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);

  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const verifiedAccounts = leads.filter((l) => l.isVerified).length;
    const avgEngagementRate =
      leads.length === 0
        ? 0
        : Number(
            (
              leads.reduce((sum, l) => sum + (l.metadata?.engagementRate ?? 0), 0) /
              leads.length
            ).toFixed(1)
          );
    return {
      totalLeads,
      newLeadsToday: 0,
      avgEngagementRate,
      verifiedAccounts,
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (onlyVerified && !lead.isVerified) return false;
      if (onlyBusiness && !lead.isBusinessAccount) return false;
      if (minFollowers !== "" && lead.followerCount < minFollowers) return false;
      if (maxFollowers !== "" && lead.followerCount > maxFollowers) return false;
      if (!q) return true;
      return (
        lead.username.toLowerCase().includes(q) ||
        lead.fullName.toLowerCase().includes(q) ||
        lead.bio.toLowerCase().includes(q)
      );
    });
  }, [leads, maxFollowers, minFollowers, onlyBusiness, onlyVerified, query]);

  const downloadCsv = (filename: string, rows: Array<Record<string, any>>) => {
    const headerSet = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((k) => headerSet.add(k));
    });
    const headers = Array.from(headerSet);
    const escape = (value: any) => {
      const s = String(value ?? "");
      if (s.includes(",") || s.includes("\n") || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    downloadCsv(
      "leads.csv",
      filteredLeads.map((l) => ({
        username: l.username,
        fullName: l.fullName,
        followerCount: l.followerCount,
        followingCount: l.followingCount,
        postsCount: l.postsCount,
        isVerified: l.isVerified,
        isBusinessAccount: l.isBusinessAccount,
        engagementRate: l.metadata.engagementRate,
        source: l.source,
        lastScraped: l.lastScraped,
      }))
    );
  };

  const handleContact = (lead: Lead) => {
    window.open(`https://instagram.com/${lead.username}`, "_blank");
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      window.alert("Copied to clipboard");
    } catch {
      window.alert("Copy failed");
    }
  };

  const handleDeleteLead = (leadId: string) => {
    const ok = window.confirm("Remove this lead from the list?");
    if (!ok) return;
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setMenuLeadId(null);
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      window.alert("Load more is not implemented yet. Connect a real backend/integration first.");
    } finally {
      setIsLoadingMore(false);
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
              <Link href="/accounts" className="text-gray-600 hover:text-gray-900">Accounts</Link>
              <Link href="/templates" className="text-gray-600 hover:text-gray-900">Templates</Link>
              <Link href="/leads" className="text-purple-600 font-medium">Leads</Link>
              <Link href="/leads/lists" className="text-gray-600 hover:text-gray-900">Lead Lists</Link>
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
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Lead Generation</h1>
            <p className="text-gray-600">Discover and manage potential customers</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
            >
              <Download className="h-5 w-5 text-gray-700" />
              <span>Export</span>
            </button>
            <Link
              href="/leads/discover"
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
            >
              <Sparkles className="h-5 w-5 text-gray-700" />
              <span>Discover (AI)</span>
            </Link>
            <Link 
              href="/leads/new"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Find Leads</span>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-purple-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalLeads.toLocaleString()}</h3>
            <p className="text-gray-600">Total Leads</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Plus className="h-8 w-8 text-green-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.newLeadsToday}</h3>
            <p className="text-gray-600">New Today</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.avgEngagementRate}%</h3>
            <p className="text-gray-600">Avg Engagement</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-orange-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.verifiedAccounts}</h3>
            <p className="text-gray-600">Verified Accounts</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads by username or bio..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={onlyVerified}
                  onChange={(e) => setOnlyVerified(e.target.checked)}
                />
                <span>Verified only</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={onlyBusiness}
                  onChange={(e) => setOnlyBusiness(e.target.checked)}
                />
                <span>Business only</span>
              </label>
              <input
                type="number"
                placeholder="Min followers"
                value={minFollowers}
                onChange={(e) => setMinFollowers(e.target.value ? Number(e.target.value) : "")}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                placeholder="Max followers"
                value={maxFollowers}
                onChange={(e) => setMaxFollowers(e.target.value ? Number(e.target.value) : "")}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Leads Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start space-x-4 mb-4">
                  <img
                    src={lead.profilePicUrl}
                    alt={lead.username}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">@{lead.username}</h3>
                      {lead.isVerified && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 font-medium truncate">{lead.fullName}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{lead.bio}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{(lead.followerCount / 1000).toFixed(1)}K</div>
                    <div className="text-xs text-gray-600">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{lead.metadata.engagementRate}%</div>
                    <div className="text-xs text-gray-600">Engagement</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{lead.postsCount}</div>
                    <div className="text-xs text-gray-600">Posts</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Source:</span>
                    <span className="text-xs font-medium text-purple-600">{lead.source}</span>
                  </div>
                  <div className="flex items-center space-x-2 relative">
                    <button
                      type="button"
                      onClick={() => handleContact(lead)}
                      className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                    >
                      Contact
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenuLeadId((prev) => (prev === lead.id ? null : lead.id))}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    {menuLeadId === lead.id && (
                      <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-gray-200 bg-white shadow-md">
                        <button
                          type="button"
                          onClick={() => window.open(`https://instagram.com/${lead.username}`, "_blank")}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          Open Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(`@${lead.username}`)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          Copy Username
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead.id)}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoadingMore ? "Loading..." : "Load More Leads"}
          </button>
        </div>
      </main>
    </div>
  );
}
