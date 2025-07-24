"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, X, BarChart3, PieChart, TrendingUp, Activity, Filter } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { DashboardComponent } from "@/lib/dashboard-state"
import { cn } from "@/lib/utils"
import { DataService } from "@/lib/data-service"
import { DashboardInlineFilter } from "./dashboard-inline-filter"
import type { FilterGroup } from "./dashboard-filter-panel"
import { FilterService } from "@/lib/filter-service"
import { SavedDashboardIframe } from './saved-dashboard-iframe'
import { SavedDashboardsService, type SavedDashboard } from '@/lib/saved-dashboards-service'

interface DashboardComponentProps {
  component: DashboardComponent
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<DashboardComponent>) => void
  isDragging?: boolean
  isEditMode?: boolean
}

export function DashboardComponentRenderer({
  component,
  onDelete,
  onUpdate,
  isDragging,
  isEditMode = true,
}: DashboardComponentProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [realData, setRealData] = useState<any>(null)
  const [dashboardFilters, setDashboardFilters] = useState<FilterGroup[]>([])
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [savedDashboard, setSavedDashboard] = useState<SavedDashboard | null>(null)
  const filterService = FilterService.getInstance()

  // Load saved dashboard data if this is a saved-component
  useEffect(() => {
    if (component.type === 'saved-component' && component.data.dashboardId) {
      const loadSavedDashboard = async () => {
        try {
          const service = SavedDashboardsService.getInstance()
          const allDashboards = await service.getAllSavedDashboards()
          const dashboard = allDashboards.find(d => d.dashboardId === component.data.dashboardId)
          if (dashboard) {
            setSavedDashboard(dashboard)
          }
        } catch (error) {
          console.error('Failed to load saved dashboard:', error)
        }
      }
      loadSavedDashboard()
    }
  }, [component.type, component.data.dashboardId])

  // If this is a saved-component and we have the saved dashboard data, render as iframe
  if (component.type === 'saved-component' && savedDashboard) {
    return (
      <SavedDashboardIframe
        savedDashboard={savedDashboard}
        onDelete={onDelete}
        onUpdate={(id, updates) => {
          // Convert SavedDashboard updates to DashboardComponent updates
          const componentUpdates: Partial<DashboardComponent> = {
            title: updates.name,
            data: {
              ...component.data,
              ...updates
            }
          }
          onUpdate(id, componentUpdates)
        }}
        isEditMode={isEditMode}
      />
    )
  }

  const handleFiltersChange = useCallback((filters: FilterGroup[]) => {
    setDashboardFilters(filters)
  }, [])

  useEffect(() => {
    const loadRealData = async () => {
      if (component.config.dataSource === "Real Data") {
        setIsLoading(true)
        try {
          const dataService = DataService.getInstance()

          if (component.type === "kpi") {
            const stats = await dataService.getTurbineStats()
            setRealData(stats)
          } else if (component.type === "chart") {
            const powerByLocation = await dataService.getPowerOutputByLocation()
            setRealData(powerByLocation)
          }
        } catch (error) {
          console.error("Failed to load real data:", error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    loadRealData()
  }, [component.config.dataSource, component.type])

  const getIcon = () => {
    switch (component.type) {
      case "kpi":
        return <Activity className="w-4 h-4" />
      case "chart":
        return <BarChart3 className="w-4 h-4" />
      case "metric":
        return <TrendingUp className="w-4 h-4" />
      case "saved-component":
        return <BarChart3 className="w-4 h-4" />
      default:
        return <PieChart className="w-4 h-4" />
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )
    }

    // Apply filters to data if any are active
    let displayData = realData
    let filterSummary = ''
    
    if (dashboardFilters.length > 0 && realData) {
      const filteredResult = filterService.applyFilters(realData, dashboardFilters)
      displayData = filteredResult.data
      filterSummary = filteredResult.appliedFilters.join(', ')
    }

    switch (component.type) {
      case "kpi":
        const kpiValue = displayData
          ? component.title.includes("Power")
            ? `${displayData.totalPowerOutput} kW`
            : component.title.includes("Turbines")
              ? displayData.totalTurbines
              : component.title.includes("Active")
                ? displayData.activeTurbines
                : component.title.includes("Warning")
                  ? displayData.warningTurbines
                  : component.data.value || "0"
          : component.data.value || "0"

        return (
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-black dark:text-white mb-1">{kpiValue}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{component.data.subtitle || "No data"}</div>
            {component.data.trend && <div className="text-xs text-green-600 mt-1">{component.data.trend}</div>}
            {filterSummary && (
              <div className="text-xs text-blue-600 mt-2 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 rounded">
                Filtered: {filterSummary}
              </div>
            )}
          </div>
        )

      case "chart":
        return (
          <div className="h-32 bg-gray-100 dark:bg-gray-900 rounded flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {displayData ? `${displayData.length} locations` : component.data.chartType || "Chart"} Visualization
              </p>
              {filterSummary && (
                <div className="text-xs text-blue-600 mt-2 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 rounded">
                  Filtered: {filterSummary}
                </div>
              )}
            </div>
          </div>
        )

      case "saved-component":
        return (
          <div className="h-32 bg-gray-100 dark:bg-gray-900 rounded flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {component.data.chartType || "Saved"} Component
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {component.data.componentCode ? `${component.data.componentCode.length} chars` : "No code"}
              </div>
            </div>
          </div>
        )

      case "metric":
        return (
          <div className="flex items-center justify-between py-4">
            <div>
              <div className="text-lg font-semibold text-black dark:text-white">{component.data.value || "N/A"}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{component.data.label || "Metric"}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-green-600">{component.data.change || "+0%"}</div>
            </div>
          </div>
        )

      default:
        return (
          <div className="py-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">{component.data.content || "Component content"}</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-2">
      {/* Inline Filter */}
      <DashboardInlineFilter
        dashboardId={component.id}
        dashboardName={component.title}
        onFiltersChange={handleFiltersChange}
        isExpanded={isFilterExpanded}
        onToggleExpanded={() => setIsFilterExpanded(!isFilterExpanded)}
      />
      
      <Card
        className={cn(
          "relative transition-all duration-200",
          isDragging
            ? "opacity-50 scale-105 shadow-lg cursor-grabbing"
            : isEditMode
              ? "cursor-move hover:shadow-md"
              : "hover:shadow-md",
          "bg-white dark:bg-black border-gray-200 dark:border-gray-800",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            <CardTitle className="text-sm font-medium text-black dark:text-white">{component.title}</CardTitle>
          </div>

          {(isHovered || isMenuOpen) && (
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsMenuOpen(true)
                  }}
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(component.id)
                    setIsMenuOpen(false)
                  }}
                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <X className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent>{renderContent()}</CardContent>

      {/* Data source indicator */}
      {component.config.dataSource && (
        <div className="absolute bottom-1 right-1">
          <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-900 px-1 rounded">
            {component.config.dataSource}
          </div>
        </div>
      )}
    </Card>
    </div>
  )
}
