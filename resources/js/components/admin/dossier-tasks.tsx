import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { ADMIN_TASKS_API, ADMIN_TASK_API, ADMIN_RESPONSABLES_API } from '@/lib/constants'
import {
  CheckSquare,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  LoaderCircle,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  XCircle,
  Calendar,
  Bell,
} from 'lucide-react'
import { toast } from 'sonner'

interface Task {
  id: string
  titre: string
  description: string | null
  priorite: 'basse' | 'normale' | 'haute' | 'urgente'
  statut: 'a_faire' | 'en_cours' | 'terminee' | 'annulee'
  dateEcheance: string | null
  rappelDate: string | null
  completedAt: string | null
  createdAt: string
  createdBy: { id: string; nom: string; prenom: string }
  assignedTo: { id: string; nom: string; prenom: string } | null
}

interface Admin {
  id: string
  nom: string
  prenom: string
}

interface DossierTasksProps {
  dossierId: string
}

const prioriteColors: Record<string, string> = {
  basse: 'bg-gray-100 text-gray-700 border-gray-300',
  normale: 'bg-blue-100 text-blue-700 border-blue-300',
  haute: 'bg-orange-100 text-orange-700 border-orange-300',
  urgente: 'bg-red-100 text-red-700 border-red-300',
}

const prioriteLabels: Record<string, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'Urgente',
}

const statutIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  a_faire: Circle,
  en_cours: Clock,
  terminee: CheckCircle2,
  annulee: XCircle,
}

const statutLabels: Record<string, string> = {
  a_faire: 'A faire',
  en_cours: 'En cours',
  terminee: 'Terminee',
  annulee: 'Annulee',
}

