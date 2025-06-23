export const bancoOptions = [
  'BANCOLOMBIA',
  'NEQUI',
  'DAVIPLATA',
  'DAVIVIENDA',
] as const;

export type BancoOption = (typeof bancoOptions)[number];
