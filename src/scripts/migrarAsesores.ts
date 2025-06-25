import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { fileURLToPath } from 'url';

import { asesores, transactions } from '../server/db/schema';

// Cargar variables de entorno
config();

// Crear conexión directa a la base de datos
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const client = postgres(connectionString);
const db = drizzle(client);

// Utilidad para obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer y parsear el CSV
function getRowsFromCSV(): {
  fecha: string;
  hora: string;
  placa: string;
  cedula: string;
  asesor: string;
}[] {
  const csvPath = path.join(__dirname, '../data/asesor.csv');
  if (!fs.existsSync(csvPath)) return [];
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).slice(1); // skip header
  const rows: {
    fecha: string;
    hora: string;
    placa: string;
    cedula: string;
    asesor: string;
  }[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(',');
    if (parts.length < 5) continue;
    const [fecha, hora, placa, cedula, asesor] = parts.map((p) => p.trim());
    if (placa && cedula && asesor && fecha) {
      rows.push({ fecha, hora, placa, cedula, asesor });
    }
  }
  return rows;
}

// Parsear fecha dd/mm/yy a Date
function parseFecha(fechaStr: string): Date | null {
  const [d, m, y] = fechaStr.split('/');
  if (!d || !m || !y) return null;
  const year = y.length === 2 ? '20' + y : y;
  return new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
}

async function migrarAsesores() {
  try {
    // 1. Insertar asesores únicos
    const rows = getRowsFromCSV();
    const asesoresCSV = Array.from(
      new Set(rows.map((r) => r.asesor.trim()).filter(Boolean))
    );

    // Obtener asesores existentes
    const asesoresExistentes = await db.select().from(asesores);
    const nombresExistentes = new Set(
      asesoresExistentes.map((a) => a.nombre.trim())
    );

    const nuevosAsesores = asesoresCSV.filter((a) => !nombresExistentes.has(a));
    for (const nombre of nuevosAsesores) {
      await db.insert(asesores).values({
        id: randomUUID(),
        nombre,
      });
      console.log(`✓ Asesor insertado: ${nombre}`);
    }
    if (nuevosAsesores.length === 0) {
      console.log('No hay asesores nuevos para insertar.');
    } else {
      console.log(`Insertados ${nuevosAsesores.length} asesores nuevos.`);
    }

    // 2. Actualizar asesores en transactions
    let count = 0;
    for (const row of rows) {
      const fechaDate = parseFecha(row.fecha);
      if (!fechaDate) continue;
      const condition = and(
        eq(transactions.fecha, fechaDate),
        eq(transactions.placa, row.placa),
        eq(transactions.numeroDocumento, row.cedula)
      );
      const tx = await db.select().from(transactions).where(condition).limit(1);
      if (tx && tx.length > 0) {
        await db
          .update(transactions)
          .set({ asesor: row.asesor })
          .where(condition);
        count++;
      }
    }
    console.log(
      `Actualizados ${count} asesores en transacciones por coincidencia exacta de fecha, placa y cédula.`
    );
  } catch (error) {
    console.error('Error en el script:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrarAsesores()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error en el script:', error);
    process.exit(1);
  });
