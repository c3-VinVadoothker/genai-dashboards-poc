import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const dashboards = await request.json()

    // Ensure data directory exists
    const dataDir = join(process.cwd(), "data")
    try {
      await mkdir(dataDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Save dashboards to JSON file
    const filePath = join(dataDir, "simple-dashboards.json")
    await writeFile(filePath, JSON.stringify(dashboards, null, 2))

    return NextResponse.json({ success: true, message: "Simple dashboards saved successfully" })
  } catch (error) {
    console.error("Error saving simple dashboards:", error)
    return NextResponse.json({ success: false, error: "Failed to save simple dashboards" }, { status: 500 })
  }
} 