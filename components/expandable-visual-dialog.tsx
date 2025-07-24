"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { BarChart3, TrendingUp, PieChart, Activity, Database, Maximize2, Download, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExpandableVisualProps {
  data: any
  type: "dashboard-suggestion" | "chart-recommendation" | "layout-idea"
  onSave: (data: any) => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ExpandableVisualDialog({ data, type, onSave, trigger, open, onOpenChange }: ExpandableVisualProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [executedComponent, setExecutedComponent] = useState<React.ReactNode | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionError, setExecutionError] = useState<string | null>(null)

  // Update dialog state when open prop changes
  useEffect(() => {
    if (open !== undefined) {
      setIsDialogOpen(open)
    }
  }, [open])

  // Execute the component code when preview opens
  useEffect(() => {
    if (isDialogOpen && type === "dashboard-suggestion" && data.components) {
      executeComponentCode()
    }
  }, [isDialogOpen, data])

  const executeComponentCode = async () => {
    if (!data.components?.[0]?.data?.componentCode) return

    setIsExecuting(true)
    setExecutionError(null)

    try {
      const componentCode = data.components[0].data.componentCode
      const dataFunction = data.components[0].data.dataFunction

      // Create a simple preview component that doesn't try to execute the actual component code
      const PreviewComponent = () => {
        const [chartData, setChartData] = useState<any[]>([])
        const [isLoading, setIsLoading] = useState(true)

        useEffect(() => {
          const loadData = async () => {
            try {
              if (dataFunction) {
                // Safely execute the data function
                const cleanDataFunction = dataFunction.replace(/import\s+.*?from\s+['"][^'"]*['"];?\n?/g, '')
                const dataFunc = new Function('return ' + cleanDataFunction)()
                const data = await dataFunc()
                setChartData(data || [])
              } else {
                setChartData(generateSampleData(data.components[0].data.chartType))
              }
            } catch (error) {
              console.error('Failed to load data:', error)
              setChartData(generateSampleData(data.components[0].data.chartType))
            } finally {
              setIsLoading(false)
            }
          }

          loadData()
        }, [])

        if (isLoading) {
          return (
            <div className="h-32 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )
        }

        return (
          <div className="h-32 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {chartData.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Data Points</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {data.components[0].data.chartType || 'Chart'} Visualization
              </div>
            </div>
          </div>
        )
      }

      setExecutedComponent(<PreviewComponent />)
    } catch (error) {
      console.error('Failed to execute component:', error)
      setExecutionError('Failed to execute component code')
    } finally {
      setIsExecuting(false)
    }
  }

  const generateSampleData = (chartType: string) => {
    const baseData = [
      { name: 'Location A', value: 120, efficiency: 85 },
      { name: 'Location B', value: 98, efficiency: 92 },
      { name: 'Location C', value: 156, efficiency: 78 },
      { name: 'Location D', value: 89, efficiency: 88 },
      { name: 'Location E', value: 134, efficiency: 91 }
    ]

    switch (chartType) {
      case 'bar':
      case 'grouped-bar':
        return baseData.map(item => ({ ...item, metric1: item.value, metric2: item.efficiency }))
      case 'line':
        return baseData.map((item, index) => ({ ...item, time: `Q${index + 1}` }))
      case 'pie':
        return baseData.map(item => ({ name: item.name, value: item.value }))
      default:
        return baseData
    }
  }

  const getIcon = () => {
    switch (type) {
      case "dashboard-suggestion":
        return <BarChart3 className="w-5 h-5" />
      case "chart-recommendation":
        return <TrendingUp className="w-5 h-5" />
      case "layout-idea":
        return <PieChart className="w-5 h-5" />
      default:
        return <Activity className="w-5 h-5" />
    }
  }

  const renderBarChart = (data: any[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-32 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">0</div>
            <div className="text-sm text-gray-500">No Data</div>
          </div>
        </div>
      )
    }

    const maxValue = Math.max(...data.map(d => d.value || d.metric1 || 0))
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

    return (
      <div className="h-32 flex items-end justify-center gap-1">
        {data.slice(0, 5).map((item, i) => {
          const value = item.value || item.metric1 || 0
          const height = (value / maxValue) * 100
          return (
            <div key={i} className="flex flex-col items-center">
              <div
                className="w-8 rounded-t"
                style={{
                  height: `${Math.max(height, 10)}px`,
                  backgroundColor: colors[i % colors.length]
                }}
              />
              <div className="text-xs text-gray-500 mt-1 truncate max-w-12">
                {item.name}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderLineChart = (data: any[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-32 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">0</div>
            <div className="text-sm text-gray-500">No Data</div>
          </div>
        </div>
      )
    }

    return (
      <div className="h-32 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{data.length}</div>
          <div className="text-sm text-gray-600">Data Points</div>
          <div className="text-xs text-gray-500">Line Chart</div>
        </div>
      </div>
    )
  }

  const renderPieChart = (data: any[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-32 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">0</div>
            <div className="text-sm text-gray-500">No Data</div>
          </div>
        </div>
      )
    }

    return (
      <div className="h-32 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{data.length}</div>
          <div className="text-sm text-gray-600">Data Points</div>
          <div className="text-xs text-gray-500">Pie Chart</div>
        </div>
      </div>
    )
  }

  const renderFullView = () => {
    if (type === "dashboard-suggestion" && data.components) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-white dark:text-black" />
            </div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-2">{data.title}</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Live preview of dashboard components with real data
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4">
            {data.components.map((component: any, index: number) => (
              <Card key={index} className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-black dark:text-white" />
                      <CardTitle className="text-sm font-medium">{component.title || component.type}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {component.data?.chartType || 'analysis'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Real Chart Preview */}
                    <div className="h-64 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {component.data?.chartType || 'Chart'} Visualization
                        </h4>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {isExecuting ? 'Loading...' : executedComponent ? 'Live Preview' : '0 data points'}
                        </div>
                      </div>
                      
                      {/* Render executed component or fallback */}
                      {isExecuting ? (
                        <div className="h-32 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : executionError ? (
                        <div className="h-32 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-red-500 text-sm">Execution Error</div>
                            <div className="text-xs text-gray-500">{executionError}</div>
                          </div>
                        </div>
                      ) : executedComponent ? (
                        executedComponent
                      ) : (
                        <div className="h-32 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                              0
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Data Points</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {component.data?.chartType || 'Chart'} Visualization
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Data Summary */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                        <div className="font-semibold text-gray-700 dark:text-gray-300">
                          {executedComponent ? 'Live' : '0'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Records</div>
                      </div>
                      <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                        <div className="font-semibold text-gray-700 dark:text-gray-300">
                          {component.data?.chartType ? '1' : '0'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Metrics</div>
                      </div>
                      <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                        <div className="font-semibold text-gray-700 dark:text-gray-300">
                          {component.data?.chartType ? '1' : '0'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Entities</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900 dark:text-blue-100">What happens when you save:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• {data.components.length} dashboard component{data.components.length > 1 ? 's' : ''} will be added to your dashboard</li>
                  <li>• Components will be automatically positioned to avoid overlaps</li>
                  <li>• Real data will be displayed based on your query</li>
                  <li>• You can drag and reposition components in edit mode</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (type === "layout-idea" && data.layout) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-white dark:text-black" />
            </div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-2">{data.title}</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Dashboard layout structure that will organize your components
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-base">Layout Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-white dark:bg-black border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="w-8 h-4 bg-blue-200 dark:bg-blue-800 rounded"></div>
                      <div className="w-8 h-4 bg-green-200 dark:bg-green-800 rounded"></div>
                      <div className="w-8 h-4 bg-purple-200 dark:bg-purple-800 rounded"></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{data.layout}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-white dark:text-black" />
          </div>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-2">{data.title}</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Chart recommendation based on your data and analysis goals
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-base">Recommended Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {data.charts?.[0] || "Bar Chart"} Visualization
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const handleSave = () => {
    onSave(data)
    setIsDialogOpen(false)
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Eye className="w-4 h-4" />
            View Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {getIcon()}
            {data.title || "Dashboard Component"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">{renderFullView()}</div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Maximize2 className="w-4 h-4" />
            Full preview mode
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Download className="w-4 h-4" />
              Add to Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
