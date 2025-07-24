"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Filter, X, Search, SlidersHorizontal, Plus, Minus, Globe, Monitor } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { DashboardFilterCompatibilityAnalyzer } from '@/lib/dashboard-filter-compatibility'

export interface DashboardFilter {
  id: string
  name: string
  type: 'date' | 'location' | 'status' | 'correlation' | 'turbine' | 'text' | 'numeric'
  value: any
  operator?: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in'
}

export interface FilterGroup {
  id: string
  name: string
  filters: DashboardFilter[]
  logic: 'AND' | 'OR'
}

export interface DashboardLevelFilter {
  dashboardId: string
  filters: FilterGroup[]
  isActive: boolean
}

export interface GlobalFilterState {
  globalFilters: FilterGroup[]
  dashboardFilters: DashboardLevelFilter[]
  selectedDashboards: string[]
}

interface DashboardFilterPanelProps {
  dashboards: Array<{
    id: string
    name: string
    description: string
    query?: string
    tags?: string[]
    createdAt?: string
    updatedAt?: string
  }>
  onFiltersChange: (filters: FilterGroup[]) => void
  onGlobalFilterChange?: (filterState: GlobalFilterState) => void
  onDashboardFilterChange?: (dashboardId: string, filters: FilterGroup[]) => void
  className?: string
  mode?: 'global' | 'dashboard' | 'both'
  selectedDashboards?: string[]
  onDashboardSelectionChange?: (dashboardIds: string[]) => void
}

