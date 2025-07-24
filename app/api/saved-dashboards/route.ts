import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const savedDashboardsPath = path.join(process.cwd(), 'data', 'dashboards', 'saved-dashboards.json')
    
    const savedDashboardsData = await fs.readFile(savedDashboardsPath, 'utf-8')
    const savedDashboards = JSON.parse(savedDashboardsData)
    
    return NextResponse.json(savedDashboards)
  } catch (error) {
    console.error('Error loading saved dashboards:', error)
    return NextResponse.json({ error: 'Failed to load saved dashboards' }, { status: 500 })
  }
}

// POST - Save a new dashboard
export async function POST(request: NextRequest) {
  try {
    const dashboardData = await request.json()

    if (!dashboardData.dashboardId || !dashboardData.position) {
      return NextResponse.json({ error: "Dashboard ID and position are required" }, { status: 400 })
    }

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), "data")
    try {
      await fs.mkdir(dataDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Load existing saved dashboards
    const savedDashboardsFilePath = path.join(dataDir, "dashboards", "saved-dashboards.json")
    let savedDashboards = []
    
    try {
      const fileContent = await fs.readFile(savedDashboardsFilePath, "utf-8")
      savedDashboards = JSON.parse(fileContent)
    } catch (error) {
      // File doesn't exist yet, start with empty array
    }

    // Create new saved dashboard entry
    const newSavedDashboard = {
      id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dashboardId: dashboardData.dashboardId,
      name: dashboardData.name || "Saved Dashboard",
      position: dashboardData.position,
      size: dashboardData.size || { width: 6, height: 300 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Add to existing saved dashboards
    savedDashboards.push(newSavedDashboard)

    // Save updated saved dashboards
    await fs.writeFile(savedDashboardsFilePath, JSON.stringify(savedDashboards, null, 2))

    return NextResponse.json({ 
      success: true, 
      message: "Dashboard saved successfully",
      savedDashboard: newSavedDashboard
    })
  } catch (error) {
    console.error("Error saving dashboard:", error)
    return NextResponse.json({ success: false, error: "Failed to save dashboard" }, { status: 500 })
  }
}

// PUT - Update existing saved dashboard
export async function PUT(request: NextRequest) {
  try {
    const { id, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Saved dashboard ID is required" }, { status: 400 })
    }

    // Load existing saved dashboards
    const savedDashboardsFilePath = path.join(process.cwd(), "data", "dashboards", "saved-dashboards.json")
    let savedDashboards = []
    
    try {
      const fileContent = await fs.readFile(savedDashboardsFilePath, "utf-8")
      savedDashboards = JSON.parse(fileContent)
    } catch (error) {
      return NextResponse.json({ error: "No saved dashboards found" }, { status: 404 })
    }

    // Find and update the saved dashboard
    const dashboardIndex = savedDashboards.findIndex((d: any) => d.id === id)
    if (dashboardIndex === -1) {
      return NextResponse.json({ error: "Saved dashboard not found" }, { status: 404 })
    }

    // Update the saved dashboard
    savedDashboards[dashboardIndex] = {
      ...savedDashboards[dashboardIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    // Save updated saved dashboards
    await fs.writeFile(savedDashboardsFilePath, JSON.stringify(savedDashboards, null, 2))

    return NextResponse.json({ 
      success: true, 
      message: "Saved dashboard updated successfully",
      savedDashboard: savedDashboards[dashboardIndex]
    })
  } catch (error) {
    console.error("Error updating saved dashboard:", error)
    return NextResponse.json({ success: false, error: "Failed to update saved dashboard" }, { status: 500 })
  }
}

// DELETE - Delete saved dashboard
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "Saved dashboard ID is required" }, { status: 400 })
    }

    // Load existing saved dashboards
    const savedDashboardsFilePath = path.join(process.cwd(), "data", "dashboards", "saved-dashboards.json")
    let savedDashboards = []
    
    try {
      const fileContent = await fs.readFile(savedDashboardsFilePath, "utf-8")
      savedDashboards = JSON.parse(fileContent)
    } catch (error) {
      return NextResponse.json({ error: "No saved dashboards found" }, { status: 404 })
    }

    // Filter out the dashboard to delete
    const filteredDashboards = savedDashboards.filter((d: any) => d.id !== id)

    if (filteredDashboards.length === savedDashboards.length) {
      return NextResponse.json({ error: "Saved dashboard not found" }, { status: 404 })
    }

    // Save updated saved dashboards
    await fs.writeFile(savedDashboardsFilePath, JSON.stringify(filteredDashboards, null, 2))

    return NextResponse.json({ 
      success: true, 
      message: "Saved dashboard deleted successfully" 
    })
  } catch (error) {
    console.error("Error deleting saved dashboard:", error)
    return NextResponse.json({ success: false, error: "Failed to delete saved dashboard" }, { status: 500 })
  }
} 