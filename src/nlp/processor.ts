/**
 * NLP Processing Module
 * Wraps wink-nlp to provide all NLP functionality needed for the tagging system
 */

import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import type { POSType, EntityType, Scope, MatchContext } from "../types.ts";

// Singleton NLP instance
let nlpInstance: any = null;

/**
 * Get or create the NLP instance
 */
function getNLP() {
  if (!nlpInstance) {
    nlpInstance = winkNLP(model);
  }
  return nlpInstance;
}

/**
 * Process text and return document object
 */
export function processText(text: string): any {
  const nlp = getNLP();
  return nlp.readDoc(text);
}

/**
 * Extract sentences from text
 */
export function extractSentences(text: string): string[] {
  const doc = processText(text);
  const sentences: string[] = [];
  doc.sentences().each((sentence: any) => {
    sentences.push(sentence.out());
  });
  return sentences;
}

/**
 * Extract paragraphs from text (split by double newline)
 */
export function extractParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
}

/**
 * Get scope text for a given position in the document
 */
export function getScopeText(
  text: string,
  position: number,
  scope: Scope
): string {
  if (scope === 'document') {
    return text;
  }

  if (scope === 'paragraph') {
    const paragraphs = extractParagraphs(text);
    let currentPos = 0;
    for (const para of paragraphs) {
      if (currentPos + para.length >= position) {
        return para;
      }
      currentPos += para.length + 2; // +2 for double newline
    }
    return text;
  }

  // Default to sentence
  const doc = processText(text);
  let result = '';
  doc.sentences().each((sentence: any) => {
    const sentenceText = sentence.out();
    const start = text.indexOf(sentenceText);
    const end = start + sentenceText.length;
    if (start <= position && position <= end) {
      result = sentenceText;
    }
  });
  return result || text;
}

/**
 * Perform POS pattern matching (e.g., "VERB NOUN")
 * Optimized version - no scope extraction, no negation checking
 */
export function matchPOSPattern(
  text: string,
  pattern: string
): MatchContext[] {
  const nlp = getNLP();
  const doc = processText(text);
  const matches: MatchContext[] = [];

  // Parse pattern into expected POS tags
  const expectedPOS = pattern.split(/\s+/) as POSType[];

  // Get all tokens with their positions
  const tokens: any[] = [];
  let currentPos = 0;

  doc.tokens().each((token: any) => {
    const tokenText = token.out();
    const index = text.indexOf(tokenText, currentPos);

    tokens.push({
      text: tokenText,
      pos: token.out(nlp.its.pos) as POSType,
      index: index >= 0 ? index : currentPos,
    });

    if (index >= 0) {
      currentPos = index + tokenText.length;
    }
  });

  // Find sequences matching the pattern
  for (let i = 0; i <= tokens.length - expectedPOS.length; i++) {
    let matches_pattern = true;
    for (let j = 0; j < expectedPOS.length; j++) {
      if (tokens[i + j].pos !== expectedPOS[j]) {
        matches_pattern = false;
        break;
      }
    }

    if (matches_pattern) {
      const matchedTokens = tokens.slice(i, i + expectedPOS.length);
      const matchedText = matchedTokens.map(t => t.text).join(' ');
      const start = matchedTokens[0].index;
      const end = start + matchedText.length;

      // Lightweight match context - no expensive scope extraction
      matches.push({
        text: matchedText,
        start,
        end,
        posTags: matchedTokens.map(t => t.pos),
      });
    }
  }

  return matches;
}

/**
 * Match keyword with optional lemmatization/stemming
 * Optimized version - no scope extraction, no negation checking
 */
export function matchKeyword(
  text: string,
  keyword: string,
  options: { lemma?: boolean; stem?: boolean } = {}
): MatchContext[] {
  const nlp = getNLP();
  const doc = processText(text);
  const matches: MatchContext[] = [];

  const searchTerm = keyword.toLowerCase();

  doc.tokens().each((token: any) => {
    let tokenText = token.out().toLowerCase();

    if (options.lemma) {
      tokenText = token.out(nlp.its.lemma).toLowerCase();
    } else if (options.stem) {
      tokenText = token.out(nlp.its.stem).toLowerCase();
    }

    if (tokenText === searchTerm) {
      const originalText = token.out();
      const start = text.indexOf(originalText);

      // Lightweight match context - no expensive scope extraction
      matches.push({
        text: originalText,
        start,
        end: start + originalText.length,
        posTags: [token.out(nlp.its.pos) as POSType],
      });
    }
  });

  return matches;
}

