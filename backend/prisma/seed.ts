import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ejecutando seed...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  const workerPassword = await bcrypt.hash('worker123', 12);

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

  // Trabajadores de ejemplo
  const workerData = [
    { name: 'Carlos García', email: 'carlos@tagmap.app', phone: '+34 666 111 222' },
    { name: 'Pedro López', email: 'pedro@tagmap.app', phone: '+34 666 333 444' },
    { name: 'María Rodríguez', email: 'maria@tagmap.app', phone: '+34 666 555 666' },
    { name: 'Antonio Martínez', email: 'antonio@tagmap.app', phone: '+34 666 777 888' },
    { name: 'Juan Sánchez', email: 'juan@tagmap.app', phone: '+34 666 999 000' },
  ];

  const workers = await Promise.all(
    workerData.map(w =>
      prisma.user.upsert({
        where: { email: w.email },
        update: {},
        create: { ...w, password: workerPassword, role: Role.WORKER },
      })
    )
  );

  console.log('✅ Seed completado:');
  console.log(`   👤 Admin: admin@tagmap.app / admin123`);
  console.log(`   👷 Trabajadores (pass: worker123):`);
  workers.forEach(w => console.log(`      - ${w.email}`));
  console.log('');
  console.log(`   Total usuarios creados: ${1 + workers.length}`);

  return { admin, workers };
}

main()
  .catch(err => {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
