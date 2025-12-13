import env from '#start/env'

const microsoftConfig = {
  clientId: env.get('MICROSOFT_CLIENT_ID', ''),
  clientSecret: env.get('MICROSOFT_CLIENT_SECRET', ''),
  // 'consumers' for personal accounts, 'organizations' for work/school, or tenant ID
  tenantId: env.get('MICROSOFT_TENANT_ID', 'consumers'),
  redirectUri: env.get(
    'MICROSOFT_REDIRECT_URI',
    'http://localhost:3333/api/admin/microsoft/callback'
  ),

  // OAuth endpoints
  get authorizeUrl(): string {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`
  },

  get tokenUrl(): string {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`
  },

  // Required scopes for OneDrive access
  scopes: [
    'User.Read',
    'Files.ReadWrite.All',
    'offline_access', // Required for refresh token
  ],

  // Service key for storing tokens
  serviceKey: 'onedrive',
}

export default microsoftConfig
