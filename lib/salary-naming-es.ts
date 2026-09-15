/**
 * US Spanish names for occupations people actually search.
 *
 * Written for speakers in the United States, not Spain: *enfermero registrado*,
 * *maestro de primaria*, *desarrollador de software*, and English job titles
 * that stay English because that is what US Spanish searchers type (RN, HVAC,
 * CDL, software developer). Feminine forms are aliases, never a second URL.
 */
import type { OewsOccupation } from '@/lib/data/bls-oews';
import { localeSlug } from '@/lib/i18n/slug';

export type OccupationNamingEs = {
  singular: string;
  plural: string;
  article: 'un' | 'una';
  aliases?: readonly string[];
};

export const OCCUPATION_NAMING_ES: Record<string, OccupationNamingEs> = {
  '11-1011': { singular: 'director ejecutivo', plural: 'directores ejecutivos', article: 'un', aliases: ['CEO', 'jefe ejecutivo'] },
  '11-1021': { singular: 'gerente general o de operaciones', plural: 'gerentes generales o de operaciones', article: 'un', aliases: ['gerente de operaciones', 'gerente general'] },
  '11-2021': { singular: 'gerente de marketing', plural: 'gerentes de marketing', article: 'un' },
  '11-2022': { singular: 'gerente de ventas', plural: 'gerentes de ventas', article: 'un' },
  '11-3021': { singular: 'gerente de sistemas de información', plural: 'gerentes de sistemas de información', article: 'un', aliases: ['gerente de IT', 'director de IT'] },
  '11-3031': { singular: 'gerente financiero', plural: 'gerentes financieros', article: 'un', aliases: ['gerente de finanzas'] },
  '11-3071': { singular: 'gerente de transporte o logística', plural: 'gerentes de transporte o logística', article: 'un', aliases: ['gerente de logística'] },
  '11-3121': { singular: 'gerente de recursos humanos', plural: 'gerentes de recursos humanos', article: 'un', aliases: ['gerente de RH', 'gerente de HR'] },
  '11-9021': { singular: 'gerente de construcción', plural: 'gerentes de construcción', article: 'un' },
  '11-9032': { singular: 'director escolar o administrador de distrito', plural: 'directores escolares o administradores de distrito', article: 'un', aliases: ['director de escuela', 'principal'] },
  '11-9111': { singular: 'gerente de servicios de salud', plural: 'gerentes de servicios de salud', article: 'un', aliases: ['administrador de hospital'] },
  '11-9141': { singular: 'administrador de propiedades', plural: 'administradores de propiedades', article: 'un', aliases: ['property manager'] },
  '13-1020': { singular: 'comprador o agente de compras', plural: 'compradores o agentes de compras', article: 'un', aliases: ['agente de compras'] },
  '13-1031': { singular: 'ajustador de reclamos', plural: 'ajustadores de reclamos', article: 'un', aliases: ['ajustador de seguros'] },
  '13-1041': { singular: 'oficial de cumplimiento', plural: 'oficiales de cumplimiento', article: 'un' },
  '13-1071': { singular: 'especialista en recursos humanos', plural: 'especialistas en recursos humanos', article: 'un', aliases: ['reclutador'] },
  '13-1082': { singular: 'especialista en gestión de proyectos', plural: 'especialistas en gestión de proyectos', article: 'un', aliases: ['project manager', 'gerente de proyecto'] },
  '13-1111': { singular: 'analista de gestión', plural: 'analistas de gestión', article: 'un', aliases: ['consultor de gestión'] },
  '13-1151': { singular: 'especialista en capacitación', plural: 'especialistas en capacitación', article: 'un', aliases: ['capacitador corporativo'] },
  '13-1161': { singular: 'analista de investigación de mercado', plural: 'analistas de investigación de mercado', article: 'un' },
  '13-2011': { singular: 'contador o auditor', plural: 'contadores o auditores', article: 'un', aliases: ['contador', 'CPA', 'auditor'] },
  '13-2051': { singular: 'analista financiero', plural: 'analistas financieros', article: 'un' },
  '15-1211': { singular: 'analista de sistemas', plural: 'analistas de sistemas', article: 'un' },
  '15-1232': { singular: 'especialista de soporte informático', plural: 'especialistas de soporte informático', article: 'un', aliases: ['soporte de IT', 'help desk'] },
  '15-1244': { singular: 'administrador de redes', plural: 'administradores de redes', article: 'un', aliases: ['sysadmin'] },
  '15-1252': { singular: 'desarrollador de software', plural: 'desarrolladores de software', article: 'un', aliases: ['software developer', 'programador', 'ingeniero de software', 'SWE'] },
  '15-1253': { singular: 'analista de control de calidad de software', plural: 'analistas de control de calidad de software', article: 'un', aliases: ['QA engineer'] },
  '15-1254': { singular: 'desarrollador web', plural: 'desarrolladores web', article: 'un', aliases: ['web developer'] },
  '15-2051': { singular: 'científico de datos', plural: 'científicos de datos', article: 'un', aliases: ['data scientist'] },
  '17-2051': { singular: 'ingeniero civil', plural: 'ingenieros civiles', article: 'un' },
  '17-2071': { singular: 'ingeniero eléctrico', plural: 'ingenieros eléctricos', article: 'un' },
  '17-2112': { singular: 'ingeniero industrial', plural: 'ingenieros industriales', article: 'un' },
  '17-2141': { singular: 'ingeniero mecánico', plural: 'ingenieros mecánicos', article: 'un' },
  '19-4021': { singular: 'técnico biológico', plural: 'técnicos biológicos', article: 'un' },
  '21-1012': { singular: 'consejero escolar o vocacional', plural: 'consejeros escolares o vocacionales', article: 'un', aliases: ['orientador'] },
  '21-1018': { singular: 'consejero de salud mental o adicciones', plural: 'consejeros de salud mental o adicciones', article: 'un' },
  '21-1021': { singular: 'trabajador social de familia o escuela', plural: 'trabajadores sociales de familia o escuela', article: 'un', aliases: ['trabajador social'] },
  '21-1093': { singular: 'asistente de servicios humanos', plural: 'asistentes de servicios humanos', article: 'un', aliases: ['trabajador de casos'] },
  '23-1011': { singular: 'abogado', plural: 'abogados', article: 'un', aliases: ['attorney'] },
  '23-2011': { singular: 'paralegal', plural: 'paralegales', article: 'un', aliases: ['asistente legal'] },
  '25-2011': { singular: 'maestro de preescolar', plural: 'maestros de preescolar', article: 'un', aliases: ['maestra de preescolar'] },
  '25-2021': { singular: 'maestro de primaria', plural: 'maestros de primaria', article: 'un', aliases: ['maestra de primaria', 'teacher'] },
  '25-2022': { singular: 'maestro de secundaria intermedia', plural: 'maestros de secundaria intermedia', article: 'un', aliases: ['middle school teacher'] },
  '25-2031': { singular: 'maestro de preparatoria', plural: 'maestros de preparatoria', article: 'un', aliases: ['high school teacher', 'maestro de secundaria'] },
  '25-2058': { singular: 'maestro de educación especial', plural: 'maestros de educación especial', article: 'un' },
  '25-3021': { singular: 'maestro de enriquecimiento personal', plural: 'maestros de enriquecimiento personal', article: 'un' },
  '25-3031': { singular: 'maestro suplente', plural: 'maestros suplentes', article: 'un', aliases: ['substitute teacher'] },
  '25-9045': { singular: 'asistente de maestro', plural: 'asistentes de maestro', article: 'un', aliases: ['paraeducador'] },
  '27-1024': { singular: 'diseñador gráfico', plural: 'diseñadores gráficos', article: 'un' },
  '29-1051': { singular: 'farmacéutico', plural: 'farmacéuticos', article: 'un' },
  '29-1141': { singular: 'enfermero registrado', plural: 'enfermeros registrados', article: 'un', aliases: ['enfermera registrada', 'RN', 'nurse', 'enfermero', 'enfermera'] },
  '29-1171': { singular: 'enfermero practicante', plural: 'enfermeros practicantes', article: 'un', aliases: ['nurse practitioner', 'NP'] },
  '29-1215': { singular: 'médico de familia', plural: 'médicos de familia', article: 'un', aliases: ['doctor de cabecera'] },
  '29-1214': { singular: 'médico de urgencias', plural: 'médicos de urgencias', article: 'un', aliases: ['doctor de ER'] },
  '29-1216': { singular: 'médico internista', plural: 'médicos internistas', article: 'un' },
  '29-1071': { singular: 'asistente médico (PA)', plural: 'asistentes médicos (PA)', article: 'un', aliases: ['physician assistant', 'PA'] },
  '29-1292': { singular: 'higienista dental', plural: 'higienistas dentales', article: 'un' },
  '29-2010': { singular: 'tecnólogo de laboratorio clínico', plural: 'tecnólogos de laboratorio clínico', article: 'un' },
  '29-2052': { singular: 'técnico de farmacia', plural: 'técnicos de farmacia', article: 'un' },
  '29-2061': { singular: 'enfermero práctico licenciado', plural: 'enfermeros prácticos licenciados', article: 'un', aliases: ['LPN', 'LVN', 'enfermera práctica'] },
  '29-2055': { singular: 'tecnólogo quirúrgico', plural: 'tecnólogos quirúrgicos', article: 'un' },
  '31-1120': { singular: 'asistente de cuidado en el hogar', plural: 'asistentes de cuidado en el hogar', article: 'un', aliases: ['cuidador', 'home health aide', 'asistente de salud en el hogar', 'HHA'] },
  '31-1131': { singular: 'asistente de enfermería', plural: 'asistentes de enfermería', article: 'un', aliases: ['CNA', 'enfermero auxiliar'] },
  '31-9091': { singular: 'asistente dental', plural: 'asistentes dentales', article: 'un' },
  '31-9092': { singular: 'asistente médico', plural: 'asistentes médicos', article: 'un', aliases: ['medical assistant'] },
  '33-2011': { singular: 'bombero', plural: 'bomberos', article: 'un' },
  '33-3012': { singular: 'oficial correccional', plural: 'oficiales correccionales', article: 'un' },
  '33-3051': { singular: 'oficial de policía', plural: 'oficiales de policía', article: 'un', aliases: ['policía'] },
  '33-9032': { singular: 'guardia de seguridad', plural: 'guardias de seguridad', article: 'un' },
  '35-1012': { singular: 'supervisor de servicio de alimentos', plural: 'supervisores de servicio de alimentos', article: 'un' },
  '35-2011': { singular: 'cocinero de comida rápida', plural: 'cocineros de comida rápida', article: 'un' },
  '35-2012': { singular: 'cocinero de cafetería o institución', plural: 'cocineros de cafetería o institución', article: 'un' },
  '35-2014': { singular: 'cocinero de restaurante', plural: 'cocineros de restaurante', article: 'un', aliases: ['cocinero', 'line cook'] },
  '35-2021': { singular: 'ayudante de cocina', plural: 'ayudantes de cocina', article: 'un' },
  '35-3011': { singular: 'cantinero', plural: 'cantineros', article: 'un', aliases: ['bartender'] },
  '35-3023': { singular: 'empleado de comida rápida o mostrador', plural: 'empleados de comida rápida o mostrador', article: 'un', aliases: ['empleado de comida rápida', 'trabajador de mostrador'] },
  '35-3031': { singular: 'mesero o mesera', plural: 'meseros o meseras', article: 'un', aliases: ['server', 'mesero'] },
  '35-9011': { singular: 'ayudante de comedor', plural: 'ayudantes de comedor', article: 'un' },
  '35-9021': { singular: 'lavaplatos', plural: 'lavaplatos', article: 'un' },
  '35-9031': { singular: 'anfitrión de restaurante', plural: 'anfitriones de restaurante', article: 'un', aliases: ['host', 'hostess'] },
  '37-2011': { singular: 'conserje', plural: 'conserjes', article: 'un', aliases: ['janitor', 'personal de limpieza'] },
  '37-2012': { singular: 'personal de limpieza doméstica', plural: 'personal de limpieza doméstica', article: 'un', aliases: ['ama de llaves', 'housekeeper'] },
  '37-3011': { singular: 'jardinero o trabajador de áreas verdes', plural: 'jardineros o trabajadores de áreas verdes', article: 'un', aliases: ['landscaper'] },
  '39-3091': { singular: 'asistente de recreación', plural: 'asistentes de recreación', article: 'un' },
  '39-5012': { singular: 'estilista o cosmetólogo', plural: 'estilistas o cosmetólogos', article: 'un', aliases: ['peluquero', 'barbero'] },
  '39-9011': { singular: 'trabajador de cuidado infantil', plural: 'trabajadores de cuidado infantil', article: 'un', aliases: ['niñera', 'daycare'] },
  '39-9031': { singular: 'entrenador personal', plural: 'entrenadores personales', article: 'un' },
  '39-9032': { singular: 'trabajador de recreación', plural: 'trabajadores de recreación', article: 'un' },
  '41-1011': { singular: 'supervisor de tienda', plural: 'supervisores de tienda', article: 'un', aliases: ['gerente de tienda'] },
  '41-2011': { singular: 'cajero', plural: 'cajeros', article: 'un', aliases: ['cajera', 'cajero de tienda'] },
  '41-2021': { singular: 'empleado de mostrador o alquiler', plural: 'empleados de mostrador o alquiler', article: 'un' },
  '41-2031': { singular: 'vendedor en tienda', plural: 'vendedores en tienda', article: 'un', aliases: ['vendedor', 'sales associate', 'vendedor minorista'] },
  '41-3021': { singular: 'agente de seguros', plural: 'agentes de seguros', article: 'un' },
  '41-3031': { singular: 'agente de servicios financieros', plural: 'agentes de servicios financieros', article: 'un', aliases: ['asesor financiero'] },
  '41-3091': { singular: 'representante de ventas de servicios', plural: 'representantes de ventas de servicios', article: 'un' },
  '41-4012': { singular: 'representante de ventas mayoristas', plural: 'representantes de ventas mayoristas', article: 'un' },
  '43-1011': { singular: 'supervisor de oficina', plural: 'supervisores de oficina', article: 'un', aliases: ['office manager'] },
  '43-3021': { singular: 'empleado de facturación', plural: 'empleados de facturación', article: 'un' },
  '43-3031': { singular: 'tenedor de libros', plural: 'tenedores de libros', article: 'un', aliases: ['bookkeeper', 'auxiliar contable'] },
  '43-3071': { singular: 'cajero de banco', plural: 'cajeros de banco', article: 'un', aliases: ['teller'] },
  '43-4051': { singular: 'representante de servicio al cliente', plural: 'representantes de servicio al cliente', article: 'un', aliases: ['customer service', 'CSR', 'atención al cliente', 'call center'] },
  '43-4171': { singular: 'recepcionista', plural: 'recepcionistas', article: 'un' },
  '43-5052': { singular: 'cartero', plural: 'carteros', article: 'un', aliases: ['postal worker'] },
  '43-5061': { singular: 'empleado de planeación de producción', plural: 'empleados de planeación de producción', article: 'un' },
  '43-5071': { singular: 'empleado de envíos y recibos', plural: 'empleados de envíos y recibos', article: 'un' },
  '43-6011': { singular: 'asistente ejecutivo', plural: 'asistentes ejecutivos', article: 'un' },
  '43-6013': { singular: 'secretario médico', plural: 'secretarios médicos', article: 'un' },
  '43-6014': { singular: 'asistente administrativo', plural: 'asistentes administrativos', article: 'un', aliases: ['secretaria', 'admin assistant'] },
  '43-9061': { singular: 'empleado de oficina', plural: 'empleados de oficina', article: 'un' },
  '47-1011': { singular: 'supervisor de construcción', plural: 'supervisores de construcción', article: 'un', aliases: ['foreman'] },
  '47-2031': { singular: 'carpintero', plural: 'carpinteros', article: 'un' },
  '47-2061': { singular: 'obrero de construcción', plural: 'obreros de construcción', article: 'un', aliases: ['construction worker'] },
  '47-2073': { singular: 'operador de equipo pesado', plural: 'operadores de equipo pesado', article: 'un' },
  '47-2111': { singular: 'electricista', plural: 'electricistas', article: 'un', aliases: ['electricista con licencia', 'journeyman electrician'] },
  '47-2152': { singular: 'plomero', plural: 'plomeros', article: 'un', aliases: ['pipefitter'] },
  '49-1011': { singular: 'supervisor de mantenimiento', plural: 'supervisores de mantenimiento', article: 'un' },
  '49-3023': { singular: 'mecánico de autos', plural: 'mecánicos de autos', article: 'un', aliases: ['técnico automotriz'] },
  '49-9021': { singular: 'técnico de HVAC', plural: 'técnicos de HVAC', article: 'un', aliases: ['técnico de aire acondicionado'] },
  '49-9041': { singular: 'mecánico de maquinaria industrial', plural: 'mecánicos de maquinaria industrial', article: 'un' },
  '49-9071': { singular: 'trabajador de mantenimiento', plural: 'trabajadores de mantenimiento', article: 'un', aliases: ['handyman'] },
  '51-1011': { singular: 'supervisor de producción', plural: 'supervisores de producción', article: 'un' },
  '51-2090': { singular: 'ensamblador o fabricador', plural: 'ensambladores o fabricadores', article: 'un' },
  '51-4121': { singular: 'soldador', plural: 'soldadores', article: 'un' },
  '51-9061': { singular: 'inspector de calidad', plural: 'inspectores de calidad', article: 'un' },
  '51-9111': { singular: 'operador de máquina empacadora', plural: 'operadores de máquina empacadora', article: 'un' },
  '53-1047': { singular: 'supervisor de transporte o almacén', plural: 'supervisores de transporte o almacén', article: 'un' },
  '53-3031': { singular: 'conductor de ventas y entrega', plural: 'conductores de ventas y entrega', article: 'un', aliases: ['delivery driver'] },
  '53-3032': { singular: 'camionero', plural: 'camioneros', article: 'un', aliases: ['truck driver', 'conductor de tráiler', 'CDL', 'chofer de tráiler', 'OTR'] },
  '53-3033': { singular: 'conductor de camioneta', plural: 'conductores de camioneta', article: 'un', aliases: ['delivery driver'] },
  '53-3051': { singular: 'conductor de autobús escolar', plural: 'conductores de autobús escolar', article: 'un' },
  '53-7051': { singular: 'operador de montacargas', plural: 'operadores de montacargas', article: 'un', aliases: ['forklift'] },
  '53-7061': { singular: 'limpiador de vehículos', plural: 'limpiadores de vehículos', article: 'un' },
  '53-7062': { singular: 'obrero o cargador', plural: 'obreros o cargadores', article: 'un', aliases: ['warehouse worker'] },
  '53-7064': { singular: 'empacador', plural: 'empacadores', article: 'un' },
  '53-7065': { singular: 'almacenista o surtidor de pedidos', plural: 'almacenistas o surtidores de pedidos', article: 'un', aliases: ['stocker'] },
};

