import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const turbineId = searchParams.get("turbine_id")
    const limit = searchParams.get("limit")

    const filePath = join(process.cwd(), "data", "turbine_telemetry.json")
    const fileContent = await readFile(filePath, "utf-8")
    let telemetry = JSON.parse(fileContent)

    // Filter by turbine ID if specified
    if (turbineId) {
      telemetry = telemetry.filter((record: any) => record.turbine_id === turbineId)
    }

    // Limit results if specified
    if (limit) {
      telemetry = telemetry.slice(0, Number.parseInt(limit))
    }

    return NextResponse.json(telemetry)
  } catch (error) {
    console.error("Error loading telemetry data:", error)
    return NextResponse.json({ error: "Failed to load telemetry data" }, { status: 500 })
  }
}
