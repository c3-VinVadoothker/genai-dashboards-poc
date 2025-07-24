export interface WindTurbine {
  turbine_id: string
  model: string
  location: string
  commission_date: string
  latitude: number
  longitude: number
  status: "Active" | "Warning" | "Offline"
}

export interface TurbineTelemetry {
  turbine_id: string
  timestamp: string
  power_output_kw: number
  wind_speed_mph: number
  rotor_rpm: number
  gearbox_temp_c: number
}

export class DataService {
  private static instance: DataService
  private turbineCache: WindTurbine[] | null = null
  private telemetryCache: TurbineTelemetry[] | null = null

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService()
    }
    return DataService.instance
  }

  async getTurbines(): Promise<WindTurbine[]> {
    if (this.turbineCache) {
      return this.turbineCache
    }

    try {
      const response = await fetch("/api/data/turbines")
      if (!response.ok) {
        throw new Error("Failed to fetch turbine data")
      }

      const turbines = await response.json()
      this.turbineCache = turbines
      return turbines
    } catch (error) {
      console.error("Error fetching turbines:", error)
      return []
    }
  }

  async getTelemetry(turbineId?: string, limit?: number): Promise<TurbineTelemetry[]> {
    try {
      const params = new URLSearchParams()
      if (turbineId) params.append("turbine_id", turbineId)
      if (limit) params.append("limit", limit.toString())

      const response = await fetch(`/api/data/telemetry?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch telemetry data")
      }

      const telemetry = await response.json()
      return telemetry
    } catch (error) {
      console.error("Error fetching telemetry:", error)
      return []
    }
  }

  async getTurbineStats(): Promise<{
    totalTurbines: number
    activeTurbines: number
    warningTurbines: number
    offlineTurbines: number
    totalPowerOutput: number
    averageWindSpeed: number
    locations: string[]
  }> {
    const turbines = await this.getTurbines()
    const telemetry = await this.getTelemetry()

    const latestTelemetry = new Map<string, TurbineTelemetry>()
    telemetry.forEach((record) => {
      const existing = latestTelemetry.get(record.turbine_id)
      if (!existing || new Date(record.timestamp) > new Date(existing.timestamp)) {
        latestTelemetry.set(record.turbine_id, record)
      }
    })

    const totalPowerOutput = Array.from(latestTelemetry.values()).reduce(
      (sum, record) => sum + record.power_output_kw,
      0,
    )

    const averageWindSpeed =
      Array.from(latestTelemetry.values()).reduce((sum, record) => sum + record.wind_speed_mph, 0) /
      latestTelemetry.size

    const locations = [...new Set(turbines.map((t) => t.location))]

    return {
      totalTurbines: turbines.length,
      activeTurbines: turbines.filter((t) => t.status === "Active").length,
      warningTurbines: turbines.filter((t) => t.status === "Warning").length,
      offlineTurbines: turbines.filter((t) => t.status === "Offline").length,
      totalPowerOutput: Math.round(totalPowerOutput),
      averageWindSpeed: Math.round(averageWindSpeed * 10) / 10,
      locations,
    }
  }

  async getTurbinesByLocation(): Promise<Record<string, WindTurbine[]>> {
    const turbines = await this.getTurbines()
    const byLocation: Record<string, WindTurbine[]> = {}

    turbines.forEach((turbine) => {
      if (!byLocation[turbine.location]) {
        byLocation[turbine.location] = []
      }
      byLocation[turbine.location].push(turbine)
    })

    return byLocation
  }

  async getPowerOutputByLocation(): Promise<Array<{ location: string; totalPower: number; turbineCount: number }>> {
    const turbines = await this.getTurbines()
    const telemetry = await this.getTelemetry()

    const latestTelemetry = new Map<string, TurbineTelemetry>()
    telemetry.forEach((record) => {
      const existing = latestTelemetry.get(record.turbine_id)
      if (!existing || new Date(record.timestamp) > new Date(existing.timestamp)) {
        latestTelemetry.set(record.turbine_id, record)
      }
    })

    const locationPower: Record<string, { totalPower: number; turbineCount: number }> = {}

    turbines.forEach((turbine) => {
      const telemetryRecord = latestTelemetry.get(turbine.turbine_id)
      if (telemetryRecord) {
        if (!locationPower[turbine.location]) {
          locationPower[turbine.location] = { totalPower: 0, turbineCount: 0 }
        }
        locationPower[turbine.location].totalPower += telemetryRecord.power_output_kw
        locationPower[turbine.location].turbineCount += 1
      }
    })

    return Object.entries(locationPower).map(([location, data]) => ({
      location,
      totalPower: Math.round(data.totalPower),
      turbineCount: data.turbineCount,
    }))
  }

  clearCache(): void {
    this.turbineCache = null
    this.telemetryCache = null
  }
}
