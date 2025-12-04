import { BASE_ROUTE } from '@/app/routes'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { HomeIcon, FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">404</h1>
          <h2 className="mt-2 text-xl font-semibold text-muted-foreground">
            Page introuvable
          </h2>
          <p className="mt-4 text-muted-foreground">
            La page que vous recherchez n'existe pas ou a ete deplacee.
          </p>
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
