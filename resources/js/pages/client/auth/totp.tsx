import { InputError } from '@/components/common/input-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CLIENT_TOTP_STATUS_API, CLIENT_TOTP_CONFIRM_API, CLIENT_TOTP_VERIFY_API } from '@/lib/constants'
import { CLIENT_DASHBOARD } from '@/app/routes'
import { Head, router, useForm } from '@inertiajs/react'
import { LoaderCircle, Shield, Info } from 'lucide-react'
import { useState, useEffect } from 'react'

const ClientTotpPage = () => {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [setupMode, setSetupMode] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const { data, setData, processing } = useForm({
    code: '',
  })

  useEffect(() => {
    checkTotpStatus()
  }, [])

  const checkTotpStatus = async () => {
    try {
      const response = await fetch(CLIENT_TOTP_STATUS_API, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const result = await response.json()
        if (result.needsSetup) {
          setSetupMode(true)
          setQrCode(result.qrCode)
          setSecret(result.secret)
        }
      }
    } catch (error) {
      console.error('Error checking TOTP status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Use confirm-totp for setup, verify-totp for regular verification
    const apiUrl = setupMode ? CLIENT_TOTP_CONFIRM_API : CLIENT_TOTP_VERIFY_API

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: data.code }),
        credentials: 'include',
      })

      const result = await response.json()

      if (!response.ok) {
        setErrors({ code: result.message || 'Code invalide' })
        return
      }

      router.visit(CLIENT_DASHBOARD)
    } catch (error) {
      setErrors({ code: 'Une erreur est survenue' })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 to-blue-800">
        <LoaderCircle className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 to-blue-800 p-4">
      <Head title="Securite 2FA" />

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">
            {setupMode ? 'Activation 2FA obligatoire' : 'Verification 2FA'}
          </CardTitle>
          <CardDescription>
            {setupMode
              ? 'Pour securiser votre compte, veuillez configurer l\'authentification a deux facteurs'
              : 'Entrez le code de votre application d\'authentification'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {setupMode && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                La double authentification est obligatoire pour acceder a vos dossiers.
                Utilisez une application comme Google Authenticator ou Authy.
              </AlertDescription>
            </Alert>
          )}

          {setupMode && qrCode && (
            <div className="mb-6 flex flex-col items-center space-y-4">
              <div className="rounded-lg border bg-white p-4">
                <img src={qrCode} alt="QR Code" className="h-48 w-48" />
              </div>
              {secret && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Ou entrez ce code manuellement :
                  </p>
                  <code className="mt-1 block rounded bg-muted px-2 py-1 font-mono text-sm">
                    {secret}
                  </code>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code a 6 chiffres</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={data.code}
                onChange={(e) => setData('code', e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                className="text-center text-2xl tracking-widest"
              />
              <InputError message={errors.code} />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={processing || data.code.length !== 6}
            >
              {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {setupMode ? 'Activer et continuer' : 'Verifier'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ClientTotpPage
