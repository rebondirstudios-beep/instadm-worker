import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MessageSquare, Users, TrendingUp, Send, Plus, Activity, Clock, Target, Zap, AlertCircle } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";
import AutomationLiveStatsCard from "@/components/AutomationLiveStatsCard";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function DashboardPage() {
  try {
    const user = await currentUser();
    
    if (!user) {
      redirect("/login");
    }

    const dbUser = await ensureDbUser(user);

  const [
    totalCampaigns,
    activeCampaigns,
    totalAccounts,
    activeAccounts,
    totalMessages,
    sentMessages,
    messagesToday,
    campaignsForLeads,
    recent,
  ] = await Promise.all([
    prisma.campaign.count({ where: { userId: dbUser.id } }),
    prisma.campaign.count({ where: { userId: dbUser.id, status: "active" } }),
    prisma.instagramAccount.count({ where: { userId: dbUser.id } }),
    prisma.instagramAccount.count({ where: { userId: dbUser.id, isActive: true } }),
    prisma.message.count({ where: { campaign: { userId: dbUser.id } } }),
    prisma.message.count({ where: { campaign: { userId: dbUser.id }, status: "sent" } }),
    prisma.message.findMany({
      where: { campaign: { userId: dbUser.id }, createdAt: { gte: startOfToday() } },
      select: { recipientUsername: true },
    }),
    prisma.campaign.findMany({
      where: { userId: dbUser.id },
      select: { settings: true },
    }),
    prisma.campaign.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, status: true, createdAt: true },
    }),
  ]);

  const successRate = totalMessages > 0 ? Math.round((sentMessages / totalMessages) * 100) : 0;

  const leadSet = new Set<string>();
  for (const c of campaignsForLeads as any[]) {
    const raw = c?.settings?.leadUsernames;
    if (!Array.isArray(raw)) continue;
    for (const u of raw) {
      const s = String(u || "").trim();
      if (!s) continue;
      leadSet.add(s.startsWith("@") ? s.slice(1).toLowerCase() : s.toLowerCase());
    }
  }

  const todayLeadSet = new Set<string>();
  for (const m of messagesToday) {
    const s = String((m as any).recipientUsername || "").trim();
    if (!s) continue;
    todayLeadSet.add(s.startsWith("@") ? s.slice(1).toLowerCase() : s.toLowerCase());
  }

  const stats = {
    totalCampaigns,
    activeCampaigns,
    totalMessages: sentMessages,
    sentMessages,
    successRate,
    totalAccounts,
    activeAccounts,
    totalLeads: leadSet.size,
    newLeadsToday: todayLeadSet.size,
  };

  const recentCampaigns = await Promise.all(
    recent.map(async (c: any) => {
      const [total, sent] = await Promise.all([
        prisma.message.count({ where: { campaignId: c.id } }),
        prisma.message.count({ where: { campaignId: c.id, status: "sent" } }),
      ]);
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        messagesSent: sent,
        successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
        createdAt: c.createdAt.toISOString(),
      };
    })
  );

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
              <Link href="/dashboard" className="text-purple-600 font-medium">Dashboard</Link>
              <Link href="/campaigns" className="text-gray-600 hover:text-gray-900">Campaigns</Link>
              <Link href="/accounts" className="text-gray-600 hover:text-gray-900">Accounts</Link>
              <Link href="/templates" className="text-gray-600 hover:text-gray-900">Templates</Link>
              <Link href="/leads" className="text-gray-600 hover:text-gray-900">Leads</Link>
              <Link href="/automation" className="text-gray-600 hover:text-gray-900">Automation</Link>
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.firstName || 'User'}!
          </h1>
          <p className="text-gray-600">Here's what's happening with your Instagram outreach today.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link 
            href="/campaigns/new"
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 group"
          >
            <Plus className="h-8 w-8 mb-3 group-hover:rotate-90 transition-transform duration-200" />
            <h3 className="text-lg font-semibold mb-1">New Campaign</h3>
            <p className="text-purple-100 text-sm">Create outreach campaign</p>
          </Link>
          
          <Link 
            href="/leads/discover"
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 group"
          >
            <Target className="h-8 w-8 mb-3 group-hover:scale-110 transition-transform duration-200" />
            <h3 className="text-lg font-semibold mb-1">Discover Leads</h3>
            <p className="text-blue-100 text-sm">Find new prospects</p>
          </Link>
          
          <Link 
            href="/campaigns"
            className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 group"
          >
            <Activity className="h-8 w-8 mb-3 group-hover:animate-pulse" />
            <h3 className="text-lg font-semibold mb-1">Active Campaigns</h3>
            <p className="text-green-100 text-sm">Manage outreach</p>
          </Link>
          
          <Link 
            href="/accounts"
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 group"
          >
            <Users className="h-8 w-8 mb-3 group-hover:scale-110 transition-transform duration-200" />
            <h3 className="text-lg font-semibold mb-1">Accounts</h3>
            <p className="text-orange-100 text-sm">Manage IG accounts</p>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <Send className="h-8 w-8 text-purple-600" />
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">Live</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalMessages.toLocaleString()}</h3>
            <p className="text-sm text-gray-500">Messages Sent</p>
            <div className="mt-2 text-xs text-green-600">+{stats.newLeadsToday} today</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <span className="text-xs text-gray-500 font-medium">{stats.successRate}%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.successRate}%</h3>
            <p className="text-sm text-gray-500">Success Rate</p>
            <div className="mt-2 text-xs text-gray-500">Last 30 days</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600 font-medium">{stats.activeAccounts}</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalLeads.toLocaleString()}</h3>
            <p className="text-sm text-gray-500">Total Leads</p>
            <div className="mt-2 text-xs text-blue-600">In database</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <Zap className="h-8 w-8 text-orange-600" />
              <span className="text-xs text-gray-500 font-medium">{stats.activeCampaigns}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.activeCampaigns}</h3>
            <p className="text-sm text-gray-500">Active Campaigns</p>
            <div className="mt-2 text-xs text-orange-600">Running now</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <span>Recent Campaigns</span>
              </h2>
            </div>
            <div className="p-6">
              {recentCampaigns.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No campaigns yet</p>
                  <Link 
                    href="/campaigns/new"
                    className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-700 mt-3"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create your first campaign</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCampaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div>
                        <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                        <p className="text-sm text-gray-500">
                          {campaign.messagesSent} messages sent • {campaign.successRate}% success
                        </p>
                      </div>
                      <Link 
                        href={`/campaigns/${campaign.id}`}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        View →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <span>Today's Activity</span>
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">New Leads Today</span>
                  <span className="text-lg font-semibold text-purple-600">{stats.newLeadsToday}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-sm font-medium text-gray-900 mb-3">Automation (Live)</div>
                <AutomationLiveStatsCard />
              </div>
              {stats.newLeadsToday === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">No activity today yet</p>
                  <p className="text-gray-400 text-xs mt-2">Start a campaign to see updates here</p>
                </div>
              )}
            </div>
          </div>
          
          <Link 
            href="/accounts/new"
            className="bg-white p-6 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-4"
          >
            <Users className="h-8 w-8 text-purple-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Add Account</h3>
              <p className="text-gray-600">Connect Instagram account</p>
            </div>
          </Link>
          
          <Link 
            href="/templates/new"
            className="bg-white p-6 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-4"
          >
            <MessageSquare className="h-8 w-8 text-purple-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Create Template</h3>
              <p className="text-gray-600">Design message template</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
  } catch (error) {
    console.error("Dashboard error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Dashboard Error
          </h2>
          <p className="text-gray-600 mb-4">
            Unable to load dashboard. Please try again later.
          </p>
          <Link 
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }
}
