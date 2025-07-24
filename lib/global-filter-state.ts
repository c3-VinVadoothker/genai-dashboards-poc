import type { FilterGroup } from '@/components/dashboard-filter-panel'

export interface GlobalFilterState {
  globalFilters: FilterGroup[]
  selectedDashboards: string[]
}

class GlobalFilterStateManager {
  private static instance: GlobalFilterStateManager
  private listeners: Set<(state: GlobalFilterState) => void> = new Set()
  private state: GlobalFilterState = {
    globalFilters: [],
    selectedDashboards: []
  }

  static getInstance(): GlobalFilterStateManager {
    if (!GlobalFilterStateManager.instance) {
      GlobalFilterStateManager.instance = new GlobalFilterStateManager()
    }
    return GlobalFilterStateManager.instance
  }

  getState(): GlobalFilterState {
    return this.state
  }

  setState(newState: Partial<GlobalFilterState>) {
    this.state = { ...this.state, ...newState }
    this.notifyListeners()
  }

  subscribe(listener: (state: GlobalFilterState) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state))
  }
}

export const globalFilterStateManager = GlobalFilterStateManager.getInstance() 