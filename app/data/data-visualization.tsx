"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Wind,
  Zap,
  Thermometer,
  Gauge,
  MapPin,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Database,
  Menu,
} from "lucide-react"
import { AppSidebar } from "@/components/sidebar"
import { ThemeProvider } from "@/components/theme-provider"

interface WindTurbine {
  turbine_id: string
  model: string
  location: string
  commission_date: string
  latitude: number
  longitude: number
  status: string
}

interface TurbineTelemetry {
  turbine_id: string
  timestamp: string
  power_output_kw: number
  wind_speed_mph: number
  rotor_rpm: number
  gearbox_temp_c: number
}

function DataContent() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [turbines, setTurbines] = useState<WindTurbine[]>([])
  const [telemetry, setTelemetry] = useState<TurbineTelemetry[]>([])
  const [selectedTurbine, setSelectedTurbine] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const [turbinesRes, telemetryRes] = await Promise.all([
          fetch("/api/data/turbines"),
          fetch("/api/data/telemetry"),
        ])

        const turbinesData = await turbinesRes.json()
        const telemetryData = await telemetryRes.json()

        setTurbines(turbinesData)
        setTelemetry(telemetryData)
      } catch (error) {
        console.error("Failed to load data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white dark:bg-black">
        <AppSidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium text-black dark:text-white">Loading Wind Farm Data...</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Fetching turbine telemetry and status</p>
          </div>
        </div>
      </div>
    )
  }

  // Calculate aggregated stats
  const totalTurbines = turbines.length
  const totalPowerOutput = telemetry.reduce((sum, t) => sum + t.power_output_kw, 0) / 1000 // Convert to MW
  const avgWindSpeed = telemetry.reduce((sum, t) => sum + t.wind_speed_mph, 0) / telemetry.length
  const avgTemperature = telemetry.reduce((sum, t) => sum + (t.gearbox_temp_c || 0), 0) / telemetry.length

  // Group turbines by location
  const locationGroups = turbines.reduce(
    (groups, turbine) => {
      const location = turbine.location
      if (!groups[location]) {
        groups[location] = []
      }
      groups[location].push(turbine)
      return groups
    },
    {} as Record<string, WindTurbine[]>,
  )

  // Get telemetry for selected turbine or latest for all
  const filteredTelemetry = selectedTurbine
    ? telemetry.filter((t) => t.turbine_id === selectedTurbine)
    : telemetry.slice(0, 20) // Show latest 20 entries

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "operational":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "warning":
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "offline":
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "operational":
        return <CheckCircle className="w-4 h-4" />
      case "warning":
      case "maintenance":
        return <AlertTriangle className="w-4 h-4" />
      case "offline":
      case "error":
        return <XCircle className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-black transition-colors">
      <AppSidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-8 py-4 bg-white dark:bg-black">
          <div className="flex items-center gap-4">
            {isSidebarCollapsed && (
              <Button
                onClick={toggleSidebar}
                variant="ghost"
                size="sm"
                className="p-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
            <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
              <Database className="w-4 h-4 text-white dark:text-black" />
            </div>
            <div>
              <h1 className="text-lg font-medium text-black dark:text-white">Wind Farm Data Center</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real-time turbine telemetry and operational insights
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 bg-gray-50 dark:bg-gray-950">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Turbines</CardTitle>
                  <Wind className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">{totalTurbines}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Across all locations</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
                    Total Power Output
                  </CardTitle>
                  <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100 mb-2">
                  {totalPowerOutput.toFixed(1)} MW
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">Current generation</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    Avg Wind Speed
                  </CardTitle>
                  <Gauge className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-2">
                  {avgWindSpeed.toFixed(1)} mph
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">Optimal conditions</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Avg Temperature
                  </CardTitle>
                  <Thermometer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-2">
                  {avgTemperature.toFixed(1)}°C
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300">Nacelle temperature</div>
              </CardContent>
            </Card>
          </div>

          {/* Data Tabs */}
          <Tabs defaultValue="locations" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
              <TabsTrigger
                value="locations"
                className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Locations
              </TabsTrigger>
              <TabsTrigger
                value="turbines"
                className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
              >
                <Wind className="w-4 h-4 mr-2" />
                Turbines
              </TabsTrigger>
              <TabsTrigger
                value="telemetry"
                className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
              >
                <Activity className="w-4 h-4 mr-2" />
                Live Data
              </TabsTrigger>
            </TabsList>

            <TabsContent value="locations" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(locationGroups).map(([location, locationTurbines]) => {
                  const locationPower =
                    telemetry
                      .filter((t) => locationTurbines.some((turbine) => turbine.turbine_id === t.turbine_id))
                      .reduce((sum, t) => sum + t.power_output_kw, 0) / 1000 // Convert to MW

                  // Estimate capacity based on turbine models (typical capacities)
                  const getTurbineCapacity = (model: string) => {
                    if (model.includes("Siemens Gamesa")) return 2.0
                    if (model.includes("Vestas")) return 2.1
                    if (model.includes("GE Cypress")) return 2.5
                    return 2.0 // Default capacity
                  }
                  
                  const locationCapacity = locationTurbines.reduce((sum, t) => sum + getTurbineCapacity(t.model), 0)
                  const efficiency = locationCapacity > 0 ? (locationPower / locationCapacity) * 100 : 0

                  return (
                    <Card
                      key={location}
                      className="hover:shadow-lg transition-shadow bg-white dark:bg-black border-gray-200 dark:border-gray-800"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            {location}
                          </CardTitle>
                          <Badge variant="outline" className="border-gray-300 dark:border-gray-700">
                            {locationTurbines.length} turbines
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Total Capacity:</span>
                          <span className="font-semibold text-black dark:text-white">
                            {locationCapacity.toFixed(1)} MW
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Current Output:</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {locationPower.toFixed(1)} MW
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Efficiency:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {efficiency.toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="turbines" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {turbines.map((turbine) => {
                  const turbineTelemetry = telemetry.find((t) => t.turbine_id === turbine.turbine_id)
                  const isSelected = selectedTurbine === turbine.turbine_id

                  return (
                    <Card
                      key={turbine.turbine_id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        isSelected
                          ? "ring-2 ring-black dark:ring-white bg-gray-50 dark:bg-gray-900"
                          : "bg-white dark:bg-black"
                      } border-gray-200 dark:border-gray-800`}
                      onClick={() => setSelectedTurbine(isSelected ? null : turbine.turbine_id)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-black dark:text-white">{turbine.turbine_id}</CardTitle>
                          <Badge className={getStatusColor(turbine.status)}>
                            {getStatusIcon(turbine.status)}
                            {turbine.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {turbine.location}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Model:</span>
                            <p className="font-medium text-black dark:text-white">{turbine.model}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Capacity:</span>
                            <p className="font-medium text-black dark:text-white">
                              {(() => {
                                if (turbine.model.includes("Siemens Gamesa")) return "2.0"
                                if (turbine.model.includes("Vestas")) return "2.1"
                                if (turbine.model.includes("GE Cypress")) return "2.5"
                                return "2.0"
                              })()} MW
                            </p>
                          </div>
                        </div>

                        {turbineTelemetry && (
                          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Power Output:</span>
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                {(turbineTelemetry.power_output_kw / 1000).toFixed(1)} MW
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Wind Speed:</span>
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                {turbineTelemetry.wind_speed_mph} mph
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Temperature:</span>
                              <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                {turbineTelemetry.gearbox_temp_c}°C
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="telemetry" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-black dark:text-white">
                  {selectedTurbine ? `Telemetry for ${selectedTurbine}` : "Latest Telemetry Data"}
                </h3>
                {selectedTurbine && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTurbine(null)}
                    className="border-gray-300 dark:border-gray-700"
                  >
                    Show All
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[600px]">
                <div className="grid gap-4">
                  {filteredTelemetry.map((data, index) => {
                    const turbine = turbines.find((t) => t.turbine_id === data.turbine_id)

                    return (
                      <Card
                        key={`${data.turbine_id}-${index}`}
                        className="bg-white dark:bg-black border-gray-200 dark:border-gray-800"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="font-medium text-black dark:text-white">{data.turbine_id}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(data.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <div>
                                <p className="text-gray-600 dark:text-gray-400">Power</p>
                                <p className="font-semibold text-black dark:text-white">
                                  {(data.power_output_kw / 1000).toFixed(1)} MW
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Wind className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <div>
                                <p className="text-gray-600 dark:text-gray-400">Wind Speed</p>
                                <p className="font-semibold text-black dark:text-white">{data.wind_speed_mph} mph</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Thermometer className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                              <div>
                                <p className="text-gray-600 dark:text-gray-400">Temperature</p>
                                <p className="font-semibold text-black dark:text-white">{data.gearbox_temp_c}°C</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <div>
                                <p className="text-gray-600 dark:text-gray-400">RPM</p>
                                <p className="font-semibold text-black dark:text-white">{data.rotor_rpm.toFixed(0)}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export function DataVisualization() {
  return (
    <ThemeProvider defaultTheme="light">
      <DataContent />
    </ThemeProvider>
  )
}
