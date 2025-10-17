import { ensureDir } from "@std/fs";
import { join } from "@std/path";

function geneqneSlug(text: string): string {
  const firstLine = text.split("\n")[0];
  const words = firstLine
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5); // Max 5 words for readability

  return words.join("-") || "note";
}

function formatDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}-${hours}-${minutes}`;
}

export async function saveNote(
  content: string,
  directory: string
): Promise<string> {
  await ensureDir(directory);

  const slug = geneqneSlug(content);
  const filename = `${slug}.md`;
  const filepath = join(directory, filename);

  // Format the content - ensure it's proper markdown
  const formattedContent = content.trim() + "\n";

  await Deno.writeTextFile(filepath, formattedContent);

  return filepath;
}

export function extractTitle(content: string): string {
  const firstLine = content.split("\n")[0];
  return firstLine.trim();
}
