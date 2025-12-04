import googleConfig from '#config/google'
import GoogleToken from '#models/google_token'

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

interface UserProfile {
  id: string
  email: string
  name: string
  picture?: string
}

class GoogleOAuthService {
  /**
   * Generate the OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: googleConfig.clientId,
      redirect_uri: googleConfig.redirectUri,
      response_type: 'code',
      scope: googleConfig.scopes.join(' '),
      access_type: 'offline', // Required for refresh token
      prompt: 'consent', // Force consent to always get refresh token
      state: state || 'default',
    })
    return `${googleConfig.authorizeUrl}?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      client_id: googleConfig.clientId,
      client_secret: googleConfig.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: googleConfig.redirectUri,
    })

    const response = await fetch(googleConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = (await response.json()) as { error?: string; error_description?: string }
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`)
    }

    return (await response.json()) as TokenResponse
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      client_id: googleConfig.clientId,
      client_secret: googleConfig.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    })

    const response = await fetch(googleConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = (await response.json()) as { error?: string; error_description?: string }
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`)
    }

    return (await response.json()) as TokenResponse
  }

  /**
   * Get user profile from Google
   */
  async getUserProfile(accessToken: string): Promise<UserProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user profile')
    }

    return (await response.json()) as UserProfile
  }

  /**
   * Complete OAuth flow: exchange code, get user info, save token
   */
  async completeOAuthFlow(code: string): Promise<GoogleToken> {
    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code)

    // Get user profile
    const profile = await this.getUserProfile(tokens.access_token)

    // Save token to database
    const token = await GoogleToken.saveToken(googleConfig.serviceKey, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiresIn: tokens.expires_in,
      accountEmail: profile.email,
      accountName: profile.name,
      scopes: tokens.scope,
    })

    return token
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string | null> {
    const token = await GoogleToken.findByService(googleConfig.serviceKey)

    if (!token) {
      return null
    }

    // Check if token needs refresh (expires in less than 5 minutes)
    if (token.willExpireSoon) {
      try {
        const refreshed = await this.refreshAccessToken(token.refreshToken)

        // Update token in database
        await GoogleToken.saveToken(googleConfig.serviceKey, {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token || token.refreshToken,
          expiresIn: refreshed.expires_in,
          accountEmail: token.accountEmail,
          accountName: token.accountName,
          scopes: refreshed.scope || token.scopes,
          selectedCalendarId: token.selectedCalendarId,
          selectedCalendarName: token.selectedCalendarName,
        })

        return refreshed.access_token
      } catch (error) {
        console.error('Failed to refresh Google token:', error)
        return null
      }
    }

    return token.accessToken
  }

  /**
   * Check if Google Calendar is connected
   */
  async isConnected(): Promise<boolean> {
    const token = await GoogleToken.findByService(googleConfig.serviceKey)
    return token !== null
  }

  /**
   * Get connection status with details
   */
  async getConnectionStatus(): Promise<{
    connected: boolean
    accountEmail?: string | null
    accountName?: string | null
    selectedCalendarId?: string | null
    selectedCalendarName?: string | null
    expiresAt?: string
  }> {
    const token = await GoogleToken.findByService(googleConfig.serviceKey)

    if (!token) {
      return { connected: false }
    }

    return {
      connected: true,
      accountEmail: token.accountEmail,
      accountName: token.accountName,
      selectedCalendarId: token.selectedCalendarId,
      selectedCalendarName: token.selectedCalendarName,
      expiresAt: token.expiresAt.toISO() ?? undefined,
    }
  }

  /**
   * Disconnect Google Calendar (delete token)
   */
  async disconnect(): Promise<void> {
    await GoogleToken.deleteByService(googleConfig.serviceKey)
  }

  /**
   * Check if Google OAuth is configured
   */
  isConfigured(): boolean {
    return !!(googleConfig.clientId && googleConfig.clientSecret)
  }
}

export default new GoogleOAuthService()
