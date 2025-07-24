import type { DashboardFilter, FilterGroup } from '@/components/dashboard-filter-panel'

export interface FilteredData {
  data: any[]
  filteredCount: number
  totalCount: number
  appliedFilters: string[]
}

export class FilterService {
  private static instance: FilterService

  static getInstance(): FilterService {
    if (!FilterService.instance) {
      FilterService.instance = new FilterService()
    }
    return FilterService.instance
  }

  /**
   * Apply filters to data
   */
  applyFilters(data: any[], filterGroups: FilterGroup[]): FilteredData {
    if (filterGroups.length === 0) {
      return {
        data,
        filteredCount: data.length,
        totalCount: data.length,
        appliedFilters: []
      }
    }

    let filteredData = [...data]
    const appliedFilters: string[] = []

    filterGroups.forEach(group => {
      if (group.filters.length === 0) return

      const groupMatches = group.logic === 'AND' 
        ? group.filters.every(filter => {
            const result = this.applySingleFilter(filteredData, filter)
            if (result.applied) {
              appliedFilters.push(`${filter.name}: ${this.getFilterDisplayValue(filter)}`)
            }
            return result.matches
          })
        : group.filters.some(filter => {
            const result = this.applySingleFilter(filteredData, filter)
            if (result.applied) {
              appliedFilters.push(`${filter.name}: ${this.getFilterDisplayValue(filter)}`)
            }
            return result.matches
          })

      if (!groupMatches) {
        filteredData = []
      }
    })

    return {
      data: filteredData,
      filteredCount: filteredData.length,
      totalCount: data.length,
      appliedFilters
    }
  }

  /**
   * Apply a single filter to data
   */
  private applySingleFilter(data: any[], filter: DashboardFilter): { matches: boolean, applied: boolean } {
    console.log(`🔍 FilterService - Applying filter: ${filter.name} (${filter.type})`)
    console.log(`📊 FilterService - Filter value:`, filter.value)
    
    if (!this.isFilterActive(filter)) {
      console.log(`⚠️ FilterService - Filter ${filter.name} is not active`)
      return { matches: true, applied: false }
    }

    const filtered = data.filter(item => {
      let result = false
      switch (filter.type) {
        case 'date':
          result = this.applyDateFilter(item, filter)
          break
        case 'numeric':
          result = this.applyNumericFilter(item, filter)
          break
        case 'location':
          result = this.applyLocationFilter(item, filter)
          break
        case 'status':
          result = this.applyStatusFilter(item, filter)
          break
        case 'turbine':
          result = this.applyTurbineFilter(item, filter)
          break
        case 'correlation':
          result = this.applyCorrelationFilter(item, filter)
          break
        case 'text':
          result = this.applyTextFilter(item, filter)
          break
        default:
          result = true
      }
      
      if (result) {
        console.log(`✅ FilterService - Item passed filter ${filter.name}:`, item)
      }
      return result
    })

    console.log(`📊 FilterService - Filter ${filter.name} result: ${filtered.length} items passed`)
    return { 
      matches: filtered.length > 0, 
      applied: true 
    }
  }

  /**
   * Check if a filter is active (has values)
   */
  private isFilterActive(filter: DashboardFilter): boolean {
    switch (filter.type) {
      case 'date':
        return filter.value.start && filter.value.end
      
      case 'numeric':
        return filter.value.min !== null || filter.value.max !== null
      
      case 'text':
        return filter.value && filter.value.trim() !== ''
      
      default:
        return Array.isArray(filter.value) && filter.value.length > 0
    }
  }

  /**
   * Apply date range filter
   */
  private applyDateFilter(item: any, filter: DashboardFilter): boolean {
    const itemDate = new Date(item.timestamp || item.createdAt || item.updatedAt || Date.now())
    const startDate = new Date(filter.value.start)
    const endDate = new Date(filter.value.end)
    
    return itemDate >= startDate && itemDate <= endDate
  }

