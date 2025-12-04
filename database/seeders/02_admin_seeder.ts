import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Admin from '#models/admin'

export default class AdminSeeder extends BaseSeeder {
  async run() {
    // Verifier si un super_admin existe deja
    const existingAdmin = await Admin.findBy('role', 'super_admin')

    if (existingAdmin) {
      console.log('Super admin existe deja, seeder ignore')
      return
    }

    // Creer le super admin initial
    // Le mot de passe sera automatiquement hashe par withAuthFinder
    await Admin.create({
      email: 'admin@cabinet.fr',
      password: 'Admin123!',
      nom: 'Administrateur',
      prenom: 'Super',
      role: 'super_admin',
      actif: true,
      totpEnabled: false,
    })

    console.log('Super admin cree avec succes')
    console.log('Email: admin@cabinet.fr')
    console.log('Mot de passe: Admin123!')
    console.log('IMPORTANT: Changez le mot de passe apres la premiere connexion!')
  }
}
