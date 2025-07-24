import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET() {
  try {
    const filePath = join(process.cwd(), "data", "dashboards", "dashboards.json")
    const fileContent = await readFile(filePath, "utf-8")
    const dashboards = JSON.parse(fileContent)

    // Return the first dashboard as the default state, or create an empty state
    const defaultDashboard = dashboards.length > 0 ? dashboards[0] : null
    
    if (defaultDashboard) {
      // Convert the dashboard to the expected DashboardState format
      const dashboardState = {
        components: [
          {
            id: defaultDashboard.id,
            type: "saved-component" as const,
            title: defaultDashboard.name,
            position: { x: 0, y: 0 },
            size: { width: 12, height: 8 },
            data: {
              dashboardId: defaultDashboard.id,
              componentCode: defaultDashboard.componentCode,
              dataFunction: defaultDashboard.dataFunction,
              chartType: defaultDashboard.chartType
            },
            config: {
              chartType: defaultDashboard.chartType,
              dataSource: "saved-dashboard",
              refreshRate: 30
            },
            createdAt: new Date(defaultDashboard.createdAt),
            updatedAt: new Date(defaultDashboard.updatedAt)
          }
        ],
        layout: {
          columns: 12,
          rowHeight: 100,
          margin: 16
        },
        lastSaved: new Date(defaultDashboard.updatedAt)
      }

      return NextResponse.json(dashboardState)
    } else {
      // Return empty state if no dashboards exist
      const emptyState = {
        components: [],
        layout: {
          columns: 12,
          rowHeight: 100,
          margin: 16
        },
        lastSaved: new Date()
      }

      return NextResponse.json(emptyState)
    }
  } catch (error) {
    if ((error as any).code === "ENOENT") {
      // File doesn't exist yet, return empty state
      const emptyState = {
        components: [],
        layout: {
          columns: 12,
          rowHeight: 100,
          margin: 16
        },
        lastSaved: new Date()
      }
      return NextResponse.json(emptyState)
    }

    console.error("Error loading dashboard state:", error)
    return NextResponse.json({ error: "Failed to load dashboard state" }, { status: 500 })
  }
}
