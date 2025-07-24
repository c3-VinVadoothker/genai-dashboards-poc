export interface DashboardUpdateRequest {
  query: string
  chatHistory?: string
  dashboardIds: string[]
  originalPrompt?: string
}

export interface DashboardUpdateResult {
  success: boolean
  updatedDashboards: Array<{
    id: string
    name: string
    componentCode: string
    dataFunction: string
  }>
  error?: string
}

export class DashboardUpdateAgent {
  private static instance: DashboardUpdateAgent

  static getInstance(): DashboardUpdateAgent {
    if (!DashboardUpdateAgent.instance) {
      DashboardUpdateAgent.instance = new DashboardUpdateAgent()
    }
    return DashboardUpdateAgent.instance
  }

  async updateDashboards(request: DashboardUpdateRequest): Promise<DashboardUpdateResult> {
    try {
      console.log("🔧 DashboardUpdateAgent: Starting dashboard update")
      console.log("🔧 DashboardUpdateAgent: Dashboard IDs to update:", request.dashboardIds)
      console.log("🔧 DashboardUpdateAgent: Query:", request.query)
      
      const updatedDashboards = []
      
      for (const dashboardId of request.dashboardIds) {
        try {
          console.log("🔧 DashboardUpdateAgent: Updating dashboard:", dashboardId)
          
          // Fetch the existing dashboard data
          const dashboardData = await this.fetchDashboardData(dashboardId)
          if (!dashboardData) {
            console.error("🔧 DashboardUpdateAgent: Dashboard not found:", dashboardId)
            continue
          }
          
          // Update the dashboard using Gemini
          const updatedDashboard = await this.updateDashboardWithGemini(
            request.query,
            request.chatHistory,
            dashboardData,
            request.originalPrompt
          )
          
          if (updatedDashboard) {
            updatedDashboards.push({
              id: dashboardId,
              name: updatedDashboard.name,
              componentCode: updatedDashboard.componentCode,
              dataFunction: updatedDashboard.dataFunction
            })
            
            // Save the updated dashboard
            await this.saveUpdatedDashboard(dashboardId, updatedDashboard)
          }
          
        } catch (error) {
          console.error("🔧 DashboardUpdateAgent: Error updating dashboard:", dashboardId, error)
        }
      }
      
      return {
        success: updatedDashboards.length > 0,
        updatedDashboards
      }
      
    } catch (error) {
      console.error("🔧 DashboardUpdateAgent: Error in update process:", error)
      return {
        success: false,
        updatedDashboards: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async fetchDashboardData(dashboardId: string): Promise<any> {
    try {
      // Load all dashboards from the dashboards API
      const dashboardsResponse = await fetch('/api/dashboards')
      if (dashboardsResponse.ok) {
        const dashboards = await dashboardsResponse.json()
        const dashboard = dashboards.find((d: any) => d.id === dashboardId)
        if (dashboard) {
          console.log("🔧 DashboardUpdateAgent: Found dashboard:", dashboard.name)
          return dashboard
        }
      }
      
      // Fallback: try saved dashboards
      const savedDashboardsResponse = await fetch('/api/saved-dashboards')
      if (savedDashboardsResponse.ok) {
        const savedDashboards = await savedDashboardsResponse.json()
        const savedDashboard = savedDashboards.find((d: any) => d.dashboardId === dashboardId)
        if (savedDashboard) {
          // Get the full dashboard data from the main dashboards endpoint
          const dashboardsResponse = await fetch('/api/dashboards')
          if (dashboardsResponse.ok) {
            const dashboards = await dashboardsResponse.json()
            const dashboard = dashboards.find((d: any) => d.id === dashboardId)
            if (dashboard) {
              console.log("🔧 DashboardUpdateAgent: Found dashboard via saved dashboards:", dashboard.name)
              return dashboard
            }
          }
        }
      }
      
      console.error("🔧 DashboardUpdateAgent: Dashboard not found in any source:", dashboardId)
      return null
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      return null
    }
  }

  private async updateDashboardWithGemini(
    query: string,
    chatHistory: string | undefined,
    dashboardData: any,
    originalPrompt: string | undefined
  ): Promise<any> {
    try {
      const dataContext = await this.getDataContext()
      
      const prompt = `You are a dashboard update system. Update the existing dashboard based on the user's request.

ORIGINAL PROMPT CONTEXT:
${originalPrompt || "No original prompt available"}

CURRENT DASHBOARD:
- Name: ${dashboardData.name}
- Description: ${dashboardData.description}
- Component Code: ${dashboardData.componentCode}
- Data Function: ${dashboardData.dataFunction}

USER UPDATE REQUEST: "${query}"

${chatHistory ? `CHAT HISTORY:
${chatHistory}

` : ''}

AVAILABLE DATA SCHEMA:
${dataContext.schema}

SAMPLE DATA:
${dataContext.sampleData}

AVAILABLE API ENDPOINTS:
- /api/data/turbines - Returns array of turbine objects
- /api/data/telemetry - Returns array of telemetry objects

REQUIREMENTS:
1. Update the component code and data function based on the user's request
2. Maintain the same professional formatting and structure
3. Keep the same chart type unless specifically requested to change
4. Update colors, styling, or functionality as requested
5. Ensure the updated code follows the same patterns as the original
6. DO NOT include any import statements - all dependencies are already provided
7. Use the same CSS variables for theming: hsl(var(--chart-1)), hsl(var(--border)), etc.
8. Include proper error handling and loading states

Return ONLY a JSON object with this structure:
{
  "name": "Updated Dashboard Name",
  "description": "Updated description",
  "componentCode": "Updated React component code",
  "dataFunction": "Updated data function code"
}`

      console.log("🔧 DashboardUpdateAgent: Sending update request to Gemini")

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          context: "Dashboard update with existing code and user modifications"
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const geminiResponse = data.response

      console.log("🔧 DashboardUpdateAgent: Raw Gemini response:", geminiResponse)

      // Parse the JSON response from Gemini
      let updatedDashboard: any
      try {
        const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          updatedDashboard = JSON.parse(jsonMatch[0])
        } else {
          throw new Error("No JSON found in response")
        }
      } catch (parseError) {
        console.error("Failed to parse Gemini response:", parseError)
        throw new Error("Invalid JSON response from Gemini")
      }

      // Validate the updated dashboard
      if (!updatedDashboard.componentCode || !updatedDashboard.dataFunction) {
        throw new Error("Invalid dashboard update structure")
      }

      return updatedDashboard

    } catch (error) {
      console.error("Dashboard update with Gemini failed:", error)
      throw error
    }
  }

  private async saveUpdatedDashboard(dashboardId: string, updatedDashboard: any): Promise<void> {
    try {
      const response = await fetch(`/api/dashboards`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: dashboardId,
          name: updatedDashboard.name,
          description: updatedDashboard.description,
          componentCode: updatedDashboard.componentCode,
          dataFunction: updatedDashboard.dataFunction
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save updated dashboard: ${response.status}`)
      }

      console.log("🔧 DashboardUpdateAgent: Successfully saved updated dashboard:", dashboardId)
    } catch (error) {
      console.error("Error saving updated dashboard:", error)
      throw error
    }
  }

  private async getDataContext(): Promise<{ schema: string; sampleData: string }> {
    try {
      // Fetch metadata from the metadata endpoint
      const metadataResponse = await fetch('/api/data/metadata')
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json()
        
        let schema = "AVAILABLE DATA SOURCES:\n\n"
        let sampleData = "SAMPLE DATA:\n\n"
        
        for (const endpoint of metadata.endpoints) {
          if (endpoint.available && endpoint.sampleData) {
            const schemaEntries = Object.entries(endpoint.schema || {})
              .map(([key, field]: [string, any]) => `  - ${key} (${field.type}): ${field.description}`)
              .join('\n')
            
            schema += `${endpoint.name}:\n${schemaEntries}\n\n`
            sampleData += `${endpoint.name.toUpperCase()} (${endpoint.sampleData.length} sample rows):\n`
            sampleData += JSON.stringify(endpoint.sampleData, null, 2)
            sampleData += "\n\n"
          }
        }

        return { schema, sampleData }
      }
    } catch (error) {
      console.error("Error fetching metadata:", error)
    }

    // Fallback to basic schema
    return {
      schema: "wind_turbines:\n  - turbine_id (string): Unique identifier for each turbine\n  - model (string): Turbine model name\n  - location (string): Geographic location/farm name\n  - status (string): Turbine status: Active, Warning, or Offline\n\nturbine_telemetry:\n  - turbine_id (string): Reference to turbine\n  - timestamp (string): ISO datetime of the reading\n  - power_output_kw (number): Power output in kilowatts\n  - wind_speed_mph (number): Wind speed in miles per hour\n  - gearbox_temp_c (number): Gearbox temperature in Celsius",
      sampleData: "Sample data unavailable"
    }
  }
} 