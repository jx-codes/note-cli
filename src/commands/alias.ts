import { Command } from "@cliffy/command";
import { loadConfig, setAlias } from "../config.ts";

export const aliasCommand = new Command()
  .description("Manage directory aliases")
  .arguments("[name:string] [path:string]")
  .action(async (_: unknown, name?: string, path?: string) => {
    if (!name) {
      // List all aliases
      const config = await loadConfig();
      if (Object.keys(config.aliases).length === 0) {
        console.log("No aliases configured.");
        return;
      }

      console.log("Configured aliases:");
      for (const [alias, aliasPath] of Object.entries(config.aliases)) {
        const isDefault = config.default === alias ? " (default)" : "";
        console.log(`  ${alias}: ${aliasPath}${isDefault}`);
      }
      return;
    }

    if (!path) {
      throw new Error(
        "Path is required when setting an alias. Use 'qn alias' to list aliases."
      );
    }

    // Special case: setting default
    if (path === "default") {
      const config = await loadConfig();
      if (!config.aliases[name]) {
        throw new Error(
          `Alias '${name}' does not exist. Create it first with 'qn alias ${name} <path>'`
        );
      }
      config.default = name;
      const { saveConfig } = await import("../config.ts");
      await saveConfig(config);
      console.log(`Set '${name}' as default alias.`);
      return;
    }

    // Set alias
    await setAlias(name, path);
    console.log(`Alias '${name}' set to '${path}'`);

    // If this is the first alias, make it default
    const config = await loadConfig();
    if (Object.keys(config.aliases).length === 1) {
      config.default = name;
      const { saveConfig } = await import("../config.ts");
      await saveConfig(config);
      console.log(`Set '${name}' as default alias.`);
    }
  });
