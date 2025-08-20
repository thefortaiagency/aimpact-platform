import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'NEXUS Chat - AImpact Nexus',
  description: 'Powerful AI assistant with autonomous capabilities',
  applicationName: 'NEXUS Chat',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NEXUS Chat',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#0a0a23',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export const viewport: Viewport = {
  themeColor: '#0a0a23',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}