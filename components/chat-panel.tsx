"use client"

import { useState, useRef, useEffect } from "react"
import { X, Bot, User, Loader2, Clock, Save, Eye, History, Plus, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChatService, type ChatThread, type ChatMessage } from "@/lib/chat-service"
import { GeminiSemanticAgent } from "@/lib/agents/gemini-semantic-agent"
import { ExpandableVisualDialog } from "@/components/expandable-visual-dialog"
import { DashboardPreview } from "@/components/dashboard-preview"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  onDashboardSaved?: (data: any) => void
  initialPrompt?: string
  onAddComponent?: (componentData: any) => void
  currentThreadId?: string | null
  onThreadChange?: (threadId: string | null) => void
  onSaveDashboard?: (dashboardId: string, name: string) => void
}

export function ChatPanel({ isOpen, onClose, onDashboardSaved, initialPrompt, onAddComponent, currentThreadId, onThreadChange, onSaveDashboard }: ChatPanelProps) {
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      content: `Hello!`,
      sender: "assistant",
      timestamp: new Date(),
      type: "query",
    },
  ])

  const [inputValue, setInputValue] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatService] = useState(() => ChatService.getInstance())
  // Save dialog state removed - dashboards are auto-saved
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    loadThreads()
    loadChatState()
  }, [])

  // Auto-save current thread when messages change
  useEffect(() => {
    if (currentThread && messages.length > 1) {
      // Don't save just the welcome message
      const updatedThread: ChatThread = {
        ...currentThread,
        messages,
        updatedAt: new Date(),
      }

      // Debounce the save
      const timeoutId = setTimeout(() => {
        chatService.saveThread(updatedThread).catch(console.error)
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [messages, currentThread, chatService])

  // Note: Chat state saving is now handled by the parent dashboard component
  // This prevents conflicts between multiple components saving to the same localStorage key

  // Restore current thread when threads are loaded
  useEffect(() => {
    if (threads.length > 0 && currentThreadId && !currentThread) {
      const threadToLoad = threads.find(t => t.id === currentThreadId)
      if (threadToLoad) {
        setCurrentThread(threadToLoad)
        setMessages(threadToLoad.messages)
      }
    }
  }, [threads, currentThreadId, currentThread])

  // Handle initial prompt when chat opens
  useEffect(() => {
    if (isOpen && initialPrompt) {
      setInputValue(initialPrompt)
      // Automatically send the prompt after a short delay
      setTimeout(() => {
        if (inputValue.trim()) {
          handleSendMessage()
        }
      }, 100)
    }
  }, [isOpen, initialPrompt])

  const loadChatState = () => {
    try {
      console.log("🔄 ChatPanel: Loading chat state...")
      const savedState = localStorage.getItem('chatState')
      console.log("📦 ChatPanel: Raw saved state:", savedState)
      
      if (savedState) {
        const state = JSON.parse(savedState)
        console.log("📋 ChatPanel: Parsed state:", state)
        const threadId = state.currentThreadId || null
        console.log("🎯 ChatPanel: Setting currentThreadId to:", threadId)
        onThreadChange?.(threadId)
      } else {
        console.log("❌ ChatPanel: No saved chat state found")
      }
    } catch (error) {
      console.error("❌ ChatPanel: Failed to load chat state:", error)
    }
  }

  // Removed saveChatState function - state saving is now handled by parent dashboard component

  const loadThreads = async () => {
    try {
      setLoadingThreads(true)
      const userThreads = await chatService.loadThreads("user_123")
      setThreads(userThreads)
    } catch (error) {
      console.error("Failed to load chat threads:", error)
    } finally {
      setLoadingThreads(false)
    }
  }

  const startNewThread = () => {
    const newThread: ChatThread = {
      id: chatService.generateThreadId(),
      title: "New Chat",
      messages: [messages[0]], // Keep welcome message
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user_123",
    }

    setCurrentThread(newThread)
    onThreadChange?.(newThread.id)
    setMessages([messages[0]]) // Reset to welcome message
    setShowHistoryDialog(false)
  }

  const loadThread = (thread: ChatThread) => {
    setCurrentThread(thread)
    onThreadChange?.(thread.id)
    setMessages(thread.messages)
    setShowHistoryDialog(false)
  }

  const deleteThread = async (threadId: string) => {
    try {
      await chatService.deleteThread(threadId)
      setThreads(threads.filter(t => t.id !== threadId))
      
      // If we're currently viewing the deleted thread, start a new one
      if (currentThread?.id === threadId) {
        onThreadChange?.(null)
        startNewThread()
      }
    } catch (error) {
      console.error("Failed to delete thread:", error)
    }
  }

  const updateThreadTitle = async (threadId: string, newTitle: string) => {
    try {
      const thread = threads.find(t => t.id === threadId)
      if (thread) {
        const updatedThread = { ...thread, title: newTitle, updatedAt: new Date() }
        await chatService.saveThread(updatedThread)
        setThreads(threads.map(t => t.id === threadId ? updatedThread : t))
        
        if (currentThread?.id === threadId) {
          setCurrentThread(updatedThread)
        }
      }
    } catch (error) {
      console.error("Failed to update thread title:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    // Create new thread if none exists
    if (!currentThread) {
      const newThread: ChatThread = {
        id: chatService.generateThreadId(),
        title: chatService.generateThreadTitle(inputValue),
        messages: [messages[0]], // Start with welcome message
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user_123",
      }
      setCurrentThread(newThread)
      onThreadChange?.(newThread.id)
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
      type: "query",
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = inputValue
    setInputValue("")
    setIsProcessing(true)

    // Update thread title if this is the first user message
    if (currentThread && currentThread.title === "New Chat") {
      const updatedThread = {
        ...currentThread,
        title: chatService.generateThreadTitle(currentInput),
      }
      setCurrentThread(updatedThread)
      
      // Update the thread in the threads list
      setThreads(prev => {
        const index = prev.findIndex(t => t.id === currentThread.id)
        if (index >= 0) {
          const newThreads = [...prev]
          newThreads[index] = updatedThread
          return newThreads
        }
        return prev
      })
    }

    try {
      const startTime = Date.now()
      
      // Use Gemini semantic agent to classify the request
      const semanticAgent = GeminiSemanticAgent.getInstance()
      let classification
      
      // Prepare chat history context
      const chatHistoryContext = messages
        .filter(msg => msg.sender === "user" || msg.sender === "assistant")
        .slice(-6) // Last 6 messages for context
        .map(msg => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n")
      
      console.log("🔍 ChatPanel: Chat history context:", chatHistoryContext)
      console.log("🔍 ChatPanel: Chat history length:", chatHistoryContext.length)
      
      // Create the original prompt for context
      const originalPrompt = `You are a semantic classification and dashboard matching system. Classify this request and handle dashboard matching in one response.

CATEGORIES:
- CREATE_DASHBOARD: User wants to create a new dashboard, chart, or visualization
- READ_DASHBOARD: User wants to view existing dashboards (only if dashboards exist)
- READ_DATA: User wants to analyze, view, or query raw data (when no dashboards exist)
- UPDATE_DASHBOARD: User wants to modify existing dashboards
- DELETE_DASHBOARD: User wants to remove dashboards
- OTHER: General conversation, questions, or unclear requests

REQUEST: "${currentInput}"

${chatHistoryContext ? `CHAT HISTORY CONTEXT:
${chatHistoryContext}

` : ''}`

      try {
        classification = await semanticAgent.classifyRequest(currentInput, chatHistoryContext)
      } catch (classificationError) {
        console.error("Gemini semantic classification failed:", classificationError)
        // Fallback to OTHER classification
        classification = {
          type: "OTHER" as const,
          confidence: 0.70,
          extractedInfo: {}
        }
      }
      
      // Ensure we have valid classification data
      if (!classification || !classification.type) {
        classification = {
          type: "OTHER" as const,
          confidence: 0.70,
          extractedInfo: {}
        }
      }
      
      // Initialize response content
      let responseContent = ""
      
      // Handle different request types
      console.log("🔍 ChatPanel: Classification type:", classification.type)
      console.log("🔍 ChatPanel: Extracted info:", classification.extractedInfo)
      console.log("🔍 ChatPanel: Dashboard IDs:", classification.extractedInfo?.dashboardIds)
      console.log("🔍 ChatPanel: Data query function:", classification.dataQueryFunction)
      
      if (classification.type === "READ_DASHBOARD" && classification.extractedInfo?.dashboardIds && classification.extractedInfo.dashboardIds.length > 0) {
        console.log("🔍 ChatPanel: Processing READ_DASHBOARD query")
        // Process dashboard query
        try {
          const { answer } = await chatService.processDashboardQuery(
            currentInput,
            classification.extractedInfo.dashboardIds,
            chatHistoryContext
          )
          
          responseContent = answer
          console.log("🔍 ChatPanel: Dashboard query processed successfully")
        } catch (queryError) {
          console.error("Dashboard query processing failed:", queryError)
          responseContent = `**❌ Dashboard Query Failed**

I encountered an issue processing your dashboard query. Please try again.`
        }
      } else if (classification.type === "READ_DATA" && classification.dataQueryFunction) {
        console.log("🔍 ChatPanel: Processing READ_DATA query")
        // Process data query
        try {
          const { answer } = await chatService.processDataQuery(
            currentInput,
            classification.dataQueryFunction.functionCode,
            classification.dataQueryFunction.dataSource,
            classification.dataQueryFunction.queryDescription,
            chatHistoryContext
          )
          
          responseContent = answer
          console.log("🔍 ChatPanel: Data query processed successfully")
        } catch (queryError) {
          console.error("Data query processing failed:", queryError)
          responseContent = `**❌ Data Query Failed**

I encountered an issue processing your data query. Please try again.`
        }
      } else if (classification.type === "UPDATE_DASHBOARD" && classification.extractedInfo?.dashboardIds && classification.extractedInfo.dashboardIds.length > 0) {
        console.log("🔍 ChatPanel: Processing UPDATE_DASHBOARD query")
        // Process dashboard update
        try {
          const { answer } = await chatService.processDashboardUpdate(
            currentInput,
            classification.extractedInfo.dashboardIds,
            chatHistoryContext,
            originalPrompt
          )
          
          responseContent = answer
          console.log("🔍 ChatPanel: Dashboard update processed successfully")
        } catch (updateError) {
          console.error("Dashboard update processing failed:", updateError)
          responseContent = `**❌ Dashboard Update Failed**

I encountered an issue updating your dashboard. Please try again.`
        }
      } else if (classification.type === "DELETE_DASHBOARD" && classification.extractedInfo?.dashboardIds && classification.extractedInfo.dashboardIds.length > 0) {
        console.log("🔍 ChatPanel: Processing DELETE_DASHBOARD query")
        console.log("🔍 ChatPanel: ChatService methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(chatService)))
        // Process dashboard deletion
        try {
          if (typeof chatService.processDashboardDelete === 'function') {
            const { answer } = await chatService.processDashboardDelete(
              currentInput,
              classification.extractedInfo.dashboardIds,
              chatHistoryContext,
              originalPrompt
            )
            
            responseContent = answer
            console.log("🔍 ChatPanel: Dashboard deletion processed successfully")
          } else {
            throw new Error("processDashboardDelete method not found")
          }
        } catch (deleteError) {
          console.error("Dashboard deletion processing failed:", deleteError)
          responseContent = `**❌ Dashboard Deletion Failed**

I encountered an issue deleting your dashboard. The method may not be available yet. Please try refreshing the page and try again.`
        }
      } else if (classification.type === "CLARIFICATION" && classification.clarificationResponse) {
        console.log("🔍 ChatPanel: Using clarification questions for CLARIFICATION classification")
        responseContent = classification.clarificationResponse
      } else if (classification.type === "OTHER" && classification.directResponse) {
        console.log("🔍 ChatPanel: Using direct response for OTHER classification")
        responseContent = classification.directResponse
      } else if (classification.type === "CREATE_DASHBOARD" && classification.generatedCode) {
        console.log("🔍 ChatPanel: Using generated code for CREATE_DASHBOARD classification")
        responseContent = `**🎨 Generated Dashboard Component:**\n`
        responseContent += `• **Title:** ${classification.generatedCode.title}\n`
        responseContent += `• **Description:** ${classification.generatedCode.description}\n`
        responseContent += `\nThis response includes semantic classification and generated dashboard components where applicable.`
      } else {
        // Default response for unhandled cases
        responseContent = `**🔍 Semantic Classification:**\n`
        responseContent += `• **Type:** ${classification.type}\n`
        responseContent += `• **Confidence:** ${classification.confidence}\n`
        responseContent += `\nThis response includes semantic classification and generated dashboard components where applicable.`
      }

      setTimeout(() => {
        const executionTime = Date.now() - startTime

        const echoMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: responseContent,
          sender: "assistant",
          timestamp: new Date(),
          type: "result",
          executionTime,
          generatedCode: classification.generatedCode
        }
        setMessages((prev) => [...prev, echoMessage])
        setIsProcessing(false)
      }, 1000)
    } catch (error: unknown) {
      console.error("Chat processing error:", error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `**❌ Processing Failed**

I encountered an issue processing your request. This is a simplified echo implementation.`,
        sender: "assistant",
        timestamp: new Date(),
        type: "error",
      }
      setMessages((prev) => [...prev, errorMessage])
      setIsProcessing(false)
    }
  }



  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // handleSaveDashboard removed - dashboards are auto-saved

  const handlePreview = (dashboard: any) => {
    // Show the React component code in preview
    const previewData = {
      title: dashboard.title,
      components: [
        {
          type: "code",
          title: dashboard.title,
          data: {
            componentCode: dashboard.componentCode,
            dataFunction: dashboard.dataFunction,
            chartType: dashboard.chartType
          }
        }
      ],
      charts: [dashboard.chartType],
      layout: "React Component",
      data: {
        componentCode: dashboard.componentCode,
        dataFunction: dashboard.dataFunction,
        chartType: dashboard.chartType
      }
    }
    
    setPreviewData(previewData)
    setShowPreviewDialog(true)
  }

    const handleSaveConfirm = async (saveData: {
    name: string
    description?: string
    tags?: string[]
  }) => {
    // This function is now a placeholder for future canvas functionality
    // Dashboards are auto-saved when created by the semantic agent
    console.log("Save functionality will be implemented later for canvas integration")
  }

  const formatMessageContent = (content: string) => {
        return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom styling for different markdown elements
            h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-black dark:text-white">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-black dark:text-white">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold mb-1 text-black dark:text-white">{children}</h3>,
            p: ({ children }) => <p className="mb-2 text-black dark:text-white">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-black dark:text-white">{children}</strong>,
            em: ({ children }) => <em className="italic text-black dark:text-white">{children}</em>,
            code: ({ children, className }) => {
              const isInline = !className
              if (isInline) {
                return <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
              }
        return (
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto">
                  <code className="text-sm font-mono">{children}</code>
                </pre>
              )
            },
            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-black dark:text-white">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-800 font-semibold text-left">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                {children}
              </td>
            ),
            a: ({ children, href }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
          </div>
        )
  }

  const renderMessageContent = (message: ChatMessage) => {
    const baseContent = formatMessageContent(message.content)

    // Show preview component if there's generated code
    if (message.generatedCode) {
      return (
        <div className="space-y-4">
          {baseContent}
          <DashboardPreview
            dashboardId={message.generatedCode.dashboardId || ''}
            onSave={onSaveDashboard}
          />
        </div>
      )
    }

    if (message.type === "result" && message.data && message.canSave) {
      return (
        <div className="space-y-4">
          {baseContent}

          <div className="grid gap-3">
            {message.data.dashboards.map((dashboard: any, index: number) => (
              <Card key={index} className="bg-white dark:bg-black border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-black dark:text-white" />
                      <CardTitle className="text-base text-black dark:text-white">{dashboard.title}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-900 text-black dark:text-white">
                      {dashboard.chartType || 'Unknown'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-black dark:text-white">
                    <strong>Chart Type:</strong> {dashboard.chartType} •<strong> Code:</strong>{" "}
                    {dashboard.componentCode?.length || 0} chars •<strong> Created:</strong>{" "}
                    {dashboard.createdAt ? new Date(dashboard.createdAt).toLocaleTimeString() : 'Just now'}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-md">
                      ✅ Auto-saved to dashboards
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 bg-transparent"
                      onClick={() => handlePreview(dashboard)}
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {message.executionTime && (
            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Executed in {message.executionTime}ms
              </div>
              <div className="flex items-center gap-1">
                <Bot className="w-3 h-3" />
                Echo processing
              </div>
            </div>
          )}
        </div>
      )
    }

    return baseContent
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-[500px] bg-white dark:bg-black border-l border-gray-200 dark:border-gray-800 flex flex-col z-50 shadow-lg">
      {/* Single Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black dark:bg-white rounded-full flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5 text-white dark:text-black" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">GenAI By C3 AI</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {currentThread ? currentThread.title : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHistoryDialog(true)} className="p-2">
            <History className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={startNewThread} className="p-2">
            <Plus className="w-4 h-4" />
          </Button>
          <Button onClick={() => {
            onClose()
          }} variant="ghost" size="sm" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages - Scrollable */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full w-full">
          <div className="p-4 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-3", message.sender === "user" ? "justify-end" : "justify-start")}
              >
                {message.sender === "assistant" && (
                  <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white dark:text-black" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-4 py-3 text-sm",
                    message.sender === "user"
                      ? "bg-gray-900 dark:bg-gray-100 text-gray-100 dark:text-gray-900"
                      : message.type === "error"
                        ? "bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-black dark:text-white"
                        : message.type === "result"
                          ? "bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-black dark:text-white"
                          : "bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800",
                  )}
                >
                  {renderMessageContent(message)}
                  <div
                    className={cn(
                      "text-xs mt-3 opacity-70 border-t pt-2 flex items-center justify-between",
                      message.sender === "user"
                        ? "text-gray-400 dark:text-gray-600 border-gray-700 dark:border-gray-400"
                        : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700",
                    )}
                  >
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.executionTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {message.executionTime}ms
                      </span>
                    )}
                  </div>
                </div>
                {message.sender === "user" && (
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                )}
              </div>
            ))}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 text-white dark:text-black animate-spin" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Thinking...
                    </span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input - Fixed at bottom */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex gap-2 mb-3">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to create a dashboard... (e.g., 'Show WindTurbine power trends by farm for Q2')"
            className="flex-1 bg-white dark:bg-black border-gray-300 dark:border-gray-700"
            disabled={isProcessing}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Save Dashboard Dialog */}
      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] min-w-[80%]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Chat History
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {loadingThreads ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading threads...</span>
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No chat history yet</p>
                <p className="text-sm">Start a conversation to see it here</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {threads
                  .sort((a, b) => {
                    // Sort by last message timestamp (most recent first)
                    const aLastMessage = a.messages[a.messages.length - 1]
                    const bLastMessage = b.messages[b.messages.length - 1]
                    
                    if (!aLastMessage && !bLastMessage) return 0
                    if (!aLastMessage) return 1
                    if (!bLastMessage) return -1
                    
                    return new Date(bLastMessage.timestamp).getTime() - new Date(aLastMessage.timestamp).getTime()
                  })
                  .map((thread) => (
                    <ThreadCard
                      key={thread.id}
                      thread={thread}
                      isActive={currentThread?.id === thread.id}
                      onLoad={loadThread}
                      onDelete={deleteThread}
                      onUpdateTitle={updateThreadTitle}
                    />
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* SaveDashboardDialog removed - dashboards are auto-saved */}

      {previewData && (
        <ExpandableVisualDialog
          data={previewData}
          type="dashboard-suggestion"
          open={showPreviewDialog}
          onOpenChange={setShowPreviewDialog}
          onSave={(data) => {
            console.log("Preview save clicked:", data)
            
            // Add components to the dashboard canvas using real data
            if (onAddComponent && previewData.components) {
              previewData.components.forEach((component: any, index: number) => {
                onAddComponent({
                  type: component.visualization?.chartType || "kpi",
                  title: component.title || component.type,
                  size: { width: 3, height: 200 },
                  data: component.data || {
                    value: component.data?.rowCount || 0,
                    change: 0,
                    trend: "neutral"
                  },
                  config: {
                    chartType: component.visualization?.chartType || "kpi",
                    color: index % 2 === 0 ? "blue" : "green",
                    visualization: component.visualization,
                    plan: component.plan
                  }
                })
              })
            }
            
            setShowPreviewDialog(false)
          }}
          trigger={<div style={{ display: 'none' }} />}
        />
      )}
    </div>
  )
}

interface ThreadCardProps {
  thread: ChatThread
  isActive: boolean
  onLoad: (thread: ChatThread) => void
  onDelete: (threadId: string) => void
  onUpdateTitle: (threadId: string, newTitle: string) => void
}

function ThreadCard({ thread, isActive, onLoad, onDelete, onUpdateTitle }: ThreadCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(thread.title)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleEdit = () => {
    setIsEditing(true)
    setEditTitle(thread.title)
  }

  const handleSave = () => {
    if (editTitle.trim()) {
      onUpdateTitle(thread.id, editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditTitle(thread.title)
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    onDelete(thread.id)
    setShowDeleteConfirm(false)
  }

  const messageCount = thread.messages.filter(m => m.sender === "user").length
  const lastMessage = thread.messages[thread.messages.length - 1]
  
  const formatRelativeTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return timestamp.toLocaleDateString()
  }
  
  const lastMessageTime = lastMessage ? formatRelativeTime(new Date(lastMessage.timestamp)) : ""

  return (
    <>
      <Card className={cn(
        "cursor-pointer hover:shadow-sm transition-all duration-200",
        isActive ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950" : "bg-white dark:bg-black border border-gray-200 dark:border-gray-800"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0" onClick={() => onLoad(thread)}>
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave()
                      if (e.key === "Escape") handleCancel()
                    }}
                    className="text-sm font-medium"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>Save</Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {thread.title}
                  </h4>
                  {lastMessage && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 truncate">
                      {lastMessage.content.replace(/[*_`#\[\]]/g, '').substring(0, 80)}...
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{messageCount} message{messageCount !== 1 ? "s" : ""}</span>
                    <span>•</span>
                    <span>{lastMessageTime}</span>
                  </div>
                </div>
              )}
            </div>
            
            {!isEditing && (
              <div className="flex items-center gap-1 ml-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEdit}
                  className="h-6 w-6 p-0"
                >
                  <Clock className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Thread</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete "{thread.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// SaveDashboardDialog component removed - dashboards are auto-saved
