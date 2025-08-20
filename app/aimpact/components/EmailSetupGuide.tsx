'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle, Circle, Copy, ExternalLink, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

export default function EmailSetupGuide() {
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())

  const copyToClipboard = (text: string, itemId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedItems(new Set([...copiedItems, itemId]))
    setTimeout(() => {
      setCopiedItems(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }, 2000)
  }

  const steps = [
    {
      title: "Create Google Cloud Project",
      completed: false,
      steps: [
        "Go to Google Cloud Console",
        "Create new project named 'AImpact Email Integration'",
        "Note the project ID"
      ]
    },
    {
      title: "Enable Gmail API",
      completed: false,
      steps: [
        "In your project, go to APIs & Services → Library",
        "Search for 'Gmail API'",
        "Click Enable"
      ]
    },
    {
      title: "Create Service Account",
      completed: false,
      steps: [
        "Go to APIs & Services → Credentials",
        "Create Credentials → Service Account",
        "Name: aimpact-gmail-service",
        "Create and download JSON key"
      ]
    },
    {
      title: "Configure Domain-Wide Delegation",
      completed: false,
      steps: [
        "Enable domain-wide delegation in service account",
        "Copy the Client ID",
        "Add to Google Admin Console with scopes"
      ]
    }
  ]

  const requiredScopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send"
  ]

  const envExample = `# Add to .env.local
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/gmail-service-account.json

# OR for production (base64 encoded):
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=<base64-encoded-json>`

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <Alert className="bg-yellow-500/10 border-yellow-500/20">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Gmail Integration Not Configured</AlertTitle>
        <AlertDescription>
          Follow these steps to enable email send/receive functionality
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Gmail Service Account Setup</CardTitle>
          <CardDescription>
            Complete these steps to integrate Gmail with AImpact
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Setup Steps */}
          {steps.map((step, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center gap-3">
                {step.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <h3 className="font-semibold">{step.title}</h3>
              </div>
              <ul className="ml-8 space-y-1">
                {step.steps.map((substep, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    • {substep}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Required Scopes */}
          <div className="space-y-3">
            <h3 className="font-semibold">Required OAuth Scopes</h3>
            <div className="bg-muted p-3 rounded-md space-y-1">
              {requiredScopes.map((scope, i) => (
                <div key={i} className="flex items-center justify-between">
                  <code className="text-xs">{scope}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(scope, `scope-${i}`)}
                  >
                    {copiedItems.has(`scope-${i}`) ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Environment Variables */}
          <div className="space-y-3">
            <h3 className="font-semibold">Environment Variables</h3>
            <div className="bg-muted p-3 rounded-md">
              <pre className="text-xs overflow-x-auto">{envExample}</pre>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => copyToClipboard(envExample, 'env')}
              >
                {copiedItems.has('env') ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                Copy
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="font-semibold">Quick Links</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Google Cloud Console
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://admin.google.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Google Admin Console
                </a>
              </Button>
            </div>
          </div>

          {/* Test Email */}
          <Alert>
            <AlertDescription>
              Once configured, emails will be sent from and received at:
              <code className="ml-2 font-mono text-sm">helpdesk@theforaiagency.com</code>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}