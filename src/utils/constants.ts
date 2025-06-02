export const bancoOptions = [
  'BANCOLOMBIA',
  'NEQUI',
  'DAVIPLATA',
  'AV VILLAS',
  'CAJA SOCIAL',
] as const;

export type BancoOption = (typeof bancoOptions)[number];
