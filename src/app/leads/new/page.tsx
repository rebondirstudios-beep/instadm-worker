'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, ArrowLeft, Search, Users } from 'lucide-react'
import Link from 'next/link'

export default function NewLeadSearchPage() {
  const router = useRouter()
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  
  const [searchCriteria, setSearchCriteria] = useState({
    type: 'hashtag', // hashtag, location, username
    query: '',
    filters: {
      minFollowers: '',
      maxFollowers: '',
      isVerified: false,
      isBusinessAccount: false,
      hasProfilePic: true,
      minPosts: '',
      maxPosts: '',
    },
    limits: {
      maxResults: '100',
    },
  })

  const handleSearch = async () => {
    if (!searchCriteria.query.trim()) return
    
    setIsSearching(true)
    
    try {
      window.alert('Lead search is not implemented yet. Connect a real backend/integration first.')
      setSearchResults([])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSaveLeads = async () => {
    if (searchResults.length === 0) return
    
    try {
      window.alert('Saving leads is not implemented yet. Connect a real backend first.')
    } catch (error) {
      console.error('Failed to save leads:', error)
    }
  }

  const handleCriteriaChange = (field: string, value: any) => {
    setSearchCriteria(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFilterChange = (field: string, value: any) => {
    setSearchCriteria(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [field]: value,
      },
    }))
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
              <Link href="/accounts" className="text-gray-600 hover:text-gray-900">Accounts</Link>
              <Link href="/templates" className="text-gray-600 hover:text-gray-900">Templates</Link>
              <Link href="/leads" className="text-purple-600 font-medium">Leads</Link>
              <Link href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link 
            href="/leads"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Leads</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Search Criteria</h2>
              
              {/* Search Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'hashtag', label: 'Hashtag', icon: '#' },
                    { value: 'location', label: 'Location', icon: '📍' },
                    { value: 'username', label: 'Username', icon: '@' },
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => handleCriteriaChange('type', type.value)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        searchCriteria.type === type.value
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="mr-1">{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Query */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {searchCriteria.type === 'hashtag' && 'Hashtag (without #)'}
                  {searchCriteria.type === 'location' && 'Location'}
                  {searchCriteria.type === 'username' && 'Username (without @)'}
                </label>
                <input
                  type="text"
                  value={searchCriteria.query}
                  onChange={(e) => handleCriteriaChange('query', e.target.value)}
                  placeholder={
                    searchCriteria.type === 'hashtag' ? 'fashion, tech, travel'
                    : searchCriteria.type === 'location' ? 'New York, Paris, Tokyo'
                    : 'username'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Min Followers</label>
                      <input
                        type="number"
                        value={searchCriteria.filters.minFollowers}
                        onChange={(e) => handleFilterChange('minFollowers', e.target.value)}
                        placeholder="1000"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max Followers</label>
                      <input
                        type="number"
                        value={searchCriteria.filters.maxFollowers}
                        onChange={(e) => handleFilterChange('maxFollowers', e.target.value)}
                        placeholder="100000"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Min Posts</label>
                      <input
                        type="number"
                        value={searchCriteria.filters.minPosts}
                        onChange={(e) => handleFilterChange('minPosts', e.target.value)}
                        placeholder="10"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max Posts</label>
                      <input
                        type="number"
                        value={searchCriteria.filters.maxPosts}
                        onChange={(e) => handleFilterChange('maxPosts', e.target.value)}
                        placeholder="1000"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={searchCriteria.filters.isVerified}
                        onChange={(e) => handleFilterChange('isVerified', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Verified accounts only</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={searchCriteria.filters.isBusinessAccount}
                        onChange={(e) => handleFilterChange('isBusinessAccount', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Business accounts only</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={searchCriteria.filters.hasProfilePic}
                        onChange={(e) => handleFilterChange('hasProfilePic', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Has profile picture</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Limits */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Results
                </label>
                <select
                  value={searchCriteria.limits.maxResults}
                  onChange={(e) => handleCriteriaChange('limits', { ...searchCriteria.limits, maxResults: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="50">50 results</option>
                  <option value="100">100 results</option>
                  <option value="200">200 results</option>
                  <option value="500">500 results</option>
                </select>
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchCriteria.query.trim()}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Search className="h-5 w-5" />
                <span>{isSearching ? 'Searching...' : 'Search Leads'}</span>
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Search Results {searchResults.length > 0 && `(${searchResults.length})`}
                </h2>
                {searchResults.length > 0 && (
                  <button
                    onClick={handleSaveLeads}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                  >
                    <Users className="h-5 w-5" />
                    <span>Save All Leads</span>
                  </button>
                )}
              </div>

              {/* Results */}
              {searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No results yet</h3>
                  <p className="text-gray-500">
                    {isSearching ? 'Searching for leads...' : 'Configure your search criteria and click Search to find leads'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {searchResults.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <img
                          src={lead.profilePicUrl}
                          alt={lead.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">@{lead.username}</h4>
                            {lead.isVerified && (
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{lead.fullName}</p>
                          <p className="text-xs text-gray-500">
                            {(lead.followerCount / 1000).toFixed(1)}K followers • {lead.metadata.engagementRate}% engagement
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                          View Profile
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
