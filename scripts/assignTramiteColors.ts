import { eq } from 'drizzle-orm';

import { db } from '~/server/db';
import { tramites } from '~/server/db/schema';
import { suggestColorForTramite } from '~/utils/tramiteColors';

async function assignColorsToExistingTramites() {
  console.log('Asignando colores a trámites existentes...');

  const allTramites = await db.select().from(tramites);

  for (const tramite of allTramites) {
    if (!tramite.color) {
      const suggestedColor = suggestColorForTramite(tramite.nombre);

      const [result] = await db
        .update(tramites)
        .set({ color: suggestedColor })
        .where(eq(tramites.id, tramite.id))
        .returning({ id: tramites.id });

      if (result) {
        console.log(
          `Asignado color '${suggestedColor}' a trámite '${tramite.nombre}'`
        );
      }
    }
  }

  console.log('¡Colores asignados exitosamente!');
}

// Ejecutar el script
assignColorsToExistingTramites().catch(console.error);
