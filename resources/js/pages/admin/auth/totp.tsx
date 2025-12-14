import { InputError } from '@/components/common/input-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ADMIN_TOTP_VERIFY_API } from '@/lib/constants'
import { ADMIN_DASHBOARD } from '@/app/routes'
import { Head, router, useForm } from '@inertiajs/react'
import { LoaderCircle, Shield, Scale, Lock, Smartphone, KeyRound } from 'lucide-react'
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
    <div className="flex min-h-screen">
      <Head title="Verification 2FA" />

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <Scale className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Cabinet d'Avocats</h1>
              <p className="text-slate-400 text-sm">Administration</p>
            </div>
          </div>

          {/* Security message */}
          <div className="mb-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm mb-6">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
              Verification<br />de securite
            </h2>
            <p className="text-lg text-slate-400 max-w-md">
              Un code unique a ete genere sur votre application d'authentification.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <span className="text-slate-300">Google Authenticator ou Authy</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <span className="text-slate-300">Code temporaire unique</span>
            </div>
          </div>

          {/* Admin badge */}
          <div className="mt-12 flex items-center gap-2 text-sm text-slate-500">
            <Shield className="h-4 w-4" />
            <span>Acces reserve aux administrateurs</span>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/10 rounded-full blur-2xl" />
      </div>

      {/* Right side - TOTP form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Verification 2FA</h1>
              <p className="text-muted-foreground text-sm">Administration</p>
            </div>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Verification</h2>
            <p className="text-muted-foreground mt-2">
              Entrez le code de votre application d'authentification
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                className="text-center text-3xl tracking-[0.5em] h-16 font-mono"
              />
              <InputError message={errors.code} />
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={processing || data.code.length !== 6}
            >
              {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Verifier
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              <a href="/admin/login" className="text-primary font-medium hover:underline">
                Retour a la connexion
              </a>
            </p>
          </div>

          {/* Security badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Code valide pendant 30 secondes</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminTotpPage
