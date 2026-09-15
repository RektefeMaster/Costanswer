import { HomePage } from '@/components/site/HomePage';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata('Calculadoras gratuitas para tus decisiones en EE. UU.', 'Calcula salarios, hipotecas, impuestos, costos del hogar y mucho más. Datos públicos, fórmulas claras y resultados que puedes ajustar.', '/es');

export default function SpanishHomePage() { return <HomePage locale="es-US" />; }
