"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus, Search, Filter, MoreHorizontal, Edit, Copy, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TemplateVariable = {
  name: string;
  type: "text" | "number" | "date" | "custom";
  defaultValue: string;
  required: boolean;
};

type Template = {
  id: string;
  name: string;
  content: string;
  variables: TemplateVariable[];
  isActive: boolean;
  usage: number;
  successRate: number;
  createdAt: string;
  updatedAt: string;
};

export default function TemplatesPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/login");
    }
  }, [isLoaded, router, user]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/templates");
        const data = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) throw new Error(data?.error || `Failed to load templates (HTTP ${res.status})`);
        if (cancelled) return;
        setTemplates(Array.isArray(data?.templates) ? data.templates : []);
      } catch (e: any) {
        if (!cancelled) window.alert(e?.message || "Failed to load templates");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [templates, setTemplates] = useState<Template[]>([]);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (statusFilter === "active" && !t.isActive) return false;
      if (statusFilter === "inactive" && t.isActive) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q)
      );
    });
  }, [query, statusFilter, templates]);

  const stats = useMemo(() => {
    return {
      totalTemplates: templates.length,
      activeTemplates: templates.filter((t) => t.isActive).length,
      totalUsage: templates.reduce((sum, t) => sum + t.usage, 0),
      avgSuccessRate: (
        templates.reduce((sum, t) => sum + t.successRate, 0) /
        Math.max(templates.length, 1)
      ).toFixed(1),
    };
  }, [templates]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      window.alert("Copied to clipboard");
    } catch {
      window.alert("Copy failed");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm("Delete this template?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to delete template (HTTP ${res.status})`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e: any) {
      window.alert(e?.message || "Failed to delete template");
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
              <Link href="/templates" className="text-purple-600 font-medium">Templates</Link>
              <Link href="/leads" className="text-gray-600 hover:text-gray-900">Leads</Link>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Message Templates</h1>
            <p className="text-gray-600">Create and manage reusable message templates</p>
          </div>
          <Link 
            href="/templates/new"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>New Template</span>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="h-8 w-8 text-purple-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalTemplates}</h3>
            <p className="text-gray-600">Total Templates</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Plus className="h-8 w-8 text-green-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.activeTemplates}</h3>
            <p className="text-gray-600">Active Templates</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalUsage.toLocaleString()}</h3>
            <p className="text-gray-600">Total Usage</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="h-8 w-8 text-orange-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.avgSuccessRate}%</h3>
            <p className="text-gray-600">Avg Success Rate</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
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
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-700">Status</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        template.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {template.variables.length} variables
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => router.push(`/templates/${template.id}`)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(template.content)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {template.content}
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-gray-500">Usage:</span>
                      <span className="ml-1 font-medium text-gray-900">{template.usage}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Success:</span>
                      <span className="ml-1 font-medium text-green-600">{template.successRate}%</span>
                    </div>
                  </div>
                  <Link href={`/templates/${template.id}`} className="text-purple-600 hover:text-purple-700 font-medium">
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {templates.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-500 mb-6">Create your first message template to get started</p>
            <Link 
              href="/templates/new"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create Template</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
