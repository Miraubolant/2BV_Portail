import { InputError } from '@/components/common/input-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { CLIENT_LOGIN_API } from '@/lib/constants'
import { CLIENT_DASHBOARD, AUTH_CLIENT_TOTP } from '@/app/routes'
import { Head, router, useForm } from '@inertiajs/react'
import { EyeIcon, EyeOffIcon, LoaderCircle, Scale, Shield, FileText, Calendar, Lock } from 'lucide-react'
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

  const features = [
    { icon: FileText, text: 'Acces a vos documents' },
    { icon: Calendar, text: 'Suivi de vos rendez-vous' },
    { icon: Shield, text: 'Espace securise' },
  ]

  return (
    <div className="flex min-h-screen">
      <Head title="Connexion Espace Client" />

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-primary-foreground">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Scale className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Cabinet d'Avocats</h1>
              <p className="text-primary-foreground/80 text-sm">Espace Client</p>
            </div>
          </div>

          {/* Welcome text */}
          <div className="mb-10">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
              Bienvenue sur<br />votre espace client
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              Accedez a vos dossiers, consultez vos documents et suivez l'avancement de vos affaires en toute securite.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="text-primary-foreground/90">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full" />
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Cabinet d'Avocats</h1>
              <p className="text-muted-foreground text-sm">Espace Client</p>
            </div>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Connexion</h2>
            <p className="text-muted-foreground mt-2">
              Entrez vos identifiants pour acceder a votre espace
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.fr"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                required
                autoFocus
                autoComplete="email"
                className="h-11"
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
                  className="h-11 pr-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-foreground"
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

            <div className="flex items-center justify-between">
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
            </div>

            <Button type="submit" className="w-full h-11" disabled={processing}>
              {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              Vous etes administrateur ?{' '}
              <a href="/admin/login" className="text-primary font-medium hover:underline">
                Acces administration
              </a>
            </p>
          </div>

          {/* Security badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Connexion securisee SSL</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientLoginPage
