"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, BarChart3, PieChart, Activity, Zap, Wind, Gauge, AlertTriangle } from "lucide-react"

interface PromptCardProps {
  title: string
  description: string
  prompt: string
  icon: React.ReactNode
  onClick: (prompt: string) => void
}

function PromptCard({ title, description, prompt, icon, onClick }: PromptCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-600"
      onClick={() => onClick(prompt)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
          {description}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
          onClick={(e) => {
            e.stopPropagation()
            onClick(prompt)
          }}
        >
          Try This Query
        </Button>
      </CardContent>
    </Card>
  )
}

interface PromptCardsProps {
  onPromptClick: (prompt: string) => void
}

export function PromptCards({ onPromptClick }: PromptCardsProps) {
  const prompts = [
    {
      title: "Power Generation Analysis",
      description: "Analyze power generation trends across all wind farms with detailed performance metrics and efficiency comparisons.",
      prompt: "Show power generation trends by wind farm with efficiency metrics and performance analysis",
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />
    },
    {
      title: "Turbine Status Overview",
      description: "Get a comprehensive view of all turbine statuses including active, warning, and maintenance states across locations.",
      prompt: "Show turbine status overview by location with maintenance and warning indicators",
      icon: <Activity className="w-5 h-5 text-green-600" />
    },
    {
      title: "Wind Speed Analysis",
      description: "Compare wind speeds across different locations and analyze their impact on power generation efficiency.",
      prompt: "Analyze wind speed patterns by location and their correlation with power output",
      icon: <Wind className="w-5 h-5 text-cyan-600" />
    },
    {
      title: "Temperature Monitoring",
      description: "Monitor gearbox temperatures across all turbines to identify potential maintenance needs and performance issues.",
      prompt: "Show gearbox temperature analysis by turbine model with maintenance alerts",
      icon: <Gauge className="w-5 h-5 text-orange-600" />
    },
    {
      title: "Performance Comparison",
      description: "Compare performance metrics between different turbine models and locations to identify best performers.",
      prompt: "Compare turbine performance by model and location with efficiency rankings",
      icon: <BarChart3 className="w-5 h-5 text-purple-600" />
    },
    {
      title: "Maintenance Alerts",
      description: "Identify turbines requiring maintenance based on temperature, performance, and status indicators.",
      prompt: "Show maintenance alerts and turbine health status by location",
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />
    },
    {
      title: "Rotor RPM Analysis",
      description: "Analyze rotor RPM patterns and their relationship with wind speed and power generation.",
      prompt: "Analyze rotor RPM patterns by wind speed and their impact on power generation",
      icon: <Zap className="w-5 h-5 text-yellow-600" />
    },
    {
      title: "Location Performance",
      description: "Compare overall performance metrics across different wind farm locations to identify optimal sites.",
      prompt: "Compare overall performance metrics across wind farm locations with efficiency analysis",
      icon: <PieChart className="w-5 h-5 text-indigo-600" />
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {prompts.map((prompt, index) => (
        <PromptCard
          key={index}
          title={prompt.title}
          description={prompt.description}
          prompt={prompt.prompt}
          icon={prompt.icon}
          onClick={onPromptClick}
        />
      ))}
    </div>
  )
} 