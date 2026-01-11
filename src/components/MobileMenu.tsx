'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Menu, X, Home, Users, Send, FileText, BarChart3, Settings } from 'lucide-react'

interface MobileMenuProps {
  user?: {
    firstName?: string
    emailAddresses?: Array<{ emailAddress: string }>
  }
  currentPage?: string
}

export function MobileMenu({ user, currentPage = '/' }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/campaigns', label: 'Campaigns', icon: Send },
    { href: '/accounts', label: 'Accounts', icon: Users },
    { href: '/templates', label: 'Templates', icon: FileText },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  ]

  const toggleMenu = () => setIsOpen(!isOpen)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleMenu}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={toggleMenu} />
          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <Link href="/" className="flex items-center space-x-2">
                <MessageSquare className="h-8 w-8 text-purple-600" />
                <span className="text-xl font-bold text-gray-900">Rebondir Studios</span>
              </Link>
              <button
                onClick={toggleMenu}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="p-4">
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={toggleMenu}
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

              {/* User section */}
              {user && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center space-x-3 px-3 py-2">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
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
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
