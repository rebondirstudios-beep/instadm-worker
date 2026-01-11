"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus, Search, Filter, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CampaignStatus = "active" | "completed" | "paused" | "draft";
type Campaign = {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  messageTemplateId: string | null;
  targetCriteria: any;
  createdAt: string;
  updatedAt: string;
  stats: {
    messagesSent: number;
    messagesDelivered: number;
    messagesRead: number;
    successRate: number;
  };
};

export default function CampaignsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/login");
    }
  }, [isLoaded, router, user]);

  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignStatus>("all");
  const [menuCampaignId, setMenuCampaignId] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/campaigns");
        const data = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) throw new Error(data?.error || `Failed to load campaigns (HTTP ${res.status})`);
        if (cancelled) return;
        setCampaigns(Array.isArray(data?.campaigns) ? data.campaigns : []);
      } catch (e: any) {
        if (!cancelled) window.alert(e?.message || "Failed to load campaigns");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCampaigns = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [campaigns, query, statusFilter]);

  const handleDelete = async (id: string) => {
    const ok = window.confirm("Delete this campaign?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to delete campaign (HTTP ${res.status})`);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      setMenuCampaignId(null);
    } catch (e: any) {
      window.alert(e?.message || "Failed to delete campaign");
    }
  };

  const handleDuplicate = async (id: string) => {
    const original = campaigns.find((c) => c.id === id);
    if (!original) return;

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${original.name} (Copy)`,
          description: original.description,
          status: "draft",
          messageTemplateId: original.messageTemplateId,
          targetCriteria: original.targetCriteria,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to duplicate campaign (HTTP ${res.status})`);

      if (data?.campaign) {
        setCampaigns((prev) => [data.campaign, ...prev]);
      }
      setMenuCampaignId(null);
    } catch (e: any) {
      window.alert(e?.message || "Failed to duplicate campaign");
    }
  };

  const handleTogglePaused = async (id: string) => {
    const current = campaigns.find((c) => c.id === id);
    if (!current) return;
    if (current.status !== "active" && current.status !== "paused") return;

    const nextStatus = current.status === "active" ? "paused" : "active";

    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to update campaign (HTTP ${res.status})`);

      setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c)));
      setMenuCampaignId(null);
    } catch (e: any) {
      window.alert(e?.message || "Failed to update campaign");
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaigns</h1>
            <p className="text-gray-600">Manage your Instagram DM campaigns</p>
          </div>
          <Link 
            href="/campaigns/new"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>New Campaign</span>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
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
            <span>Filter</span>
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-700">Status</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        )}

        {/* Campaigns Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Messages Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {campaign.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {campaign.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.stats.messagesSent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">{campaign.stats.successRate}%</div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${campaign.stats.successRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2 relative">
                        <Link 
                          href={`/campaigns/${campaign.id}`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            setMenuCampaignId((prev) => (prev === campaign.id ? null : campaign.id))
                          }
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {menuCampaignId === campaign.id && (
                          <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-gray-200 bg-white shadow-md">
                            <button
                              type="button"
                              onClick={() => router.push(`/campaigns/${campaign.id}`)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(campaign.id)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePaused(campaign.id)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              disabled={campaign.status === "completed" || campaign.status === "draft"}
                            >
                              {campaign.status === "active" ? "Pause" : "Resume"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(campaign.id)}
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

        {/* Empty State */}
        {campaigns.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first campaign</p>
            <Link 
              href="/campaigns/new"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create Campaign</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
