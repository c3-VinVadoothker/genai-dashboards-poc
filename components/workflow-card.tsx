import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WorkflowCardProps {
  title: string
  steps: string[]
  icon?: React.ReactNode
}

export function WorkflowCard({ title, steps, icon }: WorkflowCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-sm transition-all duration-200 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-2">
          {icon && <div className="text-gray-600 dark:text-gray-400">{icon}</div>}
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {steps.map((step, index) => (
            <p key={index} className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {step}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
