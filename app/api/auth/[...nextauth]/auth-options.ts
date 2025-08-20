import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gahcluyygwcbdzbitnwo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            "openid",
            "email",
            "profile",
            // Google Calendar scopes (for meeting sync)
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
            // Google Tasks scopes (for todo sync)
            "https://www.googleapis.com/auth/tasks",
            "https://www.googleapis.com/auth/tasks.readonly"
          ].join(" ")
        }
      }
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('Missing credentials');
          return null;
        }

        try {
          console.log('Attempting Supabase auth for:', credentials.email);
          
          // Use Supabase Auth to verify credentials
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error) {
            console.error('Supabase auth error:', error.message);
            return null;
          }

          if (data?.user) {
            console.log('Supabase auth successful for:', data.user.email);
            
            // Check if user has admin role
            const { data: profile } = await supabase
              .from('users')
              .select('role, name')
              .eq('email', data.user.email)
              .single();
            
            // Return user object for NextAuth
            return {
              id: data.user.id,
              email: data.user.email!,
              name: profile?.name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
              role: profile?.role || 'user',
            };
          }

          console.log('No user data returned from Supabase');
          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role || 'user';
      }
      
      // Store Google OAuth tokens
      if (account?.provider === "google") {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        
        // Save tokens to database for background sync
        if (user?.email && account.access_token) {
          try {
            await supabase
              .from('users')
              .upsert({
                email: user.email,
                google_access_token: account.access_token,
                google_refresh_token: account.refresh_token,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'email'
              });
          } catch (error) {
            console.error('Error saving Google tokens:', error);
          }
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as any).role = token.role as string;
        // Include access token in session for API calls
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Allow both Google OAuth and credentials
      if (account?.provider === "google") {
        // Create or update user in database
        if (user?.email) {
          try {
            await supabase
              .from('users')
              .upsert({
                email: user.email,
                name: user.name || profile?.name || user.email.split('@')[0],
                avatar_url: user.image || profile?.picture,
                provider: 'google',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'email'
              });
          } catch (error) {
            console.error('Error creating/updating user:', error);
          }
        }
      }
      return true;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "temporary-secret-for-development",
  debug: process.env.NODE_ENV === 'development',
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
};