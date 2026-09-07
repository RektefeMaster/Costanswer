/**
 * Product categories and the merchants that could serve them.
 *
 * Categories come from the calculator, not from a merchant catalogue. A
 * concrete calculator produces a quantity of concrete, forms and rebar, and
 * that is true whether or not anyone is paying us — which is why the mapping
 * lives in `policy.ts` next to the page and the offers live here next to the
 * merchant. The two meet in `relevance.ts` and nowhere else.
 */
import { localized, type Locale } from '@/lib/i18n/locales';
import type { AffiliateCategoryId } from '../policy';
import type { AffiliateMerchant, ProductCategory } from './types';

const CHECKED_AT = '2026-09-06';

/**
 * Merchants.
 *
 * All three networks are `configuration_required` and that is accurate: none of
 * them has approved this site, because approval generally follows traffic and
 * in Amazon's case follows qualifying sales. The infrastructure is finished; the
 * account is not. Nothing renders a monetized link from an unapproved
 * programme — `isMerchantLinkable` is the single check and it is unforgiving.
 */
export const AFFILIATE_MERCHANTS: readonly AffiliateMerchant[] = Object.freeze([
  {
    merchantId: 'amazon',
    network: 'amazon',
    displayName: 'Amazon',
    status: 'configuration_required',
    disclosureId: 'amazon-associate',
    requiredEnv: ['AFFILIATE_AMAZON_TRACKING_ID'],
    outstandingDependency:
      'Amazon Associates approval. Their current model evaluates an application after qualifying sales, so applying before the site has traffic is counterproductive. Needed before enabling: an approved tracking id, and if current price or availability is ever shown, access to the official product data API and compliance with its caching and display terms.',
    mayDisplayStoredPrice: false,
    documentationCheckedAt: CHECKED_AT,
  },
  {
    merchantId: 'homedepot',
    network: 'homedepot',
    displayName: 'The Home Depot',
    status: 'configuration_required',
    disclosureId: 'generic-affiliate',
    requiredEnv: ['AFFILIATE_HOMEDEPOT_TRACKING_ID'],
    outstandingDependency:
      'Home Depot affiliate/creator programme approval and a tracking identifier. Link format and permitted deep-link targets follow the programme terms in force at approval.',
    mayDisplayStoredPrice: false,
    documentationCheckedAt: CHECKED_AT,
  },
  {
    merchantId: 'cj',
    network: 'cj',
    displayName: 'CJ publisher network',
    status: 'configuration_required',
    disclosureId: 'generic-affiliate',
    requiredEnv: ['AFFILIATE_CJ_PUBLISHER_ID', 'AFFILIATE_CJ_WEBSITE_ID'],
    outstandingDependency:
      'CJ publisher account plus per-advertiser acceptance. Each advertiser sets its own link format and disclosure requirements, so an offer cannot be authored until its advertiser has accepted the site.',
    mayDisplayStoredPrice: false,
    documentationCheckedAt: CHECKED_AT,
  },
]);

const merchantsById = new Map(AFFILIATE_MERCHANTS.map((merchant) => [merchant.merchantId, merchant]));

export function getMerchant(merchantId: string): AffiliateMerchant | undefined {
  return merchantsById.get(merchantId);
}

/**
 * May we render a paid link to this merchant right now?
 *
 * Approval alone is not enough and neither is a flag: the credentials have to
 * be present too, because a link built without a tracking id is an unpaid
 * referral that still carries a compensation disclosure, which is the worst of
 * both.
 */
