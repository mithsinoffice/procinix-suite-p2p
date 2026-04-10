/**
 * CANONICAL ENTITY REGISTRY
 * 
 * Single source of truth for all entities across the application.
 * 
 * PURPOSE:
 * - Drive entity switcher
 * - Drive dashboard context
 * - Drive analytics filtering
 * - Drive transaction scoping
 * 
 * SAFETY:
 * - Preserves old entity IDs for backward compatibility
 * - Alias mapping for legacy datasets
 * - Non-destructive implementation
 */

export interface CanonicalEntity {
  // Canonical identifiers (new multi-entity standard)
  id: string;
  code: string; // Unique entity code (SUBKO-IN, SUBKO-UAE, PROC-IN)
  name: string;
  legalName: string;
  
  // Operating context
  country: string;
  currency: string;
  taxRegime: 'GST' | 'VAT' | 'Sales Tax';
  
  // Display properties
  logo?: string;
  status: 'Active' | 'Inactive';
  
  // Backward compatibility (legacy entity IDs)
  aliases?: string[]; // Old entity IDs that map to this canonical entity
  
  // Additional metadata
  establishedDate?: string;
  fiscalYearEnd?: string;
}

// ============================================================================
// CANONICAL ENTITY DEFINITIONS
// ============================================================================

export const CANONICAL_ENTITIES: CanonicalEntity[] = [
  // ──────────────────────────────────────────────────────────────────────
  // SUBKO COFFEE - INDIA
  // ──────────────────────────────────────────────────────────────────────
  {
    id: 'ENT-SUBKO-IN',
    code: 'SUBKO-IN',
    name: 'Subko Coffee Pvt Ltd – India',
    legalName: 'Subko Coffee Private Limited',
    country: 'India',
    currency: 'INR',
    taxRegime: 'GST',
    status: 'Active',
    aliases: ['E001', 'PSPL', 'ACME'], // Legacy entity IDs
    establishedDate: '2015-06-01',
    fiscalYearEnd: '31-Mar'
  },

  // ──────────────────────────────────────────────────────────────────────
  // SUBKO COFFEE - DUBAI
  // ──────────────────────────────────────────────────────────────────────
  {
    id: 'ENT-SUBKO-UAE',
    code: 'SUBKO-UAE',
    name: 'Subko Coffee – Dubai',
    legalName: 'Subko Coffee LLC',
    country: 'UAE',
    currency: 'AED',
    taxRegime: 'VAT',
    status: 'Active',
    aliases: ['E004', 'PGS', 'GLBL'], // Legacy entity IDs
    establishedDate: '2020-01-15',
    fiscalYearEnd: '31-Dec'
  },

  // ──────────────────────────────────────────────────────────────────────
  // PROCINIX - INDIA
  // ──────────────────────────────────────────────────────────────────────
  {
    id: 'ENT-PROCINIX-IN',
    code: 'PROC-IN',
    name: 'Procinix Ltd – India',
    legalName: 'Procinix Limited',
    country: 'India',
    currency: 'INR',
    taxRegime: 'GST',
    status: 'Active',
    aliases: ['E002', 'PML', 'TECH'], // Legacy entity IDs
    establishedDate: '2018-03-10',
    fiscalYearEnd: '31-Mar'
  },

  // ──────────────────────────────────────────────────────────────────────
  // LEGACY ENTITIES (ALIASED TO CANONICAL, BUT HIDDEN)
  // ──────────────────────────────────────────────────────────────────────
  // These are kept for dataset continuity but not shown in switcher
  
  {
    id: 'E003',
    code: 'PRI',
    name: 'Procinix Retail India',
    legalName: 'Procinix Retail India Private Limited',
    country: 'India',
    currency: 'INR',
    taxRegime: 'GST',
    status: 'Inactive', // Hidden from switcher
    aliases: ['PREM'], // Legacy alias
    establishedDate: '2019-08-01',
    fiscalYearEnd: '31-Mar'
  }
];

// ============================================================================
// ENTITY REGISTRY FUNCTIONS
// ============================================================================

/**
 * Get all active entities (shown in entity switcher)
 */
export function getActiveEntities(): CanonicalEntity[] {
  return CANONICAL_ENTITIES.filter(entity => entity.status === 'Active');
}

/**
 * Get entity by canonical ID
 */
export function getEntityById(id: string): CanonicalEntity | undefined {
  return CANONICAL_ENTITIES.find(entity => entity.id === id);
}

/**
 * Get entity by entity code (SUBKO-IN, SUBKO-UAE, PROC-IN)
 */
export function getEntityByCode(code: string): CanonicalEntity | undefined {
  return CANONICAL_ENTITIES.find(entity => entity.code === code);
}

/**
 * Resolve entity by ID or alias (backward compatibility)
 * Supports both new canonical IDs and legacy entity IDs
 */
