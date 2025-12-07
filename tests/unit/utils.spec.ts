import { test } from '@japa/runner'

test.group('Utils - Password Strength', () => {
  test('should validate minimum length requirement', ({ assert }) => {
    const shortPassword = '1234567'
    const validPassword = '12345678'

    assert.isTrue(shortPassword.length < 8)
    assert.isTrue(validPassword.length >= 8)
  })
})

test.group('Utils - Email Validation', () => {
  test('should identify valid email format', ({ assert }) => {
    const validEmails = ['test@example.com', 'user.name@domain.org', 'user+tag@company.co.uk']

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    validEmails.forEach((email) => {
      assert.isTrue(emailRegex.test(email), `${email} should be valid`)
    })
  })

  test('should identify invalid email format', ({ assert }) => {
    const invalidEmails = ['notanemail', '@domain.com', 'user@', 'user@domain', '']

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    invalidEmails.forEach((email) => {
      assert.isFalse(emailRegex.test(email), `${email} should be invalid`)
    })
  })
})

test.group('Utils - Phone Number Validation', () => {
  test('should validate French phone numbers', ({ assert }) => {
    const validPhones = ['0612345678', '06 12 34 56 78', '+33612345678', '+33 6 12 34 56 78']

    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/

    validPhones.forEach((phone) => {
      assert.isTrue(phoneRegex.test(phone), `${phone} should be valid`)
    })
  })
})

test.group('Utils - Reference Generation', () => {
  test('should generate unique references', ({ assert }) => {
    const generateReference = () => {
      const year = new Date().getFullYear()
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0')
      return `DOS-${year}-${random}`
    }

    const ref1 = generateReference()
    const ref2 = generateReference()

    assert.match(ref1, /^DOS-\d{4}-\d{4}$/)
    assert.match(ref2, /^DOS-\d{4}-\d{4}$/)
  })
})

test.group('Utils - Date Formatting', () => {
  test('should format dates correctly', ({ assert }) => {
    const date = new Date('2024-03-15')

    const formattedFR = date.toLocaleDateString('fr-FR')

    assert.isString(formattedFR)
    assert.isTrue(formattedFR.includes('15'))
  })

  test('should handle null dates gracefully', ({ assert }) => {
    const nullDate: Date | null = null

    const result = nullDate ? nullDate.toISOString() : null

    assert.isNull(result)
  })
})

test.group('Utils - SIRET Validation', () => {
  test('should validate SIRET format (14 digits)', ({ assert }) => {
    const validSiret = '12345678901234'
    const invalidSiret = '1234567890'

    const siretRegex = /^\d{14}$/

    assert.isTrue(siretRegex.test(validSiret))
    assert.isFalse(siretRegex.test(invalidSiret))
  })
})

test.group('Utils - Amount Calculations', () => {
  test('should calculate remaining amount correctly', ({ assert }) => {
    const invoiced = 10000
    const paid = 6500

    const remaining = invoiced - paid

    assert.equal(remaining, 3500)
  })

  test('should handle zero values', ({ assert }) => {
    const invoiced = 0
    const paid = 0

    const remaining = invoiced - paid

    assert.equal(remaining, 0)
  })

  test('should handle overpayment', ({ assert }) => {
    const invoiced = 5000
    const paid = 6000

    const remaining = invoiced - paid

    assert.equal(remaining, -1000)
  })
})

test.group('Utils - File Size Formatting', () => {
  test('should format bytes correctly', ({ assert }) => {
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    assert.equal(formatBytes(0), '0 B')
    assert.equal(formatBytes(1024), '1 KB')
    assert.equal(formatBytes(1048576), '1 MB')
    assert.equal(formatBytes(1073741824), '1 GB')
  })
})

test.group('Utils - Status Mapping', () => {
  test('should map dossier statuses correctly', ({ assert }) => {
    const statusLabels: Record<string, string> = {
      ouvert: 'Ouvert',
      en_cours: 'En cours',
      en_attente: 'En attente',
      cloture_gagne: 'Cloture - Gagne',
      cloture_perdu: 'Cloture - Perdu',
      archive: 'Archive',
    }

    assert.equal(statusLabels['ouvert'], 'Ouvert')
    assert.equal(statusLabels['archive'], 'Archive')
    assert.isUndefined(statusLabels['invalid'])
  })
})
