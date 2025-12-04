import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/components/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ADMIN_DOSSIERS_API, formatDate } from '@/lib/constants'
import { ADMIN_DOSSIERS } from '@/app/routes'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Edit,
  FileText,
  User,
  LoaderCircle,
  Plus,
  Save,
  Calendar,
  Gavel,
  Info,
  StickyNote,
} from 'lucide-react'

interface Dossier {
  id: string
  reference: string
  intitule: string
  description: string | null
  statut: string
  typeAffaire: string | null
  dateOuverture: string | null
  dateCloture: string | null
  honorairesEstimes: number | null
  honorairesFactures: number | null
  juridiction: string | null
  numeroRg: string | null
  adversaireNom: string | null
  adversaireAvocat: string | null
  notesInternes: string | null
  createdAt: string
  client: {
    id: string
    nom: string
    prenom: string
    email: string
  }
  evenements?: any[]
  documents?: any[]
}

const statutLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  nouveau: { label: 'Nouveau', variant: 'default' },
  en_cours: { label: 'En cours', variant: 'secondary' },
  en_attente: { label: 'En attente', variant: 'outline' },
  audience_prevue: { label: 'Audience prevue', variant: 'secondary' },
  en_delibere: { label: 'En delibere', variant: 'outline' },
  cloture_gagne: { label: 'Gagne', variant: 'default' },
  cloture_perdu: { label: 'Perdu', variant: 'destructive' },
  cloture_transaction: { label: 'Transaction', variant: 'secondary' },
  archive: { label: 'Archive', variant: 'outline' },
}

const DossierShowPage = () => {
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Dossier>>({})
  const [activeTab, setActiveTab] = useState('documents')

  const dossierId = window.location.pathname.split('/').pop()

  useEffect(() => {
    fetchDossier()
  }, [dossierId])

  const fetchDossier = async () => {
    try {
      const response = await fetch(`${ADMIN_DOSSIERS_API}/${dossierId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setDossier(result)
        setFormData(result)
      }
    } catch (error) {
      console.error('Error fetching dossier:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${ADMIN_DOSSIERS_API}/${dossierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        const updated = await response.json()
        setDossier(updated)
        setEditMode(false)
      }
    } catch (error) {
      console.error('Error updating dossier:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Dossier">
        <Head title="Dossier" />
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    )
  }

  if (!dossier) {
    return (
      <AdminLayout title="Dossier non trouve">
        <Head title="Dossier non trouve" />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ce dossier n'existe pas</p>
          <Button variant="link" asChild>
            <Link href={ADMIN_DOSSIERS}>Retour a la liste</Link>
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const statutConfig = statutLabels[dossier.statut] || { label: dossier.statut, variant: 'outline' }

  return (
    <AdminLayout
      title={dossier.reference}
      breadcrumbs={[
        { label: 'Dossiers', href: ADMIN_DOSSIERS },
        { label: dossier.reference },
      ]}
    >
      <Head title={dossier.reference} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href={ADMIN_DOSSIERS}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{dossier.reference}</h1>
              <p className="text-muted-foreground">{dossier.intitule}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statutConfig.variant}>{statutConfig.label}</Badge>
                {dossier.typeAffaire && (
                  <Badge variant="outline">{dossier.typeAffaire}</Badge>
                )}
              </div>
            </div>
          </div>
          {activeTab === 'infos' && (
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button variant="outline" onClick={() => { setEditMode(false); setFormData(dossier) }}>
                    Annuler
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              )}
            </div>
          )}
        </div>

        <Tabs defaultValue="documents" onValueChange={(value) => { setActiveTab(value); if (value !== 'infos') setEditMode(false) }}>
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="infos">Informations</TabsTrigger>
          </TabsList>

          <TabsContent value="infos" className="space-y-6 mt-6">
            {/* Section principale */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Colonne gauche - Informations principales */}
              <div className="lg:col-span-2 space-y-6">
                {/* Informations generales */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Info className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Informations generales</CardTitle>
                        <CardDescription>Details principaux du dossier</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2 space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Intitule</Label>
                          <Input
                            value={formData.intitule || ''}
                            onChange={(e) => setFormData({ ...formData, intitule: e.target.value })}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Statut</Label>
                          <Select
                            value={formData.statut || ''}
                            onValueChange={(v) => setFormData({ ...formData, statut: v })}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statutLabels).map(([key, { label }]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type d'affaire</Label>
                          <Input
                            value={formData.typeAffaire || ''}
                            onChange={(e) => setFormData({ ...formData, typeAffaire: e.target.value })}
                            placeholder="Civil, Penal, Commercial..."
                            className="bg-background"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-3">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Intitule</p>
                          <p className="font-medium">{dossier.intitule}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Statut</p>
                          <Badge variant={statutConfig.variant} className="mt-1">{statutConfig.label}</Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Type d'affaire</p>
                          <p className="font-medium">{dossier.typeAffaire || '-'}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Procedure */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Gavel className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Procedure judiciaire</CardTitle>
                        <CardDescription>Informations sur la procedure en cours</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Juridiction</Label>
                          <Input
                            value={formData.juridiction || ''}
                            onChange={(e) => setFormData({ ...formData, juridiction: e.target.value })}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Numero RG</Label>
                          <Input
                            value={formData.numeroRg || ''}
                            onChange={(e) => setFormData({ ...formData, numeroRg: e.target.value })}
                            className="bg-background"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Juridiction</p>
                          <p className="font-medium">{dossier.juridiction || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Numero RG</p>
                          <p className="font-medium font-mono">{dossier.numeroRg || '-'}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Description & Notes */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-lg">Description</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {editMode ? (
                        <Textarea
                          value={formData.description || ''}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={5}
                          placeholder="Description du dossier..."
                          className="bg-background resize-none"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                          {dossier.description || 'Aucune description'}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <StickyNote className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-lg">Notes internes</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {editMode ? (
                        <Textarea
                          value={formData.notesInternes || ''}
                          onChange={(e) => setFormData({ ...formData, notesInternes: e.target.value })}
                          rows={5}
                          placeholder="Notes internes..."
                          className="bg-background resize-none"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                          {dossier.notesInternes || 'Aucune note'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Colonne droite - Informations secondaires */}
              <div className="space-y-6">
                {/* Client */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg">Client</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-semibold">
                        {dossier.client.prenom[0]}{dossier.client.nom[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/admin/clients/${dossier.client.id}`}
                          className="font-semibold hover:text-primary transition-colors truncate block"
                        >
                          {dossier.client.prenom} {dossier.client.nom}
                        </Link>
                        <p className="text-sm text-muted-foreground truncate">{dossier.client.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dates */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg">Dates cles</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date d'ouverture</Label>
                          <Input
                            type="date"
                            value={formData.dateOuverture || ''}
                            onChange={(e) => setFormData({ ...formData, dateOuverture: e.target.value })}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date de cloture</Label>
                          <Input
                            type="date"
                            value={formData.dateCloture || ''}
                            onChange={(e) => setFormData({ ...formData, dateCloture: e.target.value })}
                            className="bg-background"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-sm text-muted-foreground">Ouverture</span>
                          <span className="font-medium">{dossier.dateOuverture ? formatDate(dossier.dateOuverture) : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-muted-foreground">Cloture</span>
                          <span className="font-medium">{dossier.dateCloture ? formatDate(dossier.dateCloture) : '-'}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents
                  </CardTitle>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dossier.documents && dossier.documents.length > 0 ? (
                  <div className="space-y-2">
                    {dossier.documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.nom}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(doc.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Telecharger
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun document
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}

export default DossierShowPage
