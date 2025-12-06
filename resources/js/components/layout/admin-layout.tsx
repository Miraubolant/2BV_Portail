import { ReactNode } from 'react'
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
import { ADMIN_DASHBOARD } from '@/app/routes'
import { GlobalSearch } from '@/components/admin/global-search'
import { NotificationsDropdown } from '@/components/admin/notifications-dropdown'
import { usePage } from '@inertiajs/react'
import { UnifiedModalProvider } from '@/contexts/unified-modal-context'

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
}

interface PageProps {
  pageTitle?: string
  breadcrumbs?: { label: string; href?: string }[]
}

export function AdminLayout({ children, title, breadcrumbs }: AdminLayoutProps) {
  // Utiliser les props de la page via usePage() si disponibles
  const { props } = usePage<{ pageTitle?: string; breadcrumbs?: { label: string; href?: string }[] }>()
  const pageTitle = title || props.pageTitle || 'Administration'
  const pageBreadcrumbs = breadcrumbs || props.breadcrumbs || []

  return (
    <UnifiedModalProvider>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={ADMIN_DASHBOARD}>Administration</BreadcrumbLink>
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

// Fonction pour utiliser AdminLayout comme layout persistant
export function getAdminLayout(page: ReactNode) {
  return <AdminLayout>{page}</AdminLayout>
}
