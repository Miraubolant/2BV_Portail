import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/components/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ADMIN_ADMINS_API, formatDate, formatDateTime } from '@/lib/constants'
import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Shield,
  User,
  Edit,
  Trash2,
  LoaderCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Admin {
  id: string
  nom: string
  prenom: string
  email: string
  role: 'super_admin' | 'admin'
  actif: boolean
  totpEnabled: boolean
  lastLogin: string | null
  createdAt: string
}

const AdminsPage = () => {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    role: 'admin' as const,
  })
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(ADMIN_ADMINS_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setAdmins(result.data || result || [])
      }
    } catch (error) {
      console.error('Error fetching admins:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    try {
      const response = await fetch(ADMIN_ADMINS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        const result = await response.json()
        if (result.generatedPassword) {
          setGeneratedPassword(result.generatedPassword)
        } else {
          setShowCreateModal(false)
          fetchAdmins()
        }
        setFormData({ nom: '', prenom: '', email: '', role: 'admin' })
      }
    } catch (error) {
      console.error('Error creating admin:', error)
    } finally {
      setProcessing(false)
    }
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setGeneratedPassword(null)
    if (generatedPassword) {
      fetchAdmins()
    }
  }

  const handleToggleStatus = async (id: string) => {
    try {
      const response = await fetch(`${ADMIN_ADMINS_API}/${id}/toggle-status`, {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        fetchAdmins()
      }
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  const handleDelete = async (id: string) => {
    setProcessing(true)
    try {
      const response = await fetch(`${ADMIN_ADMINS_API}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        setShowDeleteDialog(null)
        fetchAdmins()
      }
    } catch (error) {
      console.error('Error deleting admin:', error)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <AdminLayout title="Administrateurs">
      <Head title="Administrateurs" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Administrateurs</h1>
            <p className="text-muted-foreground">
              Gestion des comptes administrateurs
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel administrateur
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {admins.map((admin) => (
              <Card key={admin.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-2 ${admin.role === 'super_admin' ? 'bg-primary' : 'bg-secondary'}`}>
                        {admin.role === 'super_admin' ? (
                          <Shield className="h-5 w-5 text-primary-foreground" />
                        ) : (
                          <User className="h-5 w-5 text-secondary-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {admin.prenom} {admin.nom}
                        </h3>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                      </div>
                    </div>
                    <Badge variant={admin.actif ? 'default' : 'destructive'}>
                      {admin.actif ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role</span>
                      <Badge variant="outline">
                        {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">2FA</span>
                      <Badge variant={admin.totpEnabled ? 'default' : 'secondary'}>
                        {admin.totpEnabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Derniere connexion</span>
                      <span>{admin.lastLogin ? formatDateTime(admin.lastLogin) : 'Jamais'}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(admin.id)}
                    >
                      {admin.actif ? (
                        <>
                          <ToggleRight className="mr-2 h-4 w-4" />
                          Desactiver
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="mr-2 h-4 w-4" />
                          Activer
                        </>
                      )}
                    </Button>
                    {admin.role !== 'super_admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteDialog(admin.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={closeCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel administrateur</DialogTitle>
            <DialogDescription>
              {generatedPassword
                ? 'Administrateur cree avec succes'
                : 'Creer un nouveau compte administrateur'}
            </DialogDescription>
          </DialogHeader>
          {generatedPassword ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Mot de passe genere (a communiquer a l'administrateur) :
                </p>
                <p className="font-mono text-lg font-bold text-green-700">
                  {generatedPassword}
                </p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Notez ce mot de passe, il ne sera plus affiche.
              </p>
              <DialogFooter>
                <Button onClick={closeCreateModal}>Fermer</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prenom *</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Un mot de passe sera genere automatiquement.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeCreateModal}>
                  Annuler
                </Button>
                <Button type="submit" disabled={processing}>
                  {processing ? 'Creation...' : 'Creer'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet administrateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
              disabled={processing}
            >
              {processing ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}

export default AdminsPage
