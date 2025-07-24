export interface ChatMessage {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp: Date
  type?: "query" | "result" | "error" | "clarification"
  data?: any
  executionTime?: number
  canSave?: boolean
  generatedCode?: {
    componentCode: string
    dataFunction: string
    title: string
    description: string
    previewCode: string
    dashboardId?: string
  }
}

export interface ChatThread {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  userId: string
}

export class ChatService {
  private static instance: ChatService

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  async saveThread(thread: ChatThread): Promise<void> {
    try {
      const response = await fetch("/api/chat/threads/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(thread),
      })

      if (!response.ok) {
        throw new Error("Failed to save chat thread")
      }
    } catch (error) {
      console.error("Failed to save chat thread:", error)
      throw new Error("Failed to save chat thread")
    }
  }

  async loadThreads(userId: string): Promise<ChatThread[]> {
    try {
      const response = await fetch(`/api/chat/threads/load?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error("Failed to load chat threads")
      }

      const threads = await response.json()
      
      // Convert date strings back to Date objects
      const processedThreads = threads.map((thread: any) => ({
        ...thread,
        createdAt: new Date(thread.createdAt),
        updatedAt: new Date(thread.updatedAt),
        messages: thread.messages.map((message: any) => ({
          ...message,
          timestamp: new Date(message.timestamp)
        }))
      }))

      return processedThreads
    } catch (error) {
      console.error("Failed to load chat threads:", error)
      throw new Error("Failed to load chat threads")
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      const response = await fetch(`/api/chat/threads/delete?threadId=${threadId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete chat thread")
      }
    } catch (error) {
      console.error("Failed to delete chat thread:", error)
      throw new Error("Failed to delete chat thread")
    }
  }

  async processDashboardQuery(
    userQuery: string, 
    dashboardIds: string[], 
    chatHistory?: string
  ): Promise<{ answer: string; dashboardResults: any[] }> {
    try {
      const { DashboardQueryAgent } = await import('./agents/dashboard-query-agent')
      const queryAgent = DashboardQueryAgent.getInstance()
      
      const result = await queryAgent.processDashboardQuery(userQuery, dashboardIds, chatHistory)
      
      return {
        answer: result.answer,
        dashboardResults: result.dashboardResults
      }
    } catch (error) {
      console.error("Failed to process dashboard query:", error)
      throw new Error("Failed to process dashboard query")
    }
  }

  async processDataQuery(
    userQuery: string,
    functionCode: string,
    dataSource: string,
    queryDescription: string,
    chatHistory?: string
  ): Promise<{ answer: string; queryResult: any }> {
    try {
      const { DataQueryAgent } = await import('./agents/data-query-agent')
      const queryAgent = DataQueryAgent.getInstance()
      
      const result = await queryAgent.processDataQuery(userQuery, functionCode, dataSource, queryDescription, chatHistory)
      
      return {
        answer: result.answer,
        queryResult: result.queryResult
      }
    } catch (error) {
      console.error("Failed to process data query:", error)
      throw new Error("Failed to process data query")
    }
  }

  async processDashboardUpdate(
    userQuery: string,
    dashboardIds: string[],
    chatHistory?: string,
    originalPrompt?: string
  ): Promise<{ answer: string; updatedDashboards: any[] }> {
    try {
      const { DashboardUpdateAgent } = await import('./agents/dashboard-update-agent')
      const updateAgent = DashboardUpdateAgent.getInstance()
      
      const result = await updateAgent.updateDashboards({
        query: userQuery,
        chatHistory,
        dashboardIds,
        originalPrompt
      })
      
      if (result.success) {
        return {
          answer: `Successfully updated ${result.updatedDashboards.length} dashboard(s): ${result.updatedDashboards.map(d => d.name).join(', ')}. The changes have been applied and saved.`,
          updatedDashboards: result.updatedDashboards
        }
      } else {
        return {
          answer: `Failed to update dashboards: ${result.error || 'Unknown error'}`,
          updatedDashboards: []
        }
      }
    } catch (error) {
      console.error("Failed to process dashboard update:", error)
      throw new Error("Failed to process dashboard update")
    }
  }

  async processDashboardDelete(
    userQuery: string,
    dashboardIds: string[],
    chatHistory?: string,
    originalPrompt?: string
  ): Promise<{ answer: string; deletedDashboards: any[] }> {
    try {
      const { DashboardDeleteAgent } = await import('./agents/dashboard-delete-agent')
      const deleteAgent = DashboardDeleteAgent.getInstance()
      
      const result = await deleteAgent.deleteDashboards({
        query: userQuery,
        chatHistory,
        dashboardIds,
        originalPrompt
      })
      
      if (result.success) {
        return {
          answer: `Successfully deleted ${result.deletedDashboards.length} dashboard(s): ${result.deletedDashboards.map(d => d.name).join(', ')}. The dashboards have been permanently removed.`,
          deletedDashboards: result.deletedDashboards
        }
      } else {
        return {
          answer: `Failed to delete dashboards: ${result.error || 'Unknown error'}`,
          deletedDashboards: []
        }
      }
    } catch (error) {
      console.error("Failed to process dashboard deletion:", error)
      throw new Error("Failed to process dashboard deletion")
    }
  }

  generateThreadId(): string {
    return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateThreadTitle(input: string): string {
    const words = input.split(' ').slice(0, 5)
    return words.join(' ') + (words.length >= 5 ? '...' : '')
  }

  getCachedThread(threadId: string): ChatThread | undefined {
    // This would be used for caching in a real implementation
    return undefined
  }
} 