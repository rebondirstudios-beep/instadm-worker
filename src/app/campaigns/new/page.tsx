
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, ArrowLeft, Save, Play, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function NewCampaignPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    messageTemplateId: '',
    leadsUrl: '',
    schedule: {
      type: 'immediate' as 'immediate' | 'scheduled' | 'recurring',
      startDate: '',
      endDate: '',
      dailyLimits: {
        startHour: '9',
        endHour: '21',
        messagesPerHour: '10',
        messagesPerDay: '100',
      },
    },
    settings: {
      delayBetweenMessages: '30',
      useSpinText: false,
      randomizeMessageOrder: false,
      skipAlreadyContacted: true,
      enableFollowUp: false,
      followUpDelay: '24',
      followUpMessage: '',
      leadUsernames: [] as string[],
    },
  })

  const [templates, setTemplates] = useState<Array<{ id: string; name: string; content: string }>>([])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/templates')
        const data = (await res.json().catch(() => ({}))) as any
        if (!res.ok) throw new Error(data?.error || `Failed to load templates (HTTP ${res.status})`)
        if (cancelled) return
        setTemplates(Array.isArray(data?.templates) ? data.templates : [])
      } catch (e: any) {
        if (!cancelled) window.alert(e?.message || 'Failed to load templates')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        name: formData.name,
        status: 'draft',
        messageTemplateId: formData.messageTemplateId || null,
        schedule: formData.schedule,
        settings: formData.settings,
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = (await res.json().catch(() => ({}))) as any
      if (!res.ok) throw new Error(data?.error || `Failed to create campaign (HTTP ${res.status}).`)

      router.push('/campaigns')
    } catch (error) {
      console.error('Failed to create campaign:', error)
      window.alert('Failed to create campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof typeof prev] as any),
        [field]: value,
      },
    }))
  }

  const handleDailyLimitsChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        dailyLimits: {
          ...prev.schedule.dailyLimits,
          [field]: value,
        },
      },
    }))
  }

  const handleImportLeads = async () => {
    if (!formData.leadsUrl && !csvFile) {
      window.alert('Provide a Google Sheets URL or select a CSV file')
      return
    }
    setIsImporting(true)
    try {
      let usernames: string[] = []
      // Google Sheets import
      if (formData.leadsUrl) {
        const res = await fetch('/api/leads/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: formData.leadsUrl }),
        })
        const data = (await res.json().catch(() => ({}))) as any
        if (!res.ok) throw new Error(data?.error || `Import failed (HTTP ${res.status})`)
        usernames = Array.isArray(data?.usernames) ? data.usernames : []
      }
      // CSV file import
      if (csvFile) {
        const text = await csvFile.text()
        const lines = text.split('\n')
        const csvUsernames = lines
          .map(l => l.trim())
          .filter(l => l && !l.toLowerCase().includes('username'))
          .map(l => l.replace(/^@/, '').trim())
          .filter(u => /^[a-zA-Z0-9._]{1,30}$/.test(u))
        usernames = [...new Set([...usernames, ...csvUsernames])]
      }
      setFormData(prev => ({
        ...prev,
        settings: { ...prev.settings, leadUsernames: usernames },
      }))
      window.alert(`Imported ${usernames.length} usernames`) 
    } catch (e: any) {
      window.alert(e?.message || 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteUsername = (usernameToDelete: string) => {
    const current = (formData.settings as any)?.leadUsernames || [];
    const updated = current.filter((u: string) => u !== usernameToDelete);
    handleNestedChange('settings', 'leadUsernames', updated);
  };

  const handleSaveDraft = async () => {
    try {
      const draft = {
        ...formData,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem('rebondir_campaign_draft', JSON.stringify(draft))
      window.alert('Draft saved')
    } catch (error) {
      console.error('Failed to save draft:', error)
      window.alert('Failed to save draft')
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
              <Link href="/campaigns" className="text-purple-600 font-medium">Campaigns</Link>
              <Link href="/accounts" className="text-gray-600 hover:text-gray-900">Accounts</Link>
              <Link href="/templates" className="text-gray-600 hover:text-gray-900">Templates</Link>
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
            href="/campaigns"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Campaigns</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Campaign</h1>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g. Summer Sale Outreach"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Message Template */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Message Template</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Template
                </label>
                <select
                  value={formData.messageTemplateId}
                  onChange={(e) => handleInputChange('messageTemplateId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Choose a template...</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {formData.messageTemplateId && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Template Preview:</h3>
                  <p className="text-gray-700">
                    {templates.find(t => t.id === formData.messageTemplateId)?.content}
                  </p>
                </div>
              )}
            </div>

            {/* Leads Import */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Leads Import</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Google Sheets URL</label>
                  <input
                    type="url"
                    value={formData.leadsUrl}
                    onChange={(e) => handleInputChange('leadsUrl', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleImportLeads}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    disabled={isImporting || (!formData.leadsUrl && !csvFile)}
                  >
                    {isImporting ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Or upload CSV file</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  {csvFile && (
                    <button
                      type="button"
                      onClick={() => setCsvFile(null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Clear CSV
                    </button>
                  )}
                </div>
              </div>

              {(formData.settings as any)?.leadUsernames?.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Imported Usernames ({(formData.settings as any)?.leadUsernames?.length})</label>
                    <button
                      type="button"
                      onClick={() => handleNestedChange('settings', 'leadUsernames', [])}
                      className="text-xs text-red-600 hover:text-red-700 transition-colors"
                    >
                      Delete All
                    </button>
                  </div>
                  <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 min-h-[120px] max-h-[120px] overflow-y-auto">
                    <div className="space-y-1">
                      {((formData.settings as any)?.leadUsernames || []).map((username: string) => (
                        <div key={username} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-100 transition-colors">
                          <span className="text-sm text-gray-900">@{username}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteUsername(username)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Delete username"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Type
                  </label>
                  <select
                    value={formData.schedule.type}
                    onChange={(e) => handleNestedChange('schedule', 'type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="immediate">Start Immediately</option>
                    <option value="scheduled">Schedule for Later</option>
                    <option value="recurring">Recurring Campaign</option>
                  </select>
                </div>
                
                {formData.schedule.type !== 'immediate' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.schedule.startDate}
                        onChange={(e) => handleNestedChange('schedule', 'startDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    {formData.schedule.type === 'scheduled' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Date
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.schedule.endDate}
                          onChange={(e) => handleNestedChange('schedule', 'endDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                )}
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Daily Limits</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Hour
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={formData.schedule.dailyLimits.startHour}
                        onChange={(e) => handleDailyLimitsChange('startHour', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Hour
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={formData.schedule.dailyLimits.endHour}
                        onChange={(e) => handleDailyLimitsChange('endHour', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Messages/Hour
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.schedule.dailyLimits.messagesPerHour}
                        onChange={(e) => handleDailyLimitsChange('messagesPerHour', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Messages/Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.schedule.dailyLimits.messagesPerDay}
                        onChange={(e) => handleDailyLimitsChange('messagesPerDay', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delay Between Messages (seconds)
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={formData.settings.delayBetweenMessages}
                    onChange={(e) => handleNestedChange('settings', 'delayBetweenMessages', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.settings.useSpinText}
                      onChange={(e) => handleNestedChange('settings', 'useSpinText', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Use spin text</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.settings.randomizeMessageOrder}
                      onChange={(e) => handleNestedChange('settings', 'randomizeMessageOrder', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Randomize message order</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.settings.skipAlreadyContacted}
                      onChange={(e) => handleNestedChange('settings', 'skipAlreadyContacted', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Skip already contacted</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={formData.settings.enableFollowUp}
                      onChange={(e) => handleNestedChange('settings', 'enableFollowUp', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable follow-up messages</span>
                  </label>
                  
                  {formData.settings.enableFollowUp && (
                    <div className="ml-6 space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Follow-up delay (hours)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.settings.followUpDelay}
                          onChange={(e) => handleNestedChange('settings', 'followUpDelay', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Follow-up message
                        </label>
                        <textarea
                          rows={3}
                          value={formData.settings.followUpMessage}
                          onChange={(e) => handleNestedChange('settings', 'followUpMessage', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Enter your follow-up message..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Link
                href="/campaigns"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </Link>
              
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Save className="h-5 w-5" />
                  <span>Save as Draft</span>
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Play className="h-5 w-5" />
                  <span>{isLoading ? 'Creating...' : 'Create Campaign'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
