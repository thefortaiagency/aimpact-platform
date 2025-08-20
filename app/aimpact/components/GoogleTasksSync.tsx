'use client'

import { useState } from 'react'
import { RefreshCw, Check, AlertCircle, Download, Upload, Link, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'

interface GoogleTasksSyncProps {
  isConnected: boolean
  onConnect?: () => void
  onRefresh?: () => void
}

export default function GoogleTasksSync({ 
  isConnected, 
  onConnect,
  onRefresh 
}: GoogleTasksSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncStats, setSyncStats] = useState<{
    toGoogle?: number
    fromGoogle?: number
    failed?: number
  }>({})

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/aimpact/todos-db/google-tasks/sync', {
        method: 'GET' // Two-way sync
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Sync failed')
      }

      const result = await response.json()
      setSyncStats({
        toGoogle: result.toGoogle,
        fromGoogle: result.fromGoogle,
        failed: result.failed
      })
      setLastSync(new Date())
      
      toast.success(
        `Sync complete: ${result.toGoogle} sent to Google, ${result.fromGoogle} imported`,
        {
          description: result.failed > 0 ? `${result.failed} items failed to sync` : undefined
        }
      )

      // Refresh the todo list
      if (onRefresh) {
        onRefresh()
      }
    } catch (error: any) {
      console.error('Sync error:', error)
      toast.error('Failed to sync with Google Tasks', {
        description: error.message
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const response = await fetch('/api/aimpact/todos-db/google-tasks/import', {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

      const result = await response.json()
      
      toast.success(
        `Imported ${result.imported} tasks from Google`,
        {
          description: result.failed > 0 ? `${result.failed} items failed to import` : undefined
        }
      )

      // Refresh the todo list
      if (onRefresh) {
        onRefresh()
      }
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error('Failed to import from Google Tasks', {
        description: error.message
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleSyncAll = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/aimpact/todos-db/google-tasks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncAll: true })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Sync failed')
      }

      const result = await response.json()
      
      toast.success(result.message)

      // Refresh the todo list
      if (onRefresh) {
        onRefresh()
      }
    } catch (error: any) {
      console.error('Sync all error:', error)
      toast.error('Failed to sync all todos', {
        description: error.message
      })
    } finally {
      setIsSyncing(false)
    }
  }

  if (!isConnected) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Google Tasks Not Connected</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Connect your Google account to sync todos with Google Tasks</p>
          {onConnect && (
            <Button onClick={onConnect} size="sm" className="mt-2">
              <Link className="h-4 w-4 mr-2" />
              Connect Google Account
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Google Tasks Sync</CardTitle>
            <CardDescription>
              Keep your todos in sync with Google Tasks
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Check className="h-3 w-3 text-green-500" />
            Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Stats */}
        {lastSync && (
          <div className="text-sm text-muted-foreground">
            Last synced: {lastSync.toLocaleTimeString()}
            {(syncStats.toGoogle || syncStats.fromGoogle) && (
              <div className="mt-1">
                {syncStats.toGoogle ? `↑ ${syncStats.toGoogle} to Google` : ''}
                {syncStats.toGoogle && syncStats.fromGoogle ? ' • ' : ''}
                {syncStats.fromGoogle ? `↓ ${syncStats.fromGoogle} from Google` : ''}
                {syncStats.failed ? ` • ⚠ ${syncStats.failed} failed` : ''}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSync}
            disabled={isSyncing || isImporting}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Two-Way Sync
          </Button>

          <Button
            onClick={handleSyncAll}
            disabled={isSyncing || isImporting}
            size="sm"
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            Push All to Google
          </Button>

          <Button
            onClick={handleImport}
            disabled={isSyncing || isImporting}
            size="sm"
            variant="outline"
          >
            <Download className={`h-4 w-4 mr-2 ${isImporting ? 'animate-pulse' : ''}`} />
            Import from Google
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>• New todos automatically sync to Google Tasks</p>
          <p>• Updates and completions sync in real-time</p>
          <p>• Deleted todos are removed from Google Tasks</p>
          <p>• Two-way sync prevents conflicts between devices</p>
        </div>
      </CardContent>
    </Card>
  )
}