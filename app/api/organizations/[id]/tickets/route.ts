import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { sql } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Since we don't have a tickets table yet, return mock data
    // In production, you would query your actual tickets table
    const mockTickets = [
      {
        id: '1',
        subject: 'Integration Support Request',
        description: 'Need help integrating with existing CRM system',
        status: 'open',
        priority: 'high',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        subject: 'Feature Request: Advanced Reporting',
        description: 'Would like to see more detailed analytics dashboard',
        status: 'in-progress',
        priority: 'medium',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    // In a real scenario, filter by organization
    return NextResponse.json(Math.random() > 0.5 ? mockTickets : [])
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json([])
  }
}