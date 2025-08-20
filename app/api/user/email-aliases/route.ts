import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { createClient } from '@supabase/supabase-js';
import { 
  getUserEmailAliases, 
  canUserSendFrom,
  getDefaultSenderEmail 
} from '@/lib/email-config';

// Initialize Supabase
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// GET - Fetch user's email aliases
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    
    // Try to get saved aliases from database
    const { data: savedAliases, error } = await supabase
      .from('user_email_aliases')
      .select('*')
      .eq('user_email', session.user.email)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching email aliases:', error);
    }

    // Get configured aliases for this user
    const configuredAliases = getUserEmailAliases(session.user.email);
    
    // Merge saved aliases with configured ones (configured take precedence)
    // Mark thefortaiagency.com addresses as verified since that's our Resend domain
    let aliases = configuredAliases.map(alias => ({
      ...alias,
      verified: alias.domain === 'thefortaiagency.com' ? true : alias.verified
    }));
    
    // Add any additional saved aliases that aren't in the configured list
    if (savedAliases && savedAliases.length > 0) {
      const configuredEmails = new Set(aliases.map(a => a.email.toLowerCase()));
      const additionalAliases = savedAliases
        .filter(alias => !configuredEmails.has(alias.email_address.toLowerCase()))
        .map(alias => ({
          email: alias.email_address,
          name: alias.display_name,
          domain: alias.domain,
          isDefault: alias.is_default,
          isShared: alias.is_shared,
          verified: alias.verified
        }));
      aliases.push(...additionalAliases);
    }
    
    // Ensure default email is set
    const defaultEmail = getDefaultSenderEmail(session.user.email);
    if (!aliases.some(a => a.isDefault)) {
      const defaultAlias = aliases.find(a => a.email === defaultEmail);
      if (defaultAlias) {
        defaultAlias.isDefault = true;
      }
    }

    return NextResponse.json({ aliases });
  } catch (error) {
    console.error('Error in GET /api/aimpact/user/email-aliases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email aliases' },
      { status: 500 }
    );
  }
}

// POST - Add a new email alias
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address required' },
        { status: 400 }
      );
    }
    
    // Validate that the user can send from this email
    if (!canUserSendFrom(session.user.email, email)) {
      return NextResponse.json(
        { error: 'You are not authorized to send from this email address' },
        { status: 403 }
      );
    }

    const domain = email.split('@')[1];
    const supabase = getSupabaseClient();

    // Check if alias already exists
    const { data: existing } = await supabase
      .from('user_email_aliases')
      .select('id')
      .eq('user_email', session.user.email)
      .eq('email_address', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Email alias already exists' },
        { status: 400 }
      );
    }

    // Add the new alias
    const { data: newAlias, error } = await supabase
      .from('user_email_aliases')
      .insert({
        user_email: session.user.email,
        email_address: email,
        display_name: name || email.split('@')[0],
        domain,
        is_default: false,
        is_shared: false,
        verified: false // New aliases need verification
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding email alias:', error);
      return NextResponse.json(
        { error: 'Failed to add email alias' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      alias: {
        email: newAlias.email_address,
        name: newAlias.display_name,
        domain: newAlias.domain,
        isDefault: newAlias.is_default,
        isShared: newAlias.is_shared,
        verified: newAlias.verified
      }
    });
  } catch (error) {
    console.error('Error in POST /api/aimpact/user/email-aliases:', error);
    return NextResponse.json(
      { error: 'Failed to add email alias' },
      { status: 500 }
    );
  }
}

// DELETE - Remove an email alias
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email address required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Don't allow deletion of default or shared emails
    const { data: alias } = await supabase
      .from('user_email_aliases')
      .select('is_default, is_shared')
      .eq('user_email', session.user.email)
      .eq('email_address', email)
      .single();

    if (alias?.is_default || alias?.is_shared) {
      return NextResponse.json(
        { error: 'Cannot delete default or shared email aliases' },
        { status: 400 }
      );
    }

    // Delete the alias
    const { error } = await supabase
      .from('user_email_aliases')
      .delete()
      .eq('user_email', session.user.email)
      .eq('email_address', email);

    if (error) {
      console.error('Error deleting email alias:', error);
      return NextResponse.json(
        { error: 'Failed to delete email alias' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/aimpact/user/email-aliases:', error);
    return NextResponse.json(
      { error: 'Failed to delete email alias' },
      { status: 500 }
    );
  }
}