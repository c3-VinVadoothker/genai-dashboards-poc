import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log(`📊 API - Fetching data for dashboard: ${id}`)

    // Load saved dashboards data
    const savedDashboardsPath = join(process.cwd(), 'data', 'dashboards', 'saved-dashboards.json')
    let savedDashboardsData: any[] = []
    
    try {
      savedDashboardsData = JSON.parse(readFileSync(savedDashboardsPath, 'utf8'))
    } catch (error) {
      console.log(`⚠️ API - Could not load saved dashboards:`, error)
      return NextResponse.json({ error: 'No saved dashboards found' }, { status: 404 })
    }
    
    const dashboard = savedDashboardsData.find((d: any) => d.id === id)
    if (!dashboard) {
      console.log(`❌ API - Saved dashboard not found: ${id}`)
      return NextResponse.json({ error: 'Saved dashboard not found' }, { status: 404 })
    }

    console.log(`✅ API - Found dashboard: ${dashboard.name}`)

    // Execute the dashboard's data function to get the actual data
    let dashboardData: any[] = []
    
    try {
      if (dashboard.dataFunction) {
        // Create a safe execution environment
        const executeFunction = new Function(`
          ${dashboard.dataFunction}
          return fetchRpmWindSpeedData ? fetchRpmWindSpeedData() : 
                 fetchRpmWindCorrelationData ? fetchRpmWindCorrelationData() :
                 processWindPowerCorrelationData ? processWindPowerCorrelationData() :
                 fetchTurbineStatusByLocation ? fetchTurbineStatusByLocation() :
                 processTurbineStatusByLocation ? processTurbineStatusByLocation() :
                 fetchLocationStatusData ? fetchLocationStatusData() :
                 [];
        `)
        
        const result = await executeFunction()
        
        // Handle different return types
        if (Array.isArray(result)) {
          dashboardData = result
        } else if (result && typeof result === 'object') {
          // For scatter charts that return {location: data[]}
          dashboardData = Object.values(result).flat()
        } else {
          dashboardData = []
        }
        
        console.log(`📊 API - Dashboard data result:`, dashboardData.slice(0, 3))
      }
    } catch (error) {
      console.log(`⚠️ API - Error executing data function:`, error)
      // Return empty array if data function fails
      dashboardData = []
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('❌ API - Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 