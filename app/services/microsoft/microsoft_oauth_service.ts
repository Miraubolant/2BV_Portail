import microsoftConfig from '#config/microsoft'
import MicrosoftToken from '#models/microsoft_token'
import logger from '@adonisjs/core/services/logger'

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

interface UserProfile {
  id: string
  displayName: string
  mail: string | null
  userPrincipalName: string
}

class MicrosoftOAuthService {
  /**
   * Generate the OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: microsoftConfig.clientId,
      response_type: 'code',
      redirect_uri: microsoftConfig.redirectUri,
      response_mode: 'query',
      scope: microsoftConfig.scopes.join(' '),
      state: state || 'default',
    })

    return `${microsoftConfig.authorizeUrl}?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      client_id: microsoftConfig.clientId,
      client_secret: microsoftConfig.clientSecret,
      code: code,
      redirect_uri: microsoftConfig.redirectUri,
      grant_type: 'authorization_code',
      scope: microsoftConfig.scopes.join(' '),
    })

    const response = await fetch(microsoftConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.json() as { error?: string; error_description?: string }
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`)
    }

    return await response.json() as TokenResponse
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      client_id: microsoftConfig.clientId,
      client_secret: microsoftConfig.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: microsoftConfig.scopes.join(' '),
    })

    const response = await fetch(microsoftConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.json() as { error?: string; error_description?: string }
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`)
    }

    return await response.json() as TokenResponse
  }

  /**
   * Get user profile from Microsoft Graph
   */
  async getUserProfile(accessToken: string): Promise<UserProfile> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user profile')
    }

    return await response.json() as UserProfile
  }

  /**
   * Complete OAuth flow: exchange code, get user info, save token
   */
  async completeOAuthFlow(code: string): Promise<MicrosoftToken> {
    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code)

    // Get user profile
    const profile = await this.getUserProfile(tokens.access_token)

    // Save tokens to database
    const savedToken = await MicrosoftToken.saveToken(microsoftConfig.serviceKey, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      accountEmail: profile.mail || profile.userPrincipalName,
      accountName: profile.displayName,
      scopes: tokens.scope,
    })

    return savedToken
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string | null> {
    const token = await MicrosoftToken.findByService(microsoftConfig.serviceKey)

    if (!token) {
      return null
    }

    // If token is not expired and not expiring soon, return it
    if (!token.willExpireSoon) {
      return token.accessToken
    }

    // Refresh the token
    try {
      const newTokens = await this.refreshAccessToken(token.refreshToken)

      // Update stored token
      await MicrosoftToken.saveToken(microsoftConfig.serviceKey, {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresIn: newTokens.expires_in,
        accountEmail: token.accountEmail,
        accountName: token.accountName,
        scopes: newTokens.scope,
      })

      return newTokens.access_token
    } catch (error) {
      logger.error({ err: error }, 'Failed to refresh Microsoft token')
      return null
    }
  }

  /**
   * Check if OneDrive is connected
   */
  async isConnected(): Promise<boolean> {
    const token = await MicrosoftToken.findByService(microsoftConfig.serviceKey)
    return token !== null
  }

  /**
   * Get connection status with details
   */
  async getConnectionStatus(): Promise<{
    connected: boolean
    accountEmail?: string | null
    accountName?: string | null
    expiresAt?: string
  }> {
    const token = await MicrosoftToken.findByService(microsoftConfig.serviceKey)

    if (!token) {
      return { connected: false }
    }

    return {
      connected: true,
      accountEmail: token.accountEmail,
      accountName: token.accountName,
      expiresAt: token.expiresAt.toISO() ?? undefined,
    }
  }

  /**
   * Disconnect OneDrive (delete token)
   */
  async disconnect(): Promise<void> {
    await MicrosoftToken.deleteByService(microsoftConfig.serviceKey)
  }

  /**
   * Check if Microsoft OAuth is configured
   */
  isConfigured(): boolean {
    return !!(microsoftConfig.clientId && microsoftConfig.clientSecret)
  }
}

export default new MicrosoftOAuthService()
