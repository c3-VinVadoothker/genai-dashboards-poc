import { NextResponse } from 'next/server'
import { readFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    // Ensure data directory exists
    const dataDir = join(process.cwd(), "data")
    try {
      await mkdir(dataDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Load simple saved dashboards from JSON file
    const filePath = join(dataDir, "simple-dashboards.json")
    
    try {
      const fileContent = await readFile(filePath, "utf-8")
      const dashboards = JSON.parse(fileContent)
      
      // Convert string dates back to Date objects
      const dashboardsWithDates = dashboards.map((dashboard: any) => ({
        ...dashboard,
        createdAt: dashboard.createdAt ? new Date(dashboard.createdAt) : new Date(),
        updatedAt: dashboard.updatedAt ? new Date(dashboard.updatedAt) : new Date(),
      }))
      
      return NextResponse.json(dashboardsWithDates)
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        // File doesn't exist yet, return empty array
        return NextResponse.json([])
      }
      throw error
    }
  } catch (error) {
    console.error("Error loading simple dashboards:", error)
    return NextResponse.json({ error: "Failed to load simple dashboards" }, { status: 500 })
  }
} 