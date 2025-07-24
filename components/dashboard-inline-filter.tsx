"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Filter, X, SlidersHorizontal, Plus, Minus, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { DashboardFilter, FilterGroup } from './dashboard-filter-panel'

interface DashboardInlineFilterProps {
  dashboardId: string
  dashboardName: string
  onFiltersChange: (filters: FilterGroup[]) => void
  className?: string
  isExpanded?: boolean
  onToggleExpanded?: () => void
}

export function DashboardInlineFilter({
  dashboardId,
  dashboardName,
  onFiltersChange,
  className,
  isExpanded = false,
  onToggleExpanded
}: DashboardInlineFilterProps) {
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [availableFilters] = useState<DashboardFilter[]>([
    {
      id: 'date',
      name: 'Date Range',
      type: 'date',
      value: { start: null, end: null },
      operator: 'between'
    },
    {
      id: 'wind_speed',
      name: 'Wind Speed',
      type: 'numeric',
      value: { min: null, max: null },
      operator: 'between'
    },
    {
      id: 'power_output',
      name: 'Power Output',
      type: 'numeric',
      value: { min: null, max: null },
      operator: 'between'
    },
    {
      id: 'rpm',
      name: 'RPM',
      type: 'numeric',
      value: { min: null, max: null },
      operator: 'between'
    },
    {
      id: 'location',
      name: 'Location',
      type: 'location',
      value: [],
      operator: 'in'
    },
    {
      id: 'status',
      name: 'Status',
      type: 'status',
      value: [],
      operator: 'in'
    }
  ])

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

  const resetFilters = () => {
    setFilterGroups([])
  }

  // Apply filters and notify parent
  useEffect(() => {
    onFiltersChange(filterGroups)
  }, [filterGroups, onFiltersChange])

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
                <Button variant="outline" size="sm" className="w-24">
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {filter.value.start ? format(filter.value.start, 'MM/dd') : 'Start'}
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
                <Button variant="outline" size="sm" className="w-24">
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {filter.value.end ? format(filter.value.end, 'MM/dd') : 'End'}
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
          <div className="flex gap-1">
            <Input
              type="number"
              placeholder="Min"
              value={filter.value.min || ''}
              onChange={(e) => updateFilterValue(groupId, filter.id, { 
                ...filter.value, 
                min: e.target.value ? parseFloat(e.target.value) : null 
              })}
              className="w-16 h-8 text-xs"
            />
            <span className="text-muted-foreground self-center text-xs">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={filter.value.max || ''}
              onChange={(e) => updateFilterValue(groupId, filter.id, { 
                ...filter.value, 
                max: e.target.value ? parseFloat(e.target.value) : null 
              })}
              className="w-16 h-8 text-xs"
            />
          </div>
        )

      case 'location':
        return (
          <Select
            value={filter.value.join(',')}
            onValueChange={(value) => updateFilterValue(groupId, filter.id, value.split(',').filter(Boolean))}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Select..." />
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
          <Select
            value={filter.value.join(',')}
            onValueChange={(value) => updateFilterValue(groupId, filter.id, value.split(',').filter(Boolean))}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {['Active', 'Warning', 'Offline'].map(status => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      default:
        return null
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Dashboard Filters</CardTitle>
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getActiveFilterCount()} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {getActiveFilterCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {filterGroups.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">No filters applied</p>
              <Button onClick={addFilterGroup} size="sm" className="gap-2">
                <Plus className="h-3 w-3" />
                Add Filter Group
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filterGroups.map((group) => (
                <div key={group.id} className="border border-border/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={group.name}
                        onChange={(e) => updateGroupName(group.id, e.target.value)}
                        className="w-32 h-6 text-xs"
                        placeholder="Group name"
                      />
                      <Select
                        value={group.logic}
                        onValueChange={(value: 'AND' | 'OR') => updateGroupLogic(group.id, value)}
                      >
                        <SelectTrigger className="w-12 h-6">
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
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {group.filters.length === 0 ? (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground mb-2">No filters in this group</p>
                      <Select onValueChange={(value) => addFilterToGroup(group.id, value)}>
                        <SelectTrigger className="w-32 h-6 text-xs">
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
                    <div className="space-y-2">
                      {group.filters.map((filter) => (
                        <div key={filter.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <Label className="w-16 text-xs font-medium">{filter.name}:</Label>
                          <div className="flex-1">
                            {renderFilterInput(filter, group.id)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFilterFromGroup(group.id, filter.id)}
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="pt-1">
                        <Select onValueChange={(value) => addFilterToGroup(group.id, value)}>
                          <SelectTrigger className="w-32 h-6 text-xs">
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
                    </div>
                  )}
                </div>
              ))}
              
              <div className="flex justify-center pt-2">
                <Button onClick={addFilterGroup} variant="outline" size="sm" className="gap-2 h-6 text-xs">
                  <Plus className="h-3 w-3" />
                  Add Filter Group
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
} 