import { InputError } from '@/components/common/input-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { CLIENT_LOGIN_API } from '@/lib/constants'
import { CLIENT_DASHBOARD, AUTH_CLIENT_TOTP } from '@/app/routes'
import { Head, router, useForm } from '@inertiajs/react'
import { EyeIcon, EyeOffIcon, LoaderCircle, Scale } from 'lucide-react'
import { useState } from 'react'

type LoginForm = {
  email: string
  password: string
  rememberMe: boolean
}

const ClientLoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data, setData, processing, reset } = useForm<LoginForm>({
    email: '',
    password: '',
    rememberMe: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      const response = await fetch(CLIENT_LOGIN_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.errors) {
          setErrors(result.errors)
        } else {
          setErrors({ email: result.message || 'Identifiants incorrects' })
        }
        reset('password')
        return
      }

      // TOTP is mandatory for clients
      if (result.requireTotp || result.requireTotpSetup) {
        router.visit(AUTH_CLIENT_TOTP)
      } else {
        router.visit(CLIENT_DASHBOARD)
      }
    } catch (error) {
      setErrors({ email: 'Une erreur est survenue' })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Head title="Connexion Espace Client" />

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Scale className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Espace Client</CardTitle>
          <CardDescription>
            Connectez-vous pour acceder a vos dossiers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.fr"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
              <InputError message={errors.email} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <InputError message={errors.password} />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={data.rememberMe}
                onCheckedChange={(checked) => setData('rememberMe', checked as boolean)}
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                Se souvenir de moi
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={processing}>
              {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <a href="/admin/login" className="hover:text-primary hover:underline">
              Acces administration
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ClientLoginPage