/**
 * Match literal phrase (exact match, case-insensitive)
 * Optimized version - no scope extraction, no negation checking
 */
export function matchLiteral(
  text: string,
  phrase: string
): MatchContext[] {
  const matches: MatchContext[] = [];
  const lowerText = text.toLowerCase();
  const lowerPhrase = phrase.toLowerCase();

  let index = 0;
  while ((index = lowerText.indexOf(lowerPhrase, index)) !== -1) {
    const matchedText = text.substring(index, index + phrase.length);

    // Lightweight match context - no expensive scope extraction
    matches.push({
      text: matchedText,
      start: index,
      end: index + phrase.length,
    });

    index += phrase.length;
  }

  return matches;
}

/**
 * Extract entities from text
 */
export function extractEntities(text: string): Array<{ text: string; type: string; start: number }> {
  const doc = processText(text);
  const entities: Array<{ text: string; type: string; start: number }> = [];

  doc.entities().each((entity: any) => {
    const entityText = entity.out();
    const type = entity.out((getNLP().its as any).type);
    const start = text.indexOf(entityText);

    entities.push({
      text: entityText,
      type: type || 'UNKNOWN',
      start,
    });
  });

  return entities;
}

/**
 * Match entities by type (for entity rules)
 * Returns lightweight match contexts for all entities of the given type
 */
export function matchEntity(
  text: string,
  entityType: string
): MatchContext[] {
  const entities = extractEntities(text);
  const matches: MatchContext[] = [];

  for (const entity of entities) {
    if (entity.type === entityType) {
      matches.push({
        text: entity.text,
        start: entity.start,
        end: entity.start + entity.text.length,
      });
    }
  }

  return matches;
}

/**
 * Check if document contains any entity of given types (for filters)
 * Simplified - just checks document-level existence, no proximity
 */
export function hasEntityTypes(
  text: string,
  requiredTypes: string[]
): boolean {
  const entities = extractEntities(text);
  const entityTypes = new Set(entities.map(e => e.type));

  return requiredTypes.some(type => entityTypes.has(type));
}

/**
 * Check if required entities exist within scope
 */
export function hasRequiredEntities(
  text: string,
  matchPos: number,
  requiredTypes: EntityType[],
  scope: Scope = 'sentence'
): boolean {
  const scopeText = getScopeText(text, matchPos, scope);
  const entities = extractEntities(scopeText);

  return entities.some(entity =>
    requiredTypes.includes(entity.type as EntityType)
  );
}

/**
 * Calculate sentiment score for text
 */
export function calculateSentiment(text: string, scope: Scope = 'sentence'): number {
  const nlp = getNLP();

  if (scope === 'sentence') {
    const doc = processText(text);
    let totalSentiment = 0;
    let sentenceCount = 0;

    doc.sentences().each((sentence: any) => {
      const sentiment = sentence.out(nlp.its.sentiment);
      if (typeof sentiment === 'number') {
        totalSentiment += sentiment;
        sentenceCount++;
      }
    });

    return sentenceCount > 0 ? totalSentiment / sentenceCount : 0;
  }

  // For paragraph or document, process as a whole
  const doc = processText(text);
  const sentiment = doc.out(nlp.its.sentiment);
  return typeof sentiment === 'number' ? sentiment : 0;
}

/**
 * Get sentiment for match context
 */
export function getMatchSentiment(
  text: string,
  matchPos: number,
  scope: Scope = 'sentence'
): number {
  const scopeText = getScopeText(text, matchPos, scope);
  return calculateSentiment(scopeText, scope);
}

/**
 * Filter matches by POS tags (for keyword matches)
 */
export function filterByPOS(
  matches: MatchContext[],
  allowedPOS: POSType[]
): MatchContext[] {
  return matches.filter(match => {
    if (!match.posTags || match.posTags.length === 0) return false;
    return match.posTags.some(pos => allowedPOS.includes(pos));
  });
}

