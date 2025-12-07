import { test } from '@japa/runner'
import TotpService from '#services/auth/totp_service'
import { authenticator } from 'otplib'

test.group('TotpService - generateSecret', () => {
  test('should generate a valid secret', ({ assert }) => {
    const totpService = new TotpService()
    const secret = totpService.generateSecret()

    assert.isString(secret)
    assert.isTrue(secret.length >= 16)
  })

  test('should generate unique secrets', ({ assert }) => {
    const totpService = new TotpService()
    const secret1 = totpService.generateSecret()
    const secret2 = totpService.generateSecret()

    assert.notEqual(secret1, secret2)
  })
})

test.group('TotpService - generateOtpauthUrl', () => {
  test('should generate valid otpauth URL', ({ assert }) => {
    const totpService = new TotpService()
    const email = 'test@example.com'
    const secret = 'TESTSECRET123456'

    const url = totpService.generateOtpauthUrl(email, secret)

    assert.isString(url)
    assert.isTrue(url.startsWith('otpauth://totp/'))
    assert.isTrue(url.includes(encodeURIComponent(email)))
    assert.isTrue(url.includes('secret=' + secret))
    assert.isTrue(url.includes('issuer=Cabinet%20Avocats'))
  })
})

test.group('TotpService - generateQRCode', () => {
  test('should generate a base64 QR code', async ({ assert }) => {
    const totpService = new TotpService()
    const email = 'test@example.com'
    const secret = totpService.generateSecret()

    const qrCode = await totpService.generateQRCode(email, secret)

    assert.isString(qrCode)
    assert.isTrue(qrCode.startsWith('data:image/png;base64,'))
  })
})

test.group('TotpService - verifyToken', () => {
  test('should verify a valid token', ({ assert }) => {
    const totpService = new TotpService()
    const secret = totpService.generateSecret()
    const validToken = authenticator.generate(secret)

    const isValid = totpService.verifyToken(validToken, secret)

    assert.isTrue(isValid)
  })

  test('should reject an invalid token', ({ assert }) => {
    const totpService = new TotpService()
    const secret = totpService.generateSecret()
    const invalidToken = '000000'

    const isValid = totpService.verifyToken(invalidToken, secret)

    assert.isFalse(isValid)
  })

  test('should reject wrong format token', ({ assert }) => {
    const totpService = new TotpService()
    const secret = totpService.generateSecret()
    const wrongFormatToken = 'abc123'

    const isValid = totpService.verifyToken(wrongFormatToken, secret)

    assert.isFalse(isValid)
  })

  test('should reject empty token', ({ assert }) => {
    const totpService = new TotpService()
    const secret = totpService.generateSecret()

    const isValid = totpService.verifyToken('', secret)

    assert.isFalse(isValid)
  })
})

test.group('TotpService - generateRecoveryCodes', () => {
  test('should generate the default number of codes (8)', ({ assert }) => {
    const totpService = new TotpService()
    const codes = totpService.generateRecoveryCodes()

    assert.isArray(codes)
    assert.lengthOf(codes, 8)
  })

  test('should generate custom number of codes', ({ assert }) => {
    const totpService = new TotpService()
    const codes = totpService.generateRecoveryCodes(12)

    assert.isArray(codes)
    assert.lengthOf(codes, 12)
  })

  test('should generate uppercase alphanumeric codes', ({ assert }) => {
    const totpService = new TotpService()
    const codes = totpService.generateRecoveryCodes()

    codes.forEach((code) => {
      assert.isString(code)
      assert.match(code, /^[A-Z0-9]+$/)
      assert.isTrue(code.length >= 6)
    })
  })

  test('should generate unique codes', ({ assert }) => {
    const totpService = new TotpService()
    const codes = totpService.generateRecoveryCodes(20)
    const uniqueCodes = new Set(codes)

    assert.equal(uniqueCodes.size, codes.length)
  })
})
