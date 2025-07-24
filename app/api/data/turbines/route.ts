import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET() {
  try {
    const filePath = join(process.cwd(), "data", "wind_turbines.json")
    const fileContent = await readFile(filePath, "utf-8")
    const turbines = JSON.parse(fileContent)

    return NextResponse.json(turbines)
  } catch (error) {
    console.error("Error loading turbine data:", error)
    return NextResponse.json({ error: "Failed to load turbine data" }, { status: 500 })
  }
}
