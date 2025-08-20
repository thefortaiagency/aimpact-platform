#!/bin/bash

# Install essential dependencies for AImpact platform

echo "📦 Installing essential dependencies..."

# Core dependencies
npm install \
  @supabase/supabase-js \
  @supabase/auth-helpers-nextjs \
  next-auth@beta \
  @auth/drizzle-adapter \
  drizzle-orm \
  postgres \
  @neondatabase/serverless

# UI Components
npm install \
  lucide-react \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-label \
  @radix-ui/react-select \
  @radix-ui/react-tabs \
  @radix-ui/react-toast \
  @radix-ui/react-slot \
  @radix-ui/react-switch \
  @radix-ui/react-checkbox \
  @radix-ui/react-scroll-area \
  @radix-ui/react-avatar \
  class-variance-authority \
  clsx \
  tailwind-merge

# Communication APIs
npm install \
  @stream-io/node-sdk \
  @stream-io/video-react-sdk \
  @telnyx/webrtc \
  resend \
  @sendgrid/mail

# AI/ML
npm install \
  openai \
  @pinecone-database/pinecone \
  ai \
  @ai-sdk/openai

# Forms and validation
npm install \
  react-hook-form \
  @hookform/resolvers \
  zod

# Calendar
npm install \
  @fullcalendar/core \
  @fullcalendar/react \
  @fullcalendar/daygrid \
  @fullcalendar/timegrid \
  @fullcalendar/interaction

# Rich text editor
npm install \
  @tiptap/react \
  @tiptap/starter-kit \
  @tiptap/extension-link \
  @tiptap/extension-image

# Utils
npm install \
  date-fns \
  uuid \
  axios \
  bcryptjs

# Dev dependencies
npm install -D \
  @types/bcryptjs \
  @types/uuid \
  drizzle-kit

echo "✅ Dependencies installed!"