export function isMerchantLinkable(
  merchant: AffiliateMerchant,
  environment: Record<string, string | undefined> = process.env,
): boolean {
  if (merchant.status !== 'enabled' && merchant.status !== 'approved') return false;
  return merchant.requiredEnv.every((key) => (environment[key]?.trim().length ?? 0) > 0);
}

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = Object.freeze([
  category('concrete_tools', 'Concrete tools', 'Herramientas para concreto',
    'Mixing, screeding and finishing tools for a slab this size.',
    'Herramientas para mezclar, nivelar y dar acabado a una losa de este tamaño.'),
  category('masonry', 'Forms and reinforcement', 'Cimbras y refuerzo',
    'Form boards, stakes, rebar and mesh that a pour this size normally needs.',
    'Cimbras, estacas, varilla y malla que normalmente lleva un colado de este tamaño.'),
  category('measuring_tools', 'Measuring tools', 'Herramientas de medición',
    'Tapes, wheels and laser measures for checking the area you just calculated.',
    'Cintas, ruedas y medidores láser para verificar el área que acaba de calcular.'),
  category('paint_supplies', 'Paint and supplies', 'Pintura y materiales',
    'Paint, rollers, brushes, tape and drop cloths for the coverage above.',
    'Pintura, rodillos, brochas, cinta y lonas para la cobertura de arriba.'),
  category('flooring_tools', 'Flooring tools', 'Herramientas para pisos',
    'Underlayment, spacers and cutting tools for the area and waste shown.',
    'Base, separadores y herramientas de corte para el área y el desperdicio indicados.'),
  category('roofing_tools', 'Roofing materials', 'Materiales para techos',
    'Underlayment, fasteners, flashing and safety gear for a roof this size.',
    'Base, sujetadores, tapajuntas y equipo de seguridad para un techo de este tamaño.'),
  category('plumbing_tools', 'Plumbing tools', 'Herramientas de plomería',
    'Fittings, connectors and the tools a water heater swap normally needs.',
    'Conexiones, acoples y las herramientas que normalmente lleva cambiar un calentador.'),
  category('electrical_tools', 'Electrical tools', 'Herramientas eléctricas',
    'Testers, connectors and safety equipment for panel and circuit work.',
    'Probadores, conectores y equipo de seguridad para trabajo de panel y circuitos.'),
  category('hvac_filters', 'Filters and maintenance', 'Filtros y mantenimiento',
    'Filters, thermostats and maintenance parts for the system you priced.',
    'Filtros, termostatos y refacciones de mantenimiento para el sistema que coticé.'),
  category('tile_tools', 'Tile tools', 'Herramientas para azulejo',
    'Thinset, spacers, trowels and cutting tools for the tile area shown.',
    'Pegamento, separadores, llanas y herramientas de corte para el área de azulejo indicada.'),
  category('fencing_materials', 'Fence materials', 'Materiales para cerca',
    'Posts, panels, concrete and hardware for the run length above.',
    'Postes, paneles, concreto y herrajes para la longitud indicada.'),
  category('deck_materials', 'Deck materials', 'Materiales para terraza',
    'Boards, joist hardware, fasteners and finish for the deck area shown.',
    'Tablas, herrajes, sujetadores y acabado para el área de terraza indicada.'),
  category('bathroom_tools', 'Bathroom fixtures and tools', 'Accesorios y herramientas de baño',
    'Fixtures, valves and the tools a bathroom project normally needs.',
    'Accesorios, válvulas y las herramientas que normalmente lleva un proyecto de baño.'),
  category('kitchen_scales', 'Kitchen scales and measures', 'Básculas y medidas de cocina',
    'Scales and measuring sets for scaling a recipe accurately.',
    'Básculas y juegos de medición para ajustar una receta con precisión.'),
  category('ev_charging', 'EV charging', 'Carga de vehículos eléctricos',
    'Home chargers and cables for the charging cost shown above.',
    'Cargadores caseros y cables para el costo de carga que aparece arriba.'),
  category('car_care', 'Car care', 'Cuidado del auto',
    'Maintenance items that affect the running costs on this page.',
    'Artículos de mantenimiento que afectan los costos de esta página.'),
  category('home_energy', 'Home energy', 'Energía del hogar',
    'Meters, smart plugs and efficiency items for the usage you entered.',
    'Medidores, enchufes inteligentes y artículos de eficiencia para el consumo que ingresó.'),
]);

function category(
  categoryId: AffiliateCategoryId,
  labelEn: string, labelEs: string,
  descriptionEn: string, descriptionEs: string,
): ProductCategory {
  return {
    categoryId,
    label: localized({ 'en-US': labelEn, 'es-US': labelEs }),
    description: localized({ 'en-US': descriptionEn, 'es-US': descriptionEs }),
  };
}

const categoriesById = new Map(PRODUCT_CATEGORIES.map((entry) => [entry.categoryId, entry]));

export function getProductCategory(categoryId: AffiliateCategoryId): ProductCategory | undefined {
  return categoriesById.get(categoryId);
}

export function categoryLabel(categoryId: AffiliateCategoryId, locale: Locale): string {
  return categoriesById.get(categoryId)?.label[locale] ?? categoryId;
}

/** Called from tests: every category a policy references must exist here. */
export function assertCatalogCoversPolicies(categoryIds: readonly AffiliateCategoryId[]): void {
  for (const categoryId of categoryIds) {
    if (!categoriesById.has(categoryId)) {
      throw new Error(`Policy references affiliate category "${categoryId}", which the catalog does not define.`);
    }
  }
}
