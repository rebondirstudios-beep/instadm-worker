'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MessageSquare, Home, Users, Send, FileText, BarChart3, Settings, Menu, X } from 'lucide-react'
import { MobileMenu } from './MobileMenu'

interface ResponsiveLayoutProps {
  children: React.ReactNode
  user?: {
    firstName?: string
    emailAddresses?: Array<{ emailAddress: string }>
  }
  currentPage?: string
}

export function ResponsiveLayout({ children, user, currentPage = '/' }: ResponsiveLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/campaigns', label: 'Campaigns', icon: Send },
    { href: '/accounts', label: 'Accounts', icon: Users },
    { href: '/templates', label: 'Templates', icon: FileText },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  ]

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center space-x-2">
              <MessageSquare className="h-7 w-7 text-purple-600" />
              <span className="text-lg font-bold text-gray-900">Rebondir Studios</span>
            </Link>
            <MobileMenu user={user} currentPage={currentPage} />
          </div>
        </header>

        {/* Mobile Content */}
        <main className="pb-16">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <div className="grid grid-cols-6 gap-1">
            {menuItems.slice(0, 6).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                  currentPage === item.href
                    ? 'text-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <Link href="/" className="flex items-center space-x-2">
              <MessageSquare className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900">Rebondir Studios</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    currentPage === item.href
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* User Section */}
          {user && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-3 px-3 py-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.firstName || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.emailAddresses?.[0]?.emailAddress}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Desktop Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* Desktop Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-gray-900">
                {menuItems.find(item => item.href === currentPage)?.label || 'Dashboard'}
              </h1>
            </div>
            
            {user && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress[0]?.toUpperCase()}
                  </div>
                  <span className="text-gray-700">{user.firstName || user.emailAddresses?.[0]?.emailAddress}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Desktop Content Area */}
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
