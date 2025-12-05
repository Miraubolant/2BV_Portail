import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '../ui/button'

export const ErrorFallback = ({ error, resetErrorBoundary }: any) => {
  return (
    <div
      className="flex h-screen w-screen flex-col items-center justify-center bg-background"
      role="alert"
    >
      <div className="container max-w-md text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mx-auto">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Une erreur est survenue</h2>
        <p className="mt-2 text-muted-foreground">
          Nous sommes desoles, quelque chose s'est mal passe.
        </p>
        {error?.message && process.env.NODE_ENV === 'development' && (
          <pre className="mt-4 max-w-full overflow-auto rounded-md bg-muted p-4 text-left text-sm text-destructive">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex gap-3 justify-center">
          <Button variant="outline" onClick={resetErrorBoundary}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reessayer
          </Button>
          <Button onClick={() => window.location.assign('/')}>
            <Home className="mr-2 h-4 w-4" />
            Accueil
          </Button>
        </div>
      </div>
    </div>
  )
}
