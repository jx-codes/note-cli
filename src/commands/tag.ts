/**
 * Tag Rule Management Commands
 * Implements: qn tag when, list, show, remove, enable, disable, update
 */

import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";
import type { Rule } from "../types.ts";
import {
  addRule,
  getRules,
  getRule,
  removeRule,
  enableRule,
  disableRule,
  updateRule,
  getRulesStats,
} from "../rules/engine.ts";
import { parseFilters, describeFilters, type FilterOptions } from "../rules/filters.ts";

/**
 * Base command for tag rule management
 */
export const tagCommand = new Command()
  .description("Manage tagging rules")
  .action(() => {
    console.log("Use 'qn tag --help' to see available commands");
  });

/**
 * qn tag when pattern <pattern> [filters] --tags <tags>
 */
const tagWhenPatternCommand = new Command()
  .description("Create a rule that tags based on POS pattern (e.g., 'VERB NOUN')")
  .arguments("<pattern:string>")
  .option("--tags <tags:string>", "Tags to apply (comma-separated)", { required: true })
  .option("--require-entity <types:string>", "Required entity types: TYPE1,TYPE2[:scope]", { collect: true })
  .option("--sentiment-min <value:string>", "Minimum sentiment score: N[:scope]")
  .option("--sentiment-max <value:string>", "Maximum sentiment score: N[:scope]")
  .option("--sentiment-between <range:string>", "Sentiment range: N,M[:scope]")
  .option("--group <name:string>", "Add to group")
  .option("--description <text:string>", "Rule description")
  .action(async (options, pattern) => {
    try {
      const tags = options.tags.split(",").map(t => t.trim());

      const filters = parseFilters(options as FilterOptions);

      const rule = await addRule({
        type: 'pattern',
        match: pattern,
        tags,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        groups: options.group ? [options.group] : undefined,
        description: options.description,
      });

      console.log(`✓ Created rule: ${rule.id}`);
      console.log(`  Match: ${pattern}`);
      console.log(`  Tags: ${tags.map(t => `#${t}`).join(" ")}`);

      if (rule.filters) {
        const filterDesc = describeFilters(rule.filters);
        if (filterDesc.length > 0) {
          console.log(`  Filters: ${filterDesc.join(", ")}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });

/**
 * qn tag when keyword <word> [--lemma|--stem] [filters] --tags <tags>
 */
const tagWhenKeywordCommand = new Command()
  .description("Create a rule that tags based on keyword")
  .arguments("<word:string>")
  .option("--tags <tags:string>", "Tags to apply (comma-separated)", { required: true })
  .option("--lemma", "Use lemmatization (matches word roots)")
  .option("--stem", "Use stemming (algorithmic root matching)")
  .option("--pos <types:string>", "Part-of-speech filter: VERB,NOUN")
  .option("--require-entity <types:string>", "Required entity types: TYPE1,TYPE2[:scope]", { collect: true })
  .option("--sentiment-min <value:string>", "Minimum sentiment score: N[:scope]")
  .option("--sentiment-max <value:string>", "Maximum sentiment score: N[:scope]")
  .option("--sentiment-between <range:string>", "Sentiment range: N,M[:scope]")
  .option("--group <name:string>", "Add to group")
  .option("--description <text:string>", "Rule description")
  .action(async (options, word) => {
    try {
      if (options.lemma && options.stem) {
        console.error("Error: Cannot use both --lemma and --stem");
        Deno.exit(1);
      }

      const tags = options.tags.split(",").map(t => t.trim());
      const filters = parseFilters(options as FilterOptions);

      const rule = await addRule({
        type: 'keyword',
        match: word,
        lemma: options.lemma,
        stem: options.stem,
        tags,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        groups: options.group ? [options.group] : undefined,
        description: options.description,
      });

      console.log(`✓ Created rule: ${rule.id}`);
      console.log(`  Match: ${word}${options.lemma ? " (lemma)" : ""}${options.stem ? " (stem)" : ""}`);
      console.log(`  Tags: ${tags.map(t => `#${t}`).join(" ")}`);

      if (rule.filters) {
        const filterDesc = describeFilters(rule.filters);
        if (filterDesc.length > 0) {
          console.log(`  Filters: ${filterDesc.join(", ")}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });

/**
 * qn tag when literal <phrase> [filters] --tags <tags>
 */
const tagWhenLiteralCommand = new Command()
  .description("Create a rule that tags based on exact phrase")
  .arguments("<phrase:string>")
  .option("--tags <tags:string>", "Tags to apply (comma-separated)", { required: true })
  .option("--require-entity <types:string>", "Required entity types: TYPE1,TYPE2[:scope]", { collect: true })
  .option("--sentiment-min <value:string>", "Minimum sentiment score: N[:scope]")
  .option("--sentiment-max <value:string>", "Maximum sentiment score: N[:scope]")
  .option("--sentiment-between <range:string>", "Sentiment range: N,M[:scope]")
  .option("--group <name:string>", "Add to group")
  .option("--description <text:string>", "Rule description")
  .action(async (options, phrase) => {
    try {
      const tags = options.tags.split(",").map(t => t.trim());
      const filters = parseFilters(options as FilterOptions);

      const rule = await addRule({
        type: 'literal',
        match: phrase,
        tags,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        groups: options.group ? [options.group] : undefined,
        description: options.description,
      });

      console.log(`✓ Created rule: ${rule.id}`);
      console.log(`  Match: "${phrase}"`);
      console.log(`  Tags: ${tags.map(t => `#${t}`).join(" ")}`);

      if (rule.filters) {
        const filterDesc = describeFilters(rule.filters);
        if (filterDesc.length > 0) {
          console.log(`  Filters: ${filterDesc.join(", ")}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });

/**
 * qn tag when entity <entity-type> [filters] --tags <tags>
 */
const tagWhenEntityCommand = new Command()
  .description("Create a rule that tags based on entity type (URL, EMAIL, DATE, etc.)")
  .arguments("<entity-type:string>")
  .option("--tags <tags:string>", "Tags to apply (comma-separated)", { required: true })
  .option("--pos <types:string>", "Part-of-speech filter: VERB,NOUN")
  .option("--require-entity <types:string>", "Required entity types: TYPE1,TYPE2[:scope]", { collect: true })
  .option("--sentiment-min <value:string>", "Minimum sentiment score: N[:scope]")
  .option("--sentiment-max <value:string>", "Maximum sentiment score: N[:scope]")
  .option("--sentiment-between <range:string>", "Sentiment range: N,M[:scope]")
  .option("--group <name:string>", "Add to group")
  .option("--description <text:string>", "Rule description")
  .action(async (options, entityType) => {
    try {
      const tags = options.tags.split(",").map(t => t.trim());
      const filters = parseFilters(options as FilterOptions);

      const rule = await addRule({
        type: 'entity',
        match: entityType,
        tags,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        groups: options.group ? [options.group] : undefined,
        description: options.description,
      });

      console.log(`✓ Created rule: ${rule.id}`);
      console.log(`  Match: ${entityType} entities`);
      console.log(`  Tags: ${tags.map(t => `#${t}`).join(" ")}`);

      if (rule.filters) {
        const filterDesc = describeFilters(rule.filters);
        if (filterDesc.length > 0) {
          console.log(`  Filters: ${filterDesc.join(", ")}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });

/**
 * qn tag when <subcommand>
 */
const tagWhenCommand = new Command()
  .description("Create new tagging rules")
  .command("pattern", tagWhenPatternCommand)
  .command("keyword", tagWhenKeywordCommand)
  .command("literal", tagWhenLiteralCommand)
  .command("entity", tagWhenEntityCommand);

/**
 * qn tag list [--enabled|--disabled|--group <name>]
 */
const tagListCommand = new Command()
  .description("List all tagging rules")
  .option("--enabled", "Show only enabled rules")
  .option("--disabled", "Show only disabled rules")
  .option("--group <name:string>", "Show only rules in this group")
  .action(async (options) => {
    try {
      const rules = await getRules({
        enabled: options.enabled,
        disabled: options.disabled,
        group: options.group,
      });

      if (rules.length === 0) {
        console.log("No rules configured.");
        console.log("\nCreate a rule with:");
        console.log("  qn tag when pattern 'VERB NOUN' --tags action");
        console.log("  qn tag when keyword 'deploy' --lemma --tags devops");
        console.log("  qn tag when entity URL --tags links");
        return;
      }

      const stats = await getRulesStats();
      console.log(`\nRules (${stats.total} total, ${stats.enabled} enabled):\n`);

      for (const rule of rules) {
        const enabled = rule.enabled !== false;
        const symbol = enabled ? "✓" : "✗";
        const typeLabel = rule.type === 'keyword' && rule.lemma ? `${rule.type} (lemma)` :
                         rule.type === 'keyword' && rule.stem ? `${rule.type} (stem)` : rule.type;

        let matchDisplay = rule.match;
        if (rule.type === 'literal') {
          matchDisplay = `"${rule.match}"`;
        } else if (rule.type === 'entity') {
          matchDisplay = `${rule.match} entities`;
        }

        console.log(`${symbol} ${rule.id}`);
        console.log(`  Type: ${typeLabel}`);
        console.log(`  Match: ${matchDisplay}`);
        console.log(`  Tags: ${rule.tags.map(t => `#${t}`).join(" ")}`);

        if (rule.filters) {
          const filterDesc = describeFilters(rule.filters);
          if (filterDesc.length > 0) {
            console.log(`  Filters: ${filterDesc.join(", ")}`);
          }
        }

        if (rule.groups && rule.groups.length > 0) {
          console.log(`  Groups: ${rule.groups.join(", ")}`);
        }

        if (!enabled) {
          console.log(`  Status: disabled`);
        }

        console.log();
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });

/**
 * qn tag show <rule-id>
 */
const tagShowCommand = new Command()
  .description("Show detailed information about a rule")
  .arguments("<rule-id:string>")
  .action(async (_options, ruleId) => {
    try {
      const rule = await getRule(ruleId);

      if (!rule) {
        console.error(`Error: Rule '${ruleId}' not found`);
        Deno.exit(1);
      }

      let matchDisplay = rule.match;
      if (rule.type === 'literal') {
        matchDisplay = `"${rule.match}"`;
      } else if (rule.type === 'entity') {
        matchDisplay = `${rule.match} entities`;
      }

      console.log(`\nRule: ${rule.id}`);
      console.log(`Type: ${rule.type}`);
      console.log(`Match: ${matchDisplay}`);

      if (rule.type === 'keyword') {
        if (rule.lemma) console.log(`Lemmatization: enabled`);
        if (rule.stem) console.log(`Stemming: enabled`);
      }

      console.log(`Tags: ${rule.tags.map(t => `#${t}`).join(" ")}`);

      if (rule.filters) {
        const filterDesc = describeFilters(rule.filters);
        if (filterDesc.length > 0) {
          console.log(`\nFilters:`);
          filterDesc.forEach(f => console.log(`  - ${f}`));
        }
      }

      if (rule.groups && rule.groups.length > 0) {
        console.log(`\nGroups: ${rule.groups.join(", ")}`);
      }

      if (rule.description) {
        console.log(`\nDescription: ${rule.description}`);
      }

      console.log(`\nEnabled: ${rule.enabled !== false ? "yes" : "no"}`);
      if (rule.created) {
        console.log(`Created: ${new Date(rule.created).toLocaleString()}`);
      }
      if (rule.modified) {
        console.log(`Modified: ${new Date(rule.modified).toLocaleString()}`);
      }

      console.log();
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });

/**
 * qn tag remove <rule-id>
 */
const tagRemoveCommand = new Command()
  .description("Remove a tagging rule")
  .arguments("<rule-id:string>")
  .action(async (_options, ruleId) => {
    try {
      const success = await removeRule(ruleId);

      if (!success) {
        console.error(`Error: Rule '${ruleId}' not found`);
        Deno.exit(1);
      }

      console.log(`✓ Removed rule: ${ruleId}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });

/**
 * qn tag enable <rule-id>
 */
const tagEnableCommand = new Command()
  .description("Enable a tagging rule")
  .arguments("<rule-id:string>")
  .action(async (_options, ruleId) => {
    try {
      const rule = await enableRule(ruleId);

      if (!rule) {
        console.error(`Error: Rule '${ruleId}' not found`);
        Deno.exit(1);
      }

      console.log(`✓ Enabled rule: ${ruleId}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });

/**
 * qn tag disable <rule-id>
 */
const tagDisableCommand = new Command()
  .description("Disable a tagging rule")
  .arguments("<rule-id:string>")
  .action(async (_options, ruleId) => {
    try {
      const rule = await disableRule(ruleId);

      if (!rule) {
        console.error(`Error: Rule '${ruleId}' not found`);
        Deno.exit(1);
      }

      console.log(`✓ Disabled rule: ${ruleId}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });

// Register all subcommands
tagCommand
  .command("when", tagWhenCommand)
  .command("list", tagListCommand)
  .command("show", tagShowCommand)
  .command("remove", tagRemoveCommand)
  .command("enable", tagEnableCommand)
  .command("disable", tagDisableCommand);
