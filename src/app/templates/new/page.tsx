'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, ArrowLeft, Save, Plus, X } from 'lucide-react'
import Link from 'next/link'

interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'custom'
  defaultValue: string
  required: boolean
  options: string[]
}

export default function NewTemplatePage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveDraft = async () => {
    try {
      const draft = {
        ...formData,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem('rebondir_template_draft', JSON.stringify(draft))
      window.alert('Draft saved')
    } catch (error) {
      console.error('Failed to save draft:', error)
      window.alert('Failed to save draft')
    }
  }
  
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    variables: [] as TemplateVariable[],
    isActive: true,
  })

  const addVariable = () => {
    const newVariable: TemplateVariable = {
      name: '',
      type: 'text',
      defaultValue: '',
      required: false,
      options: [],
    }
    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, newVariable],
    }))
  }

  const removeVariable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index),
    }))
  }

  const updateVariable = (index: number, field: keyof TemplateVariable, value: any) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.map((variable, i) => 
        i === index ? { ...variable, [field]: value } : variable
      ),
    }))
  }

  const addOption = (variableIndex: number) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.map((variable, i) => 
        i === variableIndex 
          ? { ...variable, options: [...variable.options, ''] }
          : variable
      ),
    }))
  }

  const removeOption = (variableIndex: number, optionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.map((variable, i) => 
        i === variableIndex 
          ? { ...variable, options: variable.options.filter((_, j) => j !== optionIndex) }
          : variable
      ),
    }))
  }

  const updateOption = (variableIndex: number, optionIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.map((variable, i) => 
        i === variableIndex 
          ? { 
              ...variable, 
              options: variable.options.map((option, j) => 
                j === optionIndex ? value : option
              )
            }
          : variable
      ),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const templateData = {
        ...formData,
        variables: formData.variables.map(v => ({
          ...v,
          options: v.type === 'custom' ? v.options.filter(opt => opt.trim()) : [],
        })),
      }

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      })

      const data = (await res.json().catch(() => ({}))) as any
      if (!res.ok) throw new Error(data?.error || `Failed to create template (HTTP ${res.status}).`)

      router.push('/templates')
    } catch (error) {
      console.error('Failed to create template:', error)
      window.alert('Failed to create template')
    } finally {
      setIsSaving(false)
    }
  }

  const getVariablePreview = (content: string) => {
    let preview = content
    formData.variables.forEach(variable => {
      const placeholder = `{${variable.name}}`
      const replacement = variable.defaultValue || `[${variable.name}]`
      preview = preview.replace(new RegExp(placeholder, 'g'), replacement)
    })
    return preview
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
              <Link href="/templates" className="text-purple-600 font-medium">Templates</Link>
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
            href="/templates"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Templates</span>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Template Details</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Product Introduction"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Content *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your message template. Use {variable_name} for personalization..."
                />
                <p className="text-sm text-gray-500 mt-2">
                  Use {'{variable_name}'} syntax for variables. Examples: {'{username}'}, {'{fullName}'}, {'{product}'}
                </p>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Template is active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Template Variables */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Template Variables</h2>
              <button
                type="button"
                onClick={addVariable}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Variable</span>
              </button>
            </div>

            {formData.variables.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No variables added</h3>
                <p className="text-gray-500 mb-4">Add variables to make your templates more dynamic</p>
                <button
                  type="button"
                  onClick={addVariable}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Add Your First Variable
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.variables.map((variable, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-900">Variable {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeVariable(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Variable Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={variable.name}
                          onChange={(e) => updateVariable(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="e.g., username"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={variable.type}
                          onChange={(e) => updateVariable(index, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="custom">Custom Options</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Default Value
                        </label>
                        <input
                          type="text"
                          value={variable.defaultValue}
                          onChange={(e) => updateVariable(index, 'defaultValue', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Default value if not provided"
                        />
                      </div>
                      
                      <div className="flex items-center">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={variable.required}
                            onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Required</span>
                        </label>
                      </div>
                    </div>
                    
                    {variable.type === 'custom' && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Options
                          </label>
                          <button
                            type="button"
                            onClick={() => addOption(index)}
                            className="text-purple-600 hover:text-purple-700 text-sm"
                          >
                            Add Option
                          </button>
                        </div>
                        <div className="space-y-2">
                          {variable.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Option value"
                              />
                              <button
                                type="button"
                                onClick={() => removeOption(index, optionIndex)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {formData.content && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Template Preview</h2>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {getVariablePreview(formData.content)}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/templates"
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
                disabled={isSaving}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                <span>{isSaving ? 'Saving...' : 'Create Template'}</span>
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
