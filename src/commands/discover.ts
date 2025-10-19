/**
 * Discovery Commands
 * Find keywords and patterns in existing notes
 */

import { Command } from "@cliffy/command";
import { extname, join } from "@std/path";
import { loadConfig } from "../config.ts";
import { discoverKeywords, discoverPatterns } from "../nlp/processor.ts";

/**
 * Walk directory tree and collect all markdown content
 */
async function collectMarkdownContent(directories: string[]): Promise<string> {
  let allContent = "";
  let fileCount = 0;

  for (const dir of directories) {
    await walk(dir);
  }

  async function walk(dir: string) {
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isFile && extname(entry.name) === ".md") {
          const filePath = join(dir, entry.name);
          const content = await Deno.readTextFile(filePath);
          allContent += content + "\n\n";
          fileCount++;

          // Show progress every 10 files
          if (fileCount % 10 === 0) {
            console.log(`  Collected ${fileCount} files...`);
          }
        } else if (entry.isDirectory && !entry.name.startsWith(".")) {
          await walk(join(dir, entry.name));
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

  console.log(`✓ Collected ${fileCount} markdown files\n`);
  return allContent;
}

/**
 * Get directories to search based on alias
 */
async function getDirectories(alias?: string): Promise<string[]> {
  const config = await loadConfig();

  if (alias) {
    if (!config.aliases[alias]) {
      console.error(`Error: Alias '${alias}' not found`);
      console.log("\nAvailable aliases:");
      for (const [name, path] of Object.entries(config.aliases)) {
        console.log(`  ${name}: ${path}`);
      }
      Deno.exit(1);
    }
    return [config.aliases[alias]];
  }

  const directories = Object.values(config.aliases);

  if (directories.length === 0) {
    console.log("No aliases configured.");
    console.log("Use 'qn alias <name> <path>' to add directories.");
    Deno.exit(1);
  }

  return directories;
}

/**
 * Base discover command
 */
export const discoverCommand = new Command()
  .description("Discover keywords and patterns in notes")
  .action(() => {
    console.log("Use 'qn discover --help' to see available commands");
  });

/**
 * qn discover keywords [alias] [--limit N]
 */
const discoverKeywordsCommand = new Command()
  .description("Discover frequent keywords across notes")
  .arguments("[alias:string]")
  .option("--limit <n:number>", "Maximum number of results (default: 50)", { default: 50 })
  .action(async (options, alias) => {
    try {
      const directories = await getDirectories(alias);
      console.log(`\n✓ Analyzing ${directories.length} ${directories.length === 1 ? "directory" : "directories"}...\n`);

      // Collect all content
      const content = await collectMarkdownContent(directories);

      if (!content.trim()) {
        console.log("No content found in markdown files.");
        return;
      }

      // Discover keywords
      console.log("Processing text for keywords...");
      const keywords = discoverKeywords(content, options.limit);
      console.log("✓ Analysis complete\n");

      if (keywords.length === 0) {
        console.log("No keywords found.");
        return;
      }

      console.log(`Top keywords (${keywords.length} results):\n`);

      for (const { keyword, count } of keywords) {
        console.log(`  ${keyword.padEnd(20)} (${count} occurrences)`);
      }

      console.log(`\nAdd a keyword rule:`);
      console.log(`  qn tag when keyword "<keyword>" --lemma --tags <your-tags>`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });

/**
 * qn discover pattern <pattern> [alias] [--limit N]
 */
const discoverPatternCommand = new Command()
  .description("Discover what a POS pattern matches in notes")
  .arguments("<pattern:string> [alias:string]")
  .option("--limit <n:number>", "Maximum number of results (default: 50)", { default: 50 })
  .action(async (options, pattern, alias) => {
    try {
      const directories = await getDirectories(alias);
      console.log(`\n✓ Analyzing ${directories.length} ${directories.length === 1 ? "directory" : "directories"}...\n`);

      // Collect all content
      const content = await collectMarkdownContent(directories);

      if (!content.trim()) {
        console.log("No content found in markdown files.");
        return;
      }

      // Discover pattern matches
      console.log(`Processing text for pattern "${pattern}"...`);
      const matches = discoverPatterns(content, pattern, options.limit);
      console.log("✓ Pattern matching complete\n");

      if (matches.length === 0) {
        console.log(`No matches found for pattern: ${pattern}`);
        return;
      }

      console.log(`Pattern "${pattern}" matches (${matches.length} results):\n`);

      for (const { text, count } of matches) {
        console.log(`  ${text.padEnd(30)} (${count} occurrences)`);
      }

      console.log(`\nCreate a pattern rule:`);
      console.log(`  qn tag when pattern "${pattern}" --tags <your-tags>`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });

/**
 * qn discover keyword <word> [--lemma|--stem] [alias] [--limit N]
 */
const discoverKeywordCommand = new Command()
  .description("Discover where a specific keyword appears")
  .arguments("<word:string> [alias:string]")
  .option("--lemma", "Use lemmatization")
  .option("--stem", "Use stemming")
  .option("--limit <n:number>", "Maximum number of results (default: 50)", { default: 50 })
  .action(async (options, word, alias) => {
    try {
      if (options.lemma && options.stem) {
        console.error("Error: Cannot use both --lemma and --stem");
        Deno.exit(1);
      }

      const directories = await getDirectories(alias);
      console.log(`\n✓ Analyzing ${directories.length} ${directories.length === 1 ? "directory" : "directories"}...\n`);

      // Collect all content
      const content = await collectMarkdownContent(directories);

      if (!content.trim()) {
        console.log("No content found in markdown files.");
        return;
      }

      // Discover keyword (simple frequency count with lemma/stem)
      const processedOption = options.lemma ? "with lemmatization" : options.stem ? "with stemming" : "";
      console.log(`Searching for keyword "${word}" ${processedOption}...`);
      const { matchKeyword } = await import("../nlp/processor.ts");
      const matches = matchKeyword(content, word, {
        lemma: options.lemma,
        stem: options.stem,
      });
      console.log("✓ Search complete\n");

      if (matches.length === 0) {
        console.log(`No matches found for keyword: ${word}`);
        return;
      }

      const displayOption = options.lemma ? " (lemma)" : options.stem ? " (stem)" : "";
      console.log(`Keyword "${word}"${displayOption} found ${matches.length} times\n`);

      // Show sample matches
      const limit = Math.min(matches.length, options.limit);
      console.log(`Sample matches (showing ${limit} of ${matches.length}):\n`);

      for (let i = 0; i < limit; i++) {
        const match = matches[i];
        console.log(`  "${match.text}"`);
      }

      console.log(`\nCreate a keyword rule:`);
      console.log(`  qn tag when keyword "${word}"${options.lemma ? " --lemma" : ""}${options.stem ? " --stem" : ""} --tags <your-tags>`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }
  });

// Register subcommands
discoverCommand
  .command("keywords", discoverKeywordsCommand)
  .command("pattern", discoverPatternCommand)
  .command("keyword", discoverKeywordCommand);
