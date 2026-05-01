import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ejecutando seed...');

  const adminPassword = await bcrypt.hash('admin123', 12);

  // Administrador
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tagmap.app' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@tagmap.app',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  console.log('✅ Seed completado:');
  console.log(`   👤 Admin: admin@tagmap.app / admin123`);
  console.log('');
  console.log(`   Total usuarios creados: 1`);
  console.log('');
  console.log('📁 Los usuarios trabajadores se crearán automáticamente');
  console.log('   al detectar carpetas en storage/equipos/');

  return { admin };
}

main()
  .catch(err => {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
