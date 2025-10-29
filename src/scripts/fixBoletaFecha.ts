import { desc, eq, sql } from 'drizzle-orm';

import { db } from '~/server/db';
import { boletaPayments, transactions } from '~/server/db/schema';

import 'dotenv/config';

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const dryRun = !apply;

  console.log(
    `fixBoletaFecha: starting in ${dryRun ? 'dry-run' : 'apply'} mode`
  );

  // Load all boleta payments
  const pagos = await db
    .select()
    .from(boletaPayments)
    .orderBy(desc(boletaPayments.fecha));

  console.log(`Found ${pagos.length} boleta_payments to inspect`);

  const updates: {
    id: string | number;
    oldFecha: Date;
    newFecha: Date;
    reason: string;
  }[] = [];

  for (const p of pagos) {
    const currentFecha = p.fecha instanceof Date ? p.fecha : new Date(p.fecha);
    const idVal = (p as unknown as { id: string | number }).id;
    let candidate: { fecha: Date } | null = null;
    let reason = '';

    // Heuristic 1: match by boletaReferencia -> transactions.numero_documento
    try {
      const byRef = await db
        .select()
        .from(transactions)
        .where(eq(transactions.numeroDocumento, String(p.boletaReferencia)))
        .orderBy(desc(transactions.fecha))
        .limit(1);
      if (byRef.length > 0) {
        candidate = {
          fecha:
            byRef[0].fecha instanceof Date
              ? byRef[0].fecha
              : new Date(byRef[0].fecha),
        };
        reason = `match_numero_documento (${p.boletaReferencia})`;
      }
    } catch (_) {
      // ignore and continue
    }

    // Heuristic 2: match by placas (first found recent transaction with same placa)
    if (!candidate && p.placas) {
      const placas = String(p.placas || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const placa of placas) {
        try {
          const byPlaca = await db
            .select()
            .from(transactions)
            .where(eq(transactions.placa, placa))
            .orderBy(desc(transactions.fecha))
            .limit(1);
          if (byPlaca.length > 0) {
            candidate = {
              fecha:
                byPlaca[0].fecha instanceof Date
                  ? byPlaca[0].fecha
                  : new Date(byPlaca[0].fecha),
            };
            reason = `match_placa (${placa})`;
            break;
          }
        } catch (_) {
          // ignore and try next placa
        }
      }
    }

    // Heuristic 3: date-proximity fallback (transactions within +/- 1 day of currentFecha)
    if (!candidate) {
      const start = new Date(currentFecha.getTime() - 24 * 60 * 60 * 1000);
      const end = new Date(currentFecha.getTime() + 24 * 60 * 60 * 1000);
      try {
        const nearby = await db
          .select()
          .from(transactions)
          // use raw SQL fragment for date range
          .where(
            sql`${transactions.fecha} >= ${start} AND ${transactions.fecha} <= ${end}`
          )
          .orderBy(desc(transactions.fecha))
          .limit(1);
        if (nearby.length > 0) {
          candidate = {
            fecha:
              nearby[0].fecha instanceof Date
                ? nearby[0].fecha
                : new Date(nearby[0].fecha),
          };
          reason = `date_proximity`;
        }
      } catch (_) {
        // ignore
      }
    }

    if (candidate) {
      const diffMs = Math.abs(
        candidate.fecha.getTime() - currentFecha.getTime()
      );
      // Only consider updating if difference is > 1 minute to avoid no-op or trivial differences
      if (diffMs > 60 * 1000) {
        updates.push({
          id: idVal,
          oldFecha: currentFecha,
          newFecha: candidate.fecha,
          reason,
        });
      }
    }
  }

  console.log(`Candidates to update: ${updates.length}`);
  if (dryRun) {
    // Log first 50 candidates for inspection
    for (const u of updates.slice(0, 50)) {
      console.log(
        `ID ${u.id}: ${u.oldFecha.toISOString()} -> ${u.newFecha.toISOString()} (${u.reason})`
      );
    }
    console.log('Dry-run complete. Rerun with --apply to perform updates.');
    process.exit(0);
  }

  // Apply updates
  let updatedCount = 0;
  for (const u of updates) {
    try {
      // Use raw SQL execution to avoid Drizzle type mismatches for id column (some DBs use uuid)
      // Serialize date to ISO string and cast to timestamptz so the Postgres driver
      // receives a string (Buffer-safe) rather than a Date object.
      const fechaIso = u.newFecha.toISOString();
      await db.execute(
        sql`UPDATE boleta_payments SET fecha = ${fechaIso}::timestamptz WHERE id = ${u.id}`
      );
      updatedCount += 1;
      console.log(
        `Updated ID ${u.id}: ${u.oldFecha.toISOString()} -> ${u.newFecha.toISOString()} (${u.reason})`
      );
    } catch (err) {
      console.error(`Failed to update ID ${u.id}:`, err);
    }
  }

  console.log(`Finished. Registros actualizados: ${updatedCount}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error in fixBoletaFecha:', err);
  process.exit(1);
});
