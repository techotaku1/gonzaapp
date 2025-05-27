import { type TransactionRecord } from '~/types';

export function calculateFormulas(record: TransactionRecord) {
  // Precio Neto Ajustado
  const precioNetoAjustado =
    record.precioNeto + (record.comisionExtra ? 30000 : 0);

  // 4x1000
  const impuesto4x1000 = precioNetoAjustado * -0.004;

  // Ganancia Bruta
  const gananciaBruta =
    record.tarifaServicio +
    impuesto4x1000 +
    (record.rappi ? record.precioNeto * 0.01 : 0);

  return {
    precioNetoAjustado,
    impuesto4x1000,
    gananciaBruta,
  };
}
