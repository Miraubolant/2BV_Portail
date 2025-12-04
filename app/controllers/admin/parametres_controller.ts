import type { HttpContext } from '@adonisjs/core/http'
import Parametre from '#models/parametre'

export default class ParametresController {
  /**
   * GET /api/admin/parametres
   * Liste tous les parametres
   */
  async index({ response }: HttpContext) {
    const parametres = await Parametre.query().orderBy('categorie', 'asc')
    
    // Grouper par categorie
    const grouped: Record<string, any[]> = {}
    for (const param of parametres) {
      const cat = param.categorie || 'autres'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push({
        id: param.id,
        cle: param.cle,
        valeur: param.typedValue,
        type: param.type,
        description: param.description,
      })
    }

    return response.ok(grouped)
  }

  /**
   * GET /api/admin/parametres/:categorie
   * Parametres d'une categorie
   */
  async byCategorie({ params, response }: HttpContext) {
    const parametres = await Parametre.query()
      .where('categorie', params.categorie)
      .orderBy('cle', 'asc')

    return response.ok(parametres.map(p => ({
      id: p.id,
      cle: p.cle,
      valeur: p.typedValue,
      type: p.type,
      description: p.description,
    })))
  }

  /**
   * PUT /api/admin/parametres
   * Mettre a jour plusieurs parametres
   */
  async update({ request, auth, response }: HttpContext) {
    const admin = auth.use('admin').user!
    const updates = request.input('parametres', []) as Array<{ cle: string; valeur: any }>

    const updated: string[] = []
    for (const { cle, valeur } of updates) {
      const param = await Parametre.findBy('cle', cle)
      if (param) {
        // Convertir la valeur selon le type
        let stringValue: string
        if (param.type === 'json') {
          stringValue = JSON.stringify(valeur)
        } else if (param.type === 'boolean') {
          stringValue = valeur ? 'true' : 'false'
        } else {
          stringValue = String(valeur)
        }

        param.valeur = stringValue
        param.updatedById = admin.id
        await param.save()
        updated.push(cle)
      }
    }

    return response.ok({ message: 'Parametres mis a jour', updated })
  }

  /**
   * GET /api/admin/parametres/value/:cle
   * Obtenir une valeur specifique
   */
  async getValue({ params, response }: HttpContext) {
    const param = await Parametre.findByOrFail('cle', params.cle)
    return response.ok({ value: param.typedValue })
  }
}
