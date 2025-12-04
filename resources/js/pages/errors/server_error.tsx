import { BASE_ROUTE } from '@/app/routes'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { HomeIcon, AlertTriangle } from 'lucide-react'

export default function ServerError(props: { error: { message?: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">500</h1>
          <h2 className="mt-2 text-xl font-semibold text-muted-foreground">
            Erreur serveur
          </h2>
          <p className="mt-4 text-muted-foreground">
            Une erreur inattendue s'est produite. Veuillez reessayer plus tard.
          </p>
          {props.error?.message && process.env.NODE_ENV === 'development' && (
            <pre className="mt-4 max-w-full overflow-auto rounded-md bg-muted p-4 text-left text-sm">
              {props.error.message}
            </pre>
          )}
          <Button className="mt-8 h-12 rounded-full" variant="default" asChild>
            <Link href={BASE_ROUTE} className="flex items-center gap-2" replace>
              <HomeIcon className="h-4 w-4" />
              Retour a l'accueil
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