export function DossierTasks({ dossierId }: DossierTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showCompleted, setShowCompleted] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    priorite: 'normale' as Task['priorite'],
    assignedToId: '',
    dateEcheance: '',
    rappelDate: '',
  })

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const response = await fetch(ADMIN_TASKS_API(dossierId), { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Erreur lors du chargement des taches')
    } finally {
      setLoading(false)
    }
  }

  const fetchAdmins = async () => {
    try {
      const response = await fetch(ADMIN_RESPONSABLES_API, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setAdmins(data)
      }
    } catch (error) {
      console.error('Error fetching admins:', error)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchAdmins()
  }, [dossierId])

  const resetForm = () => {
    setFormData({
      titre: '',
      description: '',
      priorite: 'normale',
      assignedToId: '',
      dateEcheance: '',
      rappelDate: '',
    })
  }

  const handleCreate = async () => {
    if (!formData.titre.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(ADMIN_TASKS_API(dossierId), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignedToId: formData.assignedToId || null,
          dateEcheance: formData.dateEcheance || null,
          rappelDate: formData.rappelDate || null,
        }),
      })

      if (response.ok) {
        const task = await response.json()
        setTasks([task, ...tasks])
        setCreateModalOpen(false)
        resetForm()
        toast.success('Tache creee')
      } else {
        toast.error('Erreur lors de la creation')
      }
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Erreur lors de la creation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedTask || !formData.titre.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(ADMIN_TASK_API(selectedTask.id), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignedToId: formData.assignedToId || null,
          dateEcheance: formData.dateEcheance || null,
          rappelDate: formData.rappelDate || null,
        }),
      })

      if (response.ok) {
        const updatedTask = await response.json()
        setTasks(tasks.map((t) => (t.id === selectedTask.id ? updatedTask : t)))
        setEditModalOpen(false)
        setSelectedTask(null)
        resetForm()
        toast.success('Tache modifiee')
      } else {
        toast.error('Erreur lors de la modification')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Erreur lors de la modification')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleComplete = async (task: Task) => {
    const endpoint = task.statut === 'terminee' ? 'reopen' : 'complete'
    try {
      const response = await fetch(`${ADMIN_TASK_API(task.id)}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        const updatedTask = await response.json()
        setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)))
        toast.success(endpoint === 'complete' ? 'Tache terminee' : 'Tache rouverte')
      }
    } catch (error) {
      console.error('Error toggling task:', error)
      toast.error('Erreur')
    }
  }

  const handleDelete = async () => {
    if (!selectedTask) return

    try {
      const response = await fetch(ADMIN_TASK_API(selectedTask.id), {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setTasks(tasks.filter((t) => t.id !== selectedTask.id))
        toast.success('Tache supprimee')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleteDialogOpen(false)
      setSelectedTask(null)
    }
  }

  const openEditModal = (task: Task) => {
    setSelectedTask(task)
    setFormData({
      titre: task.titre,
      description: task.description || '',
      priorite: task.priorite,
      assignedToId: task.assignedTo?.id || '',
      dateEcheance: task.dateEcheance ? task.dateEcheance.split('T')[0] : '',
      rappelDate: task.rappelDate ? task.rappelDate.split('T')[0] : '',
    })
    setEditModalOpen(true)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(dateStr))
  }

  const isOverdue = (task: Task) => {
    if (!task.dateEcheance || task.statut === 'terminee' || task.statut === 'annulee') return false
    return new Date(task.dateEcheance) < new Date()
  }

  const filteredTasks = showCompleted
    ? tasks
    : tasks.filter((t) => t.statut !== 'terminee' && t.statut !== 'annulee')

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Taches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Taches ({filteredTasks.length})
            </CardTitle>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={showCompleted}
                  onCheckedChange={(checked) => setShowCompleted(checked === true)}
                />
                Afficher terminees
              </label>
              <Button size="sm" onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Aucune tache</p>
              <p className="text-sm mt-1">Ajoutez des taches pour ce dossier</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => {
                const StatutIcon = statutIcons[task.statut]
                const overdue = isOverdue(task)

                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      task.statut === 'terminee'
                        ? 'bg-muted/30 opacity-60'
                        : overdue
                          ? 'bg-red-50 dark:bg-red-950/20 border-red-200'
                          : 'bg-background'
                    }`}
                  >
                    <Checkbox
                      checked={task.statut === 'terminee'}
                      onCheckedChange={() => handleToggleComplete(task)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`font-medium ${task.statut === 'terminee' ? 'line-through' : ''}`}>
                            {task.titre}
                          </p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(task)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedTask(task)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className={prioriteColors[task.priorite]}>
                          {prioriteLabels[task.priorite]}
                        </Badge>
                        {task.dateEcheance && (
                          <Badge
                            variant="outline"
                            className={overdue ? 'text-red-600 border-red-300' : ''}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(task.dateEcheance)}
                            {overdue && <AlertCircle className="h-3 w-3 ml-1" />}
                          </Badge>
                        )}
                        {task.rappelDate && (
                          <Badge variant="outline" className="text-purple-600 border-purple-300">
                            <Bell className="h-3 w-3 mr-1" />
                            {formatDate(task.rappelDate)}
                          </Badge>
                        )}
                        {task.assignedTo && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assignedTo.prenom} {task.assignedTo.nom}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle tache</DialogTitle>
            <DialogDescription>Creez une nouvelle tache pour ce dossier</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                placeholder="Titre de la tache"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description optionnelle"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priorite</Label>
                <Select
                  value={formData.priorite}
                  onValueChange={(value: Task['priorite']) => setFormData({ ...formData, priorite: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">Basse</SelectItem>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigner a</Label>
                <Select
                  value={formData.assignedToId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, assignedToId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non assigne</SelectItem>
                    {admins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.prenom} {admin.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date d'echeance</Label>
                <Input
                  type="date"
                  value={formData.dateEcheance}
                  onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })}
                />
              </div>
              <div>
                <Label>Date de rappel</Label>
                <Input
                  type="date"
                  value={formData.rappelDate}
                  onChange={(e) => setFormData({ ...formData, rappelDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={!formData.titre.trim() || submitting}>
              {submitting ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" /> : null}
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la tache</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priorite</Label>
                <Select
                  value={formData.priorite}
                  onValueChange={(value: Task['priorite']) => setFormData({ ...formData, priorite: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">Basse</SelectItem>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigner a</Label>
                <Select
                  value={formData.assignedToId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, assignedToId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non assigne</SelectItem>
                    {admins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.prenom} {admin.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date d'echeance</Label>
                <Input
                  type="date"
                  value={formData.dateEcheance}
                  onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })}
                />
              </div>
              <div>
                <Label>Date de rappel</Label>
                <Input
                  type="date"
                  value={formData.rappelDate}
                  onChange={(e) => setFormData({ ...formData, rappelDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.titre.trim() || submitting}>
              {submitting ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la tache ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. La tache sera definitivement supprimee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
