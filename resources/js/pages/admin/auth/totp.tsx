import { InputError } from '@/components/common/input-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ADMIN_TOTP_VERIFY_API } from '@/lib/constants'
import { ADMIN_DASHBOARD } from '@/app/routes'
import { Head, router, useForm } from '@inertiajs/react'
import { LoaderCircle, Shield } from 'lucide-react'
import { useState } from 'react'

const AdminTotpPage = () => {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data, setData, processing } = useForm({
    code: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      const response = await fetch(ADMIN_TOTP_VERIFY_API, {
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

      router.visit(ADMIN_DASHBOARD)
    } catch (error) {
      setErrors({ code: 'Une erreur est survenue' })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Head title="Verification 2FA" />

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Verification 2FA</CardTitle>
          <CardDescription>
            Entrez le code de votre application d'authentification
          </CardDescription>
        </CardHeader>
        <CardContent>
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

            <Button type="submit" className="w-full" disabled={processing || data.code.length !== 6}>
              {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Verifier
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminTotpPage
