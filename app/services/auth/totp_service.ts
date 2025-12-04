import { authenticator } from 'otplib'
import * as QRCode from 'qrcode'

export default class TotpService {
  private issuer = 'Cabinet Avocats'

  /**
   * Génère un secret TOTP
   */
  generateSecret(): string {
    return authenticator.generateSecret()
  }

  /**
   * Génère l'URL otpauth pour le QR code
   */
  generateOtpauthUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, this.issuer, secret)
  }

  /**
   * Génère un QR code en base64
   */
  async generateQRCode(email: string, secret: string): Promise<string> {
    const otpauthUrl = this.generateOtpauthUrl(email, secret)
    return QRCode.toDataURL(otpauthUrl)
  }

  /**
   * Vérifie un code TOTP
   */
  verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret })
    } catch {
      return false
    }
  }

  /**
   * Génère un code de récupération (pour usage futur)
   */
  generateRecoveryCodes(count: number = 8): string[] {
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()
      codes.push(code)
    }
    return codes
  }
}
