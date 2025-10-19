/**
 * Filter System
 * Evaluates filter conditions against match contexts
 */

import type { RuleFilters, MatchContext, POSType } from "../types.ts";
import {
  getMatchSentiment,
  filterByPOS,
  hasEntityTypes,
} from "../nlp/processor.ts";

/**
 * Evaluate all filters for a match
 * Returns true if the match passes all filter conditions
 * AND logic between different filter types
 */
export function evaluateFilters(
  fullText: string,
  match: MatchContext,
  filters?: RuleFilters
): boolean {
  if (!filters) {
    return true; // No filters means all matches pass
  }

  // POS filter (for keywords) - cheap, just checks match.posTags
  if (filters.pos && filters.pos.length > 0) {
    if (!evaluatePOSFilter(match, filters.pos)) {
      return false;
    }
  }

  // Entity filter - cheap, just checks if entity type exists in document
  if (filters.requireEntity && filters.requireEntity.length > 0) {
    if (!evaluateSimpleEntityFilter(fullText, filters.requireEntity)) {
      return false;
    }
  }

  // Sentiment filter - relatively cheap
  if (filters.sentiment) {
    if (!evaluateSentimentFilter(fullText, match, filters.sentiment)) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluate POS filter (for keyword matches)
 * OR logic within array
 */
function evaluatePOSFilter(
  match: MatchContext,
  allowedPOS: POSType[]
): boolean {
  if (!match.posTags || match.posTags.length === 0) {
    return false;
  }

  // Check if any of the match's POS tags are in the allowed list
  return match.posTags.some(pos => allowedPOS.includes(pos));
}

/**
 * Evaluate simple entity filter
 * Just checks if entity type exists anywhere in document (no proximity)
 * OR logic between entity types
 */
function evaluateSimpleEntityFilter(
  fullText: string,
  entityFilters: Array<{
    types: string[];
    scope?: 'sentence' | 'paragraph' | 'document';
  }>
): boolean {
  // Collect all required types (OR across filters and types)
  const allTypes: string[] = [];
  for (const filter of entityFilters) {
    allTypes.push(...filter.types);
  }

  // Check if any of the types exist in the document
  return hasEntityTypes(fullText, allTypes);
}

/**
 * Evaluate sentiment filter
 */
function evaluateSentimentFilter(
  fullText: string,
  match: MatchContext,
  sentimentFilter: {
    min?: number;
    max?: number;
    scope?: 'sentence' | 'paragraph' | 'document' | 'match';
  }
): boolean {
  const scope = sentimentFilter.scope || 'sentence';
  const sentiment = getMatchSentiment(fullText, match.start, scope);

  if (sentimentFilter.min !== undefined && sentiment < sentimentFilter.min) {
    return false;
  }

  if (sentimentFilter.max !== undefined && sentiment > sentimentFilter.max) {
    return false;
  }

  return true;
}

/**
 * Apply filters to a list of matches
 * Returns only matches that pass all filter conditions
 */
export function applyFilters(
  fullText: string,
  matches: MatchContext[],
  filters?: RuleFilters
): MatchContext[] {
  if (!filters) {
    return matches;
  }

  return matches.filter(match => evaluateFilters(fullText, match, filters));
}

/**
 * Get human-readable description of filters
 */
export function describeFilters(filters?: RuleFilters): string[] {
  if (!filters) {
    return [];
  }

  const descriptions: string[] = [];

  // POS
  if (filters.pos && filters.pos.length > 0) {
    descriptions.push(`pos(${filters.pos.join(",")})`);
  }

  // Entity
  if (filters.requireEntity && filters.requireEntity.length > 0) {
    filters.requireEntity.forEach(entity => {
      const types = entity.types.join(",");
      const scope = entity.scope ? `:${entity.scope}` : "";
      descriptions.push(`entity(${types}${scope})`);
    });
  }

  // Sentiment
  if (filters.sentiment) {
    const parts: string[] = [];
    if (filters.sentiment.min !== undefined) {
      parts.push(`min:${filters.sentiment.min}`);
    }
    if (filters.sentiment.max !== undefined) {
      parts.push(`max:${filters.sentiment.max}`);
    }
    const scope = filters.sentiment.scope ? `:${filters.sentiment.scope}` : "";
    descriptions.push(`sentiment(${parts.join(",")}${scope})`);
  }

  return descriptions;
}

/**
 * Parse filter flags from command line arguments
 */
export interface FilterOptions {
  requireEntity?: string[];
  sentimentMin?: string;
  sentimentMax?: string;
  sentimentBetween?: string;
  pos?: string;
}

export function parseFilters(options: FilterOptions): RuleFilters {
  const filters: RuleFilters = {};

  // POS (keyword only)
  if (options.pos) {
    filters.pos = options.pos.split(',').map(p => p.trim() as POSType);
  }

  // Entity requirements
  if (options.requireEntity && options.requireEntity.length > 0) {
    filters.requireEntity = options.requireEntity.map(entityStr => {
      // Format: "TYPE1,TYPE2[:scope]"
      const parts = entityStr.split(':');
      const types = parts[0].split(',').map(t => t.trim()) as any[];
      const scope = parts[1] as 'sentence' | 'paragraph' | 'document' | undefined;

      return { types, scope };
    });
  }

  // Sentiment
  if (options.sentimentMin || options.sentimentMax || options.sentimentBetween) {
    filters.sentiment = {};

    if (options.sentimentMin) {
      const parts = options.sentimentMin.split(':');
      filters.sentiment.min = parseFloat(parts[0]);
      if (parts[1]) {
        filters.sentiment.scope = parts[1] as any;
      }
    }

    if (options.sentimentMax) {
      const parts = options.sentimentMax.split(':');
      filters.sentiment.max = parseFloat(parts[0]);
      if (parts[1]) {
        filters.sentiment.scope = parts[1] as any;
      }
    }

    if (options.sentimentBetween) {
      const parts = options.sentimentBetween.split(':');
      const [min, max] = parts[0].split(',').map(parseFloat);
      filters.sentiment.min = min;
      filters.sentiment.max = max;
      if (parts[1]) {
        filters.sentiment.scope = parts[1] as any;
      }
    }
  }

  return filters;
}
