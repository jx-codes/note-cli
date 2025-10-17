import { ensureDir } from "@std/fs";
import { extname, join } from "@std/path";
import { loadConfig } from "./config.ts";
import { listKeywords } from "./keyword.ts";
import { processFile } from "./tagger.ts";

export interface WatcherState {
  running: boolean;
  processedFiles: Map<string, string>;
  lastCheck: string;
}

const STATE_DIR = join(Deno.env.get("HOME") || "", ".config", "qn");
const STATE_FILE = join(STATE_DIR, "watcher-state.json");

async function loadWatcherState(): Promise<WatcherState> {
  try {
    const data = await Deno.readTextFile(STATE_FILE);
    const state = JSON.parse(data);
    return {
      ...state,
      processedFiles: new Map(state.processedFiles || []),
    };
  } catch {
    return {
      running: false,
      processedFiles: new Map(),
      lastCheck: new Date().toISOString(),
    };
  }
}

async function saveWatcherState(state: WatcherState): Promise<void> {
  await ensureDir(STATE_DIR);
  const serializable = {
    ...state,
    processedFiles: Array.from(state.processedFiles.entries()),
  };
  await Deno.writeTextFile(STATE_FILE, JSON.stringify(serializable, null, 2));
}

async function getFileHash(path: string): Promise<string> {
  try {
    const content = await Deno.readTextFile(path);
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

async function* walkMarkdownFiles(
  directories: string[]
): AsyncGenerator<string> {
  for (const dir of directories) {
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isFile && extname(entry.name) === ".md") {
          yield join(dir, entry.name);
        } else if (entry.isDirectory && !entry.name.startsWith(".")) {
          yield* walkMarkdownFiles([join(dir, entry.name)]);
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
}

export async function watchFiles(options: { verbose: boolean }): Promise<void> {
  const config = await loadConfig();
  const directories = Object.values(config.aliases);

  if (directories.length === 0) {
    console.log(
      "No aliases configured. Use 'qn alias' to set up directories to watch."
    );
    return;
  }

  const keywords = await listKeywords();
  if (keywords.length === 0) {
    console.log(
      "No keywords configured. Use 'qn keyword add' to add keywords."
    );
    return;
  }

  console.log(
    `✓ Watching ${directories.length} ${
      directories.length === 1 ? "directory" : "directories"
    } for ${keywords.length} ${
      keywords.length === 1 ? "keyword" : "keywords"
    }...`
  );
  console.log("Press Ctrl+C to stop watching.\n");

  const state = await loadWatcherState();
  const processedFiles = new Map<string, number>();

  const processFileDebounced = async (filePath: string) => {
    if (processedFiles.has(filePath)) {
      clearTimeout(processedFiles.get(filePath)!);
    }

    const timeout = setTimeout(async () => {
      processedFiles.delete(filePath);

      const currentHash = await getFileHash(filePath);
      const previousHash = state.processedFiles.get(filePath);

      if (currentHash && currentHash !== previousHash) {
        const result = await processFile(filePath, keywords);

        if (result.modified) {
          state.processedFiles.set(filePath, await getFileHash(filePath));
          await saveWatcherState(state);

          const time = new Date().toLocaleTimeString();
          const fileName = filePath.split("/").pop();
          const addedTags = result.addedTags.map((t) => `#${t}`).join(" ");

          console.log(`[${time}] Added ${addedTags} to ${fileName}`);

          if (options.verbose && result.matchedKeywords.length > 0) {
            console.log(
              `  Matched keywords: ${result.matchedKeywords.join(", ")}`
            );
          }
        }

        if (!result.modified) {
          state.processedFiles.set(filePath, currentHash);
        }
      }
    }, 1000);

    processedFiles.set(filePath, timeout as any);
  };

  const watcher = Deno.watchFs(directories);

  try {
    for (const dir of directories) {
      for await (const filePath of walkMarkdownFiles([dir])) {
        await processFileDebounced(filePath);
      }
    }

    for await (const event of watcher) {
      if (event.kind === "modify" || event.kind === "create") {
        for (const path of event.paths) {
          if (extname(path) === ".md") {
            await processFileDebounced(path);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "Interrupted") {
      console.log("\n✓ Stopped watching.");
    } else {
      throw error;
    }
  } finally {
    watcher.close();
    for (const timeout of processedFiles.values()) {
      clearTimeout(timeout);
    }
  }
}
