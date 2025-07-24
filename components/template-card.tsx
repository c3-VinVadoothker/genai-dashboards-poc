import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface TemplateCardProps {
  title: string
  description: string
  onGenerateVisual?: () => void
}

export function TemplateCard({ title, description, onGenerateVisual }: TemplateCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-sm transition-all duration-200 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
          {description}
        </CardDescription>
        <Button
          variant="link"
          className="p-0 h-auto text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          onClick={(e) => {
            e.stopPropagation()
            onGenerateVisual?.()
          }}
        >
          Generate Visualization
        </Button>
      </CardContent>
    </Card>
  )
}
