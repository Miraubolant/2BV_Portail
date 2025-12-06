import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ADMIN_NOTES_API, ADMIN_NOTE_API } from '@/lib/constants'
import {
  StickyNote,
  Plus,
  MoreVertical,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  LoaderCircle,
  User,
  Clock,
  X,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

interface Note {
  id: string
  contenu: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    nom: string
    prenom: string
  }
}

interface DossierNotesProps {
  dossierId: string
}

export function DossierNotes({ dossierId }: DossierNotesProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const response = await fetch(ADMIN_NOTES_API(dossierId), {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setNotes(data)
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
      toast.error('Erreur lors du chargement des notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [dossierId])

  const handleCreate = async () => {
    if (!newNoteContent.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(ADMIN_NOTES_API(dossierId), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenu: newNoteContent }),
      })

      if (response.ok) {
        const note = await response.json()
        setNotes([note, ...notes])
        setNewNoteContent('')
        setIsCreating(false)
        toast.success('Note ajoutee')
      } else {
        toast.error('Erreur lors de la creation')
      }
    } catch (error) {
      console.error('Error creating note:', error)
      toast.error('Erreur lors de la creation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (noteId: string) => {
    if (!editContent.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(ADMIN_NOTE_API(noteId), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenu: editContent }),
      })

      if (response.ok) {
        const updatedNote = await response.json()
        setNotes(notes.map((n) => (n.id === noteId ? updatedNote : n)))
        setEditingNoteId(null)
        setEditContent('')
        toast.success('Note modifiee')
      } else {
        toast.error('Erreur lors de la modification')
      }
    } catch (error) {
      console.error('Error updating note:', error)
      toast.error('Erreur lors de la modification')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTogglePin = async (noteId: string) => {
    try {
      const response = await fetch(`${ADMIN_NOTE_API(noteId)}/pin`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        const updatedNote = await response.json()
        // Re-sort notes (pinned first)
        const updated = notes.map((n) => (n.id === noteId ? updatedNote : n))
        updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        setNotes(updated)
        toast.success(updatedNote.isPinned ? 'Note epinglee' : 'Note desepinglee')
      }
    } catch (error) {
      console.error('Error toggling pin:', error)
      toast.error('Erreur')
    }
  }

  const handleDelete = async () => {
    if (!noteToDelete) return

    try {
      const response = await fetch(ADMIN_NOTE_API(noteToDelete), {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setNotes(notes.filter((n) => n.id !== noteToDelete))
        toast.success('Note supprimee')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleteDialogOpen(false)
      setNoteToDelete(null)
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'A l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`

    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
    }).format(date)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Notes
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
              <StickyNote className="h-5 w-5" />
              Notes ({notes.length})
            </CardTitle>
            {!isCreating && (
              <Button size="sm" onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New note form */}
          {isCreating && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <Textarea
                placeholder="Ecrivez votre note..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="min-h-[100px] resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false)
                    setNewNoteContent('')
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={!newNoteContent.trim() || submitting}
                >
                  {submitting ? (
                    <LoaderCircle className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </div>
          )}

          {/* Notes list */}
          {notes.length === 0 && !isCreating ? (
            <div className="text-center py-12 text-muted-foreground">
              <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Aucune note</p>
              <p className="text-sm mt-1">Ajoutez des notes pour ce dossier</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`border rounded-lg p-4 ${
                    note.isPinned ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : 'bg-background'
                  }`}
                >
                  {editingNoteId === note.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px] resize-none"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingNoteId(null)
                            setEditContent('')
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdate(note.id)}
                          disabled={!editContent.trim() || submitting}
                        >
                          {submitting ? (
                            <LoaderCircle className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {note.isPinned && (
                            <Badge variant="outline" className="mb-2 text-amber-600 border-amber-300">
                              <Pin className="h-3 w-3 mr-1" />
                              Epinglee
                            </Badge>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{note.contenu}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTogglePin(note.id)}>
                              {note.isPinned ? (
                                <>
                                  <PinOff className="h-4 w-4 mr-2" />
                                  Desepingler
                                </>
                              ) : (
                                <>
                                  <Pin className="h-4 w-4 mr-2" />
                                  Epingler
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingNoteId(note.id)
                                setEditContent(note.contenu)
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setNoteToDelete(note.id)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{note.createdBy.prenom} {note.createdBy.nom}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatRelativeTime(note.createdAt)}</span>
                        </div>
                        {note.updatedAt !== note.createdAt && (
                          <span className="italic">(modifiee)</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la note ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. La note sera definitivement supprimee.
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
