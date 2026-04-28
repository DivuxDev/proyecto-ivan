import 'dotenv/config';
import app from './app';
import { connectDatabase, prisma } from './config/database';
import { startFolderWatcher } from './services/folderWatcher';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function main() {
  // Conectar a la base de datos
  await connectDatabase();

  const server = app.listen(PORT, () => {
    console.log('');
    console.log('⚡ TagMap API arrancada');
    console.log(`   🚀 http://localhost:${PORT}`);
    console.log(`   📁 Imágenes: http://localhost:${PORT}/uploads`);
    console.log(`   🩺 Health: http://localhost:${PORT}/health`);
    console.log('');

    // Iniciar folder watcher si está habilitado
    startFolderWatcher();
  });

  // Apagado graceful
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} recibido. Cerrando servidor...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Servidor cerrado correctamente.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('❌ Error fatal al arrancar:', err);
  process.exit(1);
});
