export interface SoatPrice {
  vehicleType: string;
  cylinderRange?: string;
  basePrice: number;
  code?: string;
}

export const vehicleTypes = [
  'Ciclomotor',
  'Menos de 100 c.c.',
  'De 100 a 200 c.c.',
  'Más de 200 c.c.',
  'Motocarros, tricimoto, cuadriciclos',
  'Motocarro 5 pasajeros',
  'Camperos y Camionetas 0 - 9 años',
  'Camperos y Camionetas 10 años o más',
  'Autos Familiares 0 - 9 años',
  'Autos Familiares 10 años o más',
  'Autos de Negocios y Taxis 0 - 9 años',
  'Autos de Negocios y Taxis 10 años o más',
  'Buses y Busetas',
  'Vehículos para 6 o más Pasajeros 0 - 9 años',
  'Vehículos para 6 o más Pasajeros 10 años o más',
  'Carga o Mixto',
  'Oficiales Especiales',
] as const;

export type VehicleType = (typeof vehicleTypes)[number];

export const soatPrices2025: SoatPrice[] = [
  { vehicleType: 'Ciclomotor', code: '100', basePrice: 117900 },
  { vehicleType: 'Menos de 100 c.c.', code: '110', basePrice: 243400 },
  { vehicleType: 'De 100 a 200 c.c.', code: '120', basePrice: 326300 },
  { vehicleType: 'Más de 200 c.c.', code: '130', basePrice: 758300 },
  {
    vehicleType: 'Motocarros, tricimoto, cuadriciclos',
    code: '140',
    basePrice: 367800,
  },
  { vehicleType: 'Motocarro 5 pasajeros', code: '150', basePrice: 367800 },

  // Camperos y Camionetas 0-9 años
  {
    vehicleType: 'Camperos y Camionetas 0 - 9 años',
    code: '211',
    cylinderRange: 'Menos de 1.500 c.c.',
    basePrice: 789600,
  },
  {
    vehicleType: 'Camperos y Camionetas 0 - 9 años',
    code: '221',
    cylinderRange: 'De 1.500 a 2.500 c.c.',
    basePrice: 942800,
  },
  {
    vehicleType: 'Camperos y Camionetas 0 - 9 años',
    code: '231',
    cylinderRange: 'Más de 2.500 c.c.',
    basePrice: 1105900,
  },

  // Camperos y Camionetas 10 años o más
  {
    vehicleType: 'Camperos y Camionetas 10 años o más',
    code: '212',
    cylinderRange: 'Menos de 1.500 c.c.',
    basePrice: 949200,
  },
  {
    vehicleType: 'Camperos y Camionetas 10 años o más',
    code: '222',
    cylinderRange: 'De 1.500 a 2.500 c.c.',
    basePrice: 1116800,
  },
  {
    vehicleType: 'Camperos y Camionetas 10 años o más',
    code: '232',
    cylinderRange: 'Más de 2.500 c.c.',
    basePrice: 1269000,
  },

  // Autos Familiares 0-9 años
  {
    vehicleType: 'Autos Familiares 0 - 9 años',
    code: '511',
    cylinderRange: 'Menos de 1.500 c.c.',
    basePrice: 445300,
  },
  {
    vehicleType: 'Autos Familiares 0 - 9 años',
    code: '521',
    cylinderRange: 'De 1.500 a 2.500 c.c.',
    basePrice: 542400,
  },
  {
    vehicleType: 'Autos Familiares 0 - 9 años',
    code: '531',
    cylinderRange: 'Más de 2.500 c.c.',
    basePrice: 633500,
  },

  // Autos Familiares 10 años o más
  {
    vehicleType: 'Autos Familiares 10 años o más',
    code: '512',
    cylinderRange: 'Menos de 1.500 c.c.',
    basePrice: 590400,
  },
  {
    vehicleType: 'Autos Familiares 10 años o más',
    code: '522',
    cylinderRange: 'De 1.500 a 2.500 c.c.',
    basePrice: 674700,
  },
  {
    vehicleType: 'Autos Familiares 10 años o más',
    code: '532',
    cylinderRange: 'Más de 2.500 c.c.',
    basePrice: 674700,
  },

  // Autos de Negocios y Taxis 0-9 años
  {
    vehicleType: 'Autos de Negocios y Taxis 0 - 9 años',
    code: '711',
    cylinderRange: 'Menos de 1.500 c.c.',
    basePrice: 267900,
  },
  {
    vehicleType: 'Autos de Negocios y Taxis 0 - 9 años',
    code: '721',
    cylinderRange: 'De 1.500 a 2.500 c.c.',
    basePrice: 332700,
  },
  {
    vehicleType: 'Autos de Negocios y Taxis 0 - 9 años',
    code: '731',
    cylinderRange: 'Más de 2.500 c.c.',
    basePrice: 429000,
  },

  // Autos de Negocios y Taxis 10 años o más
  {
    vehicleType: 'Autos de Negocios y Taxis 10 años o más',
    code: '712',
    cylinderRange: 'Menos de 1.500 c.c.',
    basePrice: 334500,
  },
  {
    vehicleType: 'Autos de Negocios y Taxis 10 años o más',
    code: '722',
    cylinderRange: 'De 1.500 a 2.500 c.c.',
    basePrice: 410900,
  },
  {
    vehicleType: 'Autos de Negocios y Taxis 10 años o más',
    code: '732',
    cylinderRange: 'Más de 2.500 c.c.',
    basePrice: 503200,
  },

  // Buses y Busetas
  { vehicleType: 'Buses y Busetas', code: '810', basePrice: 640000 },
  { vehicleType: 'Buses y Busetas', code: '910', basePrice: 632700 },
  { vehicleType: 'Buses y Busetas', code: '920', basePrice: 917700 },
];

export function calculateSoatPrice(
  vehicleType: string,
  cylinderCapacity: number | null
): number {
  const prices = soatPrices2025.filter(
    (price) => price.vehicleType === vehicleType
  );

  if (prices.length === 0) return 0;

  // Si no hay rangos de cilindraje, devolver el precio base
  if (!prices[0]?.cylinderRange) {
    return prices[0]?.basePrice ?? 0;
  }

  // Si hay rangos de cilindraje pero no se proporciona cilindraje
  if (!cylinderCapacity) return 0;

  // Encontrar el rango correcto según el cilindraje
  const price = prices.find((p) => {
    switch (p.cylinderRange) {
      case 'Menos de 1.500 c.c.':
        return cylinderCapacity < 1500;
      case 'De 1.500 a 2.500 c.c.':
        return cylinderCapacity >= 1500 && cylinderCapacity <= 2500;
      case 'Más de 2.500 c.c.':
        return cylinderCapacity > 2500;
      default:
        return false;
    }
  });

  return price?.basePrice ?? 0;
}

export function getAvailableVehicleTypes(): readonly string[] {
  return vehicleTypes;
}
