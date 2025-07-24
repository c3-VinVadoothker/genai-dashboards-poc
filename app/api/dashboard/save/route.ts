import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const dashboardState = await request.json()

    // Ensure data directory exists
    const dataDir = join(process.cwd(), "data")
    try {
      await mkdir(dataDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Save dashboard state to JSON file
    const filePath = join(dataDir, "dashboard-state.json")
    await writeFile(filePath, JSON.stringify(dashboardState, null, 2))

    return NextResponse.json({ success: true, message: "Dashboard state saved successfully" })
  } catch (error) {
    console.error("Error saving dashboard state:", error)
    return NextResponse.json({ success: false, error: "Failed to save dashboard state" }, { status: 500 })
  }
}
