import type { DashboardFilter } from '@/components/dashboard-filter-panel'

export interface DashboardDataAnalysis {
  dashboardId: string
  dashboardName: string
  dataFields: string[]
  dataSample: any[]
  compatibleFilters: string[]
}

export interface FilterCompatibility {
  filterId: string
  filterName: string
  filterType: string
  compatibleDashboards: string[]
  incompatibleDashboards: string[]
}

export class DashboardFilterCompatibilityAnalyzer {
  /**
   * Analyze a dashboard's data to determine which filters can be applied
   */
  static analyzeDashboardData(
    dashboardId: string, 
    dashboardName: string, 
    data: any[]
  ): DashboardDataAnalysis {
    console.log(`🔍 Analyzing dashboard: ${dashboardName} (${dashboardId})`)
    console.log(`📊 Data sample:`, data.slice(0, 3))
    
    if (!data || data.length === 0) {
      console.log(`⚠️ No data for dashboard ${dashboardName}`)
      return {
        dashboardId,
        dashboardName,
        dataFields: [],
        dataSample: [],
        compatibleFilters: []
      }
    }

    // Get all unique fields from the data
    const dataFields = new Set<string>()
    const dataSample = data.slice(0, 5) // Keep first 5 items as sample
    
    data.forEach(item => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach(key => dataFields.add(key))
      }
    })

    const fieldsArray = Array.from(dataFields)
    console.log(`📋 Data fields found:`, fieldsArray)

    // Determine compatible filters based on data fields
    const compatibleFilters = this.getCompatibleFilters(fieldsArray, dataSample)
    console.log(`✅ Compatible filters for ${dashboardName}:`, compatibleFilters)

    return {
      dashboardId,
      dashboardName,
      dataFields: fieldsArray,
      dataSample,
      compatibleFilters
    }
  }

  /**
   * Get compatible filters based on data fields
   */
  private static getCompatibleFilters(dataFields: string[], dataSample: any[]): string[] {
    const compatibleFilters: string[] = []

    // Check for numeric filters
    if (this.hasNumericField(dataFields, 'wind_speed_mph', 'wind_speed', 'windSpeed')) {
      compatibleFilters.push('wind_speed')
    }
    
    if (this.hasNumericField(dataFields, 'power_output_kw', 'power_output')) {
      compatibleFilters.push('power_output')
    }
    
    if (this.hasNumericField(dataFields, 'rotor_rpm', 'rpm')) {
      compatibleFilters.push('rpm')
    }

    // Check for location filter
    if (dataFields.some(field => 
      field.toLowerCase().includes('location') || 
      field.toLowerCase().includes('farm') ||
      field.toLowerCase().includes('site')
    )) {
      compatibleFilters.push('location')
    }

    // Check for status filter
    if (dataFields.some(field => 
      field.toLowerCase().includes('status') || 
      field.toLowerCase().includes('state')
    )) {
      compatibleFilters.push('status')
    }

    // Check for turbine filter
    if (dataFields.some(field => 
      field.toLowerCase().includes('turbine') || 
      field.toLowerCase().includes('id')
    )) {
      compatibleFilters.push('turbine')
    }

    // Check for date/timestamp filter
    if (dataFields.some(field => 
      field.toLowerCase().includes('timestamp') || 
      field.toLowerCase().includes('date') ||
      field.toLowerCase().includes('created') ||
      field.toLowerCase().includes('updated')
    )) {
      compatibleFilters.push('date')
    }

    // Text search is always compatible
    compatibleFilters.push('text')

    return compatibleFilters
  }

  /**
   * Check if data has a numeric field with any of the given names
   */
  private static hasNumericField(dataFields: string[], ...fieldNames: string[]): boolean {
    return dataFields.some(field => 
      fieldNames.some(name => 
        field.toLowerCase().includes(name.toLowerCase())
      )
    )
  }

  /**
   * Get filters that are compatible with ALL selected dashboards
   */
  static getCommonCompatibleFilters(
    dashboardAnalyses: DashboardDataAnalysis[]
  ): string[] {
    if (dashboardAnalyses.length === 0) {
      return []
    }

    if (dashboardAnalyses.length === 1) {
      return dashboardAnalyses[0].compatibleFilters
    }

    // Find intersection of all compatible filters
    const allCompatibleFilters = dashboardAnalyses.map(analysis => analysis.compatibleFilters)
    const commonFilters = allCompatibleFilters.reduce((common, current) => 
      common.filter(filter => current.includes(filter))
    )

    console.log(`🎯 Common compatible filters for ${dashboardAnalyses.length} dashboards:`, commonFilters)
    return commonFilters
  }

  /**
   * Get detailed compatibility information for all filters
   */
  static getFilterCompatibilityDetails(
    dashboardAnalyses: DashboardDataAnalysis[]
  ): FilterCompatibility[] {
    const allFilterIds = ['wind_speed', 'power_output', 'rpm', 'location', 'status', 'turbine', 'date', 'text']
    
    return allFilterIds.map(filterId => {
      const compatibleDashboards: string[] = []
      const incompatibleDashboards: string[] = []

      dashboardAnalyses.forEach(analysis => {
        if (analysis.compatibleFilters.includes(filterId)) {
          compatibleDashboards.push(analysis.dashboardId)
        } else {
          incompatibleDashboards.push(analysis.dashboardId)
        }
      })

      return {
        filterId,
        filterName: this.getFilterDisplayName(filterId),
        filterType: this.getFilterType(filterId),
        compatibleDashboards,
        incompatibleDashboards
      }
    })
  }

  private static getFilterDisplayName(filterId: string): string {
    const names: Record<string, string> = {
      'wind_speed': 'Wind Speed Range',
      'power_output': 'Power Output Range',
      'rpm': 'RPM Range',
      'location': 'Location',
      'status': 'Status',
      'turbine': 'Turbine',
      'date': 'Date Range',
      'text': 'Text Search'
    }
    return names[filterId] || filterId
  }

  private static getFilterType(filterId: string): string {
    const types: Record<string, string> = {
      'wind_speed': 'numeric',
      'power_output': 'numeric',
      'rpm': 'numeric',
      'location': 'location',
      'status': 'status',
      'turbine': 'turbine',
      'date': 'date',
      'text': 'text'
    }
    return types[filterId] || 'text'
  }
} 