/**
 * Rule Engine
 * Handles rule storage, CRUD operations, and rule management
 */

import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import type { Rule, Config, Group, RuleType } from "../types.ts";

const CONFIG_DIR = join(Deno.env.get("HOME") || "", ".config", "qn");
const RULES_FILE = join(CONFIG_DIR, "rules.json");

/**
 * Load rules configuration from file
 */
export async function loadConfig(): Promise<Config> {
  try {
    const data = await Deno.readTextFile(RULES_FILE);
    return JSON.parse(data);
  } catch {
    return { rules: [] };
  }
}

/**
 * Save rules configuration to file
 */
export async function saveConfig(config: Config): Promise<void> {
  await ensureDir(CONFIG_DIR);
  await Deno.writeTextFile(RULES_FILE, JSON.stringify(config, null, 2));
}

/**
 * Generate a unique rule ID
 * Format: type-slugified-match
 * Example: "pattern-verb-noun", "keyword-deploy"
 */
export function generateRuleId(type: RuleType, match: string): string {
  // Slugify the match
  const slug = match
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50); // Limit length

  return `${type}-${slug}`;
}

/**
 * Ensure rule ID is unique, adding counter if needed
 */
export async function ensureUniqueId(baseId: string): Promise<string> {
  const config = await loadConfig();
  const existingIds = new Set(config.rules.map(r => r.id));

  let id = baseId;
  let counter = 2;

  while (existingIds.has(id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }

  return id;
}

/**
 * Add a new rule
 */
export async function addRule(rule: Omit<Rule, 'id' | 'created'>): Promise<Rule> {
  const config = await loadConfig();

  // Generate unique ID
  const baseId = generateRuleId(rule.type, rule.match);
  const id = await ensureUniqueId(baseId);

  // Create complete rule
  const newRule: Rule = {
    ...rule,
    id,
    enabled: rule.enabled ?? true,
    created: new Date().toISOString(),
  };

  config.rules.push(newRule);
  await saveConfig(config);

  return newRule;
}

/**
 * Get a rule by ID
 */
export async function getRule(id: string): Promise<Rule | null> {
  const config = await loadConfig();
  return config.rules.find(r => r.id === id) || null;
}

/**
 * Get all rules
 */
export async function getRules(filters?: {
  enabled?: boolean;
  disabled?: boolean;
  group?: string;
}): Promise<Rule[]> {
  const config = await loadConfig();
  let rules = config.rules;

  if (filters) {
    if (filters.enabled) {
      rules = rules.filter(r => r.enabled !== false);
    } else if (filters.disabled) {
      rules = rules.filter(r => r.enabled === false);
    }

    if (filters.group) {
      rules = rules.filter(r => r.groups?.includes(filters.group!));
    }
  }

  return rules;
}

/**
 * Update a rule
 */
export async function updateRule(
  id: string,
  updates: Partial<Omit<Rule, 'id' | 'type' | 'match' | 'created'>>
): Promise<Rule | null> {
  const config = await loadConfig();
  const ruleIndex = config.rules.findIndex(r => r.id === id);

  if (ruleIndex === -1) {
    return null;
  }

  // Merge updates
  config.rules[ruleIndex] = {
    ...config.rules[ruleIndex],
    ...updates,
    modified: new Date().toISOString(),
  };

  await saveConfig(config);
  return config.rules[ruleIndex];
}

/**
 * Remove a rule
 */
export async function removeRule(id: string): Promise<boolean> {
  const config = await loadConfig();
  const originalLength = config.rules.length;

  config.rules = config.rules.filter(r => r.id !== id);

  if (config.rules.length < originalLength) {
    await saveConfig(config);
    return true;
  }

  return false;
}

/**
 * Enable a rule
 */
export async function enableRule(id: string): Promise<Rule | null> {
  return await updateRule(id, { enabled: true });
}

/**
 * Disable a rule
 */
export async function disableRule(id: string): Promise<Rule | null> {
  return await updateRule(id, { enabled: false });
}

/**
 * Get all groups
 */
export async function getGroups(): Promise<Record<string, Group>> {
  const config = await loadConfig();
  return config.groups || {};
}

/**
 * Get a specific group
 */
export async function getGroup(name: string): Promise<Group | null> {
  const groups = await getGroups();
  return groups[name] || null;
}

/**
 * Create or update a group
 */
export async function saveGroup(name: string, group: Group): Promise<void> {
  const config = await loadConfig();

  if (!config.groups) {
    config.groups = {};
  }

  config.groups[name] = group;
  await saveConfig(config);
}

/**
 * Remove a group
 */
export async function removeGroup(name: string): Promise<boolean> {
  const config = await loadConfig();

  if (!config.groups || !config.groups[name]) {
    return false;
  }

  delete config.groups[name];

  // Also remove group reference from all rules
  config.rules = config.rules.map(rule => ({
    ...rule,
    groups: rule.groups?.filter(g => g !== name),
  }));

  await saveConfig(config);
  return true;
}

/**
 * Export a rule to JSON
 */
export function exportRule(rule: Rule): string {
  return JSON.stringify(rule, null, 2);
}

/**
 * Export all rules to JSON
 */
export async function exportAllRules(): Promise<string> {
  const config = await loadConfig();
  return JSON.stringify(config, null, 2);
}

/**
 * Import rules from JSON
 */
export async function importRules(jsonData: string): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    const data = JSON.parse(jsonData);

    // Check if it's a single rule or a config with multiple rules
    const rules = Array.isArray(data.rules) ? data.rules : [data];

    for (const ruleData of rules) {
      try {
        // Validate required fields
        if (!ruleData.type || !ruleData.match || !ruleData.tags) {
          result.errors.push(`Invalid rule: missing required fields`);
          result.skipped++;
          continue;
        }

        // Generate new ID to avoid conflicts
        const baseId = generateRuleId(ruleData.type, ruleData.match);
        const id = await ensureUniqueId(baseId);

        const rule: Rule = {
          ...ruleData,
          id,
          created: new Date().toISOString(),
          modified: undefined,
        };

        const config = await loadConfig();
        config.rules.push(rule);
        await saveConfig(config);

        result.imported++;
      } catch (error) {
        result.errors.push(`Error importing rule: ${error instanceof Error ? error.message : String(error)}`);
        result.skipped++;
      }
    }

    // Import groups if present
    if (data.groups) {
      const config = await loadConfig();
      config.groups = { ...config.groups, ...data.groups };
      await saveConfig(config);
    }
  } catch (error) {
    result.errors.push(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Validate a rule
 */
export function validateRule(rule: Partial<Rule>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rule.type) {
    errors.push("Rule type is required");
  } else if (!['pattern', 'keyword', 'literal', 'entity'].includes(rule.type)) {
    errors.push("Rule type must be 'pattern', 'keyword', 'literal', or 'entity'");
  }

  if (!rule.match || rule.match.trim().length === 0) {
    errors.push("Match pattern/keyword/phrase is required");
  }

  if (!rule.tags || rule.tags.length === 0) {
    errors.push("At least one tag is required");
  }

  // Type-specific validations
  if (rule.type === 'keyword' && rule.lemma && rule.stem) {
    errors.push("Cannot use both lemma and stem options");
  }

  // Validate filter ranges
  if (rule.filters?.sentiment) {
    const { min, max } = rule.filters.sentiment;
    if (min !== undefined && (min < -1 || min > 1)) {
      errors.push("Sentiment min must be between -1 and 1");
    }
    if (max !== undefined && (max < -1 || max > 1)) {
      errors.push("Sentiment max must be between -1 and 1");
    }
    if (min !== undefined && max !== undefined && min > max) {
      errors.push("Sentiment min must be less than or equal to max");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get rules count by status
 */
export async function getRulesStats(): Promise<{
  total: number;
  enabled: number;
  disabled: number;
}> {
  const config = await loadConfig();

  return {
    total: config.rules.length,
    enabled: config.rules.filter(r => r.enabled !== false).length,
    disabled: config.rules.filter(r => r.enabled === false).length,
  };
}
