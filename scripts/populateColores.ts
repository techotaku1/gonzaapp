import { eq } from 'drizzle-orm';

import { db } from '~/server/db';
import { colores, tramites } from '~/server/db/schema';

const coloresIniciales = [
  { nombre: 'azul', valor: 'blue', intensidad: 400 },
  { nombre: 'verde-lima', valor: 'lime', intensidad: 400 },
  { nombre: 'purpura', valor: 'purple', intensidad: 400 },
  { nombre: 'naranja', valor: 'orange', intensidad: 400 },
  { nombre: 'verde-azulado', valor: 'teal', intensidad: 400 },
  { nombre: 'rojo', valor: 'red', intensidad: 400 },
  { nombre: 'verde', valor: 'green', intensidad: 400 },
  { nombre: 'amarillo', valor: 'yellow', intensidad: 400 },
  { nombre: 'rosa', valor: 'pink', intensidad: 400 },
  { nombre: 'gris', valor: 'gray', intensidad: 400 },
  { nombre: 'indigo', valor: 'indigo', intensidad: 400 },
  { nombre: 'cian', valor: 'cyan', intensidad: 400 },
];

const tramitesColores = {
  LICENCIA: 'azul',
  RENOVACION: 'verde-lima',
  STREAMING: 'purpura',
  'AFILIACION SEGURIDAD SOCIAL': 'naranja',
  'CERTIFICADO DE TRADICION V': 'verde-azulado',
};

async function populateColores() {
  console.log('🎨 Poblando tabla de colores...');

  try {
    // Insertar colores iniciales
    for (const color of coloresIniciales) {
      try {
        await db.insert(colores).values({
          nombre: color.nombre,
          valor: color.valor,
          intensidad: color.intensidad,
        });
        console.log(`✅ Color agregado: ${color.nombre} (${color.valor})`);
      } catch (_error) {
        console.log(`⚠️  Color '${color.nombre}' ya existe`);
      }
    }

    // Actualizar trámites con colores
    for (const [tramiteName, colorName] of Object.entries(tramitesColores)) {
      // Usar el método correcto de Drizzle para obtener el resultado
      const [result] = await db
        .update(tramites)
        .set({ color: colorName })
        .where(eq(tramites.nombre, tramiteName))
        .returning({ id: tramites.id }); // Retornar algo para verificar si se actualizó

      if (result) {
        console.log(
          `✅ Trámite '${tramiteName}' asignado color '${colorName}'`
        );
      } else {
        console.log(`⚠️  Trámite '${tramiteName}' no encontrado`);
      }
    }

    console.log('🎉 ¡Tabla de colores poblada exitosamente!');
  } catch (error) {
    console.error('❌ Error poblando colores:', error);
  }
}

// Ejecutar el script
populateColores().catch(console.error);