/**
 * Get token POS tag
 */
export function getTokenPOS(text: string, position: number): POSType | null {
  const nlp = getNLP();
  const doc = processText(text);

  let result: POSType | null = null;
  doc.tokens().each((token: any) => {
    const tokenStart = text.indexOf(token.out());
    if (tokenStart === position) {
      result = token.out(nlp.its.pos) as POSType;
    }
  });

  return result;
}

/**
 * Discover frequent keywords in text
 */
export function discoverKeywords(text: string, limit: number = 50): Array<{ keyword: string; count: number }> {
  const nlp = getNLP();

  // Show progress for document processing
  Deno.stdout.writeSync(new TextEncoder().encode("  Tokenizing document...\n"));
  const doc = processText(text);

  Deno.stdout.writeSync(new TextEncoder().encode("  Analyzing word frequencies...\n"));
  const wordCounts = new Map<string, number>();
  let tokenCount = 0;

  // Count word frequencies (lemmatized, excluding stop words and punctuation)
  doc.tokens().each((token: any) => {
    tokenCount++;

    // Show progress every 1000 tokens
    if (tokenCount % 1000 === 0) {
      Deno.stdout.writeSync(new TextEncoder().encode(`  Processed ${tokenCount} tokens...\n`));
    }

    const pos = token.out(nlp.its.pos);

    // Only count nouns, verbs, adjectives
    if (['NOUN', 'VERB', 'ADJ', 'PROPN'].includes(pos)) {
      const lemma = token.out(nlp.its.lemma).toLowerCase();

      if (lemma.length > 2) { // Exclude very short words
        wordCounts.set(lemma, (wordCounts.get(lemma) || 0) + 1);
      }
    }
  });

  // Sort by frequency and return top N
  return Array.from(wordCounts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Discover pattern matches in text (fast version for discovery only)
 */
export function discoverPatterns(
  text: string,
  pattern: string,
  limit: number = 50
): Array<{ text: string; count: number }> {
  const nlp = getNLP();

  Deno.stdout.writeSync(new TextEncoder().encode("  Tokenizing and tagging parts of speech...\n"));
  const doc = processText(text);

  // Parse pattern into expected POS tags
  const expectedPOS = pattern.split(/\s+/) as POSType[];

  // Get all tokens with their POS tags (lightweight, no position tracking)
  Deno.stdout.writeSync(new TextEncoder().encode("  Extracting tokens...\n"));
  const tokens: Array<{ text: string; pos: POSType }> = [];
  let tokenCount = 0;

  doc.tokens().each((token: any) => {
    tokenCount++;

    // Show progress every 1000 tokens
    if (tokenCount % 1000 === 0) {
      Deno.stdout.writeSync(new TextEncoder().encode(`  Processed ${tokenCount} tokens...\n`));
    }

    tokens.push({
      text: token.out(),
      pos: token.out(nlp.its.pos) as POSType,
    });
  });

  // Find sequences matching the pattern (no context extraction)
  Deno.stdout.writeSync(new TextEncoder().encode(`  Searching for pattern matches in ${tokens.length} tokens...\n`));
  const patternCounts = new Map<string, number>();
  let matchesFound = 0;

  for (let i = 0; i <= tokens.length - expectedPOS.length; i++) {
    // Show progress every 5000 positions checked
    if (i % 5000 === 0 && i > 0) {
      Deno.stdout.writeSync(new TextEncoder().encode(`  Checked ${i}/${tokens.length} positions (${matchesFound} matches so far)...\n`));
    }

    let matches_pattern = true;
    for (let j = 0; j < expectedPOS.length; j++) {
      if (tokens[i + j].pos !== expectedPOS[j]) {
        matches_pattern = false;
        break;
      }
    }

    if (matches_pattern) {
      const matchedTokens = tokens.slice(i, i + expectedPOS.length);
      const matchedText = matchedTokens.map(t => t.text).join(' ').toLowerCase();
      patternCounts.set(matchedText, (patternCounts.get(matchedText) || 0) + 1);
      matchesFound++;
    }
  }

  Deno.stdout.writeSync(new TextEncoder().encode(`  Found ${matchesFound} total matches, counting unique patterns...\n`));

  return Array.from(patternCounts.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
