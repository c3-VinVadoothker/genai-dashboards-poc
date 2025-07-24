"use client"

import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatToggleProps {
  onClick: () => void
  hasUnread?: boolean
}

export function ChatToggle({ onClick, hasUnread = false }: ChatToggleProps) {
  const handleClick = () => {
    console.log("ChatToggle clicked")
    onClick()
  }

  return (
    <Button
      onClick={handleClick}
      className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 shadow-lg z-40 transition-all duration-200 flex items-center justify-center"
    >
      <MessageSquare className="w-5 h-5" />
      {hasUnread && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-bold">!</span>
        </div>
      )}
    </Button>
  )
}
