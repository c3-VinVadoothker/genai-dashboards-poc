export interface DashboardDeleteRequest {
  query: string
  chatHistory?: string
  dashboardIds: string[]
  originalPrompt?: string
}

export interface DashboardDeleteResult {
  success: boolean
  deletedDashboards: Array<{
    id: string
    name: string
  }>
  error?: string
}

export class DashboardDeleteAgent {
  private static instance: DashboardDeleteAgent

  static getInstance(): DashboardDeleteAgent {
    if (!DashboardDeleteAgent.instance) {
      DashboardDeleteAgent.instance = new DashboardDeleteAgent()
    }
    return DashboardDeleteAgent.instance
  }

  async deleteDashboards(request: DashboardDeleteRequest): Promise<DashboardDeleteResult> {
    try {
      console.log("🗑️ DashboardDeleteAgent: Starting dashboard deletion")
      console.log("🗑️ DashboardDeleteAgent: Dashboard IDs to delete:", request.dashboardIds)
      console.log("🗑️ DashboardDeleteAgent: Query:", request.query)
      
      const deletedDashboards = []
      
      for (const dashboardId of request.dashboardIds) {
        try {
          console.log("🗑️ DashboardDeleteAgent: Deleting dashboard:", dashboardId)
          
          // Find the saved dashboard that corresponds to this dashboard ID
          const savedDashboardInfo = await this.findSavedDashboardByDashboardId(dashboardId)
          if (!savedDashboardInfo) {
            console.error("🗑️ DashboardDeleteAgent: Saved dashboard not found for dashboard ID:", dashboardId)
            continue
          }
          
          // Delete the saved dashboard
          const success = await this.deleteSavedDashboard(savedDashboardInfo.id)
          
          if (success) {
            deletedDashboards.push({
              id: dashboardId,
              name: savedDashboardInfo.name
            })
            console.log("🗑️ DashboardDeleteAgent: Successfully deleted saved dashboard:", savedDashboardInfo.name)
          }
          
        } catch (error) {
          console.error("🗑️ DashboardDeleteAgent: Error deleting dashboard:", dashboardId, error)
        }
      }
      
      return {
        success: deletedDashboards.length > 0,
        deletedDashboards
      }
      
    } catch (error) {
      console.error("🗑️ DashboardDeleteAgent: Error in deletion process:", error)
      return {
        success: false,
        deletedDashboards: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async findSavedDashboardByDashboardId(dashboardId: string): Promise<any> {
    try {
      // Load saved dashboards
      const savedDashboardsResponse = await fetch('/api/saved-dashboards')
      if (savedDashboardsResponse.ok) {
        const savedDashboards = await savedDashboardsResponse.json()
        const savedDashboard = savedDashboards.find((d: any) => d.dashboardId === dashboardId)
        if (savedDashboard) {
          console.log("🗑️ DashboardDeleteAgent: Found saved dashboard:", savedDashboard.name)
          return savedDashboard
        }
      }
      
      console.error("🗑️ DashboardDeleteAgent: Saved dashboard not found for dashboard ID:", dashboardId)
      return null
    } catch (error) {
      console.error("Error finding saved dashboard:", error)
      return null
    }
  }

  private async deleteSavedDashboard(savedDashboardId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/saved-dashboards?id=${savedDashboardId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to delete saved dashboard: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        console.log("🗑️ DashboardDeleteAgent: Successfully deleted saved dashboard:", savedDashboardId)
        return true
      } else {
        console.error("🗑️ DashboardDeleteAgent: Failed to delete saved dashboard:", result.error)
        return false
      }
    } catch (error) {
      console.error("Error deleting saved dashboard:", error)
      return false
    }
  }
} 