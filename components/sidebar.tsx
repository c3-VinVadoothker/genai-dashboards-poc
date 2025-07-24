"use client"

import { Home, MessageSquare, Database, Clock, Users, Settings, Sun, Moon, HelpCircle, Sparkles, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface AppSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

const sidebarItems = [
  { icon: Home, label: "Home", href: "/", active: false },
  { icon: Sparkles, label: "Chat", href: "/chat", active: false },
  { icon: Database, label: "Data", href: "/data", active: false },
  { icon: Zap, label: "History", href: "/history", active: false },
  { icon: Users, label: "Agents", href: "/agents", active: false },
  { icon: Settings, label: "Settings", href: "/settings", active: false },
]

const bottomItems = [{ icon: HelpCircle, label: "Help", href: "/" }]

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()

  return (
    <div className="w-20 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-center py-6">
        <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden">
          <img src="/image.png" alt="C3 AI Logo" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 flex flex-col items-center space-y-1 px-2">
        {sidebarItems.map((item, index) => {
          const isActive = item.href === "/" 
            ? pathname === "/" 
            : pathname.startsWith(item.href)
          return (
            <Link key={index} href={item.href}>
              <button
                className={cn(
                  "w-full py-3 px-2 rounded-lg flex flex-col items-center justify-center transition-all duration-200 group relative",
                  isActive
                    ? "bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100",
                )}
              >
                <item.icon className="w-4 h-4 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          )
        })}
      </div>

      {/* Bottom Navigation */}
      <div className="flex flex-col items-center space-y-1 px-2 pb-6">
     

        {bottomItems.map((item, index) => (
          <Link key={index} href={item.href}>
            <button className="w-full py-3 px-2 rounded-lg flex flex-col items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200 group relative">
              <item.icon className="w-4 h-4 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          </Link>
        ))}
      </div>
    </div>
  )
}
