// Meta Platform Integration Configuration
// This file contains configuration for all Meta platform integrations

export const MetaConfig = {
  // Facebook App Configuration
  facebook: {
    appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
    appSecret: process.env.FACEBOOK_APP_SECRET || '',
    apiVersion: 'v19.0',
    permissions: [
      'email',
      'public_profile',
      'user_friends',
      'user_photos',
      'user_videos',
      'pages_show_list',
      'pages_manage_posts',
      'pages_read_engagement',
      'publish_video',
      'user_events',
      'groups_access_member_info',
      'publish_to_groups'
    ],
    sdkUrl: 'https://connect.facebook.net/en_US/sdk.js'
  },
  
  // Facebook Workplace Configuration
  workplace: {
    appId: process.env.NEXT_PUBLIC_WORKPLACE_APP_ID || '',
    appSecret: process.env.WORKPLACE_APP_SECRET || '',
    communityId: process.env.WORKPLACE_COMMUNITY_ID || '',
    integrationToken: process.env.WORKPLACE_INTEGRATION_TOKEN || '',
    webhookVerifyToken: process.env.WORKPLACE_WEBHOOK_VERIFY_TOKEN || '',
    permissions: [
      'manage_work_accounts',
      'read_work_profile',
      'manage_groups',
      'read_group_content',
      'manage_group_content',
      'read_all_messages',
      'manage_knowledge_articles'
    ]
  },
  
  // Messenger Platform Configuration
  messenger: {
    pageId: process.env.MESSENGER_PAGE_ID || '',
    pageAccessToken: process.env.MESSENGER_PAGE_ACCESS_TOKEN || '',
    appSecret: process.env.MESSENGER_APP_SECRET || '',
    webhookVerifyToken: process.env.MESSENGER_WEBHOOK_VERIFY_TOKEN || '',
    apiVersion: 'v19.0'
  },
  
  // WhatsApp Business API Configuration
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
    apiVersion: 'v19.0'
  },
  
  // Instagram Basic Display API Configuration
  instagram: {
    appId: process.env.INSTAGRAM_APP_ID || '',
    appSecret: process.env.INSTAGRAM_APP_SECRET || '',
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI || '',
    permissions: ['user_profile', 'user_media']
  },
  
  // Meta Analytics Configuration
  analytics: {
    pixelId: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '',
    measurementId: process.env.FACEBOOK_MEASUREMENT_ID || '',
    conversionsApiToken: process.env.FACEBOOK_CONVERSIONS_API_TOKEN || ''
  },
  
  // Graph API Configuration
  graphApi: {
    baseUrl: 'https://graph.facebook.com',
    version: 'v19.0'
  }
}

// Helper function to validate Meta configuration
export function validateMetaConfig(): { isValid: boolean; missingKeys: string[] } {
  const missingKeys: string[] = []
  
  // Check Facebook configuration
  if (!MetaConfig.facebook.appId) missingKeys.push('NEXT_PUBLIC_FACEBOOK_APP_ID')
  if (!MetaConfig.facebook.appSecret) missingKeys.push('FACEBOOK_APP_SECRET')
  
  // Check other configurations as needed
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys
  }
}

// Helper function to get Graph API URL
export function getGraphApiUrl(endpoint: string, version?: string): string {
  const apiVersion = version || MetaConfig.graphApi.version
  return `${MetaConfig.graphApi.baseUrl}/${apiVersion}/${endpoint}`
}