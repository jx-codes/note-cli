import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";
import { Confirm } from "@cliffy/prompt";
import {
  addKeyword,
  listKeywords,
  removeKeyword,
  updateKeyword,
  appendTags,
  processTags,
} from "../keyword.ts";
import { loadConfig } from "../config.ts";
import { migrateTagsInFile, removeTagsFromFile, processFile } from "../tagger.ts";
import { join, extname } from "@std/path";

export const keywordCommand = new Command()
  .description("Manage keywords for auto-tagging")
  .command("add", "Add a new keyword with associated tags")
  .arguments("<keyword:string>")
  .option("-t, --tags <tags:string>", "Comma-separated list of tags (without #)")
  .option("-c, --case-sensitive", "Make the keyword case-sensitive")
  .option("-v, --variations <variations:string>", "Comma-separated variations of the keyword")
  .action(async ({ tags, caseSensitive, variations }, keyword: string) => {
    if (!tags) {
      throw new Error("Tags are required. Use --tags to specify tags for this keyword.");
    }

    const processedTags = processTags(tags);
    
    if (processedTags.length === 0) {
      throw new Error("At least one valid tag is required.");
    }

    const variationsList = variations ? variations.split(",").map(v => v.trim()) : undefined;

    await addKeyword(keyword, processedTags, {
      caseSensitive: caseSensitive || false,
      variations: variationsList,
    });

    console.log(`✓ Added keyword '${keyword}' with tags: ${processedTags.map(t => `#${t}`).join(", ")}`);
    
    if (variationsList) {
      console.log(`  Variations: ${variationsList.join(", ")}`);
    }
    if (caseSensitive) {
      console.log("  Case-sensitive matching enabled");
    }
  })
  .reset()
  .command("list", "List all configured keywords")
  .alias("ls")
  .action(async () => {
    const keywords = await listKeywords();

    if (keywords.length === 0) {
      console.log("No keywords configured.");
      console.log("Use 'qn keyword add <keyword> --tags tag1,tag2' to add keywords.");
      return;
    }

    const table = new Table();
    table.header([
      "Keyword",
      "Tags",
      "Options",
      "Stats",
    ]);

    for (const keyword of keywords) {
      const tags = keyword.tags.map(t => `#${t}`).join(", ");
      const options: string[] = [];
      
      if (keyword.caseSensitive) {
        options.push("case-sensitive");
      }
      if (keyword.variations && keyword.variations.length > 0) {
        options.push(`variations: ${keyword.variations.length}`);
      }
      
      const stats: string[] = [];
      if (keyword.matchCount) {
        stats.push(`matches: ${keyword.matchCount}`);
      }
      if (keyword.lastTriggered) {
        const date = new Date(keyword.lastTriggered);
        stats.push(`last: ${date.toLocaleDateString()}`);
      }

      table.push([
        keyword.keyword,
        tags,
        options.join(", ") || "-",
        stats.join(", ") || "-",
      ]);
    }

    table.render();
  })
  .reset()
  .command("remove", "Remove a keyword")
  .alias("rm")
  .arguments("<keyword:string>")
  .option("-f, --force", "Skip confirmation prompt")
  .action(async ({ force }, keyword: string) => {
    if (!force) {
      const confirmed = await Confirm.prompt({
        message: `Are you sure you want to remove keyword '${keyword}'?`,
        default: false,
      });

      if (!confirmed) {
        console.log("Cancelled.");
        return;
      }
    }

    const removed = await removeKeyword(keyword);
    
    if (removed) {
      console.log(`✓ Removed keyword '${keyword}'`);
    } else {
      console.log(`Keyword '${keyword}' not found.`);
    }
  })
  .reset()
  .command("update", "Update an existing keyword")
  .arguments("<keyword:string>")
  .option("-t, --tags <tags:string>", "New comma-separated list of tags")
  .option("-c, --case-sensitive", "Make the keyword case-sensitive")
  .option("-v, --variations <variations:string>", "Comma-separated variations of the keyword")
  .option("--migrate", "Migrate existing tags in all files")
  .action(async ({ tags, caseSensitive, variations, migrate }, keyword: string) => {
    const updates: any = {};
    
    if (tags) {
      updates.tags = processTags(tags);
    }
    if (caseSensitive !== undefined) {
      updates.caseSensitive = caseSensitive;
    }
    if (variations) {
      updates.variations = variations.split(",").map(v => v.trim());
    }
    
    if (Object.keys(updates).length === 0) {
      throw new Error("At least one update option is required (--tags, --case-sensitive, or --variations).");
    }
    
    const result = await updateKeyword(keyword, updates);
    
    if (!result) {
      console.log(`Keyword '${keyword}' not found.`);
      return;
    }
    
    console.log(`✓ Updated keyword '${keyword}'`);
    
    if (updates.tags) {
      console.log(`  New tags: ${updates.tags.map((t: string) => `#${t}`).join(", ")}`);
    }
    
    if (migrate && updates.tags) {
      console.log("Migrating tags in existing files...");
      
      const config = await loadConfig();
      const directories = Object.values(config.aliases);
      let migratedCount = 0;
      
      for (const dir of directories) {
        for await (const entry of Deno.readDir(dir)) {
          if (entry.isFile && extname(entry.name) === ".md") {
            const filePath = join(dir, entry.name);
            const migrated = await migrateTagsInFile(filePath, result.oldTags, result.newTags);
            if (migrated) {
              migratedCount++;
            }
          }
        }
      }
      
      console.log(`✓ Migrated tags in ${migratedCount} files`);
    }
  })
  .reset()
  .command("append", "Add new tags to an existing keyword")
  .arguments("<keyword:string>")
  .option("-t, --tags <tags:string>", "Comma-separated list of tags to add")
  .option("--sync", "Apply new tags to existing files immediately")
  .action(async ({ tags, sync }, keyword: string) => {
    if (!tags) {
      throw new Error("Tags are required. Use --tags to specify tags to append.");
    }

    const processedTags = processTags(tags);
    
    if (processedTags.length === 0) {
      throw new Error("At least one valid tag is required.");
    }
    
    const result = await appendTags(keyword, processedTags);
    
    if (!result) {
      console.log(`Keyword '${keyword}' not found.`);
      return;
    }
    
    if (result.addedTags.length === 0) {
      console.log(`No new tags to add - all specified tags already exist for '${keyword}'.`);
      console.log(`Current tags: ${result.newTags.map(t => `#${t}`).join(", ")}`);
      return;
    }
    
    console.log(`✓ Added ${result.addedTags.length} new tags to keyword '${keyword}'`);
    console.log(`  Added: ${result.addedTags.map(t => `#${t}`).join(", ")}`);
    console.log(`  All tags: ${result.newTags.map(t => `#${t}`).join(", ")}`);
    
    if (sync) {
      console.log("Applying new tags to existing files...");
      
      const config = await loadConfig();
      const directories = Object.values(config.aliases);
      const keywords = await listKeywords();
      const updatedKeyword = keywords.find(k => k.keyword === keyword);
      
      if (updatedKeyword) {
        let appliedCount = 0;
        
        for (const dir of directories) {
          for await (const entry of Deno.readDir(dir)) {
            if (entry.isFile && extname(entry.name) === ".md") {
              const filePath = join(dir, entry.name);
              const processResult = await processFile(filePath, [updatedKeyword]);
              
              if (processResult.modified && processResult.addedTags.some(tag => result.addedTags.includes(tag))) {
                appliedCount++;
                console.log(`  Applied to: ${entry.name}`);
              }
            }
          }
        }
        
        console.log(`✓ Applied new tags to ${appliedCount} files`);
      }
    } else {
      console.log("Use --sync to apply new tags to existing files immediately.");
    }
  })
  .reset()
  .command("clean", "Remove tags associated with a keyword from all files")
  .arguments("<keyword:string>")
  .option("--dry-run", "Show what would be removed without making changes")
  .action(async ({ dryRun }, keyword: string) => {
    const keywords = await listKeywords();
    const keywordObj = keywords.find(k => k.keyword === keyword);
    
    if (!keywordObj) {
      console.log(`Keyword '${keyword}' not found.`);
      return;
    }
    
    const config = await loadConfig();
    const directories = Object.values(config.aliases);
    let affectedCount = 0;
    
    console.log(`${dryRun ? "Would remove" : "Removing"} tags: ${keywordObj.tags.map(t => `#${t}`).join(", ")}`);
    
    for (const dir of directories) {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isFile && extname(entry.name) === ".md") {
          const filePath = join(dir, entry.name);
          
          if (dryRun) {
            const content = await Deno.readTextFile(filePath);
            const hasTags = keywordObj.tags.some(tag => content.includes(`#${tag}`));
            if (hasTags) {
              affectedCount++;
              console.log(`  Would update: ${entry.name}`);
            }
          } else {
            const removed = await removeTagsFromFile(filePath, keywordObj.tags);
            if (removed) {
              affectedCount++;
              console.log(`  Updated: ${entry.name}`);
            }
          }
        }
      }
    }
    
    console.log(`${dryRun ? "Would affect" : "Updated"} ${affectedCount} files`);
  })
  .reset()
  .command("sync", "Re-apply all keyword rules to existing files")
  .option("--dry-run", "Show what would be changed without making changes")
  .action(async ({ dryRun }) => {
    const keywords = await listKeywords();
    
    if (keywords.length === 0) {
      console.log("No keywords configured.");
      return;
    }
    
    const config = await loadConfig();
    const directories = Object.values(config.aliases);
    let processedCount = 0;
    let modifiedCount = 0;
    
    console.log(`${dryRun ? "Analyzing" : "Syncing"} ${keywords.length} keywords across all files...`);
    
    for (const dir of directories) {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isFile && extname(entry.name) === ".md") {
          const filePath = join(dir, entry.name);
          processedCount++;
          
          if (dryRun) {
            const result = await processFile(filePath, keywords);
            if (result.addedTags.length > 0) {
              modifiedCount++;
              console.log(`  Would add to ${entry.name}: ${result.addedTags.map(t => `#${t}`).join(" ")}`);
            }
          } else {
            const result = await processFile(filePath, keywords);
            if (result.modified) {
              modifiedCount++;
              console.log(`  Updated ${entry.name}: ${result.addedTags.map(t => `#${t}`).join(" ")}`);
            }
          }
        }
      }
    }
    
    console.log(`✓ ${dryRun ? "Analyzed" : "Processed"} ${processedCount} files, ${dryRun ? "would modify" : "modified"} ${modifiedCount}`);
  })
  .reset()
  .command("watch", "Start watching for keywords in note files")
  .option("-d, --daemon", "Run as background daemon")
  .option("-v, --verbose", "Show verbose output")
  .action(async ({ daemon, verbose }) => {
    if (daemon) {
      console.log("Daemon mode not yet implemented.");
      console.log("Run without --daemon flag to watch in foreground mode.");
      return;
    }

    const { watchFiles } = await import("../watcher.ts");
    await watchFiles({ verbose: verbose || false });
  });