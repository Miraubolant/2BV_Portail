import { AlertCircle } from 'lucide-react'

export const ErrorMessage = ({ message, classes = '' }: { message?: string; classes?: string }) => (
  <div className={`grid grid-cols-1 place-items-center gap-4 p-8 ${classes}`}>
    <AlertCircle className="h-16 w-16 text-muted-foreground" />
    <p className="text-lg scroll-m-20 tracking-tight text-muted-foreground">
      {message ?? 'Erreur lors du chargement des donnees. Veuillez reessayer.'}
    </p>
  </div>
)
