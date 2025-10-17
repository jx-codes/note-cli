import { join } from "@std/path";

export async function openEditor(): Promise<string> {
  const editor = Deno.env.get("EDITOR") || "vi";
  const tmpDir = await Deno.makeTempDir();
  const tmpFile = join(tmpDir, "qn-note.md");

  // Create empty temp file
  await Deno.writeTextFile(tmpFile, "");

  // Open editor
  const cmd = new Deno.Command(editor, {
    args: [tmpFile],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const { success } = await cmd.output();

  if (!success) {
    throw new Error(`Failed to open editor: ${editor}`);
  }

  // Read the content after editing
  const content = await Deno.readTextFile(tmpFile);

  // Clean up temp file
  try {
    await Deno.remove(tmpDir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }

  if (!content.trim()) {
    throw new Error("Note is empty, aborting.");
  }

  return content;
}