export function resolveEntity(idOrAlias: string): CanonicalEntity | undefined {
  // First, try direct match
  let entity = CANONICAL_ENTITIES.find(e => e.id === idOrAlias);
  
  // If not found, try alias match
  if (!entity) {
    entity = CANONICAL_ENTITIES.find(e => 
      e.aliases && e.aliases.includes(idOrAlias)
    );
  }
  
  return entity;
}

/**
 * Get entities by country
 */
export function getEntitiesByCountry(country: string): CanonicalEntity[] {
  return CANONICAL_ENTITIES.filter(
    entity => entity.country === country && entity.status === 'Active'
  );
}

/**
 * Get entities by currency
 */
export function getEntitiesByCurrency(currency: string): CanonicalEntity[] {
  return CANONICAL_ENTITIES.filter(
    entity => entity.currency === currency && entity.status === 'Active'
  );
}

/**
 * Get entities by tax regime
 */
export function getEntitiesByTaxRegime(taxRegime: string): CanonicalEntity[] {
  return CANONICAL_ENTITIES.filter(
    entity => entity.taxRegime === taxRegime && entity.status === 'Active'
  );
}

/**
 * Check if an entity ID is an alias
 */
export function isAlias(id: string): boolean {
  return CANONICAL_ENTITIES.some(e => e.aliases && e.aliases.includes(id));
}

/**
 * Get canonical entity ID from alias
 */
export function getCanonicalId(idOrAlias: string): string | undefined {
  const entity = resolveEntity(idOrAlias);
  return entity?.id;
}

// ============================================================================
// ALIAS MAPPING (FOR BACKWARD COMPATIBILITY)
// ============================================================================

/**
 * Legacy entity ID to canonical entity mapping
 * Used for rebinding old datasets without re-computation
 */
export const ENTITY_ALIAS_MAP: Record<string, string> = {
  // Procinix Solutions → Subko Coffee India
  'E001': 'ENT-SUBKO-IN',
  'PSPL': 'ENT-SUBKO-IN',
  'ACME': 'ENT-SUBKO-IN',
  
  // Procinix Global Services → Subko Coffee Dubai
  'E004': 'ENT-SUBKO-UAE',
  'PGS': 'ENT-SUBKO-UAE',
  'GLBL': 'ENT-SUBKO-UAE',
  
  // Procinix Manufacturing → Procinix India
  'E002': 'ENT-PROCINIX-IN',
  'PML': 'ENT-PROCINIX-IN',
  'TECH': 'ENT-PROCINIX-IN',
  
  // Procinix Retail → Inactive (hidden)
  'E003': 'E003', // Kept for dataset continuity
  'PRI': 'E003',
  'PREM': 'E003'
};

/**
 * Resolve legacy entity ID to canonical ID
 */
export function resolveToCanonical(legacyId: string): string {
  return ENTITY_ALIAS_MAP[legacyId] || legacyId;
}

/**
 * Filter function for dataset queries
 * Use this to filter data by entity in dashboards/analytics
 */
export function createEntityFilter(activeEntityId: string) {
  const canonicalId = resolveToCanonical(activeEntityId);
  const entity = getEntityById(canonicalId);
  
  return (dataEntity: string): boolean => {
    // Check if data entity matches canonical ID
    if (dataEntity === canonicalId) return true;
    
    // Check if data entity is an alias of the canonical entity
    if (entity?.aliases && entity.aliases.includes(dataEntity)) return true;
    
    // Check if data entity resolves to same canonical ID
    return resolveToCanonical(dataEntity) === canonicalId;
  };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get display name for entity (used in UI)
 */
export function getEntityDisplayName(idOrAlias: string): string {
  const entity = resolveEntity(idOrAlias);
  return entity?.name || 'Unknown Entity';
}

/**
 * Get entity currency symbol
 */
export function getEntityCurrencySymbol(idOrAlias: string): string {
  const entity = resolveEntity(idOrAlias);
  
  const currencySymbols: Record<string, string> = {
    'INR': '₹',
    'AED': 'د.إ',
    'USD': '$',
    'EUR': '€',
    'GBP': '£'
  };
  
  return currencySymbols[entity?.currency || 'INR'] || '';
}

/**
 * Get entity country flag emoji
 */
export function getEntityFlag(idOrAlias: string): string {
  const entity = resolveEntity(idOrAlias);
  
  const flags: Record<string, string> = {
    'India': '🇮🇳',
    'UAE': '🇦🇪',
    'USA': '🇺🇸',
    'UK': '🇬🇧',
    'Singapore': '🇸🇬'
  };
  
  return flags[entity?.country || 'India'] || '🌍';
}

// ============================================================================
// EXPORT DEFAULT REGISTRY
// ============================================================================

export const EntityRegistry = {
  entities: CANONICAL_ENTITIES,
  getActiveEntities,
  getEntityById,
  getEntityByCode,
  resolveEntity,
  getEntitiesByCountry,
  getEntitiesByCurrency,
  getEntitiesByTaxRegime,
  isAlias,
  getCanonicalId,
  resolveToCanonical,
  createEntityFilter,
  getEntityDisplayName,
  getEntityCurrencySymbol,
  getEntityFlag
};

export default EntityRegistry;
