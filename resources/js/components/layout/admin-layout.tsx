import { type ReactNode, useMemo } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AdminSidebar } from '@/components/sidebar/admin-sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ADMIN_DASHBOARD, ADMIN_CLIENTS, ADMIN_DOSSIERS, ADMIN_EVENEMENTS, ADMIN_ADMINS, ADMIN_PARAMETRES, ADMIN_DEMANDES_RDV } from '@/app/routes'
import { GlobalSearch } from '@/components/admin/global-search'
import { NotificationsDropdown } from '@/components/admin/notifications-dropdown'
import { usePage } from '@inertiajs/react'
import { UnifiedModalProvider } from '@/contexts/unified-modal-context'
import { BreadcrumbProvider, useBreadcrumb } from '@/contexts/breadcrumb-context'
import { Toaster } from '@/components/ui/sonner'

// Configuration complete des routes avec titres et liens parents
const ROUTE_CONFIG: Record<string, { title: string; href?: string }> = {
  '/admin': { title: 'Tableau de bord', href: ADMIN_DASHBOARD },
  '/admin/dashboard': { title: 'Tableau de bord', href: ADMIN_DASHBOARD },
  '/admin/clients': { title: 'Clients', href: ADMIN_CLIENTS },
  '/admin/dossiers': { title: 'Dossiers', href: ADMIN_DOSSIERS },
  '/admin/evenements': { title: 'Evenements', href: ADMIN_EVENEMENTS },
  '/admin/admins': { title: 'Administrateurs', href: ADMIN_ADMINS },
  '/admin/parametres': { title: 'Parametres', href: ADMIN_PARAMETRES },
  '/admin/demandes-rdv': { title: 'Demandes de RDV', href: ADMIN_DEMANDES_RDV },
}

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
}

function AdminLayoutContent({ children, title, breadcrumbs }: AdminLayoutProps) {
  const { props, url } = usePage<{ pageTitle?: string; breadcrumbs?: { label: string; href?: string }[] }>()
  const { breadcrumbs: contextBreadcrumbs } = useBreadcrumb()

  // Determiner les breadcrumbs a partir de l'URL
  const computedBreadcrumbs = useMemo(() => {
    // Priorite : props > context > calcul automatique
    if (breadcrumbs && breadcrumbs.length > 0) return breadcrumbs
    if (props.breadcrumbs && props.breadcrumbs.length > 0) return props.breadcrumbs
    if (contextBreadcrumbs && contextBreadcrumbs.length > 0) return contextBreadcrumbs

    const basePath = url.split('?')[0]
    const result: { label: string; href?: string }[] = []

    // Correspondance exacte
    if (ROUTE_CONFIG[basePath]) {
      result.push({ label: ROUTE_CONFIG[basePath].title })
      return result
    }

    // Pour les pages de detail (ex: /admin/clients/123)
    const pathParts = basePath.split('/')
    if (pathParts.length >= 4) {
      // Construire le chemin parent
      const parentPath = pathParts.slice(0, 3).join('/')
      if (ROUTE_CONFIG[parentPath]) {
        // Ajouter le lien vers la page parent
        result.push({
          label: ROUTE_CONFIG[parentPath].title,
          href: ROUTE_CONFIG[parentPath].href,
        })
        // Ajouter "Detail" comme dernier element (sera remplace par le contexte)
        result.push({ label: 'Detail' })
      }
    }

    return result
  }, [breadcrumbs, props.breadcrumbs, contextBreadcrumbs, url])

  // Titre de la page (pour les cas ou on n'a pas de breadcrumbs)
  const pageTitle = useMemo(() => {
    if (title) return title
    if (props.pageTitle) return props.pageTitle
    return null
  }, [title, props.pageTitle])

  return (
    <UnifiedModalProvider>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <Toaster />
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={ADMIN_DASHBOARD}>Administration</BreadcrumbLink>
                </BreadcrumbItem>
                {computedBreadcrumbs.map((crumb, index) => (
                  <span key={index} className="flex items-center gap-2">
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {crumb.href ? (
                        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </span>
                ))}
                {computedBreadcrumbs.length === 0 && pageTitle && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>

            {/* Search bar - centered */}
            <div className="flex flex-1 justify-center px-4">
              <GlobalSearch />
            </div>

            {/* Notifications - right side */}
            <div className="flex items-center gap-2">
              <NotificationsDropdown />
            </div>
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </UnifiedModalProvider>
  )
}

// Wrapper avec BreadcrumbProvider
export function AdminLayout({ children, title, breadcrumbs }: AdminLayoutProps) {
  return (
    <BreadcrumbProvider>
      <AdminLayoutContent title={title} breadcrumbs={breadcrumbs}>
        {children}
      </AdminLayoutContent>
    </BreadcrumbProvider>
  )
}

// Fonction pour utiliser AdminLayout comme layout persistant
export function getAdminLayout(page: ReactNode) {
  return <AdminLayout>{page}</AdminLayout>
}

// Re-exporter le hook pour que les pages puissent l'utiliser
export { useBreadcrumb } from '@/contexts/breadcrumb-context'
