-- Script SQL para Drizzle Studio
-- -------------------------------------------------------------
-- 1) Añade la columna `tramites` si no existe (no destructivo)
ALTER TABLE boleta_payments
ADD COLUMN IF NOT EXISTS tramites varchar(512);

-- 2) Asegura que la columna `fecha` tenga DEFAULT now() (no cambia datos existentes)
ALTER TABLE boleta_payments
ALTER COLUMN fecha SET DEFAULT now();

-- 3) Actualiza `boleta_payments.fecha` usando transacciones donde
--    transactions.numero_documento == boleta_payments.boleta_referencia
--    Se selecciona la transacción más reciente por numero_documento.
WITH latest_per_num AS (
  SELECT DISTINCT ON (t.numero_documento) t.numero_documento, t.fecha
  FROM transactions t
  WHERE t.numero_documento IS NOT NULL
  ORDER BY t.numero_documento, t.fecha DESC
)
UPDATE boleta_payments bp
SET fecha = l.fecha
FROM latest_per_num l
WHERE bp.boleta_referencia = l.numero_documento
  AND bp.fecha IS DISTINCT FROM l.fecha;

-- 4) Actualiza `boleta_payments.fecha` usando la placa (si no se actualizó en el paso anterior)
--    boleta_payments.placas es una cadena CSV; parseamos con string_to_array y unnest.
WITH bp_plates AS (
  SELECT bp.id, trim(pl) AS placa
  FROM boleta_payments bp, unnest(string_to_array(bp.placas, ',')) AS pl
), latest_per_placa AS (
  SELECT DISTINCT ON (lower(placa)) lower(placa) AS placa, fecha
  FROM (
    SELECT lower(trim(t.placa)) AS placa, t.fecha
    FROM transactions t
    WHERE t.placa IS NOT NULL
  ) sub
  ORDER BY lower(placa), fecha DESC
)
UPDATE boleta_payments bp
SET fecha = l.fecha
FROM bp_plates bpp
JOIN latest_per_placa l ON lower(l.placa) = lower(bpp.placa)
WHERE bp.id = bpp.id
  AND bp.fecha IS DISTINCT FROM l.fecha;

-- NOTA: El paso de 'proximidad por fecha' (buscar transacciones dentro de +/- 1 día)
-- es más delicado en SQL y puede producir coincidencias ambiguas. Para esa heurística
-- recomiendo usar el script TypeScript "src/scripts/fixBoletaFecha.ts" en modo dry-run
-- (ya creado) para revisar coincidencias antes de aplicar cambios automáticos.

-- Recomendaciones antes de ejecutar:
-- 1) Hacer un respaldo de la base de datos o ejecutar en un entorno de staging.
-- 2) Ejecutar cada bloque en modo SELECT primero para revisar las filas que se verán afectadas.
-- 3) Si usas Drizzle Studio, pega este script, revisa los resultados de los SELECTs y
--    luego ejecuta los UPDATEs dentro de una transacción si lo deseas.
-- -------------------------------------------------------------
