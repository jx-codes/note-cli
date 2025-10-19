/**
 * Type definitions for the NLP-based auto-tagging system
 * Based on WINKNLP_UX_DESIGN.md specification
 */

/**
 * Rule types supported by the system
 */
export type RuleType = 'pattern' | 'keyword' | 'literal' | 'entity';

/**
 * Scope for filter operations
 */
export type Scope = 'sentence' | 'paragraph' | 'document' | 'match';

/**
 * Scope for proximity and entity filters (excludes 'match')
 */
export type ContextScope = 'sentence' | 'paragraph' | 'document';

/**
 * Part-of-speech tags supported by wink-nlp
 */
export type POSType =
  | 'VERB' | 'NOUN' | 'ADJ' | 'ADV' | 'PROPN'
  | 'DET' | 'ADP' | 'PRON' | 'NUM' | 'AUX'
  | 'CCONJ' | 'SCONJ' | 'PART' | 'INTJ' | 'SYM' | 'X';

/**
 * Entity types recognized by the system
 */
export type EntityType =
  | 'DATE' | 'TIME' | 'CARDINAL' | 'ORDINAL'
  | 'MONEY' | 'PERCENT' | 'DURATION'
  | 'EMAIL' | 'URL' | 'HASHTAG' | 'MENTION'
  | 'EMOJI' | 'EMOTICON';

/**
 * Entity requirement filter configuration
 * OR logic within types array, OR logic between multiple entity filters
 */
export interface EntityFilter {
  /** Entity types to require (OR within array) */
  types: EntityType[];
  /** Scope for entity search (default: 'sentence') */
  scope?: ContextScope;
}

/**
 * Sentiment filter configuration
 * Single threshold (not an array)
 */
export interface SentimentFilter {
  /** Minimum sentiment score (-1.0 to 1.0) */
  min?: number;
  /** Maximum sentiment score (-1.0 to 1.0) */
  max?: number;
  /** Scope for sentiment analysis (default: 'sentence') */
  scope?: Scope;
}

/**
 * Filters that can be applied to rules
 * AND logic between different filter types
 */
export interface RuleFilters {
  /** Part-of-speech filter (keyword only, OR logic within array) */
  pos?: POSType[];

  /** Entity requirement filters (OR between array items) */
  requireEntity?: EntityFilter[];

  /** Sentiment filter (single threshold) */
  sentiment?: SentimentFilter;
}

/**
 * Complete rule definition
 */
export interface Rule {
  // Identity
  /** Auto-generated ID (e.g., "pattern-verb-noun", "keyword-deploy") */
  id: string;
  /** Rule type */
  type: RuleType;
  /** Pattern/keyword/phrase to match */
  match: string;

  // Keyword-specific properties
  /** Use lemmatization for keyword matching */
  lemma?: boolean;
  /** Use stemming for keyword matching */
  stem?: boolean;

  // Filters (all optional)
  filters?: RuleFilters;

  // Output
  /** Tags to apply when rule matches */
  tags: string[];
  /** Groups this rule belongs to */
  groups?: string[];

  // Metadata
  /** Whether rule is enabled (default: true) */
  enabled?: boolean;
  /** Human-readable description */
  description?: string;
  /** ISO timestamp of creation */
  created?: string;
  /** ISO timestamp of last modification */
  modified?: string;
}

/**
 * Group configuration for organizing rules
 */
export interface Group {
  /** Human-readable description */
  description?: string;
  /** Additional tags applied to all rules in group */
  additionalTags?: string[];
  /** Whether group is enabled (can disable entire group) */
  enabled?: boolean;
}

/**
 * Global settings for the tagging system
 */
export interface Settings {
  /** Default scope for filter operations */
  defaultScope?: Scope;
}

/**
 * Complete configuration file structure
 */
export interface Config {
  /** All tagging rules */
  rules: Rule[];
  /** Named groups for organizing rules */
  groups?: Record<string, Group>;
  /** Global settings */
  settings?: Settings;
}

/**
 * Result of processing a file with rules
 */
export interface ProcessResult {
  /** Whether the file was modified */
  modified: boolean;
  /** Tags that were added */
  addedTags: string[];
  /** Tags that were removed */
  removedTags: string[];
  /** Rules that matched */
  matchedRules: string[];
}

/**
 * Result of testing a rule (dry-run)
 */
export interface TestResult {
  /** Number of matches found */
  matchCount: number;
  /** Sample matches with context */
  matches: Array<{
    /** Text that matched */
    text: string;
    /** File path where match occurred */
    filePath: string;
    /** Line number in file */
    line: number;
    /** Surrounding context */
    context: string;
  }>;
}

/**
 * Discovered keyword information
 */
export interface DiscoveredKeyword {
  /** The keyword text */
  keyword: string;
  /** Number of occurrences */
  count: number;
  /** Number of files containing this keyword */
  fileCount: number;
  /** Sample files containing the keyword */
  sampleFiles: string[];
}

/**
 * Discovered pattern information
 */
export interface DiscoveredPattern {
  /** The matched pattern text */
  text: string;
  /** Number of files containing this pattern */
  fileCount: number;
  /** Total occurrences */
  count: number;
}

/**
 * Match context for rule evaluation
 */
export interface MatchContext {
  /** The matched text */
  text: string;
  /** Start index in document */
  start: number;
  /** End index in document */
  end: number;
  /** POS tags for matched tokens */
  posTags?: POSType[];
}
