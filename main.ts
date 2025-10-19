#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

import { Command } from "@cliffy/command";
import { aliasCommand } from "./src/commands/alias.ts";
import { tagCommand } from "./src/commands/tag.ts";
import { syncCommand } from "./src/commands/sync.ts";
import { discoverCommand } from "./src/commands/discover.ts";
import { getNotePath } from "./src/config.ts";
import { openEditor } from "./src/editor.ts";
import { extractTitle, saveNote } from "./src/note.ts";

const main = new Command()
  .name("qn")
  .version("2.0.0")
  .description("Quick note-taking CLI with intelligent NLP-based auto-tagging")
  .option("-m, --message <message:string>", "Note content (inline mode)")
  .option(
    "-o, --origin <path:string>",
    "Directory path or alias to save the note"
  )
  .action(async ({ message, origin }) => {
    try {
      let content: string;

      if (message) {
        // Inline mode
        content = message;
      } else {
        // Editor mode
        content = await openEditor();
      }

      // Get the directory to save to
      const directory = await getNotePath(origin);

      // Save the note
      const filepath = await saveNote(content, directory);
      const title = extractTitle(content);

      console.log(`✓ Note saved: ${filepath}`);
      console.log(`  Title: ${title}`);
    } catch (error) {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      Deno.exit(1);
    }
  })
  .command("alias", aliasCommand)
  .command("tag", tagCommand)
  .command("sync", syncCommand)
  .command("discover", discoverCommand);

if (import.meta.main) {
  await main.parse(Deno.args);
}
