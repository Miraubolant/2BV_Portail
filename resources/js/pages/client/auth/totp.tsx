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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <LoaderCircle className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-8 sm:p-4">
      <Head title="Securite 2FA" />

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center p-4 sm:p-6">
          <div className="mx-auto mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            {setupMode ? 'Activation 2FA obligatoire' : 'Verification 2FA'}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {setupMode
              ? 'Pour securiser votre compte, veuillez configurer l\'authentification a deux facteurs'
              : 'Entrez le code de votre application d\'authentification'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {setupMode && (
            <Alert className="mb-3 sm:mb-4">
              <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                La double authentification est obligatoire pour acceder a vos dossiers.
                Utilisez une application comme Google Authenticator ou Authy.
              </AlertDescription>
            </Alert>
          )}

          {setupMode && qrCode && (
            <div className="mb-4 sm:mb-6 flex flex-col items-center space-y-3 sm:space-y-4">
              <div className="rounded-lg border bg-white p-3 sm:p-4">
                <img src={qrCode} alt="QR Code" className="h-36 w-36 sm:h-48 sm:w-48" />
              </div>
              {secret && (
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Ou entrez ce code manuellement :
                  </p>
                  <code className="mt-1 block rounded bg-muted px-2 py-1 font-mono text-[10px] sm:text-sm break-all">
                    {secret}
                  </code>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="code" className="text-xs sm:text-sm">Code a 6 chiffres</Label>
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
                className="text-center text-xl sm:text-2xl tracking-widest h-12 sm:h-14"
              />
              <InputError message={errors.code} />
            </div>

            <Button
              type="submit"
              className="w-full h-9 sm:h-10 text-sm"
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
