import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const dashboardId = resolvedParams.id

    if (!dashboardId) {
      return NextResponse.json({ error: "Dashboard ID is required" }, { status: 400 })
    }

    // Load dashboards from the API
    const dashboardsResponse = await fetch(`${request.nextUrl.origin}/api/dashboards`)
    if (!dashboardsResponse.ok) {
      return NextResponse.json({ error: "Failed to load dashboards" }, { status: 500 })
    }

    const dashboards = await dashboardsResponse.json()
    const dashboard = dashboards.find((d: any) => d.id === dashboardId)

    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
    }



    // Execute the dashboard's data function
    let result = null
    try {
      // Extract function name from the dataFunction
      const functionNameMatch = dashboard.dataFunction.match(/(?:const|let|var|function)\s+(\w+)\s*=/)
      const functionName = functionNameMatch ? functionNameMatch[1] : null
      
      if (functionName) {
        // Create a modified version that uses the full URL
        const modifiedDataFunction = dashboard.dataFunction.replace(
          /fetch\('\/api\/data\/turbines'\)/g,
          `fetch('${request.nextUrl.origin}/api/data/turbines')`
        )
        
        // Execute the function
        const executeFunction = new Function(`
          ${modifiedDataFunction}
          return ${functionName}();
        `)
        
        result = await executeFunction()
      }
    } catch (error) {
      // Let the function handle its own errors
      result = null
    }

    // Prepare the response
    const response = {
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        chartType: dashboard.chartType,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt,
        tags: dashboard.tags || [],
        createdFromChat: dashboard.createdFromChat
      },
      result: result,
      dataFunction: dashboard.dataFunction,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ 
      error: "Failed to fetch dashboard data",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 