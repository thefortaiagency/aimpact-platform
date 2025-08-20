import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const includeMetrics = searchParams.get('includeMetrics') === 'true';
    
    // Fetch all organizations
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    // If metrics are requested, enhance the data with computed metrics
    let enhancedOrgs = organizations || [];
    
    if (includeMetrics && organizations) {
      // Fetch related contacts for each organization
      const orgIds = organizations.map(org => org.id);
      
      const { data: contacts } = await supabase
        .from('contacts')
        .select('organization_id')
        .in('organization_id', orgIds);
      
      const { data: projects } = await supabase
        .from('projects')
        .select('organization_id, budget')
        .in('organization_id', orgIds);
      
      const { data: tickets } = await supabase
        .from('tickets')
        .select('organization_id, status')
        .in('organization_id', orgIds);

      // Calculate metrics for each organization
      enhancedOrgs = organizations.map(org => {
        const orgContacts = contacts?.filter(c => c.organization_id === org.id) || [];
        const orgProjects = projects?.filter(p => p.organization_id === org.id) || [];
        const orgTickets = tickets?.filter(t => t.organization_id === org.id) || [];
        
        // Calculate total project value
        const accountValue = orgProjects.reduce((sum, project) => {
          if (project.budget && typeof project.budget === 'object') {
            return sum + (project.budget.quoted || 0);
          }
          return sum + (project.budget || 0);
        }, 0);

        // Calculate health score based on various factors
        let healthScore = 70; // Base score
        if (orgProjects.length > 0) healthScore += 10;
        if (orgContacts.length > 2) healthScore += 10;
        if (orgTickets.filter(t => t.status === 'open').length === 0) healthScore += 10;
        healthScore = Math.min(100, healthScore);

        return {
          ...org,
          // Add computed metrics
          contactCount: orgContacts.length,
          projectCount: orgProjects.length,
          ticketCount: orgTickets.length,
          openTickets: orgTickets.filter(t => t.status === 'open').length,
          accountValue: accountValue,
          healthScore: healthScore,
          overallSatisfaction: healthScore, // For now, use health score as satisfaction
          communicationHealth: healthScore,
          totalInteractions: orgTickets.length + orgProjects.length,
          riskLevel: healthScore > 80 ? 'low' : healthScore > 60 ? 'medium' : 'high',
          sentimentTrend: 'stable',
          lifetimeValue: accountValue,
          paymentStatus: 'current'
        };
      });
    }

    return NextResponse.json({
      organizations: enhancedOrgs,
      count: enhancedOrgs.length
    });
    
  } catch (error) {
    console.error('Organizations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    
    // Create new organization
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        name: body.name,
        website: body.website,
        industry: body.industry,
        annual_revenue: body.annual_revenue,
        employee_count: body.employee_count,
        is_active: body.is_active !== false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating organization:', error);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      organization,
      message: 'Organization created successfully'
    });
    
  } catch (error) {
    console.error('Organizations POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}