export const MAJOR_GROUP_TITLE_ES: Record<string, { title: string; shortTitle: string }> = {
  '11-0000': { title: 'Gerencia', shortTitle: 'Gerencia' },
  '13-0000': { title: 'Negocios y finanzas', shortTitle: 'Negocios y finanzas' },
  '15-0000': { title: 'Informática y matemáticas', shortTitle: 'Informática' },
  '17-0000': { title: 'Arquitectura e ingeniería', shortTitle: 'Ingeniería' },
  '19-0000': { title: 'Ciencias de la vida, físicas y sociales', shortTitle: 'Ciencias' },
  '21-0000': { title: 'Servicios comunitarios y sociales', shortTitle: 'Servicios sociales' },
  '23-0000': { title: 'Legal', shortTitle: 'Legal' },
  '25-0000': { title: 'Educación y bibliotecas', shortTitle: 'Educación' },
  '27-0000': { title: 'Arte, diseño, entretenimiento y medios', shortTitle: 'Arte y medios' },
  '29-0000': { title: 'Profesionales de la salud', shortTitle: 'Salud' },
  '31-0000': { title: 'Apoyo en salud', shortTitle: 'Apoyo en salud' },
  '33-0000': { title: 'Protección y seguridad', shortTitle: 'Protección' },
  '35-0000': { title: 'Preparación y servicio de alimentos', shortTitle: 'Alimentos' },
  '37-0000': { title: 'Limpieza y mantenimiento', shortTitle: 'Limpieza' },
  '39-0000': { title: 'Cuidado personal y servicios', shortTitle: 'Cuidado personal' },
  '41-0000': { title: 'Ventas', shortTitle: 'Ventas' },
  '43-0000': { title: 'Oficina y apoyo administrativo', shortTitle: 'Oficina' },
  '45-0000': { title: 'Agricultura, pesca y silvicultura', shortTitle: 'Agricultura' },
  '47-0000': { title: 'Construcción y extracción', shortTitle: 'Construcción' },
  '49-0000': { title: 'Instalación, mantenimiento y reparación', shortTitle: 'Reparación' },
  '51-0000': { title: 'Producción', shortTitle: 'Producción' },
  '53-0000': { title: 'Transporte y movimiento de materiales', shortTitle: 'Transporte' },
};

