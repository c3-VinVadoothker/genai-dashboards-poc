import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Download, ExternalLink, Save } from 'lucide-react'
import { DashboardStorage, type GeneratedDashboard } from '@/lib/dashboard-storage'

interface DashboardPreviewProps {
  dashboardId: string
  size?: { width: number; height: number }
  onSave?: (dashboardId: string, name: string) => void
}

// Component that renders the dashboard in an iframe
function DashboardIframe({ dashboardId, size }: { dashboardId: string; size: { width: number; height: number } }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleLoad = () => {
    setLoading(false)
  }

  const handleError = () => {
    setError('Failed to load dashboard')
    setLoading(false)
  }

  return (
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
      <div className="w-full h-full overflow-hidden flex items-center justify-center">
        <iframe
          src={`/dashboard/${dashboardId}/visual?width=${size.width}&height=${size.height}`}
          className="w-full h-full border-0"
          style={{
            transform: 'scale(1)',
            transformOrigin: 'center center'
          }}
          onLoad={handleLoad}
          onError={handleError}
          title="Dashboard Preview"
        />
      </div>
    </div>
  )
}

export function DashboardPreview({ dashboardId, size = { width: 350, height: 200 }, onSave }: DashboardPreviewProps) {
  // Use the provided dashboardId instead of generating one

  if (!dashboardId) {
    return (
      <div className="space-y-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-card-foreground">Dashboard Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 justify-between">
              <div className="flex gap-2">
               
                <Button variant="outline" size="sm" className="p-2" disabled>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="default" size="sm" className="p-2" disabled>
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <div className="h-64 bg-muted rounded-lg border flex items-center justify-center">
              <div className="text-center">
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-card-foreground">Dashboard Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                 
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>Dashboard Preview</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4 h-[80vh]">
                    <DashboardIframe dashboardId={dashboardId} size={size} />
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog>
                <DialogTrigger asChild>
                
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Generated Code</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>// Code preview not available</code>
                    </pre>
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                variant="outline" 
                size="sm" 
                className="p-2"
                onClick={() => window.open(`/dashboard/${dashboardId}`, '_blank')}
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              {onSave && (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="p-2"
                  onClick={async () => {
                    // Fetch the dashboard name from the dashboards.json file
                    try {
                      const response = await fetch('/api/dashboards')
                      if (response.ok) {
                        const dashboards = await response.json()
                        const dashboard = dashboards.find((d: any) => d.id === dashboardId)
                        const name = dashboard?.name || `Dashboard ${dashboardId.slice(-6)}`
                        onSave(dashboardId, name)
                      } else {
                        onSave(dashboardId, `Dashboard ${dashboardId.slice(-6)}`)
                      }
                    } catch (error) {
                      console.error('Error fetching dashboard name:', error)
                      onSave(dashboardId, `Dashboard ${dashboardId.slice(-6)}`)
                    }
                  }}
                  title="Save to My Dashboard"
                >
                  <Save className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="h-64 bg-background border rounded-lg overflow-hidden">
            <DashboardIframe dashboardId={dashboardId} size={size} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 