"use client"

import React, { useEffect, useState } from 'react'
import { type GeneratedDashboard } from '@/lib/dashboard-storage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw, Code, Eye, Table } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area, BarChart, Bar, Legend
} from 'recharts'
import { FilterService } from '@/lib/filter-service'
import { globalFilterStateManager } from '@/lib/global-filter-state'
import type { FilterGroup } from '@/components/dashboard-filter-panel'

// Simple component renderer
function ComponentRenderer({ componentCode, dataFunction, chartSize }: { 
  componentCode: string; 
  dataFunction: string; 
  chartSize: { width: number; height: number }
}) {
  const [data, setData] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [viewMode, setViewMode] = React.useState<'visual' | 'table'>('visual')
  const [debugLogs, setDebugLogs] = React.useState<string[]>([])
  const [rawData, setRawData] = React.useState<any[]>([])
  const [processedData, setProcessedData] = React.useState<any>(null)
  const [globalFilters, setGlobalFilters] = React.useState<FilterGroup[]>([])
  const filterService = FilterService.getInstance()

  // Subscribe to global filter changes
  React.useEffect(() => {
    console.log('👁️ Visual page - Subscribing to global filter changes')
    
    const unsubscribe = globalFilterStateManager.subscribe((state) => {
      console.log('📡 Visual page - Received global filter update:', state.globalFilters)
      setGlobalFilters(state.globalFilters)
    })
    
    // Initialize with current state
    const currentState = globalFilterStateManager.getState().globalFilters
    console.log('🏁 Visual page - Initial global filters:', currentState)
    setGlobalFilters(currentState)
    
    return unsubscribe
  }, [])

  // Custom console.log to capture logs
  const logToDebug = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    setDebugLogs(prev => [...prev, logEntry])
    console.log(message)
  }

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        logToDebug('Starting data fetch...')
        
        // Execute the data function to get the data
        const processData = new Function('data', dataFunction)
        
        // Fetch the raw data - this should be generic, not turbine-specific
        logToDebug('Fetching data from /api/data/turbines')
        const response = await fetch('/api/data/turbines')
        const rawData = await response.json()
        setRawData(rawData)
        logToDebug(`Raw data: ${rawData.length} items loaded`)
        logToDebug(`Sample data: ${JSON.stringify(rawData[0], null, 2)}`)
        
        // Execute the data function directly
        logToDebug('Executing dataFunction...')
        logToDebug(`Data function: ${dataFunction}`)
        
        let processedData
        try {
          // Extract function name from the dataFunction
          const functionNameMatch = dataFunction.match(/(?:const|let|var|function)\s+(\w+)\s*=/)
          const functionName = functionNameMatch ? functionNameMatch[1] : null
          logToDebug(`Extracted function name: ${functionName}`)
          
          if (!functionName) {
            throw new Error('Could not extract function name from dataFunction')
          }
          
          // Create and execute the function with the raw data
          const executeFunction = new Function(`
            ${dataFunction}
            return ${functionName}();
          `)
          const result = await executeFunction()
          
          // If the function returns a promise, await it
          if (result && typeof result.then === 'function') {
            processedData = await result
          } else {
            processedData = result
          }
          
          logToDebug('Data function executed successfully')
        } catch (error) {
          logToDebug(`Error executing data function: ${error}`)
          processedData = []
        }
        
        setProcessedData(processedData)
        logToDebug(`Processed data result: ${JSON.stringify(processedData, null, 2)}`)
        
        // Handle different data structures based on chart type
        const chartType = componentCode.toLowerCase().includes('linechart') ? 'line' :
                         componentCode.toLowerCase().includes('barchart') ? 'bar' :
                         componentCode.toLowerCase().includes('piechart') ? 'pie' :
                         componentCode.toLowerCase().includes('areachart') ? 'area' :
                         componentCode.toLowerCase().includes('scatterchart') ? 'scatter' : 'line'
        
        // For scatter charts, data might be an object with location keys
        if (chartType === 'scatter' && typeof processedData === 'object' && !Array.isArray(processedData)) {
          // Convert object to array format for scatter chart rendering
          const scatterData = Object.entries(processedData).map(([location, dataPoints]) => ({
            location,
            data: dataPoints
          }))
          setData(scatterData)
          logToDebug(`Final scatter data: ${scatterData.length} locations`)
        } else {
          // For other chart types, ensure it's an array
          let arrayData
          if (Array.isArray(processedData)) {
            arrayData = processedData
          } else if (processedData && typeof processedData === 'object' && processedData.chartData) {
            // Handle case where data function returns { chartData, turbineIds }
            arrayData = processedData.chartData
            logToDebug(`Extracted chartData from object: ${arrayData.length} items`)
          } else {
            arrayData = []
          }
          setData(arrayData)
          logToDebug(`Final data array length: ${arrayData.length}`)
        }
        
        logToDebug(`Chart type detected: ${chartType}`)
        
        // Log data structure analysis
        if (processedData && processedData.length > 0) {
          const firstItem = processedData[0]
          const hasLocation = 'location' in firstItem
          const hasStatus = 'Active' in firstItem || 'Warning' in firstItem || 'Offline' in firstItem
          const hasNameValue = 'name' in firstItem && 'value' in firstItem
          logToDebug(`Data structure: hasLocation=${hasLocation}, hasStatus=${hasStatus}, hasNameValue=${hasNameValue}`)
          logToDebug(`Sample data: ${JSON.stringify(processedData.slice(0, 2), null, 2)}`)
        }
      } catch (error) {
        logToDebug(`Error: ${error instanceof Error ? error.message : String(error)}`)
        console.error('Error fetching or processing data:', error)
        setData([]) // Set empty array on error
      } finally {
        setLoading(false)
        logToDebug('Data loading completed')
      }
    }

    fetchData()
  }, [dataFunction])

  // Handle global filter changes
  React.useEffect(() => {
    console.log('🔍 Visual page - Processing global filters:', globalFilters)
    console.log('📊 Visual page - Processed data:', processedData)
    
    if (globalFilters.length > 0 && processedData) {
      const filteredResult = filterService.applyFilters(processedData, globalFilters)
      console.log('✅ Visual page - Filter result:', filteredResult)
      setData(filteredResult.data)
      logToDebug(`Applied global filters: ${filteredResult.appliedFilters.join(', ')}`)
      logToDebug(`Filtered data: ${filteredResult.filteredCount} of ${filteredResult.totalCount} items`)
    } else if (processedData) {
      console.log('📊 Visual page - No filters, using original data')
      setData(processedData)
    }
  }, [globalFilters, processedData])

  if (loading) {
    return React.createElement(Card, { className: "w-full" },
      React.createElement(CardContent, { className: "flex items-center justify-center h-64" },
        React.createElement('div', { className: "text-foreground" }, "Loading...")
      )
    )
  }

  


  // Table view component
  const renderTableView = (tableData: any[]) => {
    if (!tableData || tableData.length === 0) {
      return React.createElement('div', { className: "text-center p-4 text-muted-foreground" }, "No data available")
    }

    // Handle scatter chart data structure
    if (tableData.length > 0 && tableData[0].location && tableData[0].data) {
      // Scatter chart format: [{location, data}]
      return React.createElement('div', { className: "space-y-4" },
        tableData.map((locationData, locationIndex) => 
          React.createElement('div', { key: locationData.location, className: "border rounded-lg overflow-hidden" },
            React.createElement('div', { className: "bg-muted px-4 py-2 font-medium border-b" }, 
              `${locationData.location} (${locationData.data.length} data points)`
            ),
            React.createElement('div', { className: "overflow-x-auto" },
              React.createElement('table', { className: "w-full border-collapse border border-border" },
                React.createElement('thead', {},
                  React.createElement('tr', { className: "bg-muted/50" },
                    React.createElement('th', { className: "border border-border px-4 py-2 text-left font-medium" }, "Wind Speed (mph)"),
                    React.createElement('th', { className: "border border-border px-4 py-2 text-left font-medium" }, "Power Output (kW)")
                  )
                ),
                React.createElement('tbody', {},
                  locationData.data.map((point: any, pointIndex: number) => 
                    React.createElement('tr', { key: pointIndex, className: "hover:bg-muted/50" },
                      React.createElement('td', { className: "border border-border px-4 py-2" }, 
                        String(point.windSpeed || point.x || '')
                      ),
                      React.createElement('td', { className: "border border-border px-4 py-2" }, 
                        String(point.powerOutput || point.y || '')
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    }

    // Handle regular array data
    const headers = Object.keys(tableData[0] || {})
    
    return React.createElement('div', { className: "overflow-x-auto" },
      React.createElement('table', { className: "w-full border-collapse border border-border" },
        React.createElement('thead', {},
          React.createElement('tr', { className: "bg-muted" },
            headers.map((header, index) => 
              React.createElement('th', { 
                key: index, 
                className: "border border-border px-4 py-2 text-left font-medium" 
              }, header)
            )
          )
        ),
        React.createElement('tbody', {},
          tableData.map((row, rowIndex) => 
            React.createElement('tr', { key: rowIndex, className: "hover:bg-muted/50" },
              headers.map((header, colIndex) => 
                React.createElement('td', { 
                  key: colIndex, 
                  className: "border border-border px-4 py-2" 
                }, String(row[header] || ''))
              )
            )
          )
        )
      )
    )
  }
    
  // View mode toggle
  const renderViewToggle = () => {
    return React.createElement(DropdownMenu, {},
      React.createElement(DropdownMenuTrigger, { asChild: true },
        React.createElement(Button, { variant: "outline", className: "mb-4" },
          React.createElement(Eye, { className: "w-4 h-4 mr-2" }),
          "View Mode"
        )
      ),
      React.createElement(DropdownMenuContent, {},
        React.createElement(DropdownMenuItem, {
          onClick: () => setViewMode('visual')
        },
          React.createElement(Eye, { className: "w-4 h-4 mr-2" }),
          "Visual"
        ),
        React.createElement(DropdownMenuItem, {
          onClick: () => setViewMode('table')
        },
          React.createElement(Table, { className: "w-4 h-4 mr-2" }),
          "Table"
        )
      )
    )
  }

  try {
    // Ensure data is an array and has content
    const safeData = Array.isArray(data) ? data : []
    
    if (safeData.length === 0) {
      return React.createElement('div', {},
        React.createElement(Card, { className: "w-full" },
          React.createElement(CardContent, { className: "flex items-center justify-center h-64" },
            React.createElement('div', { className: "text-foreground" }, "No data available")
          )
        ),
      )
    }

    // Extract chart type from component code (simple heuristic)
    const chartType = componentCode.toLowerCase().includes('linechart') ? 'line' :
                     componentCode.toLowerCase().includes('barchart') ? 'bar' :
                     componentCode.toLowerCase().includes('piechart') ? 'pie' :
                     componentCode.toLowerCase().includes('areachart') ? 'area' :
                     componentCode.toLowerCase().includes('scatterchart') ? 'scatter' : 'line'

    // Create a dynamic component based on the chart type
    const createChartComponent = (chartType: string, chartData: any[]) => {
      // Determine the data structure
      const firstItem = chartData[0] || {}
      const hasLocation = 'location' in firstItem
      const hasStatus = 'Active' in firstItem || 'Warning' in firstItem || 'Offline' in firstItem
      const hasNameValue = 'name' in firstItem && 'value' in firstItem
      const hasTime = 'time' in firstItem
      const hasTurbineIds = Object.keys(firstItem).some(key => key.startsWith('WTG-'))

      switch (chartType.toLowerCase()) {
        case 'line':
          if (hasTime && hasTurbineIds) {
            // Gearbox temperature chart with time on x-axis and turbine temperatures on y-axis
            const turbineIds = Object.keys(firstItem).filter(key => key.startsWith('WTG-'))
            const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
            
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(LineChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                data: chartData, 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  dataKey: "time",
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Time', 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, {
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Temperature (°C)', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, {
                  cursor: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  },
                  formatter: (value: any, name: any) => [`${value}°C`, name]
                }),
                React.createElement(Legend as any, {
                  verticalAlign: "top",
                  height: 36
                }),
                turbineIds.map((turbineId, index) => 
                  React.createElement(Line, { 
                    key: turbineId,
                    type: "monotone", 
                    dataKey: turbineId, 
                    stroke: colors[index % colors.length], 
                    strokeWidth: 2,
                    dot: false,
                    activeDot: { r: 6 },
                    name: turbineId
                  })
                )
              )
            )
          } else if (hasLocation && hasStatus) {
            // Stacked line chart for status by location
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(LineChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                data: chartData, 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  dataKey: "location",
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Location', 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, {
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Count', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, {
                  cursor: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Legend as any, {
                  verticalAlign: "top"
                }),
                React.createElement(Line, { 
                  type: "monotone", 
                  dataKey: "Active", 
                  stroke: "#22c55e", 
                  activeDot: { r: 8 },
                  name: "Active"
                }),
                React.createElement(Line, { 
                  type: "monotone", 
                  dataKey: "Warning", 
                  stroke: "#f59e0b", 
                  activeDot: { r: 8 },
                  name: "Warning"
                }),
                React.createElement(Line, { 
                  type: "monotone", 
                  dataKey: "Offline", 
                  stroke: "#ef4444", 
                  activeDot: { r: 8 },
                  name: "Offline"
                })
              )
            )
          } else if (hasNameValue) {
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(LineChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                data: chartData, 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  dataKey: "name",
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Category', 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, {
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Value', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, {
                  cursor: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Line, { 
                  type: "monotone", 
                  dataKey: "value", 
                  stroke: "#8884d8", 
                  activeDot: { r: 8 },
                  name: "Value"
                })
              )
            )
          } else {
            // Default line chart
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(LineChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                data: chartData, 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  dataKey: "name",
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Category', 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, {
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Value', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, {
                  cursor: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Line, { 
                  type: "monotone", 
                  dataKey: "value", 
                  stroke: "#8884d8", 
                  activeDot: { r: 8 },
                  name: "Value"
                })
              )
            )
          }
        
        case 'bar':
          if (hasLocation && hasStatus) {
            // Stacked bar chart for status by location
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(BarChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                data: chartData, 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  dataKey: "location",
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Location', 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, {
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Count', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, {
                  cursor: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Bar, { 
                  dataKey: "Active", 
                  fill: "#22c55e", 
                  stackId: "a",
                  name: "Active"
                }),
                React.createElement(Bar, { 
                  dataKey: "Warning", 
                  fill: "#f59e0b", 
                  stackId: "a",
                  name: "Warning"
                }),
                React.createElement(Bar, { 
                  dataKey: "Offline", 
                  fill: "#ef4444", 
                  stackId: "a",
                  name: "Offline"
                })
              )
            )
          } else if (hasNameValue) {
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(BarChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                data: chartData, 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  dataKey: "name",
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Category', 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, {
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Value', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, {
                  cursor: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Bar, { 
                  dataKey: "value", 
                  fill: "#8884d8",
                  name: "Value"
                })
              )
            )
          } else {
            // Default bar chart
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(BarChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                data: chartData, 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  dataKey: "name",
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Category', 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, {
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Value', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, {
                  cursor: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Bar, { 
                  dataKey: "value", 
                  fill: "#8884d8",
                  name: "Value"
                })
              )
            )
          }
        
        case 'pie':
          if (hasLocation && hasStatus) {
            // Convert to pie chart format
            const pieData = chartData.flatMap(item => [
              { name: `${item.location} - Active`, value: item.Active || 0 },
              { name: `${item.location} - Warning`, value: item.Warning || 0 },
              { name: `${item.location} - Offline`, value: item.Offline || 0 }
            ]).filter(item => item.value > 0)
            
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(PieChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180),
                margin: { top: 15, right: 20, left: 15, bottom: 15 }
              },
                React.createElement(Pie,
                  { 
                    data: pieData, 
                    cx: 400, 
                    cy: 200, 
                    labelLine: false, 
                    label: ({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`, 
                    outerRadius: 120, 
                    fill: "#8884d8", 
                    dataKey: "value",
                    nameKey: "name"
                  },
                  pieData.map((entry, index) => React.createElement(Cell, { 
                    key: `cell-${index}`, 
                    fill: `hsl(${index * 60}, 70%, 50%)` 
                  }))
                ),
                React.createElement(Tooltip, {
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Legend as any, {
                  verticalAlign: "bottom"
                })
              )
            )
          } else if (hasNameValue) {
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(AreaChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                data: chartData, 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  dataKey: "name",
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Category', 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, {
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Value', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, {
                  cursor: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Area, { 
                  type: "monotone", 
                  dataKey: "value", 
                  stroke: "#8884d8", 
                  fill: "#8884d8",
                  name: "Value"
                })
              )
            )
          } else {
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(AreaChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                data: chartData, 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  dataKey: "name",
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Category', 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, {
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Value', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, {
                  cursor: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Area, { 
                  type: "monotone", 
                  dataKey: "value", 
                  stroke: "#8884d8", 
                  fill: "#8884d8",
                  name: "Value"
                })
              )
            )
          }
        
        case 'scatter':
          // Handle scatter chart data structure
          if (Array.isArray(chartData) && chartData.length > 0 && chartData[0].location && chartData[0].data) {
            // New format: array of {location, data} objects
            // Determine data keys from the first data point
            const firstDataPoint = chartData[0].data[0] || {}
            const xKey = Object.keys(firstDataPoint).find(key => typeof firstDataPoint[key] === 'number') || 'x'
            const yKey = Object.keys(firstDataPoint).find(key => key !== xKey && typeof firstDataPoint[key] === 'number') || 'y'
            
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(ScatterChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  type: "number", 
                  dataKey: xKey, 
                  name: xKey,
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: xKey, 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, { 
                  type: "number", 
                  dataKey: yKey, 
                  name: yKey,
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: yKey, 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, { 
                  cursor: { strokeDasharray: "3 3", stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Legend as any, {
                  verticalAlign: "top"
                }),
                chartData.map((locationData, index) => 
                  React.createElement(Scatter, { 
                    key: locationData.location,
                    name: locationData.location, 
                    data: locationData.data, 
                    fill: `hsl(${index * 60}, 70%, 50%)`,
                    stroke: `hsl(${index * 60}, 70%, 50%)`,
                    strokeWidth: 1
                  })
                )
              )
            )
          } else {
            // Fallback for old format
            // Determine data keys from the first data point
            const firstDataPoint = chartData[0] || {}
            const xKey = Object.keys(firstDataPoint).find(key => typeof firstDataPoint[key] === 'number') || 'x'
            const yKey = Object.keys(firstDataPoint).find(key => key !== xKey && typeof firstDataPoint[key] === 'number') || 'y'
            
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(ScatterChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  type: "number", 
                  dataKey: xKey, 
                  name: xKey,
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: xKey, 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, { 
                  type: "number", 
                  dataKey: yKey, 
                  name: yKey,
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: yKey, 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, { 
                  cursor: { strokeDasharray: "3 3", stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Legend as any, {
                  verticalAlign: "top"
                }),
                React.createElement(Scatter, { 
                  name: "Data", 
                  data: chartData, 
                  fill: "#8884d8",
                  stroke: "#8884d8",
                  strokeWidth: 1
                })
              )
            )
          }
        
        default:
          // Default to bar chart for status data
          if (hasLocation && hasStatus) {
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(BarChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                data: chartData, 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  dataKey: "location",
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Location', 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, {
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Count', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, {
                  cursor: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Bar, { 
                  dataKey: "Active", 
                  fill: "#22c55e", 
                  stackId: "a",
                  name: "Active"
                }),
                React.createElement(Bar, { 
                  dataKey: "Warning", 
                  fill: "#f59e0b", 
                  stackId: "a",
                  name: "Warning"
                }),
                React.createElement(Bar, { 
                  dataKey: "Offline", 
                  fill: "#ef4444", 
                  stackId: "a",
                  name: "Offline"
                })
              )
            )
          } else {
            return React.createElement('div', { className: "w-full h-full" },
              React.createElement(LineChart, { 
                width: Math.min(chartSize.width, 300), 
                height: Math.min(chartSize.height, 180), 
                data: chartData, 
                margin: { top: 15, right: 20, left: 15, bottom: 15 } 
              },
                React.createElement(CartesianGrid, { 
                  stroke: "hsl(var(--border))", 
                  strokeDasharray: "3 3" 
                }),
                React.createElement(XAxis, { 
                  dataKey: "name",
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Category', 
                    position: 'insideBottom', 
                    offset: -10, 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(YAxis, {
                  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                  axisLine: { stroke: 'hsl(var(--border))' },
                  label: { 
                    value: 'Value', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } 
                  }
                }),
                React.createElement(Tooltip, {
                  cursor: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' },
                  contentStyle: {
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: '12px'
                  }
                }),
                React.createElement(Line, { 
                  type: "monotone", 
                  dataKey: "value", 
                  stroke: "#8884d8", 
                  activeDot: { r: 8 },
                  name: "Value"
                })
              )
            )
          }
      }
    }

    // Create the chart component
    const ChartComponent = createChartComponent(chartType, safeData)
    
    return React.createElement('div', { className: "w-full h-full flex items-center justify-center" },
      viewMode === 'visual' 
        ? React.createElement('div', { className: "flex items-center justify-center" }, ChartComponent)
        : renderTableView(safeData)
    )
  } catch (error) {
    console.error('Error rendering component:', error)
    return React.createElement('div', {},
      React.createElement('div', { className: "text-red-500 p-4" },
      React.createElement('div', { className: "font-medium mb-2" }, "Component Error:"),
      React.createElement('div', { className: "text-sm" }, error instanceof Error ? error.message : String(error))
      ),
    )
  }
}

interface DashboardPageProps {
  params: Promise<{
    id: string
  }>
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const resolvedParams = React.use(params)
  const [dashboard, setDashboard] = useState<GeneratedDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartSize, setChartSize] = useState({ width: 350, height: 200 })

  useEffect(() => {
    // Get size from URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const width = parseInt(urlParams.get('width') || '350')
    const height = parseInt(urlParams.get('height') || '200')
    setChartSize({ width, height })
  }, [])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // Load all dashboards from API
        const response = await fetch('/api/dashboards')
        if (!response.ok) {
          throw new Error('Failed to load dashboards')
        }
        
        const dashboards = await response.json()
        const dashboardData = dashboards.find((d: any) => d.id === resolvedParams.id)
        
        if (!dashboardData) {
          setError('Dashboard not found')
          setLoading(false)
          return
        }

        setDashboard(dashboardData)
      } catch (err) {
        console.error('Error loading dashboard:', err)
        setError('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [resolvedParams.id])

  const handleRefresh = () => {
    setLoading(true)
    setError(null)
    // Reload the page to get fresh data
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-foreground mb-2">Loading Dashboard...</div>
          <div className="text-sm text-muted-foreground">Please wait while we load your dashboard</div>
        </div>
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-foreground mb-2">Error</div>
          <div className="text-sm text-muted-foreground mb-4">{error || 'Dashboard not found'}</div>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-background flex items-center justify-center">
      <ComponentRenderer componentCode={dashboard.componentCode} dataFunction={dashboard.dataFunction} chartSize={chartSize} />
    </div>
  )
} 