import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ejecutando seed...');

  const adminPassword = await bcrypt.hash('@dminServitec2026.', 12);

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

  // Trabajadores con acceso completo (consulta y gestión)
  const workers = [
    { email: 'anaceballos@servitecma.onmicrosoft.com', name: 'Ana Ceballos', password: '7KpL9mX2nQ' },
    { email: 'andreaborbolla@servitecma.onmicrosoft.com', name: 'Andrea Borbolla', password: '4Wy8RvT5bN' },
    { email: 'carmengp@servitecma.onmicrosoft.com', name: 'Carmen GP', password: '9Hj3DxK7mP' },
    { email: 'franciscomartin@servitecma.onmicrosoft.com', name: 'Francisco Martin', password: '2Nq6VwZ8cL' },
    { email: 'ivanabascal@servitecma.onmicrosoft.com', name: 'Ivan Abascal', password: '8Rt5PmY3jK' },
    { email: 'juanpablogarcia@servitecma.onmicrosoft.com', name: 'Juan Pablo Garcia', password: '5Xb9LnW4tM' },
    { email: 'marcosbernardez@servitecma.onmicrosoft.com', name: 'Marcos Bernardez', password: '3Fv7QwH6pR' },
    { email: 'victorp@servitecma.onmicrosoft.com', name: 'Victor P', password: '6Kj2TnC9xS' },
    { email: 'yolandafernandez@servitecma.onmicrosoft.com', name: 'Yolanda Fernandez', password: '4Mw8DpL5vT' },
    { email: 'alvarogonzalezvega@servitecma.onmicrosoft.com', name: 'Alvaro Gonzalez Vega', password: '7Zy3RmK6nQ' },
    { email: 'yandymsuarezriera@servitecma.onmicrosoft.com', name: 'Yandym Suarez', password: '9Hv5WxJ2pL' },
    { email: 'alvarogonzalezvega@servitecma.com', name: 'Alvaro Gonzalez', password: '2Pq8NbT4mK' },
  ];

  let createdWorkers = 0;
  for (const worker of workers) {
    const hashedPassword = await bcrypt.hash(worker.password, 12);
    await prisma.user.upsert({
      where: { email: worker.email },
      update: {},
      create: {
        name: worker.name,
        email: worker.email,
        password: hashedPassword,
        role: Role.WORKER,
      },
    });
    createdWorkers++;
  }

  console.log('✅ Seed completado:');
  console.log(`   👤 Admin: admin@tagmap.app / @dminServitec2026.`);
  console.log(`   👷 Trabajadores: ${createdWorkers} usuarios`);
  console.log('');
  console.log('📋 Credenciales de trabajadores:');
  workers.forEach(w => console.log(`   - ${w.email} / ${w.password}`));
  console.log('');
  console.log('📁 Los usuarios virtuales (@tagmap.internal) se crean automáticamente');
  console.log('   al detectar carpetas en el sistema de archivos');

  return { admin };
}

main()
  .catch(err => {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
