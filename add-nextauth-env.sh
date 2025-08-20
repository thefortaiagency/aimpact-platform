#!/bin/bash

echo "Adding NextAuth environment variables to Vercel..."

# Add NEXTAUTH_URL with production URL
echo "https://aimpact-platform.vercel.app" | vercel env add NEXTAUTH_URL production --force

# Add NEXTAUTH_SECRET (same as nexus-platform)
echo "0vyScEuc3TtZgixsWzT+C/gmNl7gx7Yfro+F7AMO0qc=" | vercel env add NEXTAUTH_SECRET production --force

echo "NextAuth environment variables added!"
echo "Triggering new deployment..."
vercel --prod