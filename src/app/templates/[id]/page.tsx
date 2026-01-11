"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageSquare, Save, Trash2 } from "lucide-react";

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
  createdAt: string;
  updatedAt: string;
};

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = String((params as any)?.id || "");

  const { user, isLoaded } = useUser();

  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/login");
    }
  }, [isLoaded, router, user]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (!templateId) return;

    let cancelled = false;

    (async () => {
      setIsFetching(true);
      try {
        const res = await fetch(`/api/templates/${templateId}`);
        const data = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) throw new Error(data?.error || `Failed to load template (HTTP ${res.status})`);
        if (cancelled) return;
        setTemplate(data?.template ?? null);
      } catch (e: any) {
        if (!cancelled) window.alert(e?.message || "Failed to load template");
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, templateId]);

  const canSave = useMemo(() => {
    if (!template) return false;
    if (!template.name.trim()) return false;
    if (!template.content.trim()) return false;
    return true;
  }, [template]);

  const handleSave = async () => {
    if (!template) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          content: template.content,
          isActive: template.isActive,
          variables: template.variables,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to save template (HTTP ${res.status})`);

      setTemplate(data?.template ?? template);
      window.alert("Saved");
    } catch (e: any) {
      window.alert(e?.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    const ok = window.confirm("Delete this template?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Failed to delete template (HTTP ${res.status})`);
      router.push("/templates");
    } catch (e: any) {
      window.alert(e?.message || "Failed to delete template");
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

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/templates" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Templates</span>
          </Link>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 rounded-lg border border-gray-300 text-red-600 hover:bg-red-50 flex items-center space-x-2"
              disabled={!template}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              disabled={!template || isSaving || !canSave}
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save"}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {isFetching && !template ? (
            <div className="text-gray-600">Loading...</div>
          ) : !template ? (
            <div className="text-gray-600">Template not found.</div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => setTemplate((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  rows={8}
                  value={template.content}
                  onChange={(e) => setTemplate((prev) => (prev ? { ...prev, content: e.target.value } : prev))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={template.isActive}
                  onChange={(e) => setTemplate((prev) => (prev ? { ...prev, isActive: e.target.checked } : prev))}
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
              </div>

              <div className="text-sm text-gray-500">
                <div>Created: {new Date(template.createdAt).toLocaleString()}</div>
                <div>Updated: {new Date(template.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
