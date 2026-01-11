'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, ArrowLeft, Shield, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function NewAccountPage() {
  const router = useRouter()
  const [isConnecting, setIsConnecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [connectionMessage, setConnectionMessage] = useState('')
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    proxy: {
      enabled: false,
      host: '',
      port: '',
      username: '',
      password: '',
      type: 'http' as 'http' | 'https' | 'socks4' | 'socks5',
    },
    settings: {
      dailyLimit: '100',
      hourlyLimit: '10',
      enableWarmup: true,
      warmupDuration: '7',
    },
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleProxyChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      proxy: {
        ...prev.proxy,
        [field]: value,
      },
    }))
  }

  const handleSettingsChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value,
      },
    }))
  }

  const testConnection = async () => {
    if (!formData.username) {
      setConnectionStatus('error')
      setConnectionMessage('Please fill in username')
      return
    }

    setConnectionStatus('testing')
    setConnectionMessage('Testing connection...')

    try {
      window.open(`https://www.instagram.com/${formData.username}/`, '_blank')
      setConnectionStatus('success')
      setConnectionMessage('Opened Instagram profile in a new tab.')
    } catch {
      setConnectionStatus('error')
      setConnectionMessage('Could not open Instagram. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsConnecting(true)

    try {
      const proxyString = formData.proxy.enabled ? JSON.stringify(formData.proxy) : null
      const dailyLimit = Number(formData.settings.dailyLimit || '50')

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          proxy: proxyString,
          dailyLimit: Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : 50,
        }),
      })

      const data = (await res.json().catch(() => ({}))) as any
      if (!res.ok) throw new Error(data?.error || `Failed to add account (HTTP ${res.status}).`)

      router.push('/accounts')
    } catch (error) {
      console.error('Failed to add account:', error)
      window.alert((error as any)?.message || 'Failed to add account')
    } finally {
      setIsConnecting(false)
    }
  }

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
              <Link href="/accounts" className="text-purple-600 font-medium">Accounts</Link>
              <Link href="/templates" className="text-gray-600 hover:text-gray-900">Templates</Link>
              <Link href="/leads" className="text-gray-600 hover:text-gray-900">Leads</Link>
              <Link href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link 
            href="/accounts"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Accounts</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Instagram Account</h1>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Account Credentials */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-purple-600" />
                Account Credentials
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="username"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your Instagram password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Connection Test */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={connectionStatus === 'testing'}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
                >
                  {connectionStatus === 'testing' && (
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {connectionStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {connectionStatus === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                  {connectionStatus === 'idle' && <Shield className="h-5 w-5" />}
                  <span>
                    {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                  </span>
                </button>
                
                {connectionMessage && (
                  <div className={`mt-2 text-sm ${
                    connectionStatus === 'success' ? 'text-green-600' : 
                    connectionStatus === 'error' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {connectionMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Proxy Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Proxy Settings (Optional)</h2>
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.proxy.enabled}
                    onChange={(e) => handleProxyChange('enabled', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Use proxy for this account</span>
                </label>
              </div>
              
              {formData.proxy.enabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proxy Type
                      </label>
                      <select
                        value={formData.proxy.type}
                        onChange={(e) => handleProxyChange('type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="http">HTTP</option>
                        <option value="https">HTTPS</option>
                        <option value="socks4">SOCKS4</option>
                        <option value="socks5">SOCKS5</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Host
                      </label>
                      <input
                        type="text"
                        value={formData.proxy.host}
                        onChange={(e) => handleProxyChange('host', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="192.168.1.1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Port
                      </label>
                      <input
                        type="number"
                        value={formData.proxy.port}
                        onChange={(e) => handleProxyChange('port', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="8080"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proxy Username (if required)
                      </label>
                      <input
                        type="text"
                        value={formData.proxy.username}
                        onChange={(e) => handleProxyChange('username', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="proxy_user"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proxy Password (if required)
                      </label>
                      <input
                        type="password"
                        value={formData.proxy.password}
                        onChange={(e) => handleProxyChange('password', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="proxy_password"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Account Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Message Limit
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={formData.settings.dailyLimit}
                    onChange={(e) => handleSettingsChange('dailyLimit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Message Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.settings.hourlyLimit}
                    onChange={(e) => handleSettingsChange('hourlyLimit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warmup Duration (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.settings.warmupDuration}
                    onChange={(e) => handleSettingsChange('warmupDuration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.settings.enableWarmup}
                      onChange={(e) => handleSettingsChange('enableWarmup', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Enable account warmup</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">About Account Warmup</h4>
                <p className="text-sm text-blue-700">
                  Warmup gradually increases your daily sending limits to avoid Instagram restrictions. 
                  New accounts should always use warmup to build trust.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Link
                href="/accounts"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </Link>
              
              <button
                type="submit"
                disabled={isConnecting || connectionStatus !== 'success'}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isConnecting ? 'Adding Account...' : 'Add Account'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
