/**
 * Rule Applicator
 * Applies tagging rules to markdown files
 */

import type { Rule, ProcessResult } from "../types.ts";
import { matchPOSPattern, matchKeyword, matchLiteral, matchEntity } from "../nlp/processor.ts";
import { applyFilters } from "./filters.ts";

/**
 * Apply rules to file content and determine which tags should be present
 */
export async function applyRulesToContent(
  content: string,
  rules: Rule[]
): Promise<{ matchedRules: string[]; expectedTags: Set<string> }> {
  const matchedRules: string[] = [];
  const expectedTags = new Set<string>();

  // Only process enabled rules
  const enabledRules = rules.filter(r => r.enabled !== false);

  for (const rule of enabledRules) {
    let rawMatches;

    // Get matches based on rule type
    switch (rule.type) {
      case 'pattern':
        rawMatches = matchPOSPattern(content, rule.match);
        break;
      case 'keyword':
        rawMatches = matchKeyword(content, rule.match, {
          lemma: rule.lemma,
          stem: rule.stem,
        });
        break;
      case 'literal':
        rawMatches = matchLiteral(content, rule.match);
        break;
      case 'entity':
        rawMatches = matchEntity(content, rule.match);
        break;
    }

    // Apply filters to matches
    const filteredMatches = applyFilters(content, rawMatches, rule.filters);

    // If we have matches after filtering, this rule matched
    if (filteredMatches.length > 0) {
      matchedRules.push(rule.id);

      // Add all tags from this rule
      for (const tag of rule.tags) {
        expectedTags.add(tag);
      }
    }
  }

  return { matchedRules, expectedTags };
}

/**
 * Extract existing tags from markdown content
 * Excludes tags in code blocks
 */
export function extractExistingTags(content: string): Set<string> {
  const tags = new Set<string>();
  const tagPattern = /#([a-zA-Z0-9\-_\/]+)/g;

  const codeBlocks = extractCodeBlocks(content);

  let match;
  while ((match = tagPattern.exec(content)) !== null) {
    const matchIndex = match.index;

    const inCodeBlock = codeBlocks.some(
      block => matchIndex >= block.start && matchIndex <= block.end
    );

    if (!inCodeBlock) {
      tags.add(match[1]);
    }
  }

  return tags;
}

/**
 * Extract code block boundaries
 */
function extractCodeBlocks(content: string): Array<{ start: number; end: number }> {
  const blocks: Array<{ start: number; end: number }> = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  let blockStart = 0;
  let currentIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        blockStart = currentIndex;
      } else {
        inCodeBlock = false;
        blocks.push({
          start: blockStart,
          end: currentIndex + line.length,
        });
      }
    }

    currentIndex += line.length + 1;
  }

  return blocks;
}

/**
 * Insert tags into markdown content
 */
export function insertTags(content: string, tagsToAdd: string[]): string {
  if (tagsToAdd.length === 0) {
    return content;
  }

  const tagString = tagsToAdd.map(tag => `#${tag}`).join(" ");
  const lines = content.split("\n");

  // Check for frontmatter
  const frontmatter = extractFrontmatter(content);

  // Find existing tag line
  const existingTagLinePattern = /^#[a-zA-Z0-9\-_\/]+(\s+#[a-zA-Z0-9\-_\/]+)*\s*$/;
  let lastTagLineIndex = -1;
  let startSearchIndex = frontmatter.exists ? frontmatter.end : 0;

  for (let i = startSearchIndex; i < lines.length; i++) {
    if (existingTagLinePattern.test(lines[i].trim())) {
      lastTagLineIndex = i;
    }
  }

  if (lastTagLineIndex >= 0) {
    // Append to existing tag line
    lines[lastTagLineIndex] = lines[lastTagLineIndex].trim() + " " + tagString;
  } else {
    // Add new tag line at the end
    let insertIndex = lines.length;

    // Skip trailing empty lines
    while (insertIndex > 0 && lines[insertIndex - 1].trim() === "") {
      insertIndex--;
    }

    if (insertIndex === lines.length) {
      lines.push("");
      lines.push(tagString);
    } else {
      lines.splice(insertIndex, 0, "", tagString);
    }
  }

  return lines.join("\n");
}

/**
 * Remove tags from markdown content
 */
export function removeTags(content: string, tagsToRemove: string[]): string {
  if (tagsToRemove.length === 0) {
    return content;
  }

  let result = content;

  for (const tag of tagsToRemove) {
    const tagPattern = new RegExp(`#${escapeRegExp(tag)}\\b`, 'g');
    result = result.replace(tagPattern, '');
  }

  // Clean up extra whitespace
  result = result.replace(/\s+\n/g, '\n').replace(/\n+$/g, '\n');

  return result;
}

/**
 * Extract frontmatter boundaries
 */
interface FrontmatterBounds {
  start: number;
  end: number;
  exists: boolean;
}

function extractFrontmatter(content: string): FrontmatterBounds {
  const lines = content.split("\n");

  if (lines[0] !== "---") {
    return { start: 0, end: 0, exists: false };
  }

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      return {
        start: 0,
        end: i + 1,
        exists: true,
      };
    }
  }

  return { start: 0, end: 0, exists: false };
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Apply rules to a file and update tags
 */
export async function processFile(
  filePath: string,
  rules: Rule[]
): Promise<ProcessResult> {
  const result: ProcessResult = {
    modified: false,
    addedTags: [],
    removedTags: [],
    matchedRules: [],
  };

  try {
    let content = await Deno.readTextFile(filePath);

    // Get expected tags based on rules
    const { matchedRules, expectedTags } = await applyRulesToContent(content, rules);
    result.matchedRules = matchedRules;

    // Get existing tags
    const existingTags = extractExistingTags(content);

    // Get all tags that could be managed by rules
    const allRuleTags = new Set<string>();
    for (const rule of rules) {
      if (rule.enabled !== false) {
        for (const tag of rule.tags) {
          allRuleTags.add(tag);
        }
      }
    }

    // Determine tags to remove (rule-managed tags that are no longer expected)
    const tagsToRemove = Array.from(existingTags).filter(tag =>
      allRuleTags.has(tag) && !expectedTags.has(tag)
    );

    // Determine tags to add (expected tags that don't exist)
    const tagsToAdd = Array.from(expectedTags).filter(tag => !existingTags.has(tag));

    // Apply tag changes
    if (tagsToRemove.length > 0) {
      content = removeTags(content, tagsToRemove);
      result.modified = true;
      result.removedTags = tagsToRemove;
    }

    if (tagsToAdd.length > 0) {
      content = insertTags(content, tagsToAdd);
      result.modified = true;
      result.addedTags = tagsToAdd;
    }

    // Write back if modified
    if (result.modified) {
      await Deno.writeTextFile(filePath, content);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}
