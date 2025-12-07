import { useState, useEffect, memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  ADMIN_CLIENTS_API,
  ADMIN_DOSSIERS_API,
  ADMIN_EVENEMENTS_API,
  ADMIN_RESPONSABLES_API,
} from '@/lib/constants'
import {
  UserPlus,
  FolderPlus,
  CalendarPlus,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Shield,
  FileText,
  Calendar,
  Clock,
  FolderOpen,
  Search,
  Briefcase,
  Scale,
  CheckCircle2,
  LoaderCircle,
  AlertCircle,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Types
interface ClientOption {
  id: string
  nom: string
  prenom: string
}

interface DossierOption {
  id: string
  reference: string
  intitule: string
  client: ClientOption | null
}

interface AdminOption {
  id: string
  nom: string
  prenom: string
  username: string | null
}

interface UnifiedAddModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: 'client' | 'dossier' | 'evenement'
  onSuccess?: (type: 'client' | 'dossier' | 'evenement', data: any) => void
  preselectedClientId?: string
  preselectedDossierId?: string
}

// Constants
const TYPE_AFFAIRE_OPTIONS = [
  { value: 'civil', label: 'Civil' },
  { value: 'penal', label: 'Penal' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'social', label: 'Social' },
  { value: 'famille', label: 'Famille' },
  { value: 'administratif', label: 'Administratif' },
  { value: 'immobilier', label: 'Immobilier' },
]

const EVENT_TYPE_OPTIONS = [
  { value: 'audience', label: 'Audience', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'rdv_client', label: 'RDV Client', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'rdv_adverse', label: 'RDV Adverse', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'expertise', label: 'Expertise', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'mediation', label: 'Mediation', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'echeance', label: 'Echeance', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'autre', label: 'Autre', color: 'bg-gray-100 text-gray-700 border-gray-200' },
]

