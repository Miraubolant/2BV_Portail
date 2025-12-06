import * as React from 'react'
import { useEffect, useState, useCallback } from 'react'
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
  ChevronsUpDown,
  Shield,
  User,
  Star,
  X,
} from 'lucide-react'
import { useFavorisUpdates, emitFavorisUpdated } from '@/hooks/use-favoris'

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
  SidebarMenuAction,
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
import { ADMIN_LOGOUT_API, ADMIN_FAVORIS_API } from '@/lib/constants'
import { Link, usePage } from '@inertiajs/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

interface UserInfo {
  email: string
  username: string | null
  nom: string
  prenom: string
  role: 'super_admin' | 'admin'
}

interface Favori {
  id: string
  type: 'dossier' | 'client'
  favoriId: string
  label: string
  sublabel: string | null
  clientName?: string | null
}

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { url } = usePage()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [favoris, setFavoris] = useState<Favori[]>([])

  const fetchFavoris = useCallback(async () => {
    try {
      const response = await fetch(ADMIN_FAVORIS_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setFavoris(data || [])
      }
    } catch (error) {
      console.error('Error fetching favoris:', error)
    }
  }, [])

  const removeFavori = async (favoriId: string) => {
    try {
      const response = await fetch(`${ADMIN_FAVORIS_API}/${favoriId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        setFavoris((prev) => prev.filter((f) => f.id !== favoriId))
      }
    } catch (error) {
      console.error('Error removing favori:', error)
    }
  }

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/admin/auth/me', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setUserInfo(data.user)
          }
        } else if (response.status === 401) {
          // Non authentifie - rediriger vers login
          window.location.href = '/admin/login'
        }
      } catch (error) {
        console.error('Error fetching user info:', error)
      }
    }
    fetchUserInfo()
    fetchFavoris()
  }, [fetchFavoris])

  // Listen for favoris updates from other components
  useFavorisUpdates(fetchFavoris)

  const isSuperAdmin = userInfo?.role === 'super_admin'

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

        {favoris.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <Star className="h-3 w-3 mr-1" />
              Favoris
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {favoris.map((favori) => (
                  <SidebarMenuItem key={favori.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={url === (favori.type === 'dossier' ? `/admin/dossiers/${favori.favoriId}` : `/admin/clients/${favori.favoriId}`)}
                      tooltip={favori.sublabel || favori.label}
                    >
                      <Link href={favori.type === 'dossier' ? `/admin/dossiers/${favori.favoriId}` : `/admin/clients/${favori.favoriId}`}>
                        {favori.type === 'dossier' ? (
                          <FolderKanban className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                        <span className="truncate">{favori.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={() => removeFavori(favori.id)}
                      className="opacity-0 group-hover/menu-item:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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
                  <div className={`flex aspect-square size-8 items-center justify-center rounded-lg ${isSuperAdmin ? 'bg-primary' : 'bg-secondary'}`}>
                    {isSuperAdmin ? (
                      <Shield className="size-4 text-primary-foreground" />
                    ) : (
                      <User className="size-4 text-secondary-foreground" />
                    )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {userInfo?.username || `${userInfo?.prenom} ${userInfo?.nom}`}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {userInfo?.email}
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
                    <div className={`flex aspect-square size-8 items-center justify-center rounded-lg ${isSuperAdmin ? 'bg-primary' : 'bg-secondary'}`}>
                      {isSuperAdmin ? (
                        <Shield className="size-4 text-primary-foreground" />
                      ) : (
                        <User className="size-4 text-secondary-foreground" />
                      )}
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {userInfo?.username || `${userInfo?.prenom} ${userInfo?.nom}`}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {isSuperAdmin ? 'Super Administrateur' : 'Administrateur'}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={ADMIN_PARAMETRES} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Parametres
                  </Link>
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href={ADMIN_ADMINS} className="cursor-pointer">
                      <UserCog className="mr-2 h-4 w-4" />
                      Administrateurs
                    </Link>
                  </DropdownMenuItem>
                )}
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
