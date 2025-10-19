/**
 * Sync Command
 * Applies tagging rules to markdown files
 */

import { Command } from "@cliffy/command";
import { extname, join } from "@std/path";
import { loadConfig } from "../config.ts";
import { getRules } from "../rules/engine.ts";
import { processFile } from "../rules/applicator.ts";

/**
 * Walk directory tree and find all markdown files
 */
async function* walkMarkdownFiles(dir: string): AsyncGenerator<string> {
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isFile && extname(entry.name) === ".md") {
        yield join(dir, entry.name);
      } else if (entry.isDirectory && !entry.name.startsWith(".")) {
        yield* walkMarkdownFiles(join(dir, entry.name));
      }
    }
  } catch (error) {
    console.error(
      `Warning: Cannot access directory ${dir}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * qn sync [alias] [--dry-run]
 */
export const syncCommand = new Command()
  .description("Apply tagging rules to markdown files")
  .arguments("[alias:string]")
  .option("--dry-run", "Show what would be changed without modifying files")
  .action(async (options, alias) => {
    try {
      // Load configuration
      const config = await loadConfig();

      // Determine directories to sync
      let directories: string[];
      if (alias) {
        if (!config.aliases[alias]) {
          console.error(`Error: Alias '${alias}' not found`);
          console.log("\nAvailable aliases:");
          for (const [name, path] of Object.entries(config.aliases)) {
            console.log(`  ${name}: ${path}`);
          }
          Deno.exit(1);
        }
        directories = [config.aliases[alias]];
      } else {
        directories = Object.values(config.aliases);
      }

      if (directories.length === 0) {
        console.log("No aliases configured.");
        console.log("Use 'qn alias <name> <path>' to add directories to sync.");
        Deno.exit(1);
      }

      // Load rules
      const rules = await getRules({ enabled: true });

      if (rules.length === 0) {
        console.log("No enabled rules configured.");
        console.log("\nCreate a rule with:");
        console.log("  qn tag when pattern 'VERB NOUN' --tags action");
        console.log("  qn tag when keyword 'deploy' --lemma --tags devops");
        Deno.exit(1);
      }

      console.log(`\n✓ Syncing ${directories.length} ${directories.length === 1 ? "directory" : "directories"} with ${rules.length} ${rules.length === 1 ? "rule" : "rules"}${options.dryRun ? " (dry-run)" : ""}...\n`);

      // Process files
      let totalFiles = 0;
      let modifiedFiles = 0;
      let totalTagsAdded = 0;
      let totalTagsRemoved = 0;

      for (const dir of directories) {
        for await (const filePath of walkMarkdownFiles(dir)) {
          totalFiles++;

          if (options.dryRun) {
            // Dry run: read file, process, but don't write
            const content = await Deno.readTextFile(filePath);
            const { applyRulesToContent, extractExistingTags } = await import("../rules/applicator.ts");
            const { matchedRules, expectedTags } = await applyRulesToContent(content, rules);
            const existingTags = extractExistingTags(content);

            // Get all tags managed by rules
            const allRuleTags = new Set<string>();
            for (const rule of rules) {
              for (const tag of rule.tags) {
                allRuleTags.add(tag);
              }
            }

            const tagsToRemove = Array.from(existingTags).filter(tag =>
              allRuleTags.has(tag) && !expectedTags.has(tag)
            );
            const tagsToAdd = Array.from(expectedTags).filter(tag => !existingTags.has(tag));

            if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
              modifiedFiles++;
              totalTagsAdded += tagsToAdd.length;
              totalTagsRemoved += tagsToRemove.length;

              const fileName = filePath.split("/").pop();
              console.log(`${fileName}`);

              if (tagsToAdd.length > 0) {
                console.log(`  + ${tagsToAdd.map(t => `#${t}`).join(" ")}`);
              }
              if (tagsToRemove.length > 0) {
                console.log(`  - ${tagsToRemove.map(t => `#${t}`).join(" ")}`);
              }
            }
          } else {
            // Actually apply changes
            const result = await processFile(filePath, rules);

            if (result.modified) {
              modifiedFiles++;
              totalTagsAdded += result.addedTags.length;
              totalTagsRemoved += result.removedTags.length;

              const fileName = filePath.split("/").pop();
              console.log(`✓ ${fileName}`);

              if (result.addedTags.length > 0) {
                console.log(`  + ${result.addedTags.map(t => `#${t}`).join(" ")}`);
              }
              if (result.removedTags.length > 0) {
                console.log(`  - ${result.removedTags.map(t => `#${t}`).join(" ")}`);
              }
            }
          }
        }
      }

      // Summary
      console.log(`\n${"=".repeat(50)}`);
      console.log(`Processed: ${totalFiles} files`);
      console.log(`Modified: ${modifiedFiles} files`);
      console.log(`Tags added: ${totalTagsAdded}`);
      console.log(`Tags removed: ${totalTagsRemoved}`);

      if (options.dryRun) {
        console.log(`\nThis was a dry-run. Run 'qn sync${alias ? ` ${alias}` : ""}' to apply changes.`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });
