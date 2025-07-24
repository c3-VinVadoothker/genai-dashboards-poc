import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

interface EndpointDefinition {
  path: string
  method: string
  name: string
  description: string
  parameters: any[]
  queryParams: Array<{ name: string; type: string; description: string; required: boolean }>
  responseType: string
  dataFile: string
  schema: Record<string, { type: string; description: string }>
}

interface EndpointMetadata extends EndpointDefinition {
  available: boolean
  sampleData?: any[]
  structure?: {
    totalRecords: number
    fields: string[]
    dataTypes: Record<string, string>
    uniqueValues: Record<string, any[]>
  }
  error?: string
  lastChecked: string
}

interface MetadataResponse {
  endpoints: EndpointMetadata[]
  schemas: Record<string, any>
  relationships: Array<{
    from: string
    to: string
    type: string
    field: string
    description: string
  }>
  totalEndpoints: number
  lastUpdated: string
}

export async function GET() {
  try {
    const metadata: MetadataResponse = {
      endpoints: [],
      schemas: {},
      relationships: [],
      totalEndpoints: 0,
      lastUpdated: new Date().toISOString()
    }

    // Define available data endpoints and their metadata
    const endpointDefinitions = [
      {
        path: "/api/data/turbines",
        method: "GET",
        name: "wind_turbines",
        description: "Wind turbine static data including location, model, and status",
        parameters: [],
        queryParams: [],
        responseType: "array",
        dataFile: "wind_turbines.json",
        schema: {
          turbine_id: { type: "string", description: "Unique identifier for each turbine" },
          model: { type: "string", description: "Turbine model name" },
          location: { type: "string", description: "Geographic location/farm name" },
          commission_date: { type: "string", description: "Date when turbine was commissioned" },
          latitude: { type: "number", description: "GPS latitude coordinate" },
          longitude: { type: "number", description: "GPS longitude coordinate" },
          status: { type: "string", description: "Turbine status: Active, Warning, or Offline" }
        }
      },
      {
        path: "/api/data/telemetry",
        method: "GET",
        name: "turbine_telemetry",
        description: "Real-time telemetry data from wind turbines",
        parameters: [],
        queryParams: [
          { name: "turbine_id", type: "string", description: "Filter by specific turbine ID", required: false },
          { name: "limit", type: "number", description: "Limit number of records returned", required: false }
        ],
        responseType: "array",
        dataFile: "turbine_telemetry.json",
        schema: {
          turbine_id: { type: "string", description: "Reference to turbine" },
          timestamp: { type: "string", description: "ISO datetime of the reading" },
          power_output_kw: { type: "number", description: "Power output in kilowatts" },
          wind_speed_mph: { type: "number", description: "Wind speed in miles per hour" },
          rotor_rpm: { type: "number", description: "Rotor speed in RPM" },
          gearbox_temp_c: { type: "number", description: "Gearbox temperature in Celsius" }
        }
      }
    ]

    // Check each endpoint and gather metadata
    for (const endpoint of endpointDefinitions) {
      const filePath = join(process.cwd(), "data", endpoint.dataFile)
      
      if (existsSync(filePath)) {
        try {
          const fileContent = await readFile(filePath, "utf-8")
          const data = JSON.parse(fileContent)
          
          // Get sample data (first 3 records)
          const sampleData = data.slice(0, 3)
          
          // Analyze data structure
          const structure = {
            totalRecords: data.length,
            fields: Object.keys(data[0] || {}),
            dataTypes: data[0] ? Object.fromEntries(
              Object.entries(data[0]).map(([key, value]) => [key, typeof value])
            ) : {},
            uniqueValues: {} as Record<string, any[]>
          }

          // Analyze unique values for categorical fields
          if (data.length > 0) {
            const categoricalFields = ['status', 'location', 'model']
            for (const field of categoricalFields) {
              if (data[0] && (data[0] as any)[field] !== undefined) {
                const uniqueValues = [...new Set(data.map((item: any) => (item as any)[field]))]
                structure.uniqueValues[field] = uniqueValues
              }
            }
          }

          // Add endpoint metadata
          metadata.endpoints.push({
            ...endpoint,
            available: true,
            sampleData,
            structure,
            lastChecked: new Date().toISOString()
          } as EndpointMetadata)

          // Add schema information
          metadata.schemas[endpoint.name] = {
            fields: endpoint.schema,
            sampleRecord: data[0] || null,
            totalRecords: data.length
          }

        } catch (error) {
          console.error(`Error reading ${endpoint.dataFile}:`, error)
          metadata.endpoints.push({
            ...endpoint,
            available: false,
            error: error.message,
            lastChecked: new Date().toISOString()
          })
        }
      } else {
        metadata.endpoints.push({
          ...endpoint,
          available: false,
          error: "Data file not found",
          lastChecked: new Date().toISOString()
        })
      }
    }

    // Add relationships
    metadata.relationships = [
      {
        from: "wind_turbines",
        to: "turbine_telemetry",
        type: "one-to-many",
        field: "turbine_id",
        description: "Each turbine can have multiple telemetry readings"
      }
    ]

    metadata.totalEndpoints = metadata.endpoints.filter(e => e.available).length

    return NextResponse.json(metadata)
  } catch (error) {
    console.error("Error generating data metadata:", error)
    return NextResponse.json(
      { error: "Failed to generate data metadata" }, 
      { status: 500 }
    )
  }
} 