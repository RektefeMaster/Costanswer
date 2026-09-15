import type { ToolEditorial } from '../types';

export const EDITORIAL_ES: ToolEditorial[] = [
  {
    toolId: 'hourly-to-salary',
    guide: {
      heading: 'Cómo convertimos la paga por hora en salario anual',
      lede: 'Esta calculadora convierte tu tarifa por hora en sueldo bruto semanal, mensual y anual. Las horas extra se calculan por separado a tiempo y medio (1.5×), a menos que cambies el multiplicador. Este cálculo es antes de impuestos.',
      sections: [
        {
          heading: 'Qué significan estas cifras',
          paragraphs: [
            'El salario anual es igual a la tarifa por hora × horas por semana × semanas pagadas al año. El sueldo mensual es esa cifra anual dividida entre 12, no un promedio de días naturales. El sueldo semanal es tarifa × horas. Por ejemplo, trabajar 40 horas durante 52 semanas a $28/hora equivale a $58,240 anuales antes de impuestos.',
            'Las horas extra solo se suman para las horas adicionales que introduzcas. El multiplicador predeterminado es 1.5× la tarifa base, lo cual coincide con la regla general de tiempo y medio de la Ley de Normas Justas de Trabajo (FLSA) en EE. UU., aunque ciertos contratos colectivos o puestos exentos pueden tener condiciones distintas.',
          ],
        },
        {
          heading: 'Cuándo conviene consultar el sueldo neto',
          paragraphs: [
            'El salario bruto es la cifra que suele figurar en las ofertas de empleo. Sin embargo, el alquiler, la cuota del auto y las aportaciones al 401(k) se pagan con el sueldo neto (take-home pay). Una vez que tengas tu sueldo anual, usa las calculadoras de salario después de impuestos y nómina neta para aplicar impuestos federales, FICA y las retenciones estatales vigentes.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Cuánto es $28 por hora al año antes de impuestos?',
        answer: [
          'A 40 horas por semana y 52 semanas al año, $28 por hora equivale a $58,240 brutos anuales. Si trabajas menos semanas o menos horas, ajusta los campos correspondientes. Las horas extra son adicionales y no están incluidas en esa cifra.',
        ],
      },
      {
        question: '¿Incluye este cálculo horas extra, bonos o propinas?',
        answer: [
          'Las horas extra tienen su propia casilla. Los bonos, propinas, comisiones o turnos nocturnos diferenciados no se modelan aquí; puedes calcularlos por separado o usar la calculadora de impuestos sobre bonos.',
        ],
      },
      {
        question: '¿Es este mi sueldo neto en mano?',
        answer: [
          'No. Este resultado muestra únicamente el salario bruto. El impuesto federal sobre el ingreso, el Seguro Social, Medicare y los impuestos estatales se calculan en la página de salario después de impuestos.',
        ],
      },
      {
        question: '¿Aplica esta fórmula para empleos asalariados exentos?',
        answer: [
          'Si ya tienes un salario anual acordado, no necesitas esta conversión. Esta herramienta está pensada para pagos por hora. La condición de exento cambia las reglas de horas extra, pero la matemática base de tarifa × horas × semanas sigue siendo la misma.',
        ],
      },
    ],
    glossary: [
      { term: 'Sueldo bruto (Gross pay)', definition: 'Ingresos totales antes de deducir impuestos sobre la renta, FICA y otras retenciones de nómina.' },
      { term: 'Tiempo y medio (Time-and-a-half)', definition: 'Tarifa habitual de horas extra en EE. UU.: 1.5 veces la tarifa base por hora para horas trabajadas más allá de las 40 horas semanales.' },
      { term: 'FLSA', definition: 'Ley federal de Normas Justas de Trabajo (Fair Labor Standards Act), que establece el estándar de pago de horas extra para trabajadores no exentos.' },
      { term: 'Semanas pagadas al año', definition: 'Cantidad de semanas efectivas con remuneración. 52 semanas representa un año completo sin permisos no remunerados.' },
    ],
    tips: [
      'Si tu empleo solo contempla 48 semanas pagadas al año, introduce 48. Mantener 52 inflará tu cálculo anual.',
      'Al comparar dos ofertas de trabajo, iguálalas en horas y semanas pagadas antes de comparar la tarifa por hora directa.',
      'Una vez obtenido el salario anual, revisa la calculadora de sueldo neto seleccionando el estado en el que realmente vas a residir y trabajar.',
    ],
    caveats: [
      'Este resultado es sueldo bruto, no constituye nómina neta ni asesoramiento fiscal.',
      'La normativa de horas extra varía según la clasificación del puesto y las leyes laborales estatales.',
    ],
  },
  {
    toolId: 'salary-after-tax',
    guide: {
      heading: 'Cómo calculamos el salario anual después de impuestos',
      lede: 'Partimos del salario anual bruto introducido y aplicamos el impuesto federal sobre el ingreso, el Seguro Social, Medicare y la tabla de impuestos sobre salarios de tu estado cuando CostAnswer dispone de datos verificados para el año en curso. Es una proyección de ingreso neto, no una declaración de impuestos formal.',
      sections: [
        {
          heading: 'Impuesto federal, FICA e impuesto estatal',
          paragraphs: [
            'El impuesto federal sobre el ingreso aplica los tramos oficiales del IRS y la deducción estándar vigente en nuestro registro del año fiscal. FICA comprende el 6.2% de Seguro Social (hasta el tope salarial anual) y el 1.45% de Medicare (sobre todos los salarios), más el impuesto adicional de Medicare cuando los ingresos superan el umbral legal.',
            'El impuesto estatal solo se calcula si nuestro sistema cuenta con una tabla verificada para el estado seleccionado. En estados sin impuesto sobre la renta (como Texas, Florida, Nevada o Washington), la línea estatal es $0. Los impuestos locales de ciudad o condado no se calculan salvo que se especifique en la herramienta.',
          ],
        },
        {
          heading: 'Diferencias con un cheque de nómina o formulario W-2 real',
          paragraphs: [
            'Los empleadores efectúan retenciones basadas en la Publicación 15-T del IRS y tu formulario W-4, lo que puede diferir de una división matemática uniforme de la obligación anual. Asimismo, aportaciones antes de impuestos al 401(k), seguro de salud o cuentas HSA reducen tanto el ingreso sujeto a impuestos como el efectivo final.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Cuánto queda neto de un salario de $100,000 en EE. UU.?',
        answer: [
          'Depende de tu estado civil tributario y de tu estado de residencia. Primero se deducen el impuesto federal y FICA. En estados con impuesto sobre la renta (como California o Nueva York) la deducción es mayor; en estados sin impuesto estatal (como Texas o Florida), el sueldo neto es considerablemente más alto.',
        ],
      },
      {
        question: '¿Cómo funciona en estados sin impuesto sobre la renta como Texas o Florida?',
        answer: [
          'Texas y Florida no gravan el ingreso salarial a nivel estatal, por lo que esa casilla marcará $0. No obstante, seguirás pagando el impuesto federal sobre la renta y las contribuciones a FICA (Seguro Social y Medicare).',
        ],
      },
      {
        question: '¿Es este resultado idéntico a lo que cobraré en mi cheque?',
        answer: [
          'Comparten la misma estimación impositiva anual, pero en la nómina real intervienen las retenciones declaradas en tu W-4, deducciones de beneficios médicos y aportes de retiro que pueden variar cada periodo.',
        ],
      },
      {
        question: '¿Puedo usar este cálculo para presentar mi Formulario 1040?',
        answer: [
          'No. Créditos tributarios específicos, deducciones detalladas, ganancias de capital e impuestos locales quedan fuera del alcance de este modelo rápido. Utiliza un software de preparación tributaria o un profesional cualificado.',
        ],
      },
    ],
    glossary: [
      { term: 'Sueldo neto (Take-home pay)', definition: 'La cantidad que queda tras deducir impuestos federales, estatales y aportes de FICA.' },
      { term: 'FICA', definition: 'Impuestos de la Ley de Contribuciones al Seguro Federal, compuestos por Seguro Social (OASDI) y Medicare.' },
      { term: 'Deducción estándar (Standard deduction)', definition: 'Monto que el IRS permite restar del ingreso bruto antes de aplicar las tasas impositivas, si no se detallan deducciones.' },
      { term: 'Tope salarial de Seguro Social (Wage base)', definition: 'Límite máximo de ingresos anuales sujetos al impuesto del Seguro Social fijado por la SSA para cada año fiscal.' },
      { term: 'W-4', definition: 'Formulario que entregas a tu empleador para indicarle el nivel de retención de impuestos federales en cada nómina.' },
    ],
    tips: [
      'Selecciona el estado civil tributario con el que realmente presentas tu declaración (soltero, casado conjunto, cabeza de familia).',
      'Si aportas a un plan 401(k) tradicional, descuenta esa aportación de tu salario bruto para simular tu ingreso neto imponible con mayor precisión.',
      'Al comparar ofertas de trabajo entre distintos estados, evalúa siempre el costo de vida y alquiler además del impacto tributario.',
    ],
    caveats: [
      'No constituye asesoramiento fiscal ni sustituye la preparación de una declaración de impuestos oficial.',
      'Las tablas aplicadas corresponden al año fiscal especificado en la herramienta.',
    ],
  },
  {
    toolId: 'paycheck',
    guide: {
      heading: 'Cómo se reparte el sueldo neto estimado en cada cheque de pago',
      lede: 'CostAnswer proyecta la obligación tributaria federal, estatal y de FICA para el año completo, y posteriormente la distribuye según la frecuencia de cobro seleccionada. Las retenciones reales en nómina dependen del formulario W-4 y las tablas del IRS.',
      sections: [
        {
          heading: 'Frecuencia de pago y periodicidad',
          paragraphs: [
            'Las opciones semanal, quincenal (cada dos semanas), dos veces al mes (semimensual) y mensual dividen el total anual estimado. Cobrar cada dos semanas (biweekly) significa 26 cheques al año; cobrar dos veces al mes (semimonthly) significa 24 cheques. Por ello, dos cobros al mes no son exactamente lo mismo que cobrar quincenalmente.',
            'El modo por hora convierte tu tarifa y jornada en salario anual antes de aplicar el mismo desglose impositivo.',
          ],
        },
        {
          heading: 'Por qué tu cheque real puede variar',
          paragraphs: [
            'Los empleadores aplican las fórmulas de retención de la Publicación 15-T del IRS. Retenciones adicionales voluntarias, aumentos salariales recientes, bonos incluidos en la misma nómina y beneficios antes de impuestos (seguro de salud, 401k) modifican la cifra final en tu talón de pago.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Cómo estimo mi cheque quincenal (biweekly) neto?',
        answer: [
          'Introduce tu salario anual o paga por hora, selecciona tu estado y elige la opción "Cada dos semanas" (26 pagos al año). La cifra neta es la estimación anual dividida entre 26.',
        ],
      },
      {
        question: '¿Por qué mi talón de pago real es algo mayor o menor?',
        answer: [
          'Tu empleador aplica las retenciones de tu W-4 específico. Además, deducciones como seguro médico de empresa, aportes de jubilación y posibles impuestos locales de ciudad influyen en el importe final.',
        ],
      },
      {
        question: '¿Un bono pagado por separado usa este mismo cálculo?',
        answer: [
          'Normalmente no. Los bonos y pagos suplementarios suelen tener una retención federal fija establecida por el IRS cuando se abonan de forma independiente. Utiliza nuestra calculadora de impuestos sobre bonos para esos casos.',
        ],
      },
    ],
    glossary: [
      { term: 'Quincenal (Biweekly)', definition: '26 periodos de pago al año, cobrando cada dos semanas (habitualmente en viernes).' },
      { term: 'Semimensual (Semimonthly)', definition: '24 periodos de pago al año, habitualmente cobrando el día 15 y el último día del mes.' },
      { term: 'Retención de nómina (Withholding)', definition: 'Cantidad que el empleador retiene y envía al IRS y al estado en tu nombre como adelanto de impuestos.' },
      { term: 'Pago neto (Net pay)', definition: 'Importe estimado que se deposita en tu cuenta bancaria tras las deducciones impositivas modeladas.' },
    ],
    tips: [
      'Si cobras cada dos viernes, selecciona siempre "Cada dos semanas" (26 pagos) y no "Dos veces al mes" (24 pagos).',
      'Un aumento salarial a mitad de año tardará varias nóminas en estabilizarse respecto a un cálculo anualizado.',
      'Revisa los "Detalles técnicos" para verificar la versión del método y los datos oficiales empleados.',
    ],
    caveats: [
      'Es una estimación del cheque de pago, no una liquidación de nómina vinculante ni asesoría impositiva.',
      'Los impuestos locales de ocupación o condado no se incluyen a menos que se indiquen explícitamente.',
    ],
  },
  {
    toolId: 'mortgage-payment',
    guide: {
      heading: 'Cómo se calcula la cuota mensual de hipoteca en EE. UU.',
      lede: 'El pago principal y de intereses (P&I) se determina mediante la fórmula estándar de amortización a tasa fija, utilizando el promedio nacional de Freddie Mac o la tasa personalizada que introduzcas. Los impuestos a la propiedad, el seguro de vivienda, la HOA y el seguro PMI son opcionales y los agregas según tu situación.',
      sections: [
        {
          heading: 'Monto del préstamo y fórmula de amortización',
          paragraphs: [
            'El precio de compra de la vivienda menos tu pago inicial (down payment) representa el capital a amortizar. La cuota mensual fija de capital e intereses se calcula con base en la tasa y el plazo. Un préstamo a 30 años consta de 360 pagos mensuales; a 15 años son 180 pagos.',
            'La tasa predeterminada de la calculadora proviene del promedio nacional semanal de la encuesta PMMS de Freddie Mac registrada en el sitio. Las ofertas reales de prestamistas en tu código postal variarán según tu puntaje de crédito (FICO), puntos de descuento y tipo de propiedad.',
          ],
        },
        {
          heading: 'Gastos de depósito en garantía (Escrow) que puedes añadir',
          paragraphs: [
            'El impuesto sobre la propiedad, el seguro de hogar (homeowners insurance) y las cuotas de la asociación de propietarios (HOA) son conceptos mensuales adicionales. Si tu pago inicial es inferior al 20% en un préstamo convencional, es habitual que debas abonar un seguro hipotecario privado (PMI).',
            'Una propiedad de $400,000 con un 20% de enganche genera un préstamo de $320,000. La cuota mensual P&I para ese préstamo con un 6.5% a 30 años es muy distinta que si se financia con solo el 5% de enganche e incluye PMI e impuestos. Configura siempre los datos reales de tu operación.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿La cuota de hipoteca mostrada incluye impuestos y seguros?',
        answer: [
          'Solo si introduces esos datos en las casillas opcionales. El resultado destacado principal corresponde exclusivamente a capital e intereses (P&I). Si la cotización de un prestamista es superior, habitualmente se debe a que ya incluye escrow de impuestos, seguro o PMI.',
        ],
      },
      {
        question: '¿Qué tasa de interés utiliza CostAnswer?',
        answer: [
          'Utilizamos el promedio nacional semanal de la encuesta PMMS de Freddie Mac para hipotecas a 30 y 15 años fijos. Siempre puedes sustituir esa tasa por una oferta específica que te haya proporcionado tu prestamista.',
        ],
      },
      {
        question: '¿Se puede estimar un préstamo FHA con esta calculadora?',
        answer: [
          'Sí, introduciendo el pago inicial y la tasa acordada para el préstamo FHA. Ten en cuenta que la prima mensual de seguro hipotecario (MIP) de FHA y los límites de préstamo por condado publicados por HUD deben comprobarse en las tablas oficiales correspondientes.',
        ],
      },
      {
        question: '¿Puedo usar esta página para comparar un refinanciamiento?',
        answer: [
          'Sí, para calcular la nueva mensualidad con el nuevo saldo, tasa y plazo. Para calcular el tiempo de recuperación de los gastos de cierre, consulta nuestra calculadora de refinanciamiento.',
        ],
      },
    ],
    glossary: [
      { term: 'Capital e intereses (P&I)', definition: 'La cuota básica mensual destinada a pagar el dinero prestado y los intereses. No incluye impuestos, seguros ni HOA salvo que los agregues.' },
      { term: 'Freddie Mac PMMS', definition: 'Encuesta semanal del mercado hipotecario primario que publica las tasas de interés promedio a nivel nacional en EE. UU.' },
      { term: 'PMI (Private Mortgage Insurance)', definition: 'Seguro hipotecario privado exigido normalmente en préstamos convencionales cuando el pago inicial es menor al 20% del valor de compra.' },
      { term: 'Escrow (Fideicomiso / Depósito en garantía)', definition: 'Cuenta gestionada por el prestamista donde se retiene mensualmente una parte de tu pago para liquidar el impuesto sobre la propiedad y el seguro de la vivienda.' },
    ],
    tips: [
      'Si cuentas con una cotización previa de un banco o prestamista, introduce esa tasa exacta en lugar del promedio nacional.',
      'Compara la cuota a 15 años frente a 30 años con el mismo enganche: pagarás algo más al mes pero ahorrarás decenas de miles de dólares en intereses totales.',
      'Consulta la tabla de amortización para observar cómo evoluciona la proporción de capital frente a intereses en cada mensualidad.',
    ],
    caveats: [
      'No constituye una oferta de crédito, estimación formal de préstamo (Loan Estimate) ni asesoramiento financiero.',
      'Los puntos de descuento y comisiones de originación se pagan al cierre y no están incluidos en la cuota P&I básica.',
    ],
  },
  {
    toolId: 'home-affordability',
    guide: {
      heading: 'Cómo determinamos “¿qué vivienda puedo pagar?”',
      lede: 'CostAnswer compara el pago mensual de la vivienda con tus ingresos netos en mano (take-home pay), o calcula en sentido inverso el precio de compra adecuado según tres rangos: cómodo, ajustado o agresivo. Estos márgenes son pautas de planificación personal, no una decisión vinculante de un analista hipotecario.',
      sections: [
        {
          heading: 'Ingresos netos en lugar de la regla tradicional 28/36 sobre bruto',
          paragraphs: [
            'Las reglas clásicas bancarias suelen evaluar el ingreso bruto. Esta herramienta prioriza tu sueldo neto real, ya que es el dinero disponible en tu cuenta con el que realmente pagas la hipoteca, los impuestos, los seguros y tus restantes compromisos cotidianos.',
            'Los rangos "Cómodo", "Ajustado" y "Agresivo" son umbrales de referencia basados en el porcentaje de tus ingresos netos. Un banco podría aprobar un préstamo que aquí calificamos como agresivo, o rechazar uno cómodo por factores como historial de crédito o reservas que quedan fuera de este modelo.',
          ],
        },
        {
          heading: 'Elementos que componen la mensualidad',
          paragraphs: [
            'El costo de la vivienda integra capital e intereses calculados con la misma fórmula hipotecaria amortizable, sumando los impuestos de propiedad, seguro, cuotas de HOA y pagos de deudas personales que declares.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Qué porcentaje del sueldo neto se aconseja destinar a la vivienda?',
        answer: [
          'La recomendación habitual de presupuesto cómodo sitúa el gasto total de vivienda (hipoteca, impuestos, seguro y HOA) por debajo del 28% al 30% de tus ingresos netos en mano. Superar el 35% a 40% suele considerarse un presupuesto ajustado o agresivo.',
        ],
      },
      {
        question: '¿Cómo influyen mis deudas mensuales existentes?',
        answer: [
          'Préstamos de auto, tarjetas de crédito y préstamos estudiantiles reducen la cantidad mensual libre para pagar la vivienda. Los prestamistas analizan tu relación deuda-ingreso (DTI) total antes de aprobar la hipoteca.',
        ],
      },
    ],
    glossary: [
      { term: 'DTI (Debt-to-Income Ratio)', definition: 'Relación deuda-ingreso: porcentaje de tus ingresos brutos o netos que se destina al pago mensual de deudas obligatorias.' },
      { term: 'Presupuesto cómodo', definition: 'Rango de costo de vivienda que deja suficiente margen mensual para ahorro, emergencias y gastos habituales sin estrés financiero.' },
    ],
    tips: [
      'Sé realista con los gastos de mantenimiento y reparación: planifica reservar entre el 1% y 2% del valor de la propiedad al año para imprevistos.',
      'No agotes todos tus ahorros en el pago inicial; reserva un fondo de emergencia para cubrir al menos 3 a 6 meses de pagos hipotecarios.',
    ],
    caveats: [
      'Los resultados son orientativos y no garantizan la aprobación de un crédito hipotecario.',
    ],
  },
  {
    toolId: 'inflation',
    guide: {
      heading: 'Cómo calculamos el poder adquisitivo con el IPC de EE. UU.',
      lede: 'Comparamos el valor del dinero entre dos fechas utilizando el Índice de Precios al Consumidor para Todos los Consumidores Urbanos (CPI-U, no desestacionalizado) publicado mensualmente por la Oficina de Estadísticas Laborales de EE. UU. (BLS) desde 1913.',
      sections: [
        {
          heading: 'Fórmula de ajuste por inflación',
          paragraphs: [
            'El valor ajustado se calcula multiplicando el importe original por el cociente entre el índice CPI del año final y el índice CPI del año inicial: Valor final = Importe original × (CPI final ÷ CPI inicial).',
            'El CPI-U representa la canasta de compras de aproximadamente el 93% de la población de EE. UU., abarcando alimentos, vivienda, transporte, atención médica y energía.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Cuánto valen hoy $100 de 1990?',
        answer: [
          'Debido a la inflación acumulada en EE. UU., $100 de 1990 equivalen a más del doble en dólares actuales según las cifras oficiales del CPI-U de la BLS. Introduce 1990 y el año actual en la calculadora para ver el importe exacto.',
        ],
      },
      {
        question: '¿De dónde proceden los datos históricos?',
        answer: [
          'De la serie mensual CPI-U publicada de forma oficial por la Bureau of Labor Statistics (BLS) del Departamento de Trabajo de EE. UU.',
        ],
      },
    ],
    glossary: [
      { term: 'CPI-U', definition: 'Índice de Precios al Consumidor para Consumidores Urbanos en EE. UU., métrica oficial de referencia para calcular la inflación.' },
      { term: 'Poder adquisitivo', definition: 'La cantidad de bienes y servicios que una suma de dinero determinada puede adquirir en un momento específico.' },
    ],
    tips: [
      'Al comparar salarios históricos de hace 10 o 20 años con ofertas actuales, ajusta siempre por inflación para comprobar si tu poder adquisitivo real ha crecido.',
    ],
    caveats: [
      'El CPI-U mide un promedio nacional; los aumentos en rubros específicos como vivienda urbana o educación universitaria pueden superar ampliamente el promedio general.',
    ],
  },
  {
    toolId: 'electricity-cost',
    guide: {
      heading: 'Cómo calculamos el costo de electricidad por estado',
      lede: 'Comparamos tu consumo en kilovatios-hora (kWh) con las tarifas residenciales promedio vigentes para cada estado, registradas por la Administración de Información Energética de EE. UU. (EIA) en su informe mensual Electric Power Monthly.',
      sections: [
        {
          heading: 'Tarifas residenciales de la EIA',
          paragraphs: [
            'El costo se calcula multiplicando tus kWh consumidos por la tarifa residencial media en centavos por kilovatio-hora de tu estado. Las tarifas varían sustancialmente entre estados: regiones como el Golfo de México o el Medio Oeste disfrutan de tarifas de 12 a 15 ¢/kWh, mientras que en California o el Noreste pueden superar los 25 a 35 ¢/kWh.',
            'Tu factura real de la compañía eléctrica incluye cargos fijos de servicio, tasas de distribución e impuestos locales que pueden hacer variar el precio por kWh final.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Cuál es el consumo promedio mensual de un hogar en EE. UU.?',
        answer: [
          'Según la EIA, un hogar promedio en EE. UU. consume cerca de 880 a 900 kWh al mes, aunque el uso de aire acondicionado en el sur o calefacción eléctrica en invierno puede elevarlo notablemente.',
        ],
      },
      {
        question: '¿Puedo introducir la tarifa exacta de mi factura de luz?',
        answer: [
          'Sí. La calculadora permite sobreescribir el promedio estatal e ingresar la tarifa que figura en tu recibo eléctrico para mayor exactitud.',
        ],
      },
    ],
    glossary: [
      { term: 'kWh (Kilovatio-hora)', definition: 'Unidad estándar de medida de consumo eléctrico que equivale a usar 1,000 vatios de potencia durante una hora.' },
      { term: 'EIA', definition: 'U.S. Energy Information Administration, organismo oficial del Departamento de Energía de EE. UU. que recopila estadísticas energéticas.' },
    ],
    tips: [
      'Revisa tu recibo para distinguir el costo por consumo de energía de los cargos fijos de conexión o mantenimiento del contador.',
    ],
    caveats: [
      'Los promedios estatales de la EIA no reflejan tarifas escalonadas por tramos horarios (Time-of-Use) de ciertas compañías eléctricas.',
    ],
  },
  {
    toolId: 'car-loan',
    guide: {
      heading: 'Cómo se calcula la cuota de financiación de un auto',
      lede: 'Calculamos el pago mensual y los intereses totales del préstamo para auto utilizando la fórmula estándar de amortización fija basada en el precio del vehículo, tu pago inicial (down payment), el valor entregado por tu auto usado (trade-in) y la tasa de interés anual (APR).',
      sections: [
        {
          heading: 'Monto a financiar y plazo',
          paragraphs: [
            'El monto financiado resulta de: Precio del vehículo − Pago inicial − Valor neto del trade-in + Impuestos sobre ventas y cargos. La cuota mensual se distribuye en plazos comunes que suelen oscilar entre 36 y 72 meses.',
            'Plazos más prolongados (como 72 u 84 meses) reducen la cuota mensual pero elevan significativamente el costo total por intereses acumulados durante la vida del crédito.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Qué es el APR en el préstamo de un auto?',
        answer: [
          'La Tasa de Porcentaje Anual (APR) refleja el costo anual global del préstamo, incluyendo la tasa de interés y comisiones aplicables. Es el valor clave para comparar ofertas entre concesionarios y cooperativas de crédito (credit unions).',
        ],
      },
      {
        question: '¿Conviene dar un pago inicial del 20%?',
        answer: [
          'Sí, aportar al menos un 10% a 20% ayuda a evitar quedar "bajo el agua" (underwater), situación en la que debes más dinero del valor de mercado del vehículo debido a la depreciación inicial.',
        ],
      },
    ],
    glossary: [
      { term: 'APR', definition: 'Tasa de porcentaje anual que mide el costo financiero anual del préstamo para el comprador.' },
      { term: 'Trade-in', definition: 'Vehículo que entregas al concesionario como parte de pago para amortizar el precio del nuevo vehículo.' },
    ],
    tips: [
      'Consigue una aprobación previa (pre-approval) de tu banco o cooperativa de crédito antes de acudir al concesionario para negociar con ventaja.',
    ],
    caveats: [
      'No incluye costos obligatorios como el seguro del auto, mantenimiento periódico o gastos de matriculación estatal.',
    ],
  },
  {
    toolId: '401k',
    guide: {
      heading: 'Cómo se proyecta el ahorro para la jubilación en un plan 401(k)',
      lede: 'Proyectamos el crecimiento de tus fondos de jubilación calculando tus aportaciones periódicas, la contribución equivalente de tu empleador (employer match) y el interés compuesto a lo largo de los años de servicio hasta tu edad de retiro.',
      sections: [
        {
          heading: 'Aportaciones y aportación del empleador (Employer Match)',
          paragraphs: [
            'Si tu empresa ofrece, por ejemplo, un 50% de match hasta el 6% de tu sueldo, aportar ese 6% te otorga un 3% adicional gratuito de remuneración para tu retiro. Es prioritario aprovechar siempre el match completo antes de invertir en otros vehículos.',
            'Los límites anuales de aportación al 401(k) están fijados por el IRS y se actualizan por inflación periódicamente. Quienes tienen 50 años o más pueden realizar aportaciones adicionales de recuperación (catch-up contributions).',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Qué diferencia hay entre un 401(k) tradicional y un Roth 401(k)?',
        answer: [
          'En el 401(k) tradicional aportas dinero antes de impuestos, reduciendo tu ingreso imponible actual, y pagas impuestos al retirar los fondos en la jubilación. En un Roth 401(k) aportas dinero después de impuestos y todos los retiros futuros de ganancias son libres de impuestos.',
        ],
      },
      {
        question: '¿El rendimiento asumido está garantizado?',
        answer: [
          'No. El rendimiento anual promedio seleccionado es una hipótesis de cálculo basada en promedios históricos de mercado, no una garantía de retorno en inversiones bursátiles.',
        ],
      },
    ],
    glossary: [
      { term: '401(k)', definition: 'Plan de ahorro e inversión patrocinado por el empleador con ventajas fiscales para la jubilación en Estados Unidos.' },
      { term: 'Employer Match', definition: 'Contribución complementaria que el empleador aporta a tu cuenta 401(k) en función de lo que tú decidas ahorrar.' },
    ],
    tips: [
      'Aporta como mínimo el porcentaje necesario para obtener el 100% de la aportación equivalente que ofrezca tu empresa.',
    ],
    caveats: [
      'Las proyecciones son ilustrativas y no garantizan saldos futuros ni constituyen asesoramiento financiero o de inversión.',
    ],
  },
  {
    toolId: 'bonus-tax',
    guide: {
      heading: 'Por qué un bono salarial parece tener una retención de impuestos tan alta',
      lede: 'Cuando un empleador paga un bono o comisión en un cheque separado del salario regular, suele aplicar una tasa federal fija de retención suplementaria (habitualmente el 22% según el IRS) en lugar de la tasa gradual de tu salario anual. Esta herramienta calcula dicha retención en el talón de pago, no tu liquidación fiscal definitiva.',
      sections: [
        {
          heading: 'Retención sobre remuneraciones suplementarias (Supplemental Wages)',
          paragraphs: [
            'El IRS permite retener un porcentaje fijo en bonos pagados por separado, comisiones o pagos por incentivos (hasta el umbral de $1 millón, a partir del cual rige una tasa superior del 37%). Esa tasa fija del 22% a menudo supera tu tasa impositiva efectiva promedio, por lo que el depósito neto recibido parece menor de lo esperado.',
            'Al presentar la declaración anual de impuestos (Formulario 1040), el bono se suma al resto de tus ingresos ordinarios. La retención del cheque no es el impuesto final: si tu tasa efectiva del año es menor, recibirás la diferencia como reembolso; si estás en tramos superiores, el bono tributará a tu tasa marginal.',
          ],
        },
        {
          heading: 'Qué situaciones no contempla este cálculo',
          paragraphs: [
            'No modela remuneraciones suplementarias agregadas que superen el millón de dólares mediante el método agregado especial del IRS, ni particularidades estatales complejas cuando un bono se mezcla directamente en la nómina regular en lugar de un pago independiente.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Por qué me retienen tantos impuestos de mi bono?',
        answer: [
          'Porque los empleadores suelen usar la tasa federal fija del 22% para salarios suplementarios, más el 7.65% de FICA (Seguro Social y Medicare) y el impuesto estatal correspondiente. En la declaración de impuestos anual se recalcula todo tu ingreso real y se ajusta la diferencia.',
        ],
      },
      {
        question: '¿Un bono por contratación (signing bonus) tiene la misma retención?',
        answer: [
          'Normalmente sí, si se abona como salario suplementario separado. Si se incluye en tu primer cheque habitual, la empresa puede optar por el método agregado de retención.',
        ],
      },
      {
        question: '¿Los estados aplican una tasa fija similar?',
        answer: [
          'Algunos estados aplican una tasa fija de retención sobre pagos suplementarios (por ejemplo California o Nueva York), mientras que otros no tienen impuesto sobre la renta (Texas, Florida, Washington, etc.) o usan tablas graduadas.',
        ],
      },
    ],
    glossary: [
      { term: 'Salarios suplementarios (Supplemental wages)', definition: 'Compensaciones adicionales a la paga regular, tales como bonos, comisiones, pagos por despido o indemnización y horas extra pagadas en cheque separado.' },
      { term: 'Retención fija (Flat withholding)', definition: 'Porcentaje único predeterminado por el IRS (actualmente 22%) aplicado al pago suplementario sin considerar deducciones personales.' },
      { term: 'Método agregado (Aggregate method)', definition: 'Método donde el empleador suma el bono al pago ordinario del periodo y calcula la retención como si fuera un solo cheque de pago.' },
    ],
    tips: [
      'Si tu empresa lo permite, realizar una aportación extraordinaria al 401(k) tradicional sobre tu bono reduce el salario sujeto a impuestos antes de la retención.',
      'Planifica tu flujo de caja en función de la retención neta del cheque y no del importe bruto acordado.',
    ],
    caveats: [
      'La retención en el cheque no equivale a tu impuesto final sobre la renta. Esta herramienta no constituye asesoramiento tributario.',
    ],
  },
  {
    toolId: 'federal-tax-bracket',
    guide: {
      heading: 'Qué significa realmente estar en el tramo impositivo del 22%',
      lede: 'Un tramo impositivo es la tasa que se aplica al último tramo de tus ingresos, no a la totalidad de tu dinero. Esta herramienta te muestra en qué tramo marginal te encuentras, cuánto tributa cada franja anterior y cuánto margen tienes antes de pasar al siguiente tramo.',
      sections: [
        {
          heading: 'Los ingresos se gravan por franjas, no a una tasa única',
          paragraphs: [
            'La deducción estándar se resta primero y no paga absolutamente nada de impuestos (tasa del 0%). El ingreso restante se divide en franjas o tramos (10%, 12%, 22%, 24%, 32%, 35% y 37%), y cada tramo paga únicamente su propio porcentaje.',
            'Si ganas $100,000 al año como soltero, estás en el tramo del 22%, pero el 22% solo se aplica a los dólares que caen dentro de esa franja superior. Todo lo anterior pagó el 10% y el 12%, y la deducción estándar no pagó nada.',
          ],
        },
        {
          heading: 'Pasar a un tramo superior nunca reduce tus ingresos netos',
          paragraphs: [
            'Un mito financiero frecuente es que un aumento de sueldo que te lleve al siguiente tramo te hará ganar menos dinero neto. Esto es falso: solo los dólares que superen el límite del nuevo tramo tributan a la tasa superior. Un aumento siempre te deja más dinero después de impuestos.',
          ],
        },
        {
          heading: 'Ingreso bruto vs. ingreso imponible (Taxable income)',
          paragraphs: [
            'El sueldo bruto es lo que aparece en tu contrato u oferta de empleo. El ingreso imponible es lo que figura en la línea 15 del Formulario 1040, tras aplicar la deducción estándar o detallada y las deducciones previas a impuestos (como 401(k) tradicional o seguro médico).',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿En qué tramo de impuestos estoy?',
        answer: [
          'Estás en el tramo en el que cae tu último dólar de ingreso imponible. Introduce tu ingreso y estado civil para ver el tramo marginal y el desglose de cada tramo previo.',
        ],
      },
      {
        question: '¿Si gano más dinero y subo de tramo recibiré menos dinero neto?',
        answer: [
          'No, nunca. El sistema tributario de EE. UU. es progresivo y marginal. Solo el dinero adicional por encima del límite paga el porcentaje mayor.',
        ],
      },
      {
        question: '¿Por qué mi impuesto total es mucho menor que mi tramo multiplicado por mi sueldo?',
        answer: [
          'Porque tu tramo marginal solo grava el último tramo. Tu tasa impositiva efectiva es significativamente menor gracias a la deducción estándar y los tramos reducidos iniciales.',
        ],
      },
    ],
    glossary: [
      { term: 'Tramo impositivo (Tax bracket)', definition: 'Rango de ingreso imponible sujeto a una tasa impositiva federal específica.' },
      { term: 'Tasa marginal (Marginal rate)', definition: 'Porcentaje de impuesto federal aplicado al último dólar ganado en tu tramo más alto.' },
      { term: 'Deducción estándar (Standard deduction)', definition: 'Monto fijo no sujeto a impuestos que el IRS permite restar de tus ingresos según tu estado civil tributario.' },
      { term: 'Ingreso imponible (Taxable income)', definition: 'Ingreso bruto ajustado (AGI) menos la deducción estándar o deducciones detalladas.' },
    ],
    tips: [
      'Si estás evaluando hacer horas extra o aceptar un trabajo secundario, fíjate en el margen que te queda en tu tramo actual antes de cambiar de tasa.',
      'Aportar a un plan 401(k) tradicional reduce tus ingresos en tu tramo marginal más alto.',
    ],
    caveats: [
      'Aplica solo al impuesto federal sobre ingresos ordinarios. Las ganancias de capital a largo plazo utilizan una escala separada (0%, 15%, 20%).',
      'No incluye FICA (Seguro Social y Medicare) ni impuestos estatales.',
    ],
  },
  {
    toolId: 'effective-tax-rate',
    guide: {
      heading: 'Por qué tu tasa efectiva de impuestos es mucho menor que tu tramo impositivo',
      lede: 'Decir que estás en el tramo del 22% no significa que el 22% de todo tu sueldo se vaya en impuestos federales. Solo la última porción lo hace. Esta calculadora te muestra la diferencia entre tu tasa marginal y tu tasa efectiva real.',
      sections: [
        {
          heading: 'La diferencia entre tasa marginal y tasa efectiva',
          paragraphs: [
            'Tu tasa marginal es el porcentaje que pagaría tu próximo dólar ganado. Tu tasa efectiva es el porcentaje promedio real: impuestos federales totales divididos entre tu ingreso total.',
            'Por ejemplo, un contribuyente soltero con un sueldo de $75,000 puede estar en el tramo marginal del 22%, pero su tasa efectiva federal puede rondar el 9% o 10% después de la deducción estándar y los tramos del 10% y 12%.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Qué es la tasa efectiva de impuestos?',
        answer: [
          'Es el porcentaje real de tus ingresos brutos totales que pagas en impuestos. Se calcula dividiendo el total de impuestos pagados entre tus ingresos totales.',
        ],
      },
      {
        question: '¿Cómo puedo reducir mi tasa efectiva?',
        answer: [
          'Aumentando tus deducciones antes de impuestos (como aportaciones a cuentas 401(k), HSA o IRA tradicionales) y aprovechando créditos fiscales como el Crédito Tributario por Hijos.',
        ],
      },
    ],
    glossary: [
      { term: 'Tasa efectiva (Effective tax rate)', definition: 'Porcentaje promedio de impuestos pagados en relación con el ingreso total.' },
      { term: 'Tasa marginal (Marginal tax rate)', definition: 'Tasa aplicada al último tramo de ingresos imponibles.' },
    ],
    tips: [
      'Usa tu tasa efectiva para presupuestar tus gastos anuales, y tu tasa marginal para evaluar el impacto de un aumento salarial o un ingreso extra.',
    ],
    caveats: [
      'Cálculo para propósitos informativos generales. No incluye créditos específicos no modelados ni deducciones comerciales.',
    ],
  },
  {
    toolId: 'self-employment-tax',
    guide: {
      heading: 'Cómo funciona el impuesto del 15.3% para trabajadores independientes (1099)',
      lede: 'El Formulario Anexo SE (Schedule SE) no calcula el 15.3% sobre la ganancia neta total del negocio. Primero reduce la ganancia imponible en un 7.65% (multiplicándola por 92.35%), y luego divide el saldo entre Seguro Social (12.4%) y Medicare (2.9%).',
      sections: [
        {
          heading: 'El factor del 92.35% y la deducción del empleador',
          paragraphs: [
            'En un empleo W-2 tradicional, el trabajador paga 7.65% y la empresa paga el otro 7.65%. Un trabajador por cuenta propia o contratista independiente (1099) cubre ambas partes (15.3%), pero el IRS le permite deducir la mitad de este impuesto en la primera página del Formulario 1040 como un ajuste al ingreso.',
            'Para aproximar esta deducción en el cálculo, el IRS solo grava el 92.35% de tu ganancia neta positiva. Si tus ganancias netas del año son inferiores a $400, no estás obligado a pagar el impuesto por cuenta propia.',
          ],
        },
        {
          heading: 'Salarios W-2 y el tope salarial del Seguro Social',
          paragraphs: [
            'El componente de Seguro Social (12.4%) solo se aplica hasta el tope salarial anual establecido por la Administración del Seguro Social. Si ya tienes un empleo W-2 y tus salarios cubrieron ese límite, tu ganancia por cuenta propia solo pagará el 2.9% de Medicare.',
          ],
        },
        {
          heading: 'Esto no es el impuesto sobre la renta (Income Tax)',
          paragraphs: [
            'El impuesto por cuenta propia sustituye a FICA. El impuesto ordinario sobre la renta federal y estatal se calcula adicionalmente sobre la ganancia neta en tu declaración anual.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Por qué el impuesto de trabajo por cuenta propia no es el 15.3% exacto de mi ganancia?',
        answer: [
          'Porque la ley tributaria multiplica tu ganancia neta por el 92.35% antes de aplicar el 15.3%, simulando la deducción que tendría un empleador.',
        ],
      },
      {
        question: '¿Puedo deducir los impuestos del trabajo por cuenta propia?',
        answer: [
          'Sí. Puedes deducir exactamente el 50% de tu impuesto de cuenta propia como deducción por encima de la línea (above-the-line deduction) en tu Formulario 1040, reduciendo tu AGI.',
        ],
      },
      {
        question: '¿Qué pasa si tengo un trabajo W-2 y además trabajo como contratista 1099?',
        answer: [
          'Tus ingresos W-2 agotan primero el tope salarial del Seguro Social. Si tu empleo W-2 alcanza el límite, no pagarás el 12.4% de Seguro Social sobre tus ingresos 1099, solo el 2.9% de Medicare.',
        ],
      },
    ],
    glossary: [
      { term: 'Schedule SE', definition: 'Anexo del Formulario 1040 del IRS utilizado para calcular el impuesto de Seguro Social y Medicare para trabajadores por cuenta propia.' },
      { term: 'Ganancias netas de cuenta propia (Net earnings)', definition: 'Ganancia neta del negocio (Schedule C) multiplicada por 92.35%.' },
      { term: 'Tope salarial de Seguro Social (Wage base)', definition: 'Límite máximo de ingresos anuales sujetos al 12.4% del impuesto de Seguro Social.' },
    ],
    tips: [
      'Si trabajas por cuenta propia, debes realizar pagos estimados trimestrales (Formulario 1040-ES) en abril, junio, septiembre y enero para evitar penalizaciones por pago insuficiente.',
      'Guarda un registro detallado de tus gastos comerciales deducibles para reducir legalmente tu ganancia neta en el Schedule C.',
    ],
    caveats: [
      'Este cálculo corresponde exclusivamente a FICA para trabajadores por cuenta propia, no incluye el impuesto sobre la renta federal ni estatal.',
    ],
  },
  {
    toolId: 'child-tax-credit',
    guide: {
      heading: 'Crédito tributario por hijos (CTC): montos máximos, límites de ingresos y reembolso',
      lede: 'El crédito tributario por hijos otorga hasta $2,000 o $2,200 por cada hijo calificado menor de 17 años, de los cuales una parte puede ser reembolsable como Crédito Adicional por Hijos (ACTC). Tu ingreso bruto ajustado modificado (MAGI) y los impuestos debidos determinan cuánto recibes realmente.',
      sections: [
        {
          heading: 'Reducción por ingresos (Phase-out)',
          paragraphs: [
            'El crédito comienza a reducirse si tu MAGI supera los $400,000 en declaraciones conjuntas de casados, o $200,000 en el resto de los estados civiles tributarios. Se reduce $50 por cada $1,000 (o fracción) que exceda el límite.',
          ],
        },
        {
          heading: 'Porción reembolsable: Crédito adicional por hijos (ACTC)',
          paragraphs: [
            'Si el crédito excede los impuestos que debes, puedes recibir la diferencia en efectivo como reembolso a través del ACTC (Schedule 8812), hasta el límite establecido por ley o el 15% de tus ingresos del trabajo que superen los $2,500.',
          ],
        },
        {
          heading: 'Requisitos de un hijo calificado',
          paragraphs: [
            'Debe tener menos de 17 años al final del año fiscal, contar con un número de Seguro Social (SSN) válido para empleo en EE. UU., haber vivido contigo más de la mitad del año y ser tu dependiente calificado.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿El crédito tributario por hijos es 100% reembolsable?',
        answer: [
          'No. Solo la porción correspondiente al Crédito Adicional por Hijos (ACTC) es reembolsable si tu crédito supera tu obligación tributaria.',
        ],
      },
      {
        question: '¿Qué pasa si mi hijo cumplió 17 años durante el año?',
        answer: [
          'Si cumplió 17 años antes del 31 de diciembre, no califica para el CTC de menores de 17, pero puede calificar para el crédito no reembolsable de $500 por otros dependientes.',
        ],
      },
      {
        question: '¿A partir de qué ingresos se empieza a perder el crédito?',
        answer: [
          'A partir de $200,000 para contribuyentes solteros o cabeza de familia, y $400,000 para parejas casadas que presentan declaración conjunta.',
        ],
      },
    ],
    glossary: [
      { term: 'Hijo calificado (Qualifying child)', definition: 'Hijo, hijastro o dependiente elegible menor de 17 años con número de Seguro Social válido.' },
      { term: 'ACTC (Additional Child Tax Credit)', definition: 'La parte reembolsable del crédito tributario por hijos calculada en el Schedule 8812.' },
      { term: 'MAGI', definition: 'Ingreso bruto ajustado modificado utilizado para determinar los umbrales de eliminación gradual del crédito.' },
    ],
    tips: [
      'Verifica que el número de Seguro Social de tu hijo esté emitido antes de la fecha límite de presentación de la declaración.',
    ],
    caveats: [
      'No sustituye la presentación formal del Schedule 8812 ni constituye asesoramiento fiscal.',
    ],
  },
  {
    toolId: 'eitc',
    guide: {
      heading: 'Crédito por ingreso del trabajo (EITC): cálculo, requisitos y límites',
      lede: 'El EITC federal es un crédito tributario reembolsable para trabajadores de ingresos bajos y moderados. No es una cantidad fija por hijo: aumenta con los ingresos del trabajo, alcanza un máximo oficial publicado y luego se elimina gradualmente a medida que los ingresos crecen.',
      sections: [
        {
          heading: 'Los tres factores del EITC',
          paragraphs: [
            'El monto depende de tus ingresos del trabajo, tu estado civil tributario y la cantidad de hijos calificados (0, 1, 2, o 3 o más). Para parejas casadas que presentan declaración conjunta, los límites de ingresos son más altos.',
          ],
        },
        {
          heading: 'Límite estricto de ingresos por inversiones',
          paragraphs: [
            'Si tienes ingresos por inversiones (intereses, dividendos, ganancias de capital o alquileres) por encima del límite legal anual, quedas automáticamente descalificado del crédito.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿El EITC es reembolsable si no debo impuestos?',
        answer: [
          'Sí, es un crédito totalmente reembolsable. Si el crédito es mayor que el impuesto adeudado, el IRS te envía la diferencia en tu reembolso.',
        ],
      },
      {
        question: '¿Puedo solicitar el EITC si no tengo hijos?',
        answer: [
          'Sí, los trabajadores solteros o casados sin hijos pueden calificar si tienen entre 25 y 64 años de edad y sus ingresos se encuentran dentro de los límites anuales permitidos.',
        ],
      },
    ],
    glossary: [
      { term: 'EITC', definition: 'Earned Income Tax Credit (Crédito por Ingreso del Trabajo).' },
      { term: 'Ingresos del trabajo (Earned income)', definition: 'Sueldos, salarios, propinas y ganancias netas de trabajo por cuenta propia.' },
    ],
    tips: [
      'Introduce tanto tus ingresos del trabajo como tu AGI; la eliminación gradual utiliza el mayor de los dos.',
    ],
    caveats: [
      'Existen requisitos estrictos de residencia, edad y número de Seguro Social.',
    ],
  },
  {
    toolId: 'refinance',
    guide: {
      heading: 'Cuándo conviene refinanciar una hipoteca y cómo calcular el punto de equilibrio',
      lede: 'Esta calculadora compara tu hipoteca actual con un nuevo préstamo: calcula la nueva cuota mensual, el tiempo necesario para recuperar los gastos de cierre (punto de equilibrio) y si un pago menor a 30 años terminará costándote más intereses en total.',
      sections: [
        {
          heading: 'El punto de equilibrio (Break-even)',
          paragraphs: [
            'Si tu nuevo pago es $200 menor cada mes y los gastos de cierre de la refinanciación son $6,000, necesitas 30 meses ($6,000 ÷ $200) para recuperar el costo. Si vendes o te mudas antes de los 30 meses, la refinanciación te habrá hecho perder dinero.',
          ],
        },
        {
          heading: 'Cuidado con reiniciar el plazo a 30 años',
          paragraphs: [
            'Si ya llevas 10 años pagando tu hipoteca y refinancias el saldo restante en un nuevo préstamo a 30 años, tu cuota mensual bajará considerablemente, pero pagarás intereses durante 40 años en total, lo que puede aumentar el costo financiero final.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Cómo sé si me conviene refinanciar?',
        answer: [
          'Compara los meses para alcanzar el punto de equilibrio y el interés total pagado. Si planeas quedarte en la casa más tiempo del que tardas en recuperar los gastos de cierre, refinanciar a una tasa menor suele ser beneficioso.',
        ],
      },
      {
        question: '¿Conviene cambiar a un plazo de 15 años?',
        answer: [
          'Un préstamo a 15 años reduce drásticamente los intereses totales pagados y acelera la amortización del capital, aunque la cuota mensual será mayor que en uno a 30 años.',
        ],
      },
    ],
    glossary: [
      { term: 'Punto de equilibrio (Break-even)', definition: 'Gastos de cierre divididos entre el ahorro mensual de la cuota. Muestra cuántos meses tardas en compensar el costo del trámite.' },
      { term: 'Gastos de cierre (Closing costs)', definition: 'Honorarios de originación, tasación, registro y seguro de título necesarios para formalizar el nuevo préstamo.' },
      { term: 'Refinanciación con retiro de efectivo (Cash-out refinance)', definition: 'Reemplazo de la hipoteca existente por un préstamo mayor para obtener liquidez del capital acumulado en la vivienda.' },
    ],
    tips: [
      'Introduce el saldo actual y los años que te faltan por pagar de tu hipoteca actual, no los números iniciales con los que compraste la casa.',
    ],
    caveats: [
      'No incluye penalizaciones por pago anticipado si tu préstamo actual las tuviera. No es una oferta formal de crédito.',
    ],
  },
  {
    toolId: 'mortgage-payoff',
    guide: {
      heading: 'Cómo los pagos adicionales al capital reducen el plazo y los intereses de una hipoteca',
      lede: 'Hacer pagos extraordinarios destinados directamente al capital (principal) de tu hipoteca recorta el tiempo de amortización y ahorra miles de dólares en intereses. Esta herramienta calcula la nueva fecha de liquidación y el ahorro financiero total.',
      sections: [
        {
          heading: 'El ahorro de intereses es un rendimiento garantizado',
          paragraphs: [
            'Abonar al capital reduce los intereses futuros a la tasa fija de tu hipoteca. Es el equivalente a obtener un rendimiento seguro igual a la tasa de interés de tu préstamo, libre de riesgo de mercado.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Cuánto tiempo antes puedo liquidar mi hipoteca pagando extra cada mes?',
        answer: [
          'Introduce el saldo pendiente, la tasa de interés y el monto extra mensual. Verás cuántos años y meses descuentas de la vida del préstamo y el dinero exacto ahorrado en intereses.',
        ],
      },
      {
        question: '¿Cómo debo indicar el pago extra al banco?',
        answer: [
          'Debes asegurarte de especificarle a tu entidad crediticia (servicer) que el pago adicional se aplique exclusivamente a reducción de capital (principal-only payment) y no como adelanto de la cuota del próximo mes.',
        ],
      },
    ],
    glossary: [
      { term: 'Capital (Principal)', definition: 'El saldo pendiente del dinero prestado, sin incluir intereses futuros ni seguros.' },
      { term: 'Amortización anticipada', definition: 'Reducción acelerada de la deuda mediante aportaciones complementarias al capital.' },
    ],
    tips: [
      'Verifica en tu estado de cuenta que los pagos adicionales se acrediten correctamente al renglón de principal.',
    ],
    caveats: [
      'No toma en cuenta impuestos a la propiedad ni seguro de vivienda (escrow), los cuales deben seguir pagándose normalmente.',
    ],
  },
  {
    toolId: 'credit-card-payoff',
    guide: {
      heading: 'Cómo liquidar el saldo de una tarjeta de crédito: plazo, cuota e intereses',
      lede: 'Esta herramienta calcula cuánto tardarás en pagar el saldo de una tarjeta de crédito con una cuota fija mensual o qué cuota necesitas para quedar libre de deuda en una fecha objetivo, mostrando el costo total de los intereses acumulados.',
      sections: [
        {
          heading: 'El peligro del pago mínimo',
          paragraphs: [
            'Los emisores de tarjetas de crédito fijan pagos mínimos que disminuyen conforme baja el saldo (por ejemplo, el 1% o 2% del saldo más intereses). Pagar solo el mínimo puede extender la deuda durante 15 o 20 años y triplicar el costo original de las compras.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Cuánto tardaré en pagar el saldo con un pago fijo mensual?',
        answer: [
          'Introduce tu saldo, la tasa APR de tu tarjeta y la cantidad mensual que puedes destinar. Verás los meses exactos hasta liquidarla y el total pagado en intereses.',
        ],
      },
      {
        question: '¿Funciona para transferencias de saldo al 0%?',
        answer: [
          'Sí, introduce 0% como tasa APR y ten en cuenta sumar la comisión por transferencia (habitualmente 3% a 5%) al saldo inicial.',
        ],
      },
    ],
    glossary: [
      { term: 'APR (Annual Percentage Rate)', definition: 'Tasa de porcentaje anual que cobra la tarjeta de crédito por financiar saldos pendientes.' },
      { term: 'Crédito rotativo (Revolving credit)', definition: 'Línea de crédito que se renueva a medida que se paga el saldo, generando intereses mensuales sobre los importes no saldados.' },
    ],
    tips: [
      'Congela el uso de la tarjeta mientras la estés pagando; compras adicionales invalidan el cálculo de fecha de finalización.',
    ],
    caveats: [
      'No contempla cargos por mora, penalizaciones por sobregiro ni aumentos de tasa por penalización.',
    ],
  },
  {
    toolId: 'debt-payoff',
    guide: {
      heading: 'Método bola de nieve vs. método avalancha para pagar deudas',
      lede: 'Compara las dos estrategias más eficaces para liquidar múltiples deudas: el método bola de nieve (pagar primero la deuda más pequeña) y el método avalancha (pagar primero la deuda con la tasa APR más alta), mientras mantienes los pagos mínimos en las demás.',
      sections: [
        {
          heading: 'Qué método es mejor',
          paragraphs: [
            'El método avalancha es matemáticamente óptimo: minimiza los intereses pagados y te hace libre de deudas en el menor tiempo posible. El método bola de nieve ofrece victorias psicológicas rápidas al eliminar cuentas completas al principio, lo que ayuda a mantener la motivación.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Cuál método debería elegir?',
        answer: [
          'Si buscas ahorrar la máxima cantidad de dinero en intereses, elige el método avalancha. Si necesitas motivación visual y simplificar tu vida eliminando facturas mensuales rápidamente, elige bola de nieve.',
        ],
      },
      {
        question: '¿Debo incluir mi hipoteca en este plan?',
        answer: [
          'Por lo general no. Una hipoteca a 30 años tiene montos mucho más grandes y tasas más bajas que las tarjetas de crédito o préstamos personales. Conviene concentrarse primero en deudas de consumo de alto interés.',
        ],
      },
    ],
    glossary: [
      { term: 'Método bola de nieve (Debt Snowball)', definition: 'Estrategia de pago que ordena las deudas de menor a mayor saldo, destinando todo el dinero extra a la más pequeña.' },
      { term: 'Método avalancha (Debt Avalanche)', definition: 'Estrategia que ordena las deudas de mayor a menor tasa de interés (APR), minimizando el costo financiero total.' },
      { term: 'Pago mínimo (Minimum payment)', definition: 'Monto obligatorio requerido por cada acreedor para mantener las cuentas al día.' },
    ],
    tips: [
      'Usa los pagos mínimos reales de tus estados de cuenta para que la proyección de fechas sea exacta.',
    ],
    caveats: [
      'No constituye asesoramiento legal sobre bancarrota ni mediación de deuda.',
    ],
  },
  {
    toolId: 'cost-of-living',
    guide: {
      heading: 'Comparación del costo de vida con datos oficiales de EE. UU.',
      lede: 'Esta herramienta compara los costos mensuales de vida entre diferentes estados y áreas metropolitanas utilizando estimaciones oficiales del Departamento de Vivienda (HUD Fair Market Rent), planes de alimentos del USDA y promedios oficiales de energía y precios.',
      sections: [
        {
          heading: 'Datos locales vs. promedios nacionales',
          paragraphs: [
            'El alquiler utiliza los alquileres de mercado justo (FMR) oficiales de HUD para la ubicación elegida. Otros renglones reflejan índices de precios regionales y costos de energía del estado. Te permite ver la diferencia real en dólares antes de mudarte.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Esto es un índice abstracto o un presupuesto en dólares?',
        answer: [
          'Es una estimación basada en dólares reales de fuentes federales públicas, no un índice privado subjetivo en base 100.',
        ],
      },
      {
        question: '¿Puedo comparar dos ciudades para una oferta de empleo?',
        answer: [
          'Sí. Es ideal para evaluar un cambio de residencia; recuerda combinar esta comparación con la calculadora de salario después de impuestos para ver la diferencia de impuestos estatales entre ambos lugares.',
        ],
      },
    ],
    glossary: [
      { term: 'Fair Market Rent (FMR)', definition: 'Alquiler de mercado justo estimado anualmente por el HUD para cada condado y zona metropolitana según el número de habitaciones.' },
      { term: 'USDA Food Plans', definition: 'Presupuestos oficiales mensuales de alimentación elaborados por el Departamento de Agricultura de EE. UU.' },
    ],
    tips: [
      'Si ya conoces el alquiler real de tu futuro contrato, introduce ese valor directamente para obtener un cálculo personalizado.',
    ],
    caveats: [
      'Estimación orientativa para planificación. No incluye gastos médicos especializados, guardería ni seguros privados no especificados.',
    ],
  },
  {
    toolId: 'auto-coverage',
    guide: {
      heading: 'Cuándo conviene mantener o cancelar la cobertura contra choque e integral de tu auto',
      lede: 'Las coberturas de colisión (Collision) y contra todo riesgo (Comprehensive) pagan únicamente el valor real en efectivo de tu auto en el momento del siniestro menos el deducible. A medida que el vehículo se deprecia, el beneficio máximo disminuye mientras la prima anual se mantiene casi constante. Esta calculadora te ayuda a evaluar si el costo de la prima sigue justificando la cobertura.',
      sections: [
        {
          heading: 'El beneficio tiene un techo que baja cada año',
          paragraphs: [
            'La cobertura por colisión cubre daños en un accidente que tú causes. La cobertura integral cubre robo, granizo, inundación, animales o vandalismo. Ambas liquidan según el valor real en efectivo (Actual Cash Value) menos el deducible. Si tu auto vale $4,000 y tu deducible es de $1,000, el cheque máximo que recibirías es de $3,000.',
          ],
        },
        {
          heading: 'La cobertura de responsabilidad civil (Liability) es obligatoria',
          paragraphs: [
            'La responsabilidad civil paga los daños corporales y materiales que causes a terceros. Es obligatoria por ley en casi todos los estados y no depende del valor de tu vehículo. Nunca debes reducir la responsabilidad civil como forma de ahorrar en un auto antiguo.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Cuándo debería dar de baja la cobertura de colisión e integral?',
        answer: [
          'Una regla habitual es evaluar darla de baja cuando la prima anual de ambas coberturas supera el 10% del valor neto asegurable del vehículo (valor del auto menos deducible), y si cuentas con ahorros suficientes para reemplazar el auto en caso de pérdida total.',
        ],
      },
      {
        question: '¿Puedo cancelar la cobertura si todavía estoy pagando el préstamo del auto?',
        answer: [
          'Casi nunca. Si el auto está financiado o en arrendamiento (lease), el prestamista exige contractualmente mantener cobertura completa (Full Coverage) hasta liquidar el préstamo.',
        ],
      },
    ],
    glossary: [
      { term: 'Valor real en efectivo (Actual Cash Value - ACV)', definition: 'El valor de mercado del auto inmediatamente antes del accidente o pérdida, descontando la depreciación acumulada.' },
      { term: 'Collision (Colisión / Choque)', definition: 'Cobertura que paga la reparación o pérdida total de tu vehículo tras chocar contra otro auto u objeto.' },
      { term: 'Comprehensive (Integral / Todo riesgo)', definition: 'Cobertura para siniestros ajenos a choques: robo, incendio, granizo, caída de árboles o impacto con animales.' },
      { term: 'Deducible (Deductible)', definition: 'Monto que debes pagar de tu bolsillo en cada reclamo antes de que la aseguradora cubra el resto.' },
    ],
    tips: [
      'Consulta el valor real de tu vehículo una vez al año para revisar si la prima anual sigue teniendo sentido frente al deducible.',
    ],
    caveats: [
      'Los promedios estatales se basan en reportes de la NAIC. No constituyen una cotización formal de seguro ni una recomendación de desprotección legal.',
    ],
  },
  {
    toolId: 'concrete',
    guide: {
      heading: 'Cálculo de concreto para losas y zapatas: yardas cúbicas, bolsas y margen de desperdicio',
      lede: 'Multiplicar largo × ancho × espesor convierte las dimensiones de tu proyecto en yardas cúbicas de concreto premezclado o en la cantidad exacta de bolsas de 60 lb u 80 lb necesarias, incluyendo un margen de desperdicio para evitar faltantes durante el vaciado.',
      sections: [
        {
          heading: 'Por qué siempre debes incluir un margen de desperdicio (Waste factor)',
          paragraphs: [
            'El terreno natural nunca es perfectamente plano, las formaletas de madera pueden ceder ligeramente bajo el peso y siempre se producen pérdidas durante el vaciado. Añadir entre un 5% y un 10% de margen evita quedarse sin concreto en mitad del colado.',
          ],
        },
      ],
    },
    faq: [
      {
        question: '¿Cuántas bolsas de 80 lb se necesitan para una losa de 10×10 pies y 4 pulgadas?',
        answer: [
          'Una losa de 10×10 pies y 4 pulgadas de espesor tiene un volumen aproximado de 1.23 yardas cúbicas. Con un 10% de desperdicio (1.36 yd³), necesitarás alrededor de 61 bolsas de 80 lb (o unas 82 bolsas de 60 lb).',
        ],
      },
      {
        question: '¿Cuándo conviene pedir un camión de concreto premezclado (ready-mix)?',
        answer: [
          'Para cualquier proyecto superior a 1 yarda cúbica (aproximadamente 45 bolsas de 80 lb), suele ser mucho más rápido, económico y resistente encargar un camión de concreto premezclado en lugar de mezclar bolsas a mano o en una pequeña mezcladora.',
        ],
      },
    ],
    glossary: [
      { term: 'Yarda cúbica (Cubic yard)', definition: 'Unidad estándar de volumen en EE. UU. equivalente a 27 pies cúbicos. Es la unidad con la que se encarga el camión de concreto premezclado.' },
      { term: 'Rendimiento por bolsa (Yield)', definition: 'Volumen de concreto endurecido que produce una bolsa de mezcla comercial seca (aprox. 0.60 pies cúbicos para una bolsa de 80 lb y 0.45 pies cúbicos para una de 60 lb).' },
    ],
    tips: [
      'Verifica bien el espesor requerido: una banqueta o patio peatonal suele requerir 4 pulgadas, mientras que una entrada de vehículos (driveway) requiere al menos 5 o 6 pulgadas con refuerzo.',
    ],
    caveats: [
      'Cálculo geométrico y estimación de materiales para planificación. No sustituye las especificaciones estructurales de un arquitecto o ingeniero civil.',
    ],
  },
];
