"use client"

import { useState, useRef, useEffect } from "react"
import { AppSidebar } from "./components/sidebar"
import { DashboardCanvas } from "./components/dashboard-canvas"
import { PromptCards } from "./components/prompt-cards"
import { WorkflowCard } from "./components/workflow-card"
import { ChatPanel } from "./components/chat-panel"
import { ChatToggle } from "./components/chat-toggle"
import { ThemeProvider } from "./components/theme-provider"
import { TrendingUp, Bot, Database } from "lucide-react"

import { cn } from "@/lib/utils"



const workflows = [
  {
    title: "Chat Frustration Escalation",
    icon: <Bot className="w-4 h-4" />,
    steps: [
      "1. Identify affected 20%. 2. Pull local bookings trend. 3. Recommend matching promo SKU & discount level. 4. Write personalized QM email.",
    ],
  },
  {
    title: "Morning Attendance Pulse",
    icon: <Database className="w-4 h-4" />,
    steps: [
      "1. Query last-day gate scans & bookings. 2. Compare YoY & WoW. 3. Detect ± 5 % anomaly. 4. Pull top 3 driver metrics (weather, promo...).",
    ],
  },
  {
    title: "Viral Topic Watchdog",
    icon: <TrendingUp className="w-4 h-4" />,
    steps: [
      "1. Detect trending. 2. IP Check flexibility questions & intent sig. 3. Auto-queue homepage banner 'Book now, change later'...",
    ],
  },
]

