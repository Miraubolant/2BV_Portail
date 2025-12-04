import * as React from 'react'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  FolderKanban,
  Clock,
  LogOut,
  Scale,
  ChevronsUpDown,
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
  CLIENT_DASHBOARD,
  CLIENT_DOSSIERS,
  CLIENT_DEMANDES_RDV,
} from '@/app/routes'
import { CLIENT_LOGOUT_API, CLIENT_ME_API } from '@/lib/constants'
import { Link, usePage } from '@inertiajs/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navItems = [
  {
    title: 'Tableau de bord',
    href: CLIENT_DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    title: 'Mes dossiers',
    href: CLIENT_DOSSIERS,
    icon: FolderKanban,
  },
  {
    title: 'Demandes de RDV',
    href: CLIENT_DEMANDES_RDV,
    icon: Clock,
  },
]

interface ClientInfo {
  id: string
  email: string
  nom: string
  prenom: string
  type: string
}

export function ClientSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { url } = usePage()
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)

  useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        const response = await fetch(CLIENT_ME_API, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setClientInfo(data.user)
          }
        }
      } catch (error) {
        console.error('Error fetching client info:', error)
      }
    }
    fetchClientInfo()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch(CLIENT_LOGOUT_API, {
        method: 'POST',
        credentials: 'include',
      })
      window.location.href = '/client/login'
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
              <Link href={CLIENT_DASHBOARD}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Scale className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Cabinet d'Avocats</span>
                  <span className="truncate text-xs text-muted-foreground">Espace Client</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      {clientInfo?.prenom?.[0]}{clientInfo?.nom?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {clientInfo?.prenom} {clientInfo?.nom}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {clientInfo?.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                        {clientInfo?.prenom?.[0]}{clientInfo?.nom?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {clientInfo?.prenom} {clientInfo?.nom}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">Client</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  Deconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
