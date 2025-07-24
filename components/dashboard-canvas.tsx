"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Eye, Pencil, Filter } from "lucide-react"
import { DashboardComponentRenderer } from "./dashboard-component"
import { cn } from "@/lib/utils"
import {
  type DashboardComponent,
  type DashboardState,
  saveDashboardState,
  loadDashboardState,
  generateComponentId,
  findOptimalPosition,
  cleanupLayout,
} from "@/lib/dashboard-state"
import { SavedDashboardsService, type SavedDashboard } from "@/lib/saved-dashboards-service"
import { SavedDashboardIframe } from "./saved-dashboard-iframe"
import { DashboardFilterPanel, type FilterGroup, type GlobalFilterState } from "./dashboard-filter-panel"
import { FilterService } from "@/lib/filter-service"

interface DashboardCanvasProps {
  className?: string
  onAddComponent?: () => void
  onOpenChat?: () => void
  onComponentAdded?: (componentData: any) => void
  setAddComponentRef?: (addComponentFn: (componentData: any) => void) => void
  setSaveDashboardRef?: (saveDashboardFn: (dashboardId: string, name: string) => void) => void
}

export function DashboardCanvas({ className, onAddComponent, onOpenChat, onComponentAdded, setAddComponentRef, setSaveDashboardRef }: DashboardCanvasProps) {
  const [isEditMode, setIsEditMode] = useState(true)
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    components: [],
    layout: {
      columns: 12,
      rowHeight: 100,
      margin: 16,
    },
    lastSaved: new Date(),
  })
  const [draggedComponent, setDraggedComponent] = useState<string | null>(null)
  const [draggedSavedDashboard, setDraggedSavedDashboard] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [savedDashboards, setSavedDashboards] = useState<SavedDashboard[]>([])
  const [filteredDashboards, setFilteredDashboards] = useState<SavedDashboard[]>([])
  const [activeFilters, setActiveFilters] = useState<FilterGroup[]>([])
  const [globalFilterState, setGlobalFilterState] = useState<GlobalFilterState>({
    globalFilters: [],
    dashboardFilters: [],
    selectedDashboards: []
  })
  const [dashboardFilters, setDashboardFilters] = useState<Map<string, FilterGroup[]>>(new Map())
  const canvasRef = useRef<HTMLDivElement>(null)
  const previousSavedDashboardsRef = useRef<SavedDashboard[]>([])
  const filterService = FilterService.getInstance()

  // Load view mode and filters from session storage on mount
  useEffect(() => {
    try {
      // Load view mode
      const savedViewMode = sessionStorage.getItem('dashboard-view-mode')
      if (savedViewMode) {
        setIsEditMode(savedViewMode === 'edit')
      }

      // Load filters
      const savedFilters = sessionStorage.getItem('dashboard-filters')
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters)
        setActiveFilters(parsedFilters)
      }

      // Load global filter state
      const savedGlobalFilterState = sessionStorage.getItem('dashboard-global-filter-state')
      if (savedGlobalFilterState) {
        const parsedGlobalFilterState = JSON.parse(savedGlobalFilterState)
        setGlobalFilterState(parsedGlobalFilterState)
      }
    } catch (error) {
      console.error('Error loading state from session storage:', error)
    }
  }, [])

  // Save view mode to session storage when it changes
  useEffect(() => {
    try {
      sessionStorage.setItem('dashboard-view-mode', isEditMode ? 'edit' : 'view')
    } catch (error) {
      console.error('Error saving view mode to session storage:', error)
    }
  }, [isEditMode])

  // Save filters to session storage when they change
  useEffect(() => {
    try {
      sessionStorage.setItem('dashboard-filters', JSON.stringify(activeFilters))
    } catch (error) {
      console.error('Error saving filters to session storage:', error)
    }
  }, [activeFilters])

  // Save global filter state to session storage when it changes
  useEffect(() => {
    try {
      sessionStorage.setItem('dashboard-global-filter-state', JSON.stringify(globalFilterState))
    } catch (error) {
      console.error('Error saving global filter state to session storage:', error)
    }
  }, [globalFilterState])

  // Calculate dynamic canvas height based on content
  const calculateCanvasHeight = () => {
    const totalItems = dashboardState.components.length + filteredDashboards.length
    if (totalItems === 0) return 400 // Minimum height for empty state
    
    // Calculate rows needed (4 items per row for saved dashboards)
    const savedDashboardRows = Math.ceil(filteredDashboards.length / 4)
    const componentRows = Math.ceil(dashboardState.components.length / 4)
    const totalRows = Math.max(savedDashboardRows, componentRows, 1)
    
    // Each row needs 120px height + 20px margin
    const rowHeight = 140
    const minHeight = 400
    const calculatedHeight = Math.max(totalRows * rowHeight + 100, minHeight)
    
    return calculatedHeight
  }

  const canvasHeight = calculateCanvasHeight()

  // Apply filters to dashboards
  useEffect(() => {
    if (activeFilters.length === 0) {
      setFilteredDashboards(savedDashboards)
      return
    }

    const filtered = savedDashboards.filter(dashboard => {
      return activeFilters.every(group => {
        if (group.filters.length === 0) return true

        const groupMatches = group.logic === 'AND' 
          ? group.filters.every(filter => applyFilter(dashboard, filter))
          : group.filters.some(filter => applyFilter(dashboard, filter))

        return groupMatches
      })
    })

    setFilteredDashboards(filtered)
  }, [savedDashboards, activeFilters])

  const applyFilter = (dashboard: SavedDashboard, filter: any) => {
    const text = `${dashboard.name} ${dashboard.dashboardId}`.toLowerCase()
    
    switch (filter.type) {
      case 'text':
        if (!filter.value || filter.value.trim() === '') return true
        return text.includes(filter.value.toLowerCase())
      
      case 'date':
        if (!filter.value.start || !filter.value.end) return true
        const dashboardDate = new Date(dashboard.createdAt || dashboard.updatedAt || Date.now())
        return dashboardDate >= filter.value.start && dashboardDate <= filter.value.end
      
      case 'location':
        if (filter.value.length === 0) return true
        return filter.value.some((location: string) => 
          text.includes(location.toLowerCase())
        )
      
      case 'status':
        if (filter.value.length === 0) return true
        return filter.value.some((status: string) => 
          text.includes(status.toLowerCase())
        )
      
      case 'turbine':
        if (filter.value.length === 0) return true
        return filter.value.some((turbine: string) => 
          text.includes(turbine.toLowerCase())
        )
      
      case 'correlation':
        if (filter.value.length === 0) return true
        return filter.value.some((correlation: string) => 
          text.includes(correlation.toLowerCase())
        )
      
      default:
        return true
    }
  }

  const handleFiltersChange = React.useCallback((filters: FilterGroup[]) => {
    setActiveFilters(filters)
  }, [])

  const handleGlobalFilterChange = React.useCallback((filterState: GlobalFilterState) => {
    setGlobalFilterState(filterState)
  }, [])

  const handleDashboardFilterChange = React.useCallback((dashboardId: string, filters: FilterGroup[]) => {
    setDashboardFilters(prev => {
      const newMap = new Map(prev)
      newMap.set(dashboardId, filters)
      return newMap
    })
  }, [])

  const handleDashboardSelectionChange = React.useCallback((dashboardIds: string[]) => {
    setGlobalFilterState(prev => ({
      ...prev,
      selectedDashboards: dashboardIds
    }))
  }, [])

  // Load dashboard state and saved dashboards on mount
  useEffect(() => {
    const loadState = async () => {
      setIsLoading(true)
      try {
        const [saved, savedDashboardsData] = await Promise.all([
          loadDashboardState(),
          SavedDashboardsService.getInstance().getAllSavedDashboards()
        ])
        
        if (saved) {
          setDashboardState(saved)
        }
        
        setSavedDashboards(savedDashboardsData)
        previousSavedDashboardsRef.current = savedDashboardsData
      } catch (error) {
        console.error("Failed to load dashboard state:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadState()
  }, [])

  // Convert saved-component type components to saved dashboard iframes
  useEffect(() => {
    if (dashboardState.components.length === 0) return

    const savedComponentIds = dashboardState.components
      .filter(component => component.type === 'saved-component')
      .map(component => component.data.dashboardId)

    if (savedComponentIds.length > 0) {
      // Remove saved-component type components from dashboard state
      const filteredComponents = dashboardState.components.filter(
        component => component.type !== 'saved-component'
      )
      
      if (filteredComponents.length !== dashboardState.components.length) {
        setDashboardState(prev => ({
          ...prev,
          components: filteredComponents
        }))
      }
    }
  }, [dashboardState.components])

  // Set the addComponent function reference
  useEffect(() => {
    if (setAddComponentRef) {
      setAddComponentRef(addComponent)
    }
  }, [setAddComponentRef])

  // Set the saveDashboard function reference
  useEffect(() => {
    if (setSaveDashboardRef) {
      setSaveDashboardRef(handleSaveDashboard)
    }
  }, [setSaveDashboardRef])

  // Save dashboard state only when components change (with debounce)
  useEffect(() => {
    if (isLoading) return // Don't save during initial load

    const timeoutId = setTimeout(async () => {
      const stateToSave = {
        ...dashboardState,
        lastSaved: new Date(),
      }

      await saveDashboardState(stateToSave)
    }, 1000) // Debounce saves

    return () => clearTimeout(timeoutId)
  }, [dashboardState.components, dashboardState.layout]) // Only save when components or layout change

  const toggleMode = () => {
    setIsEditMode(!isEditMode)
  }

  const addComponent = (componentData: Partial<DashboardComponent>) => {
    const newComponent: DashboardComponent = {
      id: generateComponentId(),
      type: componentData.type || "kpi",
      title: componentData.title || "New Component",
      position: findOptimalPosition(dashboardState.components, componentData.size || { width: 3, height: 200 }),
      size: componentData.size || { width: 3, height: 200 },
      data: componentData.data || {},
      config: componentData.config || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setDashboardState((prev) => ({
      ...prev,
      components: [...prev.components, newComponent],
    }))

    // Call the callback if provided
    if (onComponentAdded) {
      onComponentAdded(newComponent)
    }
  }

  const deleteComponent = (id: string) => {
    setDashboardState((prev) => ({
      ...prev,
      components: cleanupLayout(prev.components.filter((c) => c.id !== id)),
    }))
  }

  const updateComponent = (id: string, updates: Partial<DashboardComponent>) => {
    setDashboardState((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c)),
    }))
  }

  const handleSaveDashboard = async (dashboardId: string, name: string) => {
    const service = SavedDashboardsService.getInstance()
    
    // Get the latest saved dashboards from the service to ensure we have the most up-to-date data
    const latestSavedDashboards = await service.getAllSavedDashboards()
    
    const position = service.findOptimalPosition(latestSavedDashboards, { width: 6, height: 300 })
    
    const savedDashboard = await service.saveDashboard({
      dashboardId,
      name,
      position,
      size: { width: 6, height: 300 }
    })

    if (savedDashboard) {
      const newSavedDashboards = [...latestSavedDashboards, savedDashboard]
      setSavedDashboards(newSavedDashboards)
      previousSavedDashboardsRef.current = newSavedDashboards
    }
  }

  const handleDeleteSavedDashboard = async (id: string) => {
    const service = SavedDashboardsService.getInstance()
    const success = await service.deleteSavedDashboard(id)
    
    if (success) {
      const newSavedDashboards = savedDashboards.filter(d => d.id !== id)
      
      // Optimize layout by repositioning remaining dashboards
      const optimizedDashboards = await optimizeSavedDashboardLayout(newSavedDashboards, service)
      
      setSavedDashboards(optimizedDashboards)
      previousSavedDashboardsRef.current = optimizedDashboards
      
      // Reload the page after successful deletion and layout optimization
      window.location.reload()
    }
  }

  const optimizeSavedDashboardLayout = async (dashboards: SavedDashboard[], service: SavedDashboardsService): Promise<SavedDashboard[]> => {
    if (dashboards.length === 0) return dashboards
    
    // Sort dashboards by creation date to maintain order
    const sortedDashboards = [...dashboards].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    
    const optimizedDashboards: SavedDashboard[] = []
    
    for (let i = 0; i < sortedDashboards.length; i++) {
      const dashboard = sortedDashboards[i]
      const optimalPosition = service.findOptimalPosition(optimizedDashboards, dashboard.size)
      
      // Update the dashboard with the optimal position
      const updatedDashboard = await service.updateSavedDashboard(dashboard.id, {
        position: optimalPosition
      })
      
      if (updatedDashboard) {
        optimizedDashboards.push(updatedDashboard)
      } else {
        // Fallback to original position if update fails
        optimizedDashboards.push(dashboard)
      }
    }
    
    return optimizedDashboards
  }

  const handleUpdateSavedDashboard = async (id: string, updates: Partial<SavedDashboard>) => {
    const service = SavedDashboardsService.getInstance()
    const updated = await service.updateSavedDashboard(id, updates)
    
    if (updated) {
      const newSavedDashboards = savedDashboards.map(d => d.id === id ? updated : d)
      setSavedDashboards(newSavedDashboards)
      previousSavedDashboardsRef.current = newSavedDashboards
    }
  }

  const handleMouseDown = (e: React.MouseEvent, componentId: string) => {
    if (!isEditMode) return

    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setDraggedComponent(componentId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isEditMode || !draggedComponent || !canvasRef.current) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const gridSize = canvasRect.width / dashboardState.layout.columns

    const newX = Math.round((e.clientX - canvasRect.left - dragOffset.x) / gridSize)
    const newY = Math.round((e.clientY - canvasRect.top - dragOffset.y) / dashboardState.layout.rowHeight)

    // Constrain to grid bounds
    const constrainedX = Math.max(0, Math.min(newX, dashboardState.layout.columns - 3))
    const constrainedY = Math.max(0, newY)

    updateComponent(draggedComponent, {
      position: { x: constrainedX, y: constrainedY },
    })
  }

  const handleMouseUp = () => {
    if (draggedComponent) {
      // Cleanup layout to prevent overlaps
      setDashboardState((prev) => ({
        ...prev,
        components: cleanupLayout(prev.components),
      }))
      setDraggedComponent(null)
    }
  }

  // Saved dashboard drag and drop handlers
  const handleSavedDashboardDragStart = (e: React.MouseEvent, dashboardId: string) => {
    if (!isEditMode) return
    e.preventDefault()
    setDraggedSavedDashboard(dashboardId)
  }

  const handleSavedDashboardDragOver = (e: React.MouseEvent, dashboardId: string) => {
    if (!isEditMode || !draggedSavedDashboard || draggedSavedDashboard === dashboardId) return
    e.preventDefault()
  }

  const handleSavedDashboardDrop = async (e: React.MouseEvent, targetDashboardId: string) => {
    if (!isEditMode || !draggedSavedDashboard || draggedSavedDashboard === targetDashboardId) return
    e.preventDefault()
    
    // Swap positions between the dragged dashboard and target dashboard
    const draggedDashboard = savedDashboards.find(d => d.id === draggedSavedDashboard)
    const targetDashboard = savedDashboards.find(d => d.id === targetDashboardId)
    
    if (draggedDashboard && targetDashboard) {
      const service = SavedDashboardsService.getInstance()
      
      // Update both dashboards with their new positions
      const [updatedDragged, updatedTarget] = await Promise.all([
        service.updateSavedDashboard(draggedSavedDashboard, { position: targetDashboard.position }),
        service.updateSavedDashboard(targetDashboardId, { position: draggedDashboard.position })
      ])
      
      if (updatedDragged && updatedTarget) {
        const newSavedDashboards = savedDashboards.map(d => {
          if (d.id === draggedSavedDashboard) return updatedDragged
          if (d.id === targetDashboardId) return updatedTarget
          return d
        })
        
        setSavedDashboards(newSavedDashboards)
        previousSavedDashboardsRef.current = newSavedDashboards
      }
    }
    
    setDraggedSavedDashboard(null)
  }

  const getComponentStyle = (component: DashboardComponent) => {
    const gridSize = 100 / dashboardState.layout.columns // percentage
    return {
      position: "absolute" as const,
      left: `${component.position.x * gridSize}%`,
      top: `${component.position.y * dashboardState.layout.rowHeight + component.position.y * dashboardState.layout.margin}px`,
      width: `calc(${component.size.width * gridSize}% - ${dashboardState.layout.margin}px)`,
      height: `${component.size.height}px`,
      zIndex: draggedComponent === component.id ? 1000 : 1,
    }
  }

  // Expose addComponent function to parent
  useEffect(() => {
    if (onAddComponent) {
      ;(window as any).addDashboardComponent = addComponent
    }
  }, [onAddComponent])

  if (isLoading) {
    return (
      <div className={cn("relative", className)}>
        <div className="min-h-[400px] rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* Filter Panel */}
      <div className="mb-6">
        <DashboardFilterPanel
          dashboards={savedDashboards.map(dashboard => ({
            id: dashboard.id,
            name: dashboard.name,
            description: `Dashboard ${dashboard.dashboardId}`,
            createdAt: dashboard.createdAt,
            updatedAt: dashboard.updatedAt
          }))}
          onFiltersChange={handleFiltersChange}
          onGlobalFilterChange={handleGlobalFilterChange}
          onDashboardFilterChange={handleDashboardFilterChange}
          selectedDashboards={globalFilterState.selectedDashboards}
          onDashboardSelectionChange={handleDashboardSelectionChange}
          mode="both"
        />
      </div>

      {/* Mode Toggle Button - moved above canvas */}
      <div className="flex items-center justify-end mb-4">
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800 mr-2">
            <Filter className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {filteredDashboards.length} of {savedDashboards.length}
            </span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMode}
          className="bg-white/90 dark:bg-black/90 backdrop-blur-sm border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-black"
          title={isEditMode ? "Switch to View Mode" : "Switch to Edit Mode"}
        >
          {isEditMode ? (
            <Eye className="w-4 h-4" />
          ) : (
            <Pencil className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className={cn(
          "rounded-lg border border-gray-200 dark:border-gray-800 transition-all duration-200 relative overflow-hidden bg-white dark:bg-black",
        )}
        style={{ minHeight: `${canvasHeight}px` }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {dashboardState.components.length === 0 && filteredDashboards.length === 0 ? (
          <div className="flex items-center justify-center h-full" style={{ minHeight: `${canvasHeight}px` }}>
            <div className="text-center max-w-md">
              <div className="mx-auto mb-6 flex items-center justify-center">
                <Image 
                  src="/blank.png" 
                  alt="Add Component" 
                  width={100} 
                  height={100} 
                  className="w-40 h-30"
                />
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Add a Dashboard Component here
              </h3>
              <Button
                variant="link"
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-0 h-auto"
                onClick={onOpenChat}
              >
                Generate Visualization
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Grid overlay in edit mode */}
            {isEditMode && (
              <div className="absolute inset-0 pointer-events-none opacity-5">
                <div className="grid grid-cols-12 h-full">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="border-r border-gray-400 dark:border-gray-600" />
                  ))}
                </div>
              </div>
            )}

            {/* Dashboard Components */}
            {dashboardState.components.map((component) => (
              <div
                key={component.id}
                style={getComponentStyle(component)}
                onMouseDown={(e) => handleMouseDown(e, component.id)}
              >
                <DashboardComponentRenderer
                  component={component}
                  onDelete={deleteComponent}
                  onUpdate={updateComponent}
                  isDragging={draggedComponent === component.id}
                  isEditMode={isEditMode}
                />
              </div>
            ))}

            {/* Saved Dashboard Iframes */}
            {filteredDashboards.map((savedDashboard) => (
              <SavedDashboardIframe
                key={savedDashboard.id}
                savedDashboard={savedDashboard}
                onDelete={handleDeleteSavedDashboard}
                onUpdate={handleUpdateSavedDashboard}
                isEditMode={isEditMode}
                onDragStart={handleSavedDashboardDragStart}
                onDragOver={handleSavedDashboardDragOver}
                onDrop={handleSavedDashboardDrop}
                draggedDashboardId={draggedSavedDashboard}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
