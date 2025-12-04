import * as React from 'react'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Calendar,
  Clock,
  Settings,
  UserCog,
  LogOut,
  Scale,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar'
import {
  ADMIN_DASHBOARD,
  ADMIN_CLIENTS,
  ADMIN_DOSSIERS,
  ADMIN_EVENEMENTS,
  ADMIN_DEMANDES_RDV,
  ADMIN_PARAMETRES,
  ADMIN_ADMINS,
} from '@/app/routes'
import { ADMIN_LOGOUT_API } from '@/lib/constants'
import { Link, usePage } from '@inertiajs/react'

const mainNavItems = [
  {
    title: 'Tableau de bord',
    href: ADMIN_DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    title: 'Clients',
    href: ADMIN_CLIENTS,
    icon: Users,
  },
  {
    title: 'Dossiers',
    href: ADMIN_DOSSIERS,
    icon: FolderKanban,
  },
  {
    title: 'Evenements',
    href: ADMIN_EVENEMENTS,
    icon: Calendar,
  },
  {
    title: 'Demandes RDV',
    href: ADMIN_DEMANDES_RDV,
    icon: Clock,
  },
]

const adminNavItems = [
  {
    title: 'Parametres',
    href: ADMIN_PARAMETRES,
    icon: Settings,
  },
  {
    title: 'Administrateurs',
    href: ADMIN_ADMINS,
    icon: UserCog,
  },
]

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { url } = usePage()

  const handleLogout = async () => {
    try {
      await fetch(ADMIN_LOGOUT_API, {
        method: 'POST',
        credentials: 'include',
      })
      window.location.href = '/admin/login'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={ADMIN_DASHBOARD}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Scale className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Cabinet d'Avocats</span>
                  <span className="truncate text-xs text-muted-foreground">Administration</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={url.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={url.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut />
              <span>Deconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
