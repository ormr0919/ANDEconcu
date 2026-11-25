/*
 * Puestos y categorías del juego.
 * Temarios verificados en las actas de Paraguay Concursa (noviembre de 2026):
 *  - Operador (CPI-08) y Despachante (CPI-05) rinden el mismo temario de 7 bloques.
 *  - Lector (CPI-07) rinde el mismo temario sin el bloque «Sistemas eléctricos de potencia».
 *  - Ingeniero Electricista Junior (CPIEP-74) rinde estadística, planilla electrónica,
 *    legislación/función pública y guaraní (Acta N.º 04/2026).
 */
export const CATEGORIAS = {
  fund: { n: 'Fundamentos', icono: '⚡', color: '#E9A800' },
  leyes: { n: 'Leyes y cálculos', icono: '🧮', color: '#2D7FF9' },
  seg: { n: 'Seguridad eléctrica', icono: '🦺', color: '#E5484D' },
  med: { n: 'Mediciones', icono: '📟', color: '#1E9E73' },
  pot: { n: 'Sistemas de potencia', icono: '🏭', color: '#8E4EC6' },
  dist: { n: 'Distribución', icono: '🔌', color: '#EE7A12' },
  com: { n: 'Comercialización', icono: '🧾', color: '#0FA3B8' },
  est: { n: 'Estadística', icono: '📊', color: '#2D7FF9' },
  xls: { n: 'Excel', icono: '📗', color: '#1E9E73' },
  fp: { n: 'Función pública y ANDE', icono: '🏛️', color: '#8E4EC6' }
};

const CPI_7 = ['fund', 'leyes', 'seg', 'med', 'pot', 'dist', 'com'];
const EXAMEN_CPI = 'Prueba de conocimientos de 30 puntos (más guaraní, test psicométrico y entrevista). La fecha todavía no se publicó: seguí las actas en Paraguay Concursa.';

export const PUESTOS = [
  {
    id: 'lector', n: 'Lector Distribuidor II', corto: 'Lector', icono: '📋',
    conv: 'ANDE-CPI-07-2026', tipo: 'Permanente (CPI)',
    cats: ['fund', 'leyes', 'seg', 'med', 'dist', 'com'],
    nota: 'Mismo temario que Operador y Despachante, sin el bloque de sistemas de potencia.',
    examen: EXAMEN_CPI
  },
  {
    id: 'operador', n: 'Operador de Estaciones y Subestaciones IV', corto: 'Operador', icono: '🎛️',
    conv: 'ANDE-CPI-08-2026', tipo: 'Permanente (CPI)',
    cats: CPI_7,
    nota: 'Mismo temario que Despachante de Carga (7 bloques).',
    examen: EXAMEN_CPI
  },
  {
    id: 'despachante', n: 'Despachante de Carga Junior', corto: 'Despachante', icono: '📡',
    conv: 'ANDE-CPI-05-2026', tipo: 'Permanente (CPI)',
    cats: CPI_7,
    nota: 'Mismo temario que Operador de Estaciones (7 bloques).',
    examen: EXAMEN_CPI
  },
  {
    id: 'ingeniero', n: 'Ingeniero Electricista Junior', corto: 'Ing. Electricista', icono: '👷',
    conv: 'ANDE-CPIEP-74-2026', tipo: 'Contratado (CPIEP)',
    cats: ['est', 'xls', 'fp'],
    nota: 'La prueba no evalúa electricidad: estadística (10), Excel (10), legislación (5) y guaraní (5).',
    examen: 'Sábado 05/12/2026 a las 07:00, Facultad Politécnica UNA (San Lorenzo). Llevá tu cédula, una cuenta de Gmail para el examen de Excel y una calculadora permitida (por ejemplo, CASIO fx-82).',
    fechaExamen: '2026-12-05T07:00:00-03:00'
  }
];

export function puestoPorId(id) {
  return PUESTOS.find(function (p) { return p.id === id; }) || null;
}
