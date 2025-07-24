import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir, readFile } from "fs/promises"
import { join } from "path"

// GET - Load all dashboards
export async function GET(request: NextRequest) {
  try {
    // Load dashboards from data/dashboards directory
    const dashboardsFilePath = join(process.cwd(), "data", "dashboards", "dashboards.json")
    
    try {
      const fileContent = await readFile(dashboardsFilePath, "utf-8")
      const dashboards = JSON.parse(fileContent)
      
      return NextResponse.json(dashboards)
    } catch (error) {
      // File doesn't exist yet, return empty array
      return NextResponse.json([])
    }
  } catch (error) {
    console.error("Error loading dashboards:", error)
    return NextResponse.json({ error: "Failed to load dashboards" }, { status: 500 })
  }
}

// POST - Create new dashboard
export async function POST(request: NextRequest) {
  try {
    const dashboard = await request.json()

    if (!dashboard.name || !dashboard.componentCode) {
      return NextResponse.json({ error: "Dashboard name and component code are required" }, { status: 400 })
    }

    // Ensure data/dashboards directory exists
    const dashboardsDir = join(process.cwd(), "data", "dashboards")
    try {
      await mkdir(dashboardsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Load existing dashboards
    const dashboardsFilePath = join(dashboardsDir, "dashboards.json")
    let dashboards = []
    
    try {
      const fileContent = await readFile(dashboardsFilePath, "utf-8")
      dashboards = JSON.parse(fileContent)
    } catch (error) {
      // File doesn't exist yet, start with empty array
    }

    // Create new dashboard with proper structure
    const newDashboard = {
      id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: dashboard.name,
      description: dashboard.description || "",
      tags: dashboard.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chartType: dashboard.chartType || "custom",
      componentCode: dashboard.componentCode,
      dataFunction: dashboard.dataFunction || "async function fetchData() { return [] }",
      query: dashboard.query || "",
      createdFromChat: true
    }

    // Add to existing dashboards
    dashboards.push(newDashboard)

    // Save updated dashboards
    await writeFile(dashboardsFilePath, JSON.stringify(dashboards, null, 2))

    return NextResponse.json({ 
      success: true, 
      message: "Dashboard created successfully",
      dashboard: newDashboard
    })
  } catch (error) {
    console.error("Error creating dashboard:", error)
    return NextResponse.json({ success: false, error: "Failed to create dashboard" }, { status: 500 })
  }
}

// PUT - Update existing dashboard
export async function PUT(request: NextRequest) {
  try {
    const { id, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Dashboard ID is required" }, { status: 400 })
    }

    // Load existing dashboards
    const dashboardsFilePath = join(process.cwd(), "data", "dashboards", "dashboards.json")
    let dashboards = []
    
    try {
      const fileContent = await readFile(dashboardsFilePath, "utf-8")
      dashboards = JSON.parse(fileContent)
    } catch (error) {
      return NextResponse.json({ error: "No dashboards found" }, { status: 404 })
    }

    // Find and update the dashboard
    const dashboardIndex = dashboards.findIndex((d: any) => d.id === id)
    if (dashboardIndex === -1) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
    }

    // Update the dashboard
    dashboards[dashboardIndex] = {
      ...dashboards[dashboardIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    // Save updated dashboards
    await writeFile(dashboardsFilePath, JSON.stringify(dashboards, null, 2))

    return NextResponse.json({ 
      success: true, 
      message: "Dashboard updated successfully",
      dashboard: dashboards[dashboardIndex]
    })
  } catch (error) {
    console.error("Error updating dashboard:", error)
    return NextResponse.json({ success: false, error: "Failed to update dashboard" }, { status: 500 })
  }
}

// DELETE - Delete dashboard
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "Dashboard ID is required" }, { status: 400 })
    }

    // Load existing dashboards
    const dashboardsFilePath = join(process.cwd(), "data", "dashboards", "dashboards.json")
    let dashboards = []
    
    try {
      const fileContent = await readFile(dashboardsFilePath, "utf-8")
      dashboards = JSON.parse(fileContent)
    } catch (error) {
      return NextResponse.json({ error: "No dashboards found" }, { status: 404 })
    }

    // Find and remove the dashboard
    const dashboardIndex = dashboards.findIndex((d: any) => d.id === id)
    if (dashboardIndex === -1) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
    }

    const deletedDashboard = dashboards[dashboardIndex]
    dashboards.splice(dashboardIndex, 1)

    // Save updated dashboards
    await writeFile(dashboardsFilePath, JSON.stringify(dashboards, null, 2))

    return NextResponse.json({ 
      success: true, 
      message: "Dashboard deleted successfully",
      dashboard: deletedDashboard
    })
  } catch (error) {
    console.error("Error deleting dashboard:", error)
    return NextResponse.json({ success: false, error: "Failed to delete dashboard" }, { status: 500 })
  }
} 