export function majorGroupTitleEs(majorCode: string, englishTitle: string): { title: string; shortTitle: string } {
  return MAJOR_GROUP_TITLE_ES[majorCode] ?? {
    title: translateBlsTitle(englishTitle),
    shortTitle: translateBlsTitle(englishTitle.replace(/\s+Occupations$/i, '')),
  };
}

export function hasCuratedNameEs(occupation: Pick<OewsOccupation, 'code'>): boolean {
  return occupation.code in OCCUPATION_NAMING_ES;
}

const PHRASE_ES: ReadonlyArray<readonly [RegExp, string]> = [
  [/Nurse Anesthetists/gi, 'enfermeros anestesistas'],
  [/Nurse Midwives/gi, 'enfermeras parteras'],
  [/Nurse Practitioners/gi, 'enfermeros practicantes'],
  [/Except Special Education/gi, 'excepto educación especial'],
  [/Elementary School Teachers/gi, 'maestros de primaria'],
  [/Secondary School Teachers/gi, 'maestros de preparatoria'],
  [/Middle School Teachers/gi, 'maestros de secundaria intermedia'],
  [/Special Education Teachers/gi, 'maestros de educación especial'],
  [/Aircraft Mechanics and Service Technicians/gi, 'mecánicos de aeronaves y técnicos de servicio'],
  [/Automotive Service Technicians and Mechanics/gi, 'técnicos de servicio automotriz y mecánicos'],
  [/Bus and Truck Mechanics and Diesel Engine Specialists/gi, 'mecánicos de autobuses y camiones y especialistas en diésel'],
  [/Computer and Information Systems Managers/gi, 'gerentes de sistemas de información e informática'],
  [/and Related Occupations/gi, 'y ocupaciones afines'],
  [/and Related Workers/gi, 'y trabajadores afines'],
  [/All Other/gi, 'otros'],
  [/not otherwise classified/gi, 'no clasificados en otra parte'],
];

