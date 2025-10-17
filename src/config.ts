import { ensureDir } from "@std/fs";
import { join } from "@std/path";

export interface Config {
  aliases: Record<string, string>;
  default?: string;
}

const CONFIG_DIR = join(Deno.env.get("HOME") || "", ".config", "qn");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export async function loadConfig(): Promise<Config> {
  try {
    const data = await Deno.readTextFile(CONFIG_FILE);
    return JSON.parse(data);
  } catch {
    return { aliases: {} };
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureDir(CONFIG_DIR);
  await Deno.writeTextFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function setAlias(name: string, path: string): Promise<void> {
  const config = await loadConfig();
  config.aliases[name] = path;

  if (name === "default" || Object.keys(config.aliases).length === 1) {
    config.default = name;
  }

  await saveConfig(config);
}

export async function getNotePath(aliasOrPath?: string): Promise<string> {
  const config = await loadConfig();

  if (!aliasOrPath) {
    if (!config.default || !config.aliases[config.default]) {
      throw new Error(
        "No default alias set. Use 'qn alias <name> <path>' to set up an alias, then 'qn alias default <name>' to set it as default."
      );
    }
    return config.aliases[config.default];
  }

  // Check if it's an alias
  if (config.aliases[aliasOrPath]) {
    return config.aliases[aliasOrPath];
  }

  // Otherwise treat it as a path
  return aliasOrPath;
}
