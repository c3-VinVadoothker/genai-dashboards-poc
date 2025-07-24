export interface DashboardComponent {
  id: string
  type: "kpi" | "chart" | "table" | "metric" | "alert" | "saved-component"
  title: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  data: any
  config: {
    chartType?: string
    dataSource?: string
    refreshRate?: number
    styling?: any
  }
  createdAt: Date
  updatedAt: Date
}

export interface DashboardState {
  components: DashboardComponent[]
  layout: {
    columns: number
    rowHeight: number
    margin: number
  }
  lastSaved: Date
}

export const saveDashboardState = async (state: DashboardState) => {
  try {
    // Only save if there are actual changes (components or layout changed)
    const hasChanges = state.components.length > 0 || 
                      state.layout.columns !== 12 || 
                      state.layout.rowHeight !== 100 || 
                      state.layout.margin !== 16

    if (!hasChanges) {
      console.log("No changes detected, skipping save")
      return
    }

    const response = await fetch("/api/dashboard/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(state),
    })

    if (!response.ok) {
      throw new Error("Failed to save dashboard state")
    }

    console.log("Dashboard state saved successfully")
  } catch (error) {
    console.error("Failed to save dashboard state:", error)
  }
}

export const loadDashboardState = async (): Promise<DashboardState | null> => {
  try {
    const response = await fetch("/api/dashboard/load")

    if (!response.ok) {
      if (response.status === 404) {
        // No saved state exists yet
        return null
      }
      throw new Error("Failed to load dashboard state")
    }

    const parsed = await response.json()

    // Convert string dates back to Date objects
    return {
      ...parsed,
      lastSaved: parsed.lastSaved ? new Date(parsed.lastSaved) : new Date(),
      components: parsed.components.map((component: any) => ({
        ...component,
        createdAt: component.createdAt ? new Date(component.createdAt) : new Date(),
        updatedAt: component.updatedAt ? new Date(component.updatedAt) : new Date(),
      })),
    }
  } catch (error) {
    console.error("Failed to load dashboard state:", error)
    return null
  }
}

export const generateComponentId = () => `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const findOptimalPosition = (
  components: DashboardComponent[],
  newComponentSize: { width: number; height: number },
  gridColumns = 12,
  rowHeight = 100,
): { x: number; y: number } => {
  const gridWidth = gridColumns
  const componentWidth = newComponentSize.width
  const componentHeight = Math.ceil(newComponentSize.height / rowHeight)

  // Create a grid to track occupied spaces
  const maxRows = Math.max(10, ...components.map((c) => c.position.y + Math.ceil(c.size.height / rowHeight)))
  const grid: boolean[][] = Array(maxRows)
    .fill(null)
    .map(() => Array(gridWidth).fill(false))

  // Mark occupied positions
  components.forEach((component) => {
    const startX = component.position.x
    const startY = component.position.y
    const width = component.size.width
    const height = Math.ceil(component.size.height / rowHeight)

    for (let y = startY; y < startY + height && y < maxRows; y++) {
      for (let x = startX; x < startX + width && x < gridWidth; x++) {
        if (grid[y]) grid[y][x] = true
      }
    }
  })

  // Find the first available position
  for (let y = 0; y < maxRows; y++) {
    for (let x = 0; x <= gridWidth - componentWidth; x++) {
      let canPlace = true

      // Check if the component can fit at this position
      for (let dy = 0; dy < componentHeight && canPlace; dy++) {
        for (let dx = 0; dx < componentWidth && canPlace; dx++) {
          if (y + dy >= maxRows || (grid[y + dy] && grid[y + dy][x + dx])) {
            canPlace = false
          }
        }
      }

      if (canPlace) {
        return { x, y }
      }
    }
  }

  // If no space found, place at the bottom
  return { x: 0, y: maxRows }
}

export const cleanupLayout = (components: DashboardComponent[]): DashboardComponent[] => {
  // Sort components by position (top to bottom, left to right)
  const sorted = [...components].sort((a, b) => {
    if (a.position.y !== b.position.y) return a.position.y - b.position.y
    return a.position.x - b.position.x
  })

  const cleaned: DashboardComponent[] = []

  sorted.forEach((component) => {
    const optimalPosition = findOptimalPosition(cleaned, component.size)
    cleaned.push({
      ...component,
      position: optimalPosition,
      updatedAt: new Date(),
    })
  })

  return cleaned
}
