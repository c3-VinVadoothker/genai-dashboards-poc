export interface DashboardQueryResult {
  dashboardId: string
  dashboardName: string
  metrics: any
  error?: string
}

export interface QueryAnswer {
  answer: string
  dashboardResults: DashboardQueryResult[]
  queryIntent: string
}

export class DashboardQueryAgent {
  private static instance: DashboardQueryAgent

  static getInstance(): DashboardQueryAgent {
    if (!DashboardQueryAgent.instance) {
      DashboardQueryAgent.instance = new DashboardQueryAgent()
    }
    return DashboardQueryAgent.instance
  }

  async processDashboardQuery(
    userQuery: string, 
    dashboardIds: string[], 
    chatHistory?: string
  ): Promise<QueryAnswer> {
    try {
      console.log("🔍 DashboardQueryAgent: Processing query for dashboards:", dashboardIds)
      console.log("🔍 DashboardQueryAgent: Chat history received:", chatHistory ? "Yes" : "No")
      console.log("🔍 DashboardQueryAgent: Chat history length:", chatHistory?.length || 0)
      if (chatHistory) {
        console.log("🔍 DashboardQueryAgent: Chat history content:", chatHistory)
      }
      
      // Fetch metrics for each dashboard
      const dashboardResults = await this.fetchDashboardMetrics(dashboardIds)
      
      // Generate answer using Gemini
      const answer = await this.generateAnswer(userQuery, dashboardResults, chatHistory)
      
      return {
        answer,
        dashboardResults,
        queryIntent: userQuery
      }
    } catch (error) {
      console.error("DashboardQueryAgent error:", error)
      return {
        answer: "I encountered an error while processing your dashboard query. Please try again.",
        dashboardResults: [],
        queryIntent: userQuery
      }
    }
  }

  private async fetchDashboardMetrics(dashboardIds: string[]): Promise<DashboardQueryResult[]> {
    const results: DashboardQueryResult[] = []

    for (const dashboardId of dashboardIds) {
      try {
        console.log(`🔍 DashboardQueryAgent: Fetching metrics for dashboard ${dashboardId}`)
        
        const response = await fetch(`/api/dashboard/${dashboardId}/metrics`)
        if (response.ok) {
          const data = await response.json()
          results.push({
            dashboardId,
            dashboardName: data.dashboard.name,
            metrics: data.result
          })
        } else {
          results.push({
            dashboardId,
            dashboardName: "Unknown Dashboard",
            metrics: null,
            error: `Failed to fetch metrics: ${response.status}`
          })
        }
      } catch (error) {
        console.error(`Error fetching metrics for dashboard ${dashboardId}:`, error)
        results.push({
          dashboardId,
          dashboardName: "Unknown Dashboard",
          metrics: null,
          error: `Error: ${error instanceof Error ? error.message : String(error)}`
        })
      }
    }

    return results
  }

  private async generateAnswer(
    userQuery: string, 
    dashboardResults: DashboardQueryResult[], 
    chatHistory?: string
  ): Promise<string> {
    try {
      const prompt = `You are a helpful AI assistant that analyzes dashboard data and answers user questions.

USER QUERY: "${userQuery}"

DASHBOARD RESULTS:
${dashboardResults.map(result => `
Dashboard: ${result.dashboardName} (ID: ${result.dashboardId})
${result.error ? `Error: ${result.error}` : `Metrics: ${JSON.stringify(result.metrics, null, 2)}`}
`).join('\n')}

${chatHistory ? `CHAT HISTORY:
${chatHistory}

` : ''}

Based on the dashboard data above, provide a comprehensive answer to the user's query. 

REQUIREMENTS:
1. Answer the specific question asked
2. Use the actual data from the dashboards
3. Provide insights and analysis based on the data
4. Format your response in Markdown
5. Be conversational and helpful
6. If there are errors fetching data, mention them but still try to answer with available data
7. If no relevant data is available, explain what you can and cannot answer

Return ONLY the markdown answer, no additional formatting or explanations.`

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          context: "Dashboard data analysis and query answering"
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      return data.response

    } catch (error) {
      console.error("Error generating answer:", error)
      return "I encountered an error while generating an answer. Please try again."
    }
  }
} 