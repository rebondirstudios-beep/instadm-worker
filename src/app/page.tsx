"use client";

import Link from "next/link";
import { MessageSquare, Home as HomeIcon, Users, MessageSquarePlus, BarChart3, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [showDemo, setShowDemo] = useState(false);

  const demoCredentials = {
    username: "musigorecords",
    password: "Musigo2025@1",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Demo Mode Toggle */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowDemo(!showDemo)}
          className="bg-slate-800 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm hover:bg-slate-700 transition-colors"
        >
          {showDemo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{showDemo ? "Hide" : "Show"} Demo</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <MessageSquare className="h-8 w-8 text-purple-600 transition-transform group-hover:scale-110" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Rebondir Studios
              </span>
            </Link>
            
            <div className="flex items-center space-x-1">
              <Link 
                href="/dashboard" 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 flex items-center space-x-2"
              >
                <HomeIcon className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link 
                href="/campaigns" 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 flex items-center space-x-2"
              >
                <MessageSquarePlus className="h-4 w-4" />
                <span>Campaigns</span>
              </Link>
              <Link 
                href="/accounts" 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 flex items-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Accounts</span>
              </Link>
              <Link 
                href="/templates" 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                Templates
              </Link>
              <Link 
                href="/leads" 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                Leads
              </Link>
              <Link 
                href="/automation" 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                Automation
              </Link>
              <Link 
                href="/analytics" 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 flex items-center space-x-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </Link>
              
              <div className="ml-2 pl-2 border-l border-slate-200"></div>
              
              <div className="flex items-center space-x-2 ml-2">
                <div className="relative">
                  <button className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                    U
                  </button>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Demo Credentials Panel */}
      {showDemo && (
        <div className="fixed top-20 right-4 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-80">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
            <Eye className="h-5 w-5 text-purple-600" />
            <span>Demo Credentials</span>
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={demoCredentials.username}
                readOnly
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={demoCredentials.password}
                readOnly
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900"
              />
            </div>
            <div className="text-xs text-slate-500 mt-3">
              Click to copy, then paste into Instagram login
            </div>
          </div>
        </div>
      )}
      
      {/* Empty state content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="h-10 w-10 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Welcome to
            <span className="bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent ml-2">
              Rebondir Studios
            </span>
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed">
            Navigate using the menu above to manage your Instagram outreach campaigns, leads, and analytics.
          </p>
        </div>
      </div>
    </div>
  );
}
