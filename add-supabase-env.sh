#!/bin/bash

# Supabase credentials from nexus-platform
echo "Adding Supabase environment variables to Vercel..."

# Add NEXT_PUBLIC_SUPABASE_URL
echo "https://gahcluyygwcbdzbitnwo.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production --force

# Add NEXT_PUBLIC_SUPABASE_ANON_KEY
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaGNsdXl5Z3djYmR6Yml0bndvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODQwMzgsImV4cCI6MjA2OTk2MDAzOH0.Lt5CwoxpMdKUuwB1RENMFnSTe-Qm0lLyX5Ec1DIWtAQ" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force

# Add SUPABASE_URL
echo "https://gahcluyygwcbdzbitnwo.supabase.co" | vercel env add SUPABASE_URL production --force

# Add SUPABASE_ANON_KEY
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaGNsdXl5Z3djYmR6Yml0bndvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODQwMzgsImV4cCI6MjA2OTk2MDAzOH0.Lt5CwoxpMdKUuwB1RENMFnSTe-Qm0lLyX5Ec1DIWtAQ" | vercel env add SUPABASE_ANON_KEY production --force

# Add SUPABASE_SERVICE_ROLE_KEY
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaGNsdXl5Z3djYmR6Yml0bndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM4NDAzOCwiZXhwIjoyMDY5OTYwMDM4fQ.DvauVy70CCKZXSzxH1OhY_wApc5EU4Spaa5GXSdoNVU" | vercel env add SUPABASE_SERVICE_ROLE_KEY production --force

echo "All Supabase environment variables added!"
echo "Triggering new deployment..."
vercel --prod