export function DashboardFilterPanel({ 
  dashboards, 
  onFiltersChange, 
  onGlobalFilterChange,
  onDashboardFilterChange,
  className, 
  mode = 'both',
  selectedDashboards = [],
  onDashboardSelectionChange
}: DashboardFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [availableFilters, setAvailableFilters] = useState<DashboardFilter[]>([])
  const [quickFilters, setQuickFilters] = useState<string[]>([])
  const [globalFilterState, setGlobalFilterState] = useState<GlobalFilterState>({
    globalFilters: [],
    dashboardFilters: [],
    selectedDashboards: selectedDashboards
  })
  const [isDashboardMode, setIsDashboardMode] = useState(true)
  const [dashboardData, setDashboardData] = useState<Map<string, any[]>>(new Map())
  const [compatibleFilters, setCompatibleFilters] = useState<string[]>([])

  // Load filter panel state from session storage on mount
  useEffect(() => {
    try {
      // Load expanded state
      const savedExpanded = sessionStorage.getItem('filter-panel-expanded')
      if (savedExpanded) {
        setIsExpanded(savedExpanded === 'true')
      }

      // Load dashboard mode
      const savedDashboardMode = sessionStorage.getItem('filter-panel-dashboard-mode')
      if (savedDashboardMode) {
        setIsDashboardMode(savedDashboardMode === 'true')
      }

      // Load filter groups
      const savedFilterGroups = sessionStorage.getItem('filter-panel-groups')
      if (savedFilterGroups) {
        const parsedFilterGroups = JSON.parse(savedFilterGroups)
        setFilterGroups(parsedFilterGroups)
      }

      // Load quick filters
      const savedQuickFilters = sessionStorage.getItem('filter-panel-quick-filters')
      if (savedQuickFilters) {
        const parsedQuickFilters = JSON.parse(savedQuickFilters)
        setQuickFilters(parsedQuickFilters)
      }
    } catch (error) {
      console.error('Error loading filter panel state from session storage:', error)
    }
  }, [])

  // Save expanded state to session storage when it changes
  useEffect(() => {
    try {
      sessionStorage.setItem('filter-panel-expanded', isExpanded.toString())
    } catch (error) {
      console.error('Error saving expanded state to session storage:', error)
    }
  }, [isExpanded])

  // Save dashboard mode to session storage when it changes
  useEffect(() => {
    try {
      sessionStorage.setItem('filter-panel-dashboard-mode', isDashboardMode.toString())
    } catch (error) {
      console.error('Error saving dashboard mode to session storage:', error)
    }
  }, [isDashboardMode])

  // Save filter groups to session storage when they change
  useEffect(() => {
    try {
      sessionStorage.setItem('filter-panel-groups', JSON.stringify(filterGroups))
    } catch (error) {
      console.error('Error saving filter groups to session storage:', error)
    }
  }, [filterGroups])

  // Save quick filters to session storage when they change
  useEffect(() => {
    try {
      sessionStorage.setItem('filter-panel-quick-filters', JSON.stringify(quickFilters))
    } catch (error) {
      console.error('Error saving quick filters to session storage:', error)
    }
  }, [quickFilters])

  // Fetch dashboard data and analyze compatibility
  useEffect(() => {
    const fetchDashboardData = async () => {
      console.log('🔍 Fetching saved dashboard data for compatibility analysis')
      
      const dataMap = new Map<string, any[]>()
      const analyses: any[] = []

      for (const dashboard of dashboards) {
        try {
          // Only process saved dashboards (those with 'saved_' prefix)
          if (!dashboard.id.startsWith('saved_')) {
            console.log(`⏭️ Skipping non-saved dashboard: ${dashboard.name}`)
            continue
          }

          console.log(`📊 Fetching data for saved dashboard: ${dashboard.name} (${dashboard.id})`)
          
          // Fetch data for this saved dashboard using the new API
          const response = await fetch(`/api/saved-dashboard/${dashboard.id}/data`)
          if (response.ok) {
            const result = await response.json()
            console.log(`📊 API response for ${dashboard.name}:`, {
              hasData: !!result.data,
              columns: result.metadata?.columns || [],
              rowCount: result.metadata?.rowCount || 0,
              error: result.error
            })
            
            if (result.data && !result.error) {
              dataMap.set(dashboard.id, result.data)
              
              // Analyze compatibility
              const analysis = DashboardFilterCompatibilityAnalyzer.analyzeDashboardData(
                dashboard.id,
                dashboard.name,
                result.data
              )
              analyses.push(analysis)
              console.log(`✅ Successfully analyzed ${dashboard.name}`)
            } else {
              console.log(`⚠️ No data or error for ${dashboard.name}:`, result.error)
            }
          } else {
            console.log(`⚠️ Failed to fetch data for ${dashboard.name}: ${response.status}`)
          }
        } catch (error) {
          console.log(`⚠️ Could not fetch data for dashboard ${dashboard.name}:`, error)
        }
      }

      setDashboardData(dataMap)
      
      // Get common compatible filters for selected dashboards
      if (selectedDashboards.length > 0) {
        const selectedAnalyses = analyses.filter(analysis => 
          selectedDashboards.includes(analysis.dashboardId)
        )
        const commonFilters = DashboardFilterCompatibilityAnalyzer.getCommonCompatibleFilters(selectedAnalyses)
        setCompatibleFilters(commonFilters)
        console.log('🎯 Common compatible filters:', commonFilters)
      } else {
        // If no dashboards selected, show all basic filters
        setCompatibleFilters(['text', 'date'])
        console.log('🎯 No dashboards selected, showing basic filters')
      }
    }

    fetchDashboardData()
  }, [dashboards, selectedDashboards])

  // Extract available filter options from dashboards
  useEffect(() => {
    const filters: DashboardFilter[] = []
    
    // Extract unique locations, statuses, turbines from dashboard data
    const locations = new Set<string>()
    const statuses = new Set<string>()
    const turbines = new Set<string>()
    const correlations = new Set<string>()

    dashboards.forEach(dashboard => {
      // Extract from query/description
      const text = `${dashboard.name} ${dashboard.description} ${dashboard.query || ''}`.toLowerCase()
      
      // Look for location patterns
      if (text.includes('location') || text.includes('farm')) {
        locations.add('Wind Farm A')
        locations.add('Wind Farm B')
        locations.add('Desert Winds')
      }
      
      // Look for status patterns
      if (text.includes('status') || text.includes('active') || text.includes('warning')) {
        statuses.add('Active')
        statuses.add('Warning')
        statuses.add('Offline')
      }
      
      // Look for turbine patterns
      if (text.includes('turbine') || text.includes('rpm') || text.includes('power')) {
        turbines.add('WTG-001')
        turbines.add('WTG-002')
        turbines.add('WTG-003')
      }
      
      // Look for correlation patterns
      if (text.includes('correlation') || text.includes('rpm') || text.includes('wind speed')) {
        correlations.add('RPM vs Wind Speed')
        correlations.add('Power vs Wind Speed')
        correlations.add('Temperature vs Time')
      }
    })

    // Add available filters
    if (locations.size > 0) {
      filters.push({
        id: 'location',
        name: 'Location',
        type: 'location',
        value: [],
        operator: 'in'
      })
    }

    if (statuses.size > 0) {
      filters.push({
        id: 'status',
        name: 'Status',
        type: 'status',
        value: [],
        operator: 'in'
      })
    }

    if (turbines.size > 0) {
      filters.push({
        id: 'turbine',
        name: 'Turbine',
        type: 'turbine',
        value: [],
        operator: 'in'
      })
    }

    if (correlations.size > 0) {
      filters.push({
        id: 'correlation',
        name: 'Correlation Type',
        type: 'correlation',
        value: [],
        operator: 'in'
      })
    }

    // Add date filter (only if compatible)
    if (compatibleFilters.includes('date')) {
      filters.push({
        id: 'date',
        name: 'Date Range',
        type: 'date',
        value: { start: null, end: null },
        operator: 'between'
      })
    }

    // Add numeric filters for data ranges (only if compatible)
    if (compatibleFilters.includes('wind_speed')) {
      filters.push({
        id: 'wind_speed',
        name: 'Wind Speed Range',
        type: 'numeric',
        value: { min: null, max: null },
        operator: 'between'
      })
    }

    if (compatibleFilters.includes('power_output')) {
      filters.push({
        id: 'power_output',
        name: 'Power Output Range',
        type: 'numeric',
        value: { min: null, max: null },
        operator: 'between'
      })
    }

    if (compatibleFilters.includes('rpm')) {
      filters.push({
        id: 'rpm',
        name: 'RPM Range',
        type: 'numeric',
        value: { min: null, max: null },
        operator: 'between'
      })
    }

    // Add text search (always compatible)
    filters.push({
      id: 'text',
      name: 'Text Search',
      type: 'text',
      value: '',
      operator: 'contains'
    })

    setAvailableFilters(filters)
  }, [dashboards, compatibleFilters])

  const addFilterGroup = () => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      name: `Filter Group ${filterGroups.length + 1}`,
      filters: [],
      logic: 'AND'
    }
    setFilterGroups([...filterGroups, newGroup])
  }

  const removeFilterGroup = (groupId: string) => {
    setFilterGroups(filterGroups.filter(group => group.id !== groupId))
  }

  const addFilterToGroup = (groupId: string, filterType: string) => {
    const filter = availableFilters.find(f => f.id === filterType)
    if (!filter) return

    const newFilter: DashboardFilter = {
      ...filter,
      id: `${filter.id}-${Date.now()}`,
      value: filter.type === 'date' ? { start: null, end: null } :
              filter.type === 'numeric' ? { min: null, max: null } :
              filter.type === 'text' ? '' : []
    }

    setFilterGroups(filterGroups.map(group => 
      group.id === groupId 
        ? { ...group, filters: [...group.filters, newFilter] }
        : group
    ))
  }

  const removeFilterFromGroup = (groupId: string, filterId: string) => {
    setFilterGroups(filterGroups.map(group => 
      group.id === groupId 
        ? { ...group, filters: group.filters.filter(f => f.id !== filterId) }
        : group
    ))
  }

  const updateFilterValue = (groupId: string, filterId: string, value: any) => {
    setFilterGroups(filterGroups.map(group => 
      group.id === groupId 
        ? { 
            ...group, 
            filters: group.filters.map(f => 
              f.id === filterId ? { ...f, value } : f
            )
          }
        : group
    ))
  }

  const updateGroupLogic = (groupId: string, logic: 'AND' | 'OR') => {
    setFilterGroups(filterGroups.map(group => 
      group.id === groupId ? { ...group, logic } : group
    ))
  }

  const updateGroupName = (groupId: string, name: string) => {
    setFilterGroups(filterGroups.map(group => 
      group.id === groupId ? { ...group, name } : group
    ))
  }

  // Quick filter functions
  const addQuickFilter = (filterType: string) => {
    if (!quickFilters.includes(filterType)) {
      setQuickFilters([...quickFilters, filterType])
    }
  }

  const removeQuickFilter = (filterType: string) => {
    setQuickFilters(quickFilters.filter(f => f !== filterType))
  }

  // Dashboard selection functions
  const toggleDashboardSelection = (dashboardId: string) => {
    const newSelection = selectedDashboards.includes(dashboardId)
      ? selectedDashboards.filter(id => id !== dashboardId)
      : [...selectedDashboards, dashboardId]
    
    onDashboardSelectionChange?.(newSelection)
    setGlobalFilterState(prev => ({
      ...prev,
      selectedDashboards: newSelection
    }))
  }

  const selectAllDashboards = () => {
    const savedDashboardIds = dashboards
      .filter(d => d.id.startsWith('saved_'))
      .map(d => d.id)
    onDashboardSelectionChange?.(savedDashboardIds)
    setGlobalFilterState(prev => ({
      ...prev,
      selectedDashboards: savedDashboardIds
    }))
  }

  const clearDashboardSelection = () => {
    onDashboardSelectionChange?.([])
    setGlobalFilterState(prev => ({
      ...prev,
      selectedDashboards: []
    }))
  }

  // Apply filters and notify parent
  useEffect(() => {
    if (isDashboardMode) {
      onFiltersChange(filterGroups)
      if (onGlobalFilterChange) {
        onGlobalFilterChange({
          globalFilters: filterGroups,
          dashboardFilters: globalFilterState.dashboardFilters,
          selectedDashboards: globalFilterState.selectedDashboards
        })
      }
    } else {
      // When not in dashboard mode, apply global filters
      onFiltersChange(filterGroups)
      if (onGlobalFilterChange) {
        onGlobalFilterChange({
          globalFilters: filterGroups,
          dashboardFilters: globalFilterState.dashboardFilters,
          selectedDashboards: globalFilterState.selectedDashboards
        })
      }
    }
  }, [filterGroups, isDashboardMode, onFiltersChange, onGlobalFilterChange])

  const getActiveFilterCount = () => {
    return filterGroups.reduce((total, group) => {
      return total + group.filters.filter(f => {
        if (f.type === 'date') {
          return f.value.start && f.value.end
        }
        if (f.type === 'numeric') {
          return f.value.min !== null || f.value.max !== null
        }
        if (f.type === 'text') {
          return f.value && f.value.trim() !== ''
        }
        return Array.isArray(f.value) && f.value.length > 0
      }).length
    }, 0)
  }

  const renderFilterInput = (filter: DashboardFilter, groupId: string) => {
    switch (filter.type) {
      case 'date':
        return (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-32">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filter.value.start ? format(filter.value.start, 'MMM dd') : 'Start'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filter.value.start}
                  onSelect={(date: Date | undefined) => updateFilterValue(groupId, filter.id, { ...filter.value, start: date })}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-32">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filter.value.end ? format(filter.value.end, 'MMM dd') : 'End'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filter.value.end}
                  onSelect={(date: Date | undefined) => updateFilterValue(groupId, filter.id, { ...filter.value, end: date })}
                />
              </PopoverContent>
            </Popover>
          </div>
        )

      case 'numeric':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filter.value.min || ''}
              onChange={(e) => updateFilterValue(groupId, filter.id, { 
                ...filter.value, 
                min: e.target.value ? parseFloat(e.target.value) : null 
              })}
              className="w-20"
            />
            <span className="text-muted-foreground self-center">to</span>
            <Input
              type="number"
              placeholder="Max"
              value={filter.value.max || ''}
              onChange={(e) => updateFilterValue(groupId, filter.id, { 
                ...filter.value, 
                max: e.target.value ? parseFloat(e.target.value) : null 
              })}
              className="w-20"
            />
          </div>
        )

      case 'location':
        return (
          <Select
            value={filter.value.join(',')}
            onValueChange={(value) => updateFilterValue(groupId, filter.id, value.split(',').filter(Boolean))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select locations" />
            </SelectTrigger>
            <SelectContent>
              {['Wind Farm A', 'Wind Farm B', 'Desert Winds'].map(location => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'status':
        return (
          <div className="flex gap-2">
            {['Active', 'Warning', 'Offline'].map(status => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`${filter.id}-${status}`}
                  checked={filter.value.includes(status)}
                  onCheckedChange={(checked: boolean) => {
                    const newValue = checked 
                      ? [...filter.value, status]
                      : filter.value.filter((s: string) => s !== status)
                    updateFilterValue(groupId, filter.id, newValue)
                  }}
                />
                <Label htmlFor={`${filter.id}-${status}`} className="text-sm">{status}</Label>
              </div>
            ))}
          </div>
        )

      case 'turbine':
        return (
          <Select
            value={filter.value.join(',')}
            onValueChange={(value) => updateFilterValue(groupId, filter.id, value.split(',').filter(Boolean))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select turbines" />
            </SelectTrigger>
            <SelectContent>
              {['WTG-001', 'WTG-002', 'WTG-003'].map(turbine => (
                <SelectItem key={turbine} value={turbine}>
                  {turbine}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'correlation':
        return (
          <Select
            value={filter.value.join(',')}
            onValueChange={(value) => updateFilterValue(groupId, filter.id, value.split(',').filter(Boolean))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select correlations" />
            </SelectTrigger>
            <SelectContent>
              {['RPM vs Wind Speed', 'Power vs Wind Speed', 'Temperature vs Time'].map(correlation => (
                <SelectItem key={correlation} value={correlation}>
                  {correlation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'text':
        return (
          <Input
            placeholder="Search dashboards..."
            value={filter.value}
            onChange={(e) => updateFilterValue(groupId, filter.id, e.target.value)}
            className="w-48"
          />
        )

      default:
        return null
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Mode Toggle */}
      {mode === 'both' && (
        <div className="mb-4">
          <div className="flex items-center gap-2 p-1 rounded-lg">
            <Button
              variant={isDashboardMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setIsDashboardMode(!isDashboardMode)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>
      )}

      {/* Dashboard Selection */}
      {isDashboardMode && mode !== 'global' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Select Dashboards</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllDashboards}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearDashboardSelection}>
                Clear
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {dashboards
              .filter(dashboard => dashboard.id.startsWith('saved_'))
              .map(dashboard => (
                <div key={dashboard.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dashboard-${dashboard.id}`}
                    checked={selectedDashboards.includes(dashboard.id)}
                    onCheckedChange={() => toggleDashboardSelection(dashboard.id)}
                  />
                  <Label htmlFor={`dashboard-${dashboard.id}`} className="text-sm">
                    {dashboard.name}
                  </Label>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Sleek Header */}
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-auto p-0 hover:bg-transparent"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                {isDashboardMode ? 'Filters' : 'Global Filters'}
              </h3>
            </div>
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()} active
              </Badge>
            )}
            {isExpanded ? <Minus className="h-4 w-4 text-muted-foreground" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
          </div>
        </Button>
      </div>

      {/* Quick Filters */}
      {isExpanded && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Quick Filters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableFilters.map(filter => (
              <Button
                key={filter.id}
                variant={quickFilters.includes(filter.id) ? "default" : "outline"}
                size="sm"
                onClick={() => quickFilters.includes(filter.id) 
                  ? removeQuickFilter(filter.id)
                  : addQuickFilter(filter.id)
                }
                className="h-8 px-3 text-xs"
              >
                {filter.name}
                {quickFilters.includes(filter.id) && (
                  <X className="ml-2 h-3 w-3" />
                )}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Advanced Filters */}
      {isExpanded && (
        <div className="space-y-4">
          {filterGroups.length === 0 ? (
            <Card className="border-dashed border-2 border-muted-foreground/20">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Filter className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No filter groups created</p>
                <Button onClick={addFilterGroup} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Filter Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filterGroups.map((group) => (
                <Card key={group.id} className="border border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Input
                          value={group.name}
                          onChange={(e) => updateGroupName(group.id, e.target.value)}
                          className="w-48 h-8 text-sm"
                          placeholder="Filter group name"
                        />
                        <Select
                          value={group.logic}
                          onValueChange={(value: 'AND' | 'OR') => updateGroupLogic(group.id, value)}
                        >
                          <SelectTrigger className="w-16 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">AND</SelectItem>
                            <SelectItem value="OR">OR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFilterGroup(group.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {group.filters.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-3">No filters in this group</p>
                        <Select onValueChange={(value) => addFilterToGroup(group.id, value)}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Add filter..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFilters.map(filter => (
                              <SelectItem key={filter.id} value={filter.id}>
                                {filter.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {group.filters.map((filter) => (
                          <div key={filter.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                            <Label className="w-20 text-sm font-medium">{filter.name}:</Label>
                            <div className="flex-1">
                              {renderFilterInput(filter, group.id)}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFilterFromGroup(group.id, filter.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <div className="pt-2">
                          <Select onValueChange={(value) => addFilterToGroup(group.id, value)}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Add another filter..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFilters.map(filter => (
                                <SelectItem key={filter.id} value={filter.id}>
                                  {filter.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              <div className="flex justify-center pt-2">
                <Button onClick={addFilterGroup} variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Filter Group
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 