// Client Form Component
const ClientForm = memo(function ClientForm({
  formData,
  setFormData,
  admins,
}: {
  formData: any
  setFormData: (data: any) => void
  admins: AdminOption[]
}) {
  return (
    <div className="space-y-6">
      {/* Section 1: Identite */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="h-4 w-4" />
          Identite
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="civilite">Civilite</Label>
            <Select
              value={formData.civilite || 'none'}
              onValueChange={(value) => setFormData({ ...formData, civilite: value === 'none' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">--</SelectItem>
                <SelectItem value="M.">M.</SelectItem>
                <SelectItem value="Mme">Mme</SelectItem>
                <SelectItem value="Dr">Dr</SelectItem>
                <SelectItem value="Me">Me</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3 space-y-2">
            <Label htmlFor="email">
              <Mail className="inline h-3.5 w-3.5 mr-1" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="jean.dupont@email.fr"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              placeholder="Dupont"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prenom">Prenom *</Label>
            <Input
              id="prenom"
              placeholder="Jean"
              value={formData.prenom}
              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      {/* Section 2: Contact */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Phone className="h-4 w-4" />
          Contact
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telephone">Telephone</Label>
            <Input
              id="telephone"
              placeholder="06 12 34 56 78"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telephoneSecondaire">Telephone secondaire</Label>
            <Input
              id="telephoneSecondaire"
              placeholder="01 23 45 67 89"
              value={formData.telephoneSecondaire}
              onChange={(e) => setFormData({ ...formData, telephoneSecondaire: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adresseLigne1">
            <MapPin className="inline h-3.5 w-3.5 mr-1" />
            Adresse
          </Label>
          <Input
            id="adresseLigne1"
            placeholder="123 rue du Palais"
            value={formData.adresseLigne1}
            onChange={(e) => setFormData({ ...formData, adresseLigne1: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="codePostal">Code postal</Label>
            <Input
              id="codePostal"
              placeholder="75001"
              value={formData.codePostal}
              onChange={(e) => setFormData({ ...formData, codePostal: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ville">Ville</Label>
            <Input
              id="ville"
              placeholder="Paris"
              value={formData.ville}
              onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pays">Pays</Label>
            <Input
              id="pays"
              placeholder="France"
              value={formData.pays}
              onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Type et Responsable */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Building2 className="h-4 w-4" />
          Type et Attribution
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type de client</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="particulier">Particulier</SelectItem>
                <SelectItem value="institutionnel">Institutionnel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="responsableId">Responsable</Label>
            <Select
              value={formData.responsableId || 'none'}
              onValueChange={(value) => setFormData({ ...formData, responsableId: value === 'none' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.username || `${admin.prenom} ${admin.nom}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.type === 'institutionnel' && (
          <div className="p-3 rounded-lg bg-muted/30 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="societeNom">Nom de la societe</Label>
              <Input
                id="societeNom"
                placeholder="Entreprise SARL"
                value={formData.societeNom}
                onChange={(e) => setFormData({ ...formData, societeNom: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="societeSiret">SIRET</Label>
                <Input
                  id="societeSiret"
                  placeholder="123 456 789 00012"
                  value={formData.societeSiret}
                  onChange={(e) => setFormData({ ...formData, societeSiret: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="societeFonction">Fonction</Label>
                <Input
                  id="societeFonction"
                  placeholder="Gerant"
                  value={formData.societeFonction}
                  onChange={(e) => setFormData({ ...formData, societeFonction: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Permissions */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Shield className="h-4 w-4" />
          Permissions
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="actif"
              checked={formData.actif}
              onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })}
            />
            <Label htmlFor="actif" className="font-normal text-sm">
              Compte actif
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="peutUploader"
              checked={formData.peutUploader}
              onCheckedChange={(checked) => setFormData({ ...formData, peutUploader: checked })}
            />
            <Label htmlFor="peutUploader" className="font-normal text-sm">
              Peut uploader
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="peutDemanderRdv"
              checked={formData.peutDemanderRdv}
              onCheckedChange={(checked) => setFormData({ ...formData, peutDemanderRdv: checked })}
            />
            <Label htmlFor="peutDemanderRdv" className="font-normal text-sm">
              Peut demander RDV
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
})

// Dossier Form Component
const DossierForm = memo(function DossierForm({
  formData,
  setFormData,
  clients,
}: {
  formData: any
  setFormData: (data: any) => void
  clients: ClientOption[]
}) {
  const [clientSearch, setClientSearch] = useState('')

  const filteredClients = clients.filter((client) => {
    if (!clientSearch) return true
    const search = clientSearch.toLowerCase()
    return (
      client.nom.toLowerCase().includes(search) ||
      client.prenom.toLowerCase().includes(search)
    )
  })

  const selectedClient = clients.find((c) => c.id === formData.clientId)

  return (
    <div className="space-y-6">
      {/* Section 1: Client */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="h-4 w-4" />
          Client associe
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientId">Client *</Label>
          <Select
            value={formData.clientId || 'none'}
            onValueChange={(value) => setFormData({ ...formData, clientId: value === 'none' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selectionner un client">
                {selectedClient ? (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedClient.prenom} {selectedClient.nom}</span>
                  </div>
                ) : (
                  'Selectionner un client'
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un client..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
              </div>
              {filteredClients.slice(0, 20).map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{client.prenom} {client.nom}</span>
                  </div>
                </SelectItem>
              ))}
              {filteredClients.length > 20 && (
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  +{filteredClients.length - 20} autres resultats...
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section 2: Informations du dossier */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FolderOpen className="h-4 w-4" />
          Informations du dossier
        </div>

        <div className="space-y-2">
          <Label htmlFor="intitule">Intitule *</Label>
          <Input
            id="intitule"
            placeholder="Ex: Litige bail commercial, Divorce contentieux..."
            value={formData.intitule}
            onChange={(e) => setFormData({ ...formData, intitule: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="typeAffaire">
            <Scale className="inline h-3.5 w-3.5 mr-1" />
            Type d'affaire
          </Label>
          <Select
            value={formData.typeAffaire || 'none'}
            onValueChange={(value) => setFormData({ ...formData, typeAffaire: value === 'none' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selectionner un type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Non defini</SelectItem>
              {TYPE_AFFAIRE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            <FileText className="inline h-3.5 w-3.5 mr-1" />
            Description
          </Label>
          <Textarea
            id="description"
            placeholder="Description detaillee du dossier, contexte, enjeux..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
        <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100">Reference automatique</p>
          <p className="text-blue-700 dark:text-blue-300">
            Une reference unique sera generee automatiquement a la creation du dossier.
          </p>
        </div>
      </div>
    </div>
  )
})

// Event Form Component
const EventForm = memo(function EventForm({
  formData,
  setFormData,
  dossiers,
}: {
  formData: any
  setFormData: (data: any) => void
  dossiers: DossierOption[]
}) {
  const [dossierSearch, setDossierSearch] = useState('')

  const filteredDossiers = dossiers.filter((dossier) => {
    if (!dossierSearch) return true
    const search = dossierSearch.toLowerCase()
    return (
      dossier.reference.toLowerCase().includes(search) ||
      dossier.intitule?.toLowerCase().includes(search) ||
      dossier.client?.nom.toLowerCase().includes(search) ||
      dossier.client?.prenom.toLowerCase().includes(search)
    )
  })

  const selectedDossier = dossiers.find((d) => d.id === formData.dossierId)

  return (
    <div className="space-y-6">
      {/* Section 1: Informations principales */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Informations principales
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input
              id="titre"
              placeholder="Ex: Audience TGI, RDV client Dupont..."
              value={formData.titre}
              onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <Badge variant="outline" className={cn('text-xs', option.color)}>
                      {option.label}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dossier selection */}
        <div className="space-y-2">
          <Label htmlFor="dossierId">Dossier associe</Label>
          <Select
            value={formData.dossierId || 'none'}
            onValueChange={(value) => setFormData({ ...formData, dossierId: value === 'none' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selectionner un dossier (optionnel)">
                {selectedDossier ? (
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedDossier.reference}</span>
                    {selectedDossier.client && (
                      <span className="text-muted-foreground text-sm">
                        - {selectedDossier.client.prenom} {selectedDossier.client.nom}
                      </span>
                    )}
                  </div>
                ) : (
                  'Aucun dossier'
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un dossier..."
                    value={dossierSearch}
                    onChange={(e) => setDossierSearch(e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
              </div>
              <SelectItem value="none">
                <span className="text-muted-foreground">Aucun dossier</span>
              </SelectItem>
              {filteredDossiers.slice(0, 20).map((dossier) => (
                <SelectItem key={dossier.id} value={dossier.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{dossier.reference}</span>
                    {dossier.client && (
                      <span className="text-muted-foreground">
                        - {dossier.client.prenom} {dossier.client.nom}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
              {filteredDossiers.length > 20 && (
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  +{filteredDossiers.length - 20} autres resultats...
                </div>
              )}
            </SelectContent>
          </Select>
          {selectedDossier?.client && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
              <User className="h-3 w-3" />
              Client: <span className="font-medium text-foreground">{selectedDossier.client.prenom} {selectedDossier.client.nom}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Date et heure */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Date et heure
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="journeeEntiere"
              checked={formData.journeeEntiere}
              onCheckedChange={(checked) => setFormData({ ...formData, journeeEntiere: checked })}
            />
            <Label htmlFor="journeeEntiere" className="font-normal text-sm">
              Journee entiere
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Debut *</Label>
            <Input
              type="date"
              value={formData.dateDebut}
              onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
              required
            />
            {!formData.journeeEntiere && (
              <Input
                type="time"
                value={formData.heureDebut}
                onChange={(e) => setFormData({ ...formData, heureDebut: e.target.value })}
                required
              />
            )}
          </div>
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Fin</Label>
            <Input
              type="date"
              value={formData.dateFin}
              onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
            />
            {!formData.journeeEntiere && (
              <Input
                type="time"
                value={formData.heureFin}
                onChange={(e) => setFormData({ ...formData, heureFin: e.target.value })}
              />
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Lieu */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4" />
          Lieu (optionnel)
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lieu">Lieu</Label>
            <Input
              id="lieu"
              placeholder="Tribunal, Cabinet, Visio..."
              value={formData.lieu}
              onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salle">Salle / Chambre</Label>
            <Input
              id="salle"
              placeholder="1ere chambre civile..."
              value={formData.salle}
              onChange={(e) => setFormData({ ...formData, salle: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adresse">Adresse complete</Label>
          <Input
            id="adresse"
            placeholder="4 Boulevard du Palais, 75001 Paris"
            value={formData.adresse}
            onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
          />
        </div>
      </div>

      {/* Section 4: Notes */}
      <div className="space-y-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="description">Notes / Description</Label>
          <Textarea
            id="description"
            placeholder="Informations supplementaires, points a aborder..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Google Calendar</p>
              <p className="text-xs text-muted-foreground">Synchroniser avec votre agenda Google</p>
            </div>
          </div>
          <Checkbox
            id="syncGoogle"
            checked={formData.syncGoogle}
            onCheckedChange={(checked) => setFormData({ ...formData, syncGoogle: checked })}
          />
        </div>
      </div>
    </div>
  )
})

// Main Component
export function UnifiedAddModal({
  open,
  onOpenChange,
  defaultTab = 'client',
  onSuccess,
  preselectedClientId,
  preselectedDossierId,
}: UnifiedAddModalProps) {
  const [activeTab, setActiveTab] = useState<'client' | 'dossier' | 'evenement'>(defaultTab)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data for selects
  const [clients, setClients] = useState<ClientOption[]>([])
  const [dossiers, setDossiers] = useState<DossierOption[]>([])
  const [admins, setAdmins] = useState<AdminOption[]>([])

  // Form states
  const [clientForm, setClientForm] = useState({
    civilite: '',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    telephoneSecondaire: '',
    adresseLigne1: '',
    codePostal: '',
    ville: '',
    pays: 'France',
    type: 'particulier',
    societeNom: '',
    societeSiret: '',
    societeFonction: '',
    peutUploader: true,
    peutDemanderRdv: true,
    actif: true,
    responsableId: '',
  })

  const [dossierForm, setDossierForm] = useState({
    clientId: preselectedClientId || '',
    intitule: '',
    description: '',
    typeAffaire: '',
  })

  const [eventForm, setEventForm] = useState({
    dossierId: preselectedDossierId || '',
    titre: '',
    type: 'rdv_client',
    description: '',
    dateDebut: new Date().toISOString().split('T')[0],
    heureDebut: '09:00',
    dateFin: new Date().toISOString().split('T')[0],
    heureFin: '10:00',
    journeeEntiere: false,
    lieu: '',
    adresse: '',
    salle: '',
    syncGoogle: true,
  })

  // Fetch data
  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch(`${ADMIN_CLIENTS_API}?limit=1000`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setClients(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }, [])

  const fetchDossiers = useCallback(async () => {
    try {
      const response = await fetch(`${ADMIN_DOSSIERS_API}?limit=500`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setDossiers(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching dossiers:', error)
    }
  }, [])

  const fetchAdmins = useCallback(async () => {
    try {
      const response = await fetch(ADMIN_RESPONSABLES_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setAdmins(result || [])
      }
    } catch (error) {
      console.error('Error fetching admins:', error)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchClients()
      fetchDossiers()
      fetchAdmins()
    }
  }, [open, fetchClients, fetchDossiers, fetchAdmins])

  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  // Reset forms when modal closes
  useEffect(() => {
    if (!open) {
      setClientForm({
        civilite: '',
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        telephoneSecondaire: '',
        adresseLigne1: '',
        codePostal: '',
        ville: '',
        pays: 'France',
        type: 'particulier',
        societeNom: '',
        societeSiret: '',
        societeFonction: '',
        peutUploader: true,
        peutDemanderRdv: true,
        actif: true,
        responsableId: '',
      })
      setDossierForm({
        clientId: '',
        intitule: '',
        description: '',
        typeAffaire: '',
      })
      setEventForm({
        dossierId: '',
        titre: '',
        type: 'rdv_client',
        description: '',
        dateDebut: new Date().toISOString().split('T')[0],
        heureDebut: '09:00',
        dateFin: new Date().toISOString().split('T')[0],
        heureFin: '10:00',
        journeeEntiere: false,
        lieu: '',
        adresse: '',
        salle: '',
        syncGoogle: true,
      })
    }
  }, [open])

  // Helper to parse error response
  const parseErrorResponse = async (response: Response): Promise<string> => {
    try {
      const data = await response.json()
      if (data.errors && Array.isArray(data.errors)) {
        return data.errors.map((e: { message: string }) => e.message).join(', ')
      }
      return data.message || `Erreur ${response.status}`
    } catch {
      return `Erreur ${response.status}: ${response.statusText}`
    }
  }

  // Submit handlers
  const handleSubmitClient = async () => {
    setProcessing(true)
    setError(null)
    try {
      const response = await fetch(ADMIN_CLIENTS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(clientForm),
      })
      if (response.ok) {
        const data = await response.json()
        onSuccess?.('client', data)
        onOpenChange(false)
      } else {
        const errorMsg = await parseErrorResponse(response)
        setError(errorMsg)
      }
    } catch (err) {
      console.error('Error creating client:', err)
      setError('Erreur de connexion au serveur')
    } finally {
      setProcessing(false)
    }
  }

  const handleSubmitDossier = async () => {
    setProcessing(true)
    setError(null)
    try {
      const response = await fetch(ADMIN_DOSSIERS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dossierForm),
      })
      if (response.ok) {
        const data = await response.json()
        onSuccess?.('dossier', data)
        onOpenChange(false)
      } else {
        const errorMsg = await parseErrorResponse(response)
        setError(errorMsg)
      }
    } catch (err) {
      console.error('Error creating dossier:', err)
      setError('Erreur de connexion au serveur')
    } finally {
      setProcessing(false)
    }
  }

  const handleSubmitEvent = async () => {
    setProcessing(true)
    setError(null)
    try {
      let dateDebut: string
      let dateFin: string

      if (eventForm.journeeEntiere) {
        dateDebut = `${eventForm.dateDebut}T00:00:00`
        dateFin = `${eventForm.dateFin || eventForm.dateDebut}T23:59:59`
      } else {
        dateDebut = `${eventForm.dateDebut}T${eventForm.heureDebut}:00`
        dateFin = `${eventForm.dateFin || eventForm.dateDebut}T${eventForm.heureFin}:00`
      }

      const payload = {
        dossierId: eventForm.dossierId || null,
        titre: eventForm.titre,
        type: eventForm.type,
        description: eventForm.description || null,
        dateDebut,
        dateFin,
        journeeEntiere: eventForm.journeeEntiere,
        lieu: eventForm.lieu || null,
        adresse: eventForm.adresse || null,
        salle: eventForm.salle || null,
        syncGoogle: eventForm.syncGoogle,
      }

      const response = await fetch(ADMIN_EVENEMENTS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        const data = await response.json()
        onSuccess?.('evenement', data)
        onOpenChange(false)
      } else {
        const errorMsg = await parseErrorResponse(response)
        setError(errorMsg)
      }
    } catch (err) {
      console.error('Error creating event:', err)
      setError('Erreur de connexion au serveur')
    } finally {
      setProcessing(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    switch (activeTab) {
      case 'client':
        handleSubmitClient()
        break
      case 'dossier':
        handleSubmitDossier()
        break
      case 'evenement':
        handleSubmitEvent()
        break
    }
  }

  const isFormValid = () => {
    switch (activeTab) {
      case 'client':
        return clientForm.nom && clientForm.prenom && clientForm.email
      case 'dossier':
        return dossierForm.clientId && dossierForm.intitule
      case 'evenement':
        return eventForm.titre && eventForm.dateDebut
      default:
        return false
    }
  }

  const getSubmitLabel = () => {
    if (processing) {
      return (
        <>
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          Creation...
        </>
      )
    }
    switch (activeTab) {
      case 'client':
        return (
          <>
            <UserPlus className="mr-2 h-4 w-4" />
            Creer le client
          </>
        )
      case 'dossier':
        return (
          <>
            <FolderPlus className="mr-2 h-4 w-4" />
            Creer le dossier
          </>
        )
      case 'evenement':
        return (
          <>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Creer l'evenement
          </>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[85vh] max-h-[750px] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Briefcase className="h-5 w-5 text-primary" />
            Nouvel element
          </DialogTitle>
          <DialogDescription>
            Creez rapidement un nouveau client, dossier ou evenement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'client' | 'dossier' | 'evenement')}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-3 h-12">
              <TabsTrigger value="client" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Client</span>
              </TabsTrigger>
              <TabsTrigger value="dossier" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FolderPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Dossier</span>
              </TabsTrigger>
              <TabsTrigger value="evenement" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <CalendarPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Evenement</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto py-4">
              <TabsContent value="client" className="mt-0 h-full">
                <ClientForm formData={clientForm} setFormData={setClientForm} admins={admins} />
              </TabsContent>

              <TabsContent value="dossier" className="mt-0 h-full">
                <DossierForm formData={dossierForm} setFormData={setDossierForm} clients={clients} />
              </TabsContent>

              <TabsContent value="evenement" className="mt-0 h-full">
                <EventForm formData={eventForm} setFormData={setEventForm} dossiers={dossiers} />
              </TabsContent>
            </div>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mx-4 mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={processing || !isFormValid()}>
              {getSubmitLabel()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
