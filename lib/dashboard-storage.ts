export interface GeneratedDashboard {
  id: string
  name: string
  title?: string
  description: string
  tags?: string[]
  createdAt: string
  updatedAt: string
  chartType: string
  componentCode: string
  dataFunction: string
  query?: string
  createdFromChat?: boolean
}

export class DashboardStorage {
  private static instance: DashboardStorage
  private storageKey = 'generated-dashboards'

  static getInstance(): DashboardStorage {
    if (!DashboardStorage.instance) {
      DashboardStorage.instance = new DashboardStorage()
    }
    return DashboardStorage.instance
  }

  generateId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async saveDashboard(dashboard: Omit<GeneratedDashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<GeneratedDashboard> {
    const newDashboard: GeneratedDashboard = {
      ...dashboard,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const existing = await this.getAllDashboards()
    existing.push(newDashboard)
    
    localStorage.setItem(this.storageKey, JSON.stringify(existing))
    return newDashboard
  }

  async getAllDashboards(): Promise<GeneratedDashboard[]> {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) return []
      
      const dashboards = JSON.parse(stored)
      return dashboards.map((d: any) => ({
        ...d,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      }))
    } catch (error) {
      console.error('Error loading dashboards:', error)
      return []
    }
  }

  async getDashboard(id: string): Promise<GeneratedDashboard | null> {
    const dashboards = await this.getAllDashboards()
    return dashboards.find(d => d.id === id) || null
  }

  async deleteDashboard(id: string): Promise<void> {
    const dashboards = await this.getAllDashboards()
    const filtered = dashboards.filter(d => d.id !== id)
    localStorage.setItem(this.storageKey, JSON.stringify(filtered))
  }
} 