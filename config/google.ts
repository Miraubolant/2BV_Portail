import env from '#start/env'

const googleConfig = {
  clientId: env.get('GOOGLE_CLIENT_ID', ''),
  clientSecret: env.get('GOOGLE_CLIENT_SECRET', ''),
  redirectUri: env.get('GOOGLE_REDIRECT_URI', 'http://localhost:3333/api/admin/google/callback'),

  // OAuth endpoints
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',

  // Required scopes for Google Calendar
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],

  // Service key for storing tokens
  serviceKey: 'google_calendar',

  // Google Calendar API base URL
  calendarApiBase: 'https://www.googleapis.com/calendar/v3',
}

export default googleConfig
