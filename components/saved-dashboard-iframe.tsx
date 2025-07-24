import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Maximize2, Code, Trash2, Edit } from 'lucide-react'
import { SavedDashboard } from '@/lib/saved-dashboards-service'
import { useRouter } from 'next/navigation'

interface SavedDashboardIframeProps {
  savedDashboard: SavedDashboard
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<SavedDashboard>) => void
  isEditMode: boolean
  onDragStart?: (e: React.MouseEvent, dashboardId: string) => void
  onDragOver?: (e: React.MouseEvent, dashboardId: string) => void
  onDrop?: (e: React.MouseEvent, dashboardId: string) => void
  draggedDashboardId?: string | null
}

export function SavedDashboardIframe({ 
  savedDashboard, 
  onDelete, 
  onUpdate, 
  isEditMode,
  onDragStart,
  onDragOver,
  onDrop,
  draggedDashboardId
}: SavedDashboardIframeProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [windowWidth, setWindowWidth] = useState(1024)

  // Handle responsive resizing
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    setWindowWidth(window.innerWidth)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLoad = () => {
    console.log('Saved dashboard iframe loaded:', savedDashboard.name)
    setLoading(false)
  }

  const handleError = () => {
    console.error('Saved dashboard iframe error:', savedDashboard.name)
    setError('Failed to load dashboard')
    setLoading(false)
  }

  const handleDelete = () => {
    onDelete(savedDashboard.id)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on delete button or in edit mode
    if (isEditMode) {
      return
    }
    
    // Open dashboard in a new tab
    window.open(`/dashboard/${savedDashboard.dashboardId}`, '_blank')
  }

  const getComponentStyle = () => {
    // Fixed 4-column grid for tile-based positioning
    const gridSize = 100 / 4 // 25% width per tile
    const rowHeight = 120
    
    // Use tile position directly (x, y are now tile coordinates)
    const gridX = savedDashboard.position.x
    const gridY = savedDashboard.position.y
    
    return {
      position: 'absolute' as const,
      left: `${gridX * gridSize}%`,
      top: `${gridY * rowHeight}px`,
      width: `calc(${gridSize}% - 16px)`,
      height: `${(savedDashboard.size.height + 60) * 0.5}px`,
      zIndex: 1,
    }
  }

  return (
    <div 
      style={getComponentStyle()} 
      className={`relative transition-all duration-200 ${
        draggedDashboardId === savedDashboard.id ? 'opacity-50 scale-95' : ''
      } ${isEditMode ? 'cursor-move' : 'cursor-pointer'}`}
      onMouseDown={(e) => onDragStart?.(e, savedDashboard.id)}
      onMouseOver={(e) => onDragOver?.(e, savedDashboard.id)}
      onMouseUp={(e) => onDrop?.(e, savedDashboard.id)}
      onClick={handleCardClick}
    >
      <Card className="w-full h-full">
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium text-card-foreground">
              {savedDashboard.name}
            </CardTitle>
            {isEditMode && (
              <div className="flex gap-1">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-red-50 dark:hover:bg-red-950"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        Delete Saved Dashboard
                      </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete "{savedDashboard.name}"? This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleDelete}
                      >
                        Delete
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <div className="relative w-full h-full">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <div className="text-sm text-muted-foreground">Loading dashboard...</div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <div className="text-sm text-red-500">{error}</div>
              </div>
            )}
            <div className="w-full h-full bg-background flex items-center justify-center overflow-hidden">
              {(() => {
                const iframeSrc = `/dashboard/${savedDashboard.dashboardId}/visual?width=300&height=180`
                console.log('Iframe src:', iframeSrc, 'for dashboard:', savedDashboard.name)
                return (
                  <iframe
                    src={iframeSrc}
                    className="w-full h-full border-0"
                    style={{
                      width: '300px',
                      height: '300px',
                      transform: 'scale(0.9)',
                      transformOrigin: 'center center'
                    }}
                    onLoad={handleLoad}
                    onError={handleError}
                    title={savedDashboard.name}
                  />
                )
              })()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 