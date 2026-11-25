/*
 * Fuentes oficiales usadas para redactar y verificar cada pregunta.
 * El código de fuente de cada pregunta empieza con una de estas claves (por ejemplo "PLIEGO 3.4").
 * Todas están citadas en las actas de las Comisiones de Selección publicadas en Paraguay Concursa,
 * salvo las marcadas como complementarias.
 */
export const FUENTES = {
  ACTA_CPI: {
    t: 'Temario oficial de conocimientos técnicos. Actas de las Comisiones de Selección, convocatorias ANDE-CPI-05, 06, 07 y 08-2026.',
    url: 'https://paraguayconcursa.mef.gov.py/'
  },
  ACTA_CPIEP: {
    t: 'Acta N.º 02/2026 y Acta N.º 04/2026 (19/11/2026) de la Comisión de Selección, convocatoria ANDE-CPIEP-74-2026.',
    url: 'https://paraguayconcursa.mef.gov.py/'
  },
  OPENSTAX: {
    t: 'Ling, Moebs y Sanny. Física universitaria, volumen 2 (OpenStax), cap. 9, 10 y 15. Bibliografía oficial del temario CPI.',
    url: 'https://openstax.org/details/books/f%C3%ADsica-universitaria-volumen-2'
  },
  PLIEGO: {
    t: 'ANDE. Pliego de Tarifas N.º 21, versión actualizada 27-11-2024. Bibliografía oficial del temario CPI.',
    url: 'https://www.ande.gov.py/tarifas_vigentes.php'
  },
  RBT: {
    t: 'ANDE. Reglamento para Instalaciones Eléctricas de Baja Tensión. Bibliografía oficial del temario CPI.',
    url: 'https://www.ande.gov.py/documentos/Reglamentos_de_la_ande/Reglamento%20de%20Baja%20Tension%20ANDE.pdf'
  },
  RMT: {
    t: 'ANDE. Reglamento de Ejecución de Instalaciones Eléctricas de Media Tensión. Bibliografía oficial del temario CPI.',
    url: 'https://www.ande.gov.py/documentos/Reglamentos_de_la_ande/Reglamento%20MT%20de%20la%20ANDE.pdf'
  },
  INSST: {
    t: 'INSST. Guía técnica para la evaluación y prevención del riesgo eléctrico (RD 614/2001). Bibliografía oficial de seguridad (CPIEP); complementaria para CPI.',
    url: 'https://www.insst.es/documents/94886/789467/Gu%C3%ADa+t%C3%A9cnica+para+la+evaluaci%C3%B3n+y+prevenci%C3%B3n+de+los+riesgos+relacionados+con+la+protecci%C3%B3n+frente+al+riesgo+el%C3%A9ctrico.pdf'
  },
  KUPHALDT: {
    t: 'Kuphaldt. Circuitos Eléctricos I y II (LibreTexts Español). Bibliografía oficial del temario técnico (CPIEP); complementaria para CPI.',
    url: 'https://espanol.libretexts.org/Bookshelves/Vocacional/Tecnologia_Electronica'
  },
  ESTAD: {
    t: 'Illowsky y Dean. Introducción a la estadística (OpenStax), cap. 1 a 3. Bibliografía oficial del Acta N.º 02/2026 (CPIEP).',
    url: 'https://openstax.org/details/books/introducci%C3%B3n-estad%C3%ADstica'
  },
  EXCEL: {
    t: 'Microsoft. Ayuda y formación de Excel y fichas de funciones. Bibliografía oficial del Acta N.º 02/2026 (CPIEP).',
    url: 'https://support.microsoft.com/es-es/excel/'
  },
  LEY7445: {
    t: 'Ley N.º 7445/2025 «De la Función Pública y del Servicio Civil», cap. III (arts. 14 a 20) y cap. IV (arts. 21 a 26). Bibliografía oficial del Acta N.º 04/2026 (CPIEP).',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/12637/ley-n-74452025-de-la-funcion-publica-y-del-servicio-civil'
  },
  RES33: {
    t: 'Resolución VCHGO N.º 33/2026, Reglamento General de Selección: principios rectores y deberes del postulante. Bibliografía oficial del Acta N.º 04/2026 (CPIEP).',
    url: 'https://www.mef.gov.py/sites/default/files/2026-02/Resolucion%20_VCHGO_33_2026.pdf'
  },
  MISION: {
    t: 'ANDE. Misión, Visión y Valores. Bibliografía oficial del Acta N.º 04/2026 (CPIEP).',
    url: 'https://www.ande.gov.py/mision.php'
  }
};

export function citar(codigo) {
  const clave = String(codigo).split(' ')[0];
  const f = FUENTES[clave];
  if (!f) { return { texto: codigo, url: null }; }
  const detalle = String(codigo).slice(clave.length).trim();
  return { texto: f.t + (detalle ? ' Referencia: ' + detalle + '.' : ''), url: f.url };
}
