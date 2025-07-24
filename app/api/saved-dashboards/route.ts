import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

// In-memory storage for production environments where file system is read-only
let inMemorySavedDashboards: any[] = []

// Initialize in-memory storage on module load
const initializeMemoryStorage = async () => {
  try {
    const savedDashboardsPath = path.join(process.cwd(), 'data', 'dashboards', 'saved-dashboards.json')
    const savedDashboardsData = await fs.readFile(savedDashboardsPath, 'utf-8')
    inMemorySavedDashboards = JSON.parse(savedDashboardsData)
    console.log('Loaded saved dashboards into memory:', inMemorySavedDashboards.length)
  } catch (error) {
    console.log('No existing saved dashboards file found, starting with empty memory')
  }
}

// Call initialization
initializeMemoryStorage()

// Helper function to get saved dashboards (file system or memory)
async function getSavedDashboards(): Promise<any[]> {
  try {
    // Try to read from file system first
    const savedDashboardsPath = path.join(process.cwd(), 'data', 'dashboards', 'saved-dashboards.json')
    const savedDashboardsData = await fs.readFile(savedDashboardsPath, 'utf-8')
    const savedDashboards = JSON.parse(savedDashboardsData)
    
    // Update in-memory storage
    inMemorySavedDashboards = savedDashboards
    return savedDashboards
  } catch (error) {
    console.log('Using in-memory storage for saved dashboards')
    return inMemorySavedDashboards
  }
}

// Helper function to save dashboards (file system or memory)
async function saveDashboardsToStorage(dashboards: any[]): Promise<void> {
  try {
    // Try to save to file system first
    const dataDir = path.join(process.cwd(), "data")
    await fs.mkdir(dataDir, { recursive: true })
    
    const savedDashboardsFilePath = path.join(dataDir, "dashboards", "saved-dashboards.json")
    await fs.writeFile(savedDashboardsFilePath, JSON.stringify(dashboards, null, 2))
    
    // Update in-memory storage
    inMemorySavedDashboards = dashboards
  } catch (error) {
    console.log('Using in-memory storage for saved dashboards')
    // Fall back to in-memory storage
    inMemorySavedDashboards = dashboards
  }
}

export async function GET(request: NextRequest) {
  try {
    const savedDashboards = await getSavedDashboards()
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

    // Load existing saved dashboards
    const savedDashboards = await getSavedDashboards()

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
    const updatedDashboards = [...savedDashboards, newSavedDashboard]

    // Save updated saved dashboards
    await saveDashboardsToStorage(updatedDashboards)

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
    const savedDashboards = await getSavedDashboards()

    // Find and update the saved dashboard
    const dashboardIndex = savedDashboards.findIndex((d: any) => d.id === id)
    if (dashboardIndex === -1) {
      return NextResponse.json({ error: "Saved dashboard not found" }, { status: 404 })
    }

    // Update the saved dashboard
    const updatedDashboards = [...savedDashboards]
    updatedDashboards[dashboardIndex] = {
      ...updatedDashboards[dashboardIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    // Save updated saved dashboards
    await saveDashboardsToStorage(updatedDashboards)

    return NextResponse.json({ 
      success: true, 
      message: "Saved dashboard updated successfully",
      savedDashboard: updatedDashboards[dashboardIndex]
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
    const savedDashboards = await getSavedDashboards()

    // Filter out the dashboard to delete
    const filteredDashboards = savedDashboards.filter((d: any) => d.id !== id)

    if (filteredDashboards.length === savedDashboards.length) {
      return NextResponse.json({ error: "Saved dashboard not found" }, { status: 404 })
    }

    // Save updated saved dashboards
    await saveDashboardsToStorage(filteredDashboards)

    return NextResponse.json({ 
      success: true, 
      message: "Saved dashboard deleted successfully" 
    })
  } catch (error) {
    console.error("Error deleting saved dashboard:", error)
    return NextResponse.json({ success: false, error: "Failed to delete saved dashboard" }, { status: 500 })
  }
} 