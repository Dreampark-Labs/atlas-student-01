import { Id } from "@/convex/_generated/dataModel";

/**
 * Generate a URL-safe slug from a string
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
}

/**
 * Generate a unique term slug with name and ID
 */
export function createTermSlug(termName: string, termId: Id<"terms">): string {
  const nameSlug = createSlug(termName);
  // Take last 8 characters of the ID for uniqueness
  const idPart = termId.slice(-8);
  return `${nameSlug}-${idPart}`;
}

/**
 * Generate a unique class slug with name and ID
 */
export function createClassSlug(className: string, classId: Id<"classes">): string {
  const nameSlug = createSlug(className);
  // Take last 8 characters of the ID for uniqueness
  const idPart = classId.slice(-8);
  return `${nameSlug}-${idPart}`;
}

/**
 * Extract ID from a slug (get the part after the last hyphen)
 */
export function extractIdFromSlug(slug: string): string {
  const parts = slug.split('-');
  return parts[parts.length - 1];
}

/**
 * Generate a unique All Terms identifier for a user
 */
export function generateAllTermsId(userId: string): string {
  // Create a consistent hash-like identifier from the user ID
  const hash = userId.split('').reduce((acc, char, index) => {
    const charCode = char.charCodeAt(0);
    return ((acc << 5) - acc + charCode) & 0xffffffff;
  }, 0);
  
  // Convert to a positive hex string and take last 8 characters
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `all-${hexHash.slice(-8)}`;
}

/**
 * Generate All Terms slug for a user
 */
export function createAllTermsSlug(userId: string): string {
  const allTermsId = generateAllTermsId(userId);
  return `all-terms-${allTermsId.slice(-8)}`;
}

/**
 * Check if a slug represents the All Terms view
 */
export function isAllTermsSlug(slug: string): boolean {
  return slug.startsWith('all-terms-');
}

/**
 * Check if an ID is an All Terms ID
 */
export function isAllTermsId(id: string): boolean {
  return id === "all-terms" || (typeof id === 'string' && id.startsWith('all-'));
}

/**
 * Generate term-based URL paths
 */
export function generateTermPath(termName: string, termId: Id<"terms"> | string, page?: string): string {
  // Special handling for All Terms
  if (typeof termId === 'string' && isAllTermsId(termId)) {
    const userId = termId.split('-')[1]; // Extract userId from the ID if available
    const allTermsSlug = userId ? createAllTermsSlug(userId) : 'all-terms';
    const basePath = `/term/${allTermsSlug}`;
    
    if (!page || page === 'dashboard') {
      return basePath;
    }
    
    return `${basePath}/${page}`;
  }
  
  // Normal term handling
  const termSlug = createTermSlug(termName, termId as Id<"terms">);
  const basePath = `/term/${termSlug}`;
  
  if (!page || page === 'dashboard') {
    return basePath;
  }
  
  return `${basePath}/${page}`;
}

/**
 * Generate class-based URL paths within a term
 */
export function generateClassPath(
  termName: string, 
  termId: Id<"terms">, 
  className: string, 
  classId: Id<"classes">, 
  page?: string
): string {
  const termSlug = createTermSlug(termName, termId);
  const classSlug = createClassSlug(className, classId);
  const basePath = `/term/${termSlug}/class/${classSlug}`;
  
  if (!page || page === 'assignments') {
    return basePath;
  }
  
  return `${basePath}/${page}`;
}

/**
 * Parse a term path to extract term ID
 */
export function parseTermPath(path: string): { termId: string | null } {
  const match = path.match(/^\/term\/(.+?)(?:\/|$)/);
  if (!match) return { termId: null };
  
  const termSlug = match[1];
  const termId = extractIdFromSlug(termSlug);
  
  return { termId };
}

/**
 * Parse a class path to extract term ID and class ID
 */
export function parseClassPath(path: string): { termId: string | null; classId: string | null } {
  const match = path.match(/^\/term\/(.+?)\/class\/(.+?)(?:\/|$)/);
  if (!match) return { termId: null, classId: null };
  
  const termSlug = match[1];
  const classSlug = match[2];
  const termId = extractIdFromSlug(termSlug);
  const classId = extractIdFromSlug(classSlug);
  
  return { termId, classId };
}