function DashboardContent() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  // Dashboard state removed - saved dashboards section removed
  const [initialPrompt, setInitialPrompt] = useState<string>("")
  const addComponentRef = useRef<((componentData: any) => void) | null>(null)
  const saveDashboardRef = useRef<((dashboardId: string, name: string) => void) | null>(null)

  // Load chat state on initialization
  useEffect(() => {
    try {
      console.log("🔄 Loading chat state from localStorage...")
      const savedState = localStorage.getItem('chatState')
      console.log("📦 Raw saved state:", savedState)
      
      if (savedState) {
        const state = JSON.parse(savedState)
        console.log("📋 Parsed state:", state)
        const newChatState = state.isOpen || false
        const newThreadId = state.currentThreadId || null
        console.log("🎯 Setting isChatOpen to:", newChatState)
        console.log("🎯 Setting currentThreadId to:", newThreadId)
        setIsChatOpen(newChatState)
        setCurrentThreadId(newThreadId)
      } else {
        console.log("❌ No saved chat state found")
      }
    } catch (error) {
      console.error("❌ Failed to load chat state:", error)
    }
  }, [])

  // Save chat state whenever it changes
  useEffect(() => {
    try {
      console.log("💾 Saving chat state to localStorage...")
      console.log("📊 Current isChatOpen:", isChatOpen)
      console.log("📊 Current currentThreadId:", currentThreadId)
      
      const savedState = localStorage.getItem('chatState')
      console.log("📦 Existing saved state:", savedState)
      
      const state = savedState ? JSON.parse(savedState) : {}
      console.log("📋 Current state object:", state)
      
      state.isOpen = isChatOpen
      state.currentThreadId = currentThreadId
      console.log("🔄 Updated state object:", state)
      
      const stateString = JSON.stringify(state)
      console.log("📝 Stringified state:", stateString)
      
      localStorage.setItem('chatState', stateString)
      console.log("✅ Chat state saved successfully")
    } catch (error) {
      console.error("❌ Failed to save chat state:", error)
    }
  }, [isChatOpen, currentThreadId])

  const toggleChat = () => {
    const newState = !isChatOpen
    console.log("🔄 Toggle chat called - current state:", isChatOpen, "new state:", newState)
    setIsChatOpen(newState)
    
    // Save chat state to localStorage
    try {
      console.log("💾 Saving chat state in toggleChat...")
      const savedState = localStorage.getItem('chatState')
      const state = savedState ? JSON.parse(savedState) : {}
      state.isOpen = newState
      localStorage.setItem('chatState', JSON.stringify(state))
      console.log("✅ Chat state saved in toggleChat")
    } catch (error) {
      console.error("❌ Failed to save chat state in toggleChat:", error)
    }
  }

  const closeChat = () => {
    console.log("🔄 Close chat called")
    setIsChatOpen(false)
    setInitialPrompt("")
    
    // Save chat state to localStorage
    try {
      console.log("💾 Saving chat state in closeChat...")
      const savedState = localStorage.getItem('chatState')
      const state = savedState ? JSON.parse(savedState) : {}
      state.isOpen = false
      localStorage.setItem('chatState', JSON.stringify(state))
      console.log("✅ Chat state saved in closeChat")
    } catch (error) {
      console.error("❌ Failed to save chat state in closeChat:", error)
    }
  }

  // Dashboard saved handlers removed - saved dashboards section removed

  const handleAddComponentToCanvas = (componentData: any) => {
    if (addComponentRef.current) {
      addComponentRef.current(componentData)
    }
  }

  const setAddComponentRef = (addComponentFn: (componentData: any) => void) => {
    addComponentRef.current = addComponentFn
  }

  const setSaveDashboardRef = (saveDashboardFn: (dashboardId: string, name: string) => void) => {
    saveDashboardRef.current = saveDashboardFn
  }

  const handleTemplateClick = (prompt: string) => {
    console.log("🔄 Template click called with prompt:", prompt)
    setInitialPrompt(prompt)
    setIsChatOpen(true)
    
    // Save chat state to localStorage
    try {
      console.log("💾 Saving chat state in handleTemplateClick...")
      const savedState = localStorage.getItem('chatState')
      const state = savedState ? JSON.parse(savedState) : {}
      state.isOpen = true
      localStorage.setItem('chatState', JSON.stringify(state))
      console.log("✅ Chat state saved in handleTemplateClick")
    } catch (error) {
      console.error("❌ Failed to save chat state in handleTemplateClick:", error)
    }
  }

  // Dashboard loading removed - saved dashboards section removed

  // Debug function to manually test localStorage
  const debugChatState = () => {
    console.log("🔍 DEBUG: Manual chat state check")
    console.log("📊 Current isChatOpen:", isChatOpen)
    console.log("📦 localStorage.getItem('chatState'):", localStorage.getItem('chatState'))
    console.log("📋 Parsed localStorage:", localStorage.getItem('chatState') ? JSON.parse(localStorage.getItem('chatState')!) : null)
  }

  // Expose debug function to window for manual testing
  useEffect(() => {
    (window as any).debugChatState = debugChatState
    console.log("🔧 Debug function available: window.debugChatState()")
  }, [isChatOpen])

  return (
    <div className="flex min-h-screen bg-white dark:bg-black">
      <AppSidebar isCollapsed={false} onToggle={() => {}} />

      <div className={cn("flex-1 transition-all duration-300 ease-in-out", isChatOpen ? "mr-[500px]" : "mr-0")}>
        {/* Header */}
        <div className="px-12 py-8 bg-white dark:bg-black">
          <div className="mb-2">
            <h1 className="text-sm font-medium text-gray-600 dark:text-gray-400">C3 Generative AI</h1>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Welcome Vin</h2>
          </div>
          <div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-8">My Dashboard</h3>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-12 pb-12 space-y-16 bg-white dark:bg-black">
          {/* Dashboard Canvas */}
          <div>
            <DashboardCanvas 
              className="mb-8" 
              onOpenChat={() => setIsChatOpen(true)} 
              setAddComponentRef={setAddComponentRef}
              setSaveDashboardRef={setSaveDashboardRef}
            />
          </div>

          {/* Saved Dashboards Section - Removed */}

          {/* Quick Start Section */}
          <div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-8">Quick Start</h3>
            <PromptCards onPromptClick={handleTemplateClick} />
          </div>

          
        </div>
      </div>

      {/* Chat Toggle Button */}
      {!isChatOpen && <ChatToggle onClick={toggleChat} />}

      {/* Chat Panel */}
      <ChatPanel 
        isOpen={isChatOpen} 
        onClose={closeChat} 
        initialPrompt={initialPrompt} 
        onAddComponent={handleAddComponentToCanvas}
        currentThreadId={currentThreadId}
        onThreadChange={setCurrentThreadId}
        onSaveDashboard={(dashboardId, name) => {
          if (saveDashboardRef.current) {
            saveDashboardRef.current(dashboardId, name)
          }
        }}
      />
    </div>
  )
}

export default function Dashboard() {
  return (
    <ThemeProvider defaultTheme="light">
      <DashboardContent />
    </ThemeProvider>
  )
}
