import { ReactNode } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { ClientSidebar } from '@/components/sidebar/client-sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { CLIENT_DASHBOARD } from '@/app/routes'
import { usePage } from '@inertiajs/react'

interface ClientLayoutProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
}

export function ClientLayout({ children, title, breadcrumbs }: ClientLayoutProps) {
  // Utiliser les props de la page via usePage() si disponibles
  const { props } = usePage<{ pageTitle?: string; breadcrumbs?: { label: string; href?: string }[] }>()
  const pageTitle = title || props.pageTitle || 'Espace Client'
  const pageBreadcrumbs = breadcrumbs || props.breadcrumbs || []

  return (
    <SidebarProvider>
      <ClientSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={CLIENT_DASHBOARD}>Espace Client</BreadcrumbLink>
              </BreadcrumbItem>
              {pageBreadcrumbs.map((crumb, index) => (
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
              {pageBreadcrumbs.length === 0 && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Fonction pour utiliser ClientLayout comme layout persistant
export function getClientLayout(page: ReactNode) {
  return <ClientLayout>{page}</ClientLayout>
}
