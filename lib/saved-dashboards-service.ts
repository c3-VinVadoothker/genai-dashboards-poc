export interface SavedDashboard {
  id: string
  dashboardId: string
  name: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  createdAt: string
  updatedAt: string
}

export class SavedDashboardsService {
  private static instance: SavedDashboardsService

  static getInstance(): SavedDashboardsService {
    if (!SavedDashboardsService.instance) {
      SavedDashboardsService.instance = new SavedDashboardsService()
    }
    return SavedDashboardsService.instance
  }

  async getAllSavedDashboards(): Promise<SavedDashboard[]> {
    try {
      const response = await fetch('/api/saved-dashboards')
      if (!response.ok) {
        throw new Error('Failed to load saved dashboards')
      }
      return await response.json()
    } catch (error) {
      console.error('Error loading saved dashboards:', error)
      return []
    }
  }

  async saveDashboard(dashboardData: {
    dashboardId: string
    name?: string
    position: { x: number; y: number }
    size?: { width: number; height: number }
  }): Promise<SavedDashboard | null> {
    try {
      // Check if dashboard already exists to avoid duplicates
      const existingDashboards = await this.getAllSavedDashboards()
      const existingDashboard = existingDashboards.find(d => d.dashboardId === dashboardData.dashboardId)
      
      if (existingDashboard) {
        console.log('Dashboard already exists, skipping save')
        return existingDashboard
      }

      const response = await fetch('/api/saved-dashboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dashboardData),
      })

      if (!response.ok) {
        throw new Error('Failed to save dashboard')
      }

      const result = await response.json()
      console.log('Dashboard saved successfully:', result.savedDashboard.id)
      return result.savedDashboard
    } catch (error) {
      console.error('Error saving dashboard:', error)
      return null
    }
  }

  async updateSavedDashboard(id: string, updates: Partial<SavedDashboard>): Promise<SavedDashboard | null> {
    try {
      // Check if there are actual changes
      const existingDashboards = await this.getAllSavedDashboards()
      const existingDashboard = existingDashboards.find(d => d.id === id)
      
      if (!existingDashboard) {
        console.log('Dashboard not found for update')
        return null
      }

      // Check if updates are meaningful
      const hasChanges = Object.keys(updates).some(key => {
        const updateValue = (updates as any)[key]
        const existingValue = (existingDashboard as any)[key]
        return JSON.stringify(updateValue) !== JSON.stringify(existingValue)
      })

      if (!hasChanges) {
        console.log('No meaningful changes detected, skipping update')
        return existingDashboard
      }

      const response = await fetch('/api/saved-dashboards', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!response.ok) {
        throw new Error('Failed to update saved dashboard')
      }

      const result = await response.json()
      console.log('Dashboard updated successfully:', result.savedDashboard.id)
      return result.savedDashboard
    } catch (error) {
      console.error('Error updating saved dashboard:', error)
      return null
    }
  }

  async deleteSavedDashboard(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/saved-dashboards?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete saved dashboard')
      }

      return true
    } catch (error) {
      console.error('Error deleting saved dashboard:', error)
      return false
    }
  }

  findOptimalPosition(existingDashboards: SavedDashboard[], size: { width: number; height: number }): { x: number; y: number } {
    // Find the next available tile position
    const usedPositions = existingDashboards.map(d => d.position.x + d.position.y * 4) // 4 columns
    let tilePosition = 0
    
    // Find the first available tile position
    while (usedPositions.includes(tilePosition)) {
      tilePosition++
    }
    
    // Convert tile position to grid coordinates
    const columnsPerRow = 4 // Fixed 4 columns per row
    const x = tilePosition % columnsPerRow
    const y = Math.floor(tilePosition / columnsPerRow)
    
    return { x, y }
  }

  private isPositionOccupied(
    existingDashboards: SavedDashboard[], 
    position: { x: number; y: number }, 
    size: { width: number; height: number }
  ): boolean {
    const tilePosition = position.x + position.y * 4
    return existingDashboards.some(dashboard => {
      const dashboardTilePosition = dashboard.position.x + dashboard.position.y * 4
      return dashboardTilePosition === tilePosition
    })
  }
} 