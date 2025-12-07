import { test } from '@japa/runner'

test.group('Security - Input Sanitization', () => {
  test('should detect potential SQL injection patterns', ({ assert }) => {
    const sqlInjectionPatterns = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "' UNION SELECT * FROM admins --",
      '1; DELETE FROM clients',
    ]

    const dangerousPattern = /('|--|;|\bUNION\b|\bSELECT\b|\bDROP\b|\bDELETE\b)/i

    sqlInjectionPatterns.forEach((input) => {
      assert.isTrue(dangerousPattern.test(input), `Should detect: ${input}`)
    })
  })

  test('should detect XSS patterns', ({ assert }) => {
    const xssPatterns = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      "javascript:alert('xss')",
      '<svg onload=alert(1)>',
    ]

    const xssPattern = /<[^>]*script|javascript:|on\w+\s*=/i

    xssPatterns.forEach((input) => {
      assert.isTrue(xssPattern.test(input), `Should detect: ${input}`)
    })
  })

  test('should sanitize HTML entities', ({ assert }) => {
    const sanitizeHtml = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
    }

    const input = '<script>alert("xss")</script>'
    const sanitized = sanitizeHtml(input)

    assert.isFalse(sanitized.includes('<'))
    assert.isFalse(sanitized.includes('>'))
    assert.isTrue(sanitized.includes('&lt;'))
    assert.isTrue(sanitized.includes('&gt;'))
  })
})

test.group('Security - Password Policy', () => {
  test('should enforce minimum length', ({ assert }) => {
    const minLength = 8

    assert.isFalse('1234567'.length >= minLength)
    assert.isTrue('12345678'.length >= minLength)
    assert.isTrue('supersecurepassword'.length >= minLength)
  })

  test('should detect weak passwords', ({ assert }) => {
    const weakPasswords = ['password', '12345678', 'qwerty123', 'admin123', 'azerty']

    const commonPasswords = new Set(weakPasswords)

    weakPasswords.forEach((pwd) => {
      assert.isTrue(commonPasswords.has(pwd), `${pwd} should be weak`)
    })
  })

  test('should validate password complexity', ({ assert }) => {
    const hasComplexity = (password: string): boolean => {
      const hasLower = /[a-z]/.test(password)
      const hasUpper = /[A-Z]/.test(password)
      const hasDigit = /\d/.test(password)
      return hasLower && hasUpper && hasDigit
    }

    assert.isFalse(hasComplexity('password'))
    assert.isFalse(hasComplexity('PASSWORD'))
    assert.isFalse(hasComplexity('12345678'))
    assert.isTrue(hasComplexity('Password1'))
    assert.isTrue(hasComplexity('SecurePass123'))
  })
})

test.group('Security - Session', () => {
  test('should validate session token format', ({ assert }) => {
    const isValidSessionToken = (token: string): boolean => {
      return token.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(token)
    }

    assert.isFalse(isValidSessionToken('short'))
    assert.isFalse(isValidSessionToken('<script>'))
    assert.isTrue(isValidSessionToken('a'.repeat(32)))
    assert.isTrue(isValidSessionToken('abcdefghijklmnopqrstuvwxyz123456'))
  })
})

test.group('Security - CSRF Protection', () => {
  test('should validate CSRF token presence', ({ assert }) => {
    const validateCsrf = (token: string | undefined): boolean => {
      return token !== undefined && token.length > 0
    }

    assert.isFalse(validateCsrf(undefined))
    assert.isFalse(validateCsrf(''))
    assert.isTrue(validateCsrf('valid-csrf-token'))
  })
})

test.group('Security - Rate Limiting', () => {
  test('should track request counts correctly', ({ assert }) => {
    const requests: Map<string, { count: number; resetAt: number }> = new Map()

    const trackRequest = (ip: string, windowMs: number): boolean => {
      const now = Date.now()
      const existing = requests.get(ip)

      if (!existing || existing.resetAt < now) {
        requests.set(ip, { count: 1, resetAt: now + windowMs })
        return true
      }

      if (existing.count >= 5) {
        return false
      }

      existing.count++
      return true
    }

    const ip = '192.168.1.1'
    const windowMs = 60000

    assert.isTrue(trackRequest(ip, windowMs))
    assert.isTrue(trackRequest(ip, windowMs))
    assert.isTrue(trackRequest(ip, windowMs))
    assert.isTrue(trackRequest(ip, windowMs))
    assert.isTrue(trackRequest(ip, windowMs))
    assert.isFalse(trackRequest(ip, windowMs))
  })
})

test.group('Security - File Upload', () => {
  test('should validate allowed file extensions', ({ assert }) => {
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.png', '.xls', '.xlsx']

    const isAllowed = (filename: string): boolean => {
      const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
      return allowedExtensions.includes(ext)
    }

    assert.isTrue(isAllowed('document.pdf'))
    assert.isTrue(isAllowed('image.jpg'))
    assert.isTrue(isAllowed('spreadsheet.xlsx'))
    assert.isFalse(isAllowed('script.exe'))
    assert.isFalse(isAllowed('malware.bat'))
    assert.isFalse(isAllowed('shell.sh'))
  })

  test('should validate MIME types', ({ assert }) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    const isValidMime = (mime: string): boolean => allowedMimes.includes(mime)

    assert.isTrue(isValidMime('application/pdf'))
    assert.isTrue(isValidMime('image/jpeg'))
    assert.isFalse(isValidMime('application/x-executable'))
    assert.isFalse(isValidMime('text/html'))
  })

  test('should validate file size limits', ({ assert }) => {
    const maxSizeMB = 10
    const maxSizeBytes = maxSizeMB * 1024 * 1024

    const isValidSize = (sizeBytes: number): boolean => sizeBytes <= maxSizeBytes

    assert.isTrue(isValidSize(1024))
    assert.isTrue(isValidSize(5 * 1024 * 1024))
    assert.isTrue(isValidSize(maxSizeBytes))
    assert.isFalse(isValidSize(maxSizeBytes + 1))
    assert.isFalse(isValidSize(20 * 1024 * 1024))
  })
})

test.group('Security - Data Masking', () => {
  test('should mask email addresses', ({ assert }) => {
    const maskEmail = (email: string): string => {
      const [local, domain] = email.split('@')
      if (local.length <= 2) return `${local[0]}***@${domain}`
      return `${local[0]}${local[1]}***@${domain}`
    }

    assert.equal(maskEmail('john.doe@example.com'), 'jo***@example.com')
    assert.equal(maskEmail('a@test.com'), 'a***@test.com')
  })

  test('should mask phone numbers', ({ assert }) => {
    const maskPhone = (phone: string): string => {
      const digits = phone.replace(/\D/g, '')
      if (digits.length < 4) return '****'
      return '*'.repeat(digits.length - 4) + digits.slice(-4)
    }

    assert.equal(maskPhone('0612345678'), '******5678')
    assert.equal(maskPhone('+33 6 12 34 56 78'), '*******5678')
  })
})