const WORD_ES: Record<string, string> = {
  managers: 'gerentes',
  manager: 'gerente',
  teachers: 'maestros',
  teacher: 'maestro',
  workers: 'trabajadores',
  worker: 'trabajador',
  engineers: 'ingenieros',
  engineer: 'ingeniero',
  analysts: 'analistas',
  analyst: 'analista',
  assistants: 'asistentes',
  assistant: 'asistente',
  specialists: 'especialistas',
  specialist: 'especialista',
  technicians: 'técnicos',
  technician: 'técnico',
  operators: 'operadores',
  operator: 'operador',
  supervisors: 'supervisores',
  supervisor: 'supervisor',
  clerks: 'empleados',
  clerk: 'empleado',
  scientists: 'científicos',
  scientist: 'científico',
  physicians: 'médicos',
  physician: 'médico',
  nurses: 'enfermeros',
  nurse: 'enfermero',
  drivers: 'conductores',
  driver: 'conductor',
  mechanics: 'mecánicos',
  mechanic: 'mecánico',
  inspectors: 'inspectores',
  inspector: 'inspector',
  officers: 'oficiales',
  officer: 'oficial',
  representatives: 'representantes',
  representative: 'representante',
  coordinators: 'coordinadores',
  coordinator: 'coordinador',
  directors: 'directores',
  director: 'director',
  aides: 'auxiliares',
  aide: 'auxiliar',
  helpers: 'ayudantes',
  helper: 'ayudante',
  cleaners: 'personal de limpieza',
  cleaner: 'personal de limpieza',
  assemblers: 'ensambladores',
  assembler: 'ensamblador',
  packers: 'empacadores',
  packer: 'empacador',
  cooks: 'cocineros',
  cook: 'cocinero',
  cashiers: 'cajeros',
  cashier: 'cajero',
  salespersons: 'vendedores',
  salesperson: 'vendedor',
  programmers: 'programadores',
  programmer: 'programador',
  developers: 'desarrolladores',
  developer: 'desarrollador',
  accountants: 'contadores',
  accountant: 'contador',
  firefighters: 'bomberos',
  firefighter: 'bombero',
  electricians: 'electricistas',
  electrician: 'electricista',
  plumbers: 'plomeros',
  plumber: 'plomero',
  carpenters: 'carpinteros',
  carpenter: 'carpintero',
  painters: 'pintores',
  painter: 'pintor',
  welders: 'soldadores',
  welder: 'soldador',
  machinists: 'maquinistas',
  machinist: 'maquinista',
  roofers: 'techadores',
  roofer: 'techador',
  installers: 'instaladores',
  installer: 'instalador',
  repairers: 'reparadores',
  repairer: 'reparador',
  technologists: 'tecnólogos',
  technologist: 'tecnólogo',
  lawyers: 'abogados',
  lawyer: 'abogado',
  paralegals: 'paralegales',
  paralegal: 'paralegal',
  judges: 'jueces',
  judge: 'juez',
  pharmacists: 'farmacéuticos',
  pharmacist: 'farmacéutico',
  therapists: 'terapeutas',
  therapist: 'terapeuta',
  dentists: 'dentistas',
  dentist: 'dentista',
  surgeons: 'cirujanos',
  surgeon: 'cirujano',
  counselors: 'consejeros',
  counselor: 'consejero',
  advisors: 'asesores',
  advisor: 'asesor',
  advisers: 'asesores',
  adviser: 'asesor',
  designers: 'diseñadores',
  designer: 'diseñador',
  writers: 'escritores',
  writer: 'escritor',
  editors: 'editores',
  editor: 'editor',
  photographers: 'fotógrafos',
  photographer: 'fotógrafo',
  librarians: 'bibliotecarios',
  librarian: 'bibliotecario',
  professors: 'profesores',
  professor: 'profesor',
  instructors: 'instructores',
  instructor: 'instructor',
  architects: 'arquitectos',
  architect: 'arquitecto',
  surveyors: 'topógrafos',
  surveyor: 'topógrafo',
  economists: 'economistas',
  economist: 'economista',
  psychologists: 'psicólogos',
  psychologist: 'psicólogo',
  agents: 'agentes',
  agent: 'agente',
  appraisers: 'tasadores',
  appraiser: 'tasador',
  buyers: 'compradores',
  buyer: 'comprador',
  loaders: 'cargadores',
  loader: 'cargador',
  dispatchers: 'despachadores',
  dispatcher: 'despachador',
  tellers: 'cajeros',
  teller: 'cajero',
  receptionists: 'recepcionistas',
  receptionist: 'recepcionista',
  attendants: 'asistentes',
  attendant: 'asistente',
  bakers: 'panaderos',
  baker: 'panadero',
  butchers: 'carniceros',
  butcher: 'carnicero',
  pilots: 'pilotos',
  pilot: 'piloto',
  janitors: 'conserjes',
  janitor: 'conserje',
  guards: 'guardias',
  guard: 'guardia',
  investigators: 'investigadores',
  investigator: 'investigador',
  bartenders: 'cantineros',
  bartender: 'cantinero',
  waiters: 'meseros',
  waiter: 'mesero',
  waitresses: 'meseras',
  waitress: 'mesera',
  and: 'y',
  of: 'de',
  or: 'o',
  the: '',
  other: 'otros',
};

