"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { MessageSquare, TrendingUp, Users, Send, Calendar, Download, Filter } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/login");
    }
  }, [isLoaded, router, user]);

  const [dateRange, setDateRange] = useState("Last 7 days");
  const [showCampaignFilters, setShowCampaignFilters] = useState(false);
  const [minSuccessRate, setMinSuccessRate] = useState<number | "">("");

  const analyticsData = {
    overview: {
      totalMessages: 0,
      sentMessages: 0,
      failedMessages: 0,
      readMessages: 0,
      successRate: 0,
      averageResponseTime: 0,
      totalAccounts: 0,
      activeAccounts: 0,
      totalCampaigns: 0,
      activeCampaigns: 0,
    },
    dailyStats: [] as Array<{ date: string; sent: number; read: number; failed: number; successRate: number }>,
    campaignPerformance: [] as Array<{
      id: string;
      name: string;
      messagesSent: number;
      messagesRead: number;
      successRate: number;
      averageResponseTime: number;
      costPerMessage: number;
      roi: number;
    }>,
    accountPerformance: [] as Array<{
      id: string;
      username: string;
      messagesSent: number;
      successRate: number;
      dailyUsage: number;
      dailyLimit: number;
      status: string;
    }>,
    topTemplates: [] as Array<{
      id: string;
      name: string;
      usage: number;
      successRate: number;
      averageResponseTime: number;
    }>,
  };

  const filteredCampaignPerformance = useMemo(() => {
    if (minSuccessRate === "") return analyticsData.campaignPerformance;
    return analyticsData.campaignPerformance.filter((c) => c.successRate >= minSuccessRate);
  }, [analyticsData.campaignPerformance, minSuccessRate]);

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

    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
    ].join("\n");

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
    downloadCsv("analytics_campaigns.csv", filteredCampaignPerformance);
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
              <Link href="/leads" className="text-gray-600 hover:text-gray-900">Leads</Link>
              <Link href="/analytics" className="text-purple-600 font-medium">Analytics</Link>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
            <p className="text-gray-600">Track your performance and optimize your campaigns</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg">
              <Calendar className="h-5 w-5 text-gray-400" />
              <select
                className="bg-transparent text-gray-700 focus:outline-none"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>All time</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="h-5 w-5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Send className="h-8 w-8 text-purple-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalMessages.toLocaleString()}</h3>
            <p className="text-gray-600">Total Messages Sent</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{analyticsData.overview.successRate}%</h3>
            <p className="text-gray-600">Success Rate</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-blue-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{analyticsData.overview.averageResponseTime}h</h3>
            <p className="text-gray-600">Avg Response Time</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="h-8 w-8 text-orange-600" />
              <span className="text-sm text-gray-500 font-medium">—</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{analyticsData.overview.activeCampaigns}</h3>
            <p className="text-gray-600">Active Campaigns</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Daily Performance Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Performance</h2>
            <div className="h-64 flex items-end justify-between space-x-2">
              {analyticsData.dailyStats.map((day, index) => (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-purple-600 rounded-t" style={{ height: `${(day.sent / 350) * 100}%` }}></div>
                  <div className="text-xs text-gray-600 mt-2 text-center">
                    {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-600 rounded"></div>
                <span className="text-gray-600">Messages Sent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span className="text-gray-600">Messages Read</span>
              </div>
            </div>
          </div>

          {/* Success Rate Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Success Rate Trend</h2>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">{analyticsData.overview.successRate}%</div>
                <div className="text-gray-600">Overall Success Rate</div>
                <div className="text-sm text-gray-500 mt-2">—</div>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Campaign Performance</h2>
            <button
              type="button"
              onClick={() => setShowCampaignFilters((v) => !v)}
              className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
            >
              <Filter className="h-5 w-5" />
              <span>Filter</span>
            </button>
          </div>

          {showCampaignFilters && (
            <div className="mb-4 flex items-center space-x-3">
              <label className="text-sm text-gray-700">Min success rate</label>
              <input
                type="number"
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0"
                value={minSuccessRate}
                onChange={(e) => setMinSuccessRate(e.target.value ? Number(e.target.value) : "")}
              />
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Messages Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost/Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROI
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaignPerformance.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.messagesSent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">{campaign.successRate}%</div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${campaign.successRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.averageResponseTime}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${campaign.costPerMessage}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">{campaign.roi}%</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Account Performance & Top Templates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Account Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Performance</h2>
            <div className="space-y-4">
              {analyticsData.accountPerformance.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900">@{account.username}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAccountStatusColor(account.status)}`}>
                        {account.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {account.messagesSent.toLocaleString()} messages • {account.successRate}% success rate
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-900">{account.dailyUsage}/{account.dailyLimit}</div>
                    <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full ${
                          (account.dailyUsage / account.dailyLimit) > 0.8 
                            ? 'bg-red-600' 
                            : (account.dailyUsage / account.dailyLimit) > 0.6 
                            ? 'bg-yellow-600' 
                            : 'bg-green-600'
                        }`}
                        style={{ width: `${Math.min((account.dailyUsage / account.dailyLimit) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Templates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Templates</h2>
            <div className="space-y-4">
              {analyticsData.topTemplates.map((template, index) => (
                <div key={template.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-semibold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <div className="text-sm text-gray-600">
                        {template.usage} uses • {template.averageResponseTime}h avg response
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{template.successRate}%</div>
                    <div className="text-xs text-gray-600">success rate</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