  /**
   * Apply numeric range filter
   */
  private applyNumericFilter(item: any, filter: DashboardFilter): boolean {
    console.log(`🔢 FilterService - Applying numeric filter: ${filter.id}`)
    console.log(`📊 FilterService - Item data:`, item)
    
    let value: number | null = null
    
    // Map filter IDs to data properties
    switch (filter.id) {
      case 'wind_speed':
        value = item.wind_speed_mph || item.wind_speed || item.windSpeed
        console.log(`💨 FilterService - Wind speed value: ${value} (from: ${item.wind_speed_mph || item.wind_speed || item.windSpeed})`)
        break
      case 'power_output':
        value = item.power_output_kw || item.power_output
        console.log(`⚡ FilterService - Power output value: ${value}`)
        break
      case 'rpm':
        value = item.rotor_rpm || item.rpm
        console.log(`🔄 FilterService - RPM value: ${value} (from: ${item.rotor_rpm || item.rpm})`)
        break
      default:
        value = item[filter.id]
        console.log(`🔍 FilterService - Default value for ${filter.id}: ${value}`)
    }

    if (value === null || value === undefined) {
      console.log(`❌ FilterService - No value found for ${filter.id}`)
      return false
    }

    const { min, max } = filter.value
    console.log(`🎯 FilterService - Filter range: ${min} to ${max}, value: ${value}`)
    
    if (min !== null && value < min) {
      console.log(`❌ FilterService - Value ${value} below minimum ${min}`)
      return false
    }
    if (max !== null && value > max) {
      console.log(`❌ FilterService - Value ${value} above maximum ${max}`)
      return false
    }
    
    console.log(`✅ FilterService - Value ${value} within range ${min} to ${max}`)
    return true
  }

  /**
   * Apply location filter
   */
  private applyLocationFilter(item: any, filter: DashboardFilter): boolean {
    const itemLocation = item.location || item.farm || item.site
    if (!itemLocation) return false
    
    return filter.value.some((location: string) => 
      itemLocation.toLowerCase().includes(location.toLowerCase())
    )
  }

  /**
   * Apply status filter
   */
  private applyStatusFilter(item: any, filter: DashboardFilter): boolean {
    const itemStatus = item.status || item.state
    if (!itemStatus) return false
    
    return filter.value.some((status: string) => 
      itemStatus.toLowerCase() === status.toLowerCase()
    )
  }

  /**
   * Apply turbine filter
   */
  private applyTurbineFilter(item: any, filter: DashboardFilter): boolean {
    const itemTurbine = item.turbine_id || item.turbine || item.id
    if (!itemTurbine) return false
    
    return filter.value.some((turbine: string) => 
      itemTurbine.toLowerCase().includes(turbine.toLowerCase())
    )
  }

  /**
   * Apply correlation filter
   */
  private applyCorrelationFilter(item: any, filter: DashboardFilter): boolean {
    // For correlation filters, we check if the item has the required data fields
    const correlationType = filter.value[0]?.toLowerCase() || ''
    
    switch (correlationType) {
      case 'rpm vs wind speed':
        return item.rotor_rpm !== undefined && item.wind_speed_mph !== undefined
      case 'power vs wind speed':
        return item.power_output_kw !== undefined && item.wind_speed_mph !== undefined
      case 'temperature vs time':
        return item.temperature !== undefined && item.timestamp !== undefined
      default:
        return true
    }
  }

  /**
   * Apply text filter
   */
  private applyTextFilter(item: any, filter: DashboardFilter): boolean {
    const searchText = filter.value.toLowerCase()
    const itemText = JSON.stringify(item).toLowerCase()
    
    return itemText.includes(searchText)
  }

  /**
   * Get display value for filter
   */
  private getFilterDisplayValue(filter: DashboardFilter): string {
    switch (filter.type) {
      case 'date':
        return `${filter.value.start?.toLocaleDateString()} - ${filter.value.end?.toLocaleDateString()}`
      
      case 'numeric':
        const { min, max } = filter.value
        if (min !== null && max !== null) {
          return `${min} - ${max}`
        } else if (min !== null) {
          return `≥ ${min}`
        } else if (max !== null) {
          return `≤ ${max}`
        }
        return ''
      
      case 'text':
        return filter.value
      
      default:
        return Array.isArray(filter.value) ? filter.value.join(', ') : ''
    }
  }

  /**
   * Generate filter summary for display
   */
  getFilterSummary(filterGroups: FilterGroup[]): string {
    if (filterGroups.length === 0) return 'No filters applied'

    const activeFilters = filterGroups.flatMap(group =>
      group.filters.filter(filter => this.isFilterActive(filter))
        .map(filter => `${filter.name}: ${this.getFilterDisplayValue(filter)}`)
    )

    return activeFilters.join(' • ')
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(filterGroups: FilterGroup[]): boolean {
    return filterGroups.some(group =>
      group.filters.some(filter => this.isFilterActive(filter))
    )
  }

  /**
   * Get active filter count
   */
  getActiveFilterCount(filterGroups: FilterGroup[]): number {
    return filterGroups.reduce((total, group) => {
      return total + group.filters.filter(filter => this.isFilterActive(filter)).length
    }, 0)
  }
} 