function translateBlsTitle(title: string): string {
  let text = title;
  for (const [pattern, replacement] of PHRASE_ES) text = text.replace(pattern, replacement);
  const translated = text
    .split(/(\s+|,[ ]*)/)
    .map((token) => {
      if (/^\s+$/.test(token) || token.startsWith(',')) return token;
      const key = token.toLowerCase();
      if (key in WORD_ES) return WORD_ES[key];
      return token;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return translated;
}

export function occupationNamingEs(occupation: Pick<OewsOccupation, 'code' | 'displayTitle'>): OccupationNamingEs {
  const curated = OCCUPATION_NAMING_ES[occupation.code];
  if (curated) return curated;
  const translated = translateBlsTitle(occupation.displayTitle);
  const singular = translated.length > 0 ? translated : occupation.displayTitle;
  return {
    singular,
    plural: singular,
    article: 'un',
    aliases: translated === occupation.displayTitle ? undefined : [occupation.displayTitle],
  };
}

export function occupationSingularEs(occupation: Pick<OewsOccupation, 'code' | 'displayTitle'>): string {
  return occupationNamingEs(occupation).singular;
}

export function occupationPluralEs(occupation: Pick<OewsOccupation, 'code' | 'displayTitle'>): string {
  return occupationNamingEs(occupation).plural;
}

export function occupationArticleEs(occupation: Pick<OewsOccupation, 'code' | 'displayTitle'>): 'un' | 'una' {
  return occupationNamingEs(occupation).article;
}

export function occupationAliasesEs(occupation: Pick<OewsOccupation, 'code' | 'displayTitle'>): readonly string[] {
  return occupationNamingEs(occupation).aliases ?? [];
}

export function occupationSlugEs(occupation: Pick<OewsOccupation, 'code' | 'displayTitle' | 'slug'>): string {
  const curated = OCCUPATION_NAMING_ES[occupation.code];
  if (curated) {
    const slug = localeSlug(curated.singular);
    return slug.length > 0 ? slug : occupation.slug;
  }
  const fromTitle = localeSlug(occupationNamingEs(occupation).singular);
  return fromTitle.length > 0 ? fromTitle : occupation.slug;
}

export function occupationSearchTermsEs(occupation: Pick<OewsOccupation, 'code' | 'displayTitle' | 'title' | 'slug'>): string[] {
  const naming = occupationNamingEs(occupation);
  return [...new Set([
    naming.singular.toLowerCase(),
    naming.plural.toLowerCase(),
    occupation.displayTitle.toLowerCase(),
    occupation.title.toLowerCase(),
    occupation.code.toLowerCase(),
    occupation.code.replace('-', ''),
    ...occupationAliasesEs(occupation).map((alias) => alias.toLowerCase()),
    'sueldo',
    'salario',
  ])];
}
