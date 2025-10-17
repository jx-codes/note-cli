import { Keyword, updateKeywordStats } from "./keyword.ts";

interface ProcessResult {
  modified: boolean;
  addedTags: string[];
  matchedKeywords: string[];
}

interface FrontmatterBounds {
  start: number;
  end: number;
  exists: boolean;
}

function extractFrontmatter(content: string): FrontmatterBounds {
  const lines = content.split("\n");
  
  if (lines[0] !== "---") {
    return { start: 0, end: 0, exists: false };
  }
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      return {
        start: 0,
        end: i + 1,
        exists: true,
      };
    }
  }
  
  return { start: 0, end: 0, exists: false };
}

function extractCodeBlocks(content: string): Array<{ start: number; end: number }> {
  const blocks: Array<{ start: number; end: number }> = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  let blockStart = 0;
  let currentIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        blockStart = currentIndex;
      } else {
        inCodeBlock = false;
        blocks.push({
          start: blockStart,
          end: currentIndex + line.length,
        });
      }
    }
    
    currentIndex += line.length + 1;
  }
  
  return blocks;
}

function extractExistingTags(content: string): Set<string> {
  const tags = new Set<string>();
  const tagPattern = /#([a-zA-Z0-9\-_\/]+)/g;
  
  const codeBlocks = extractCodeBlocks(content);
  
  let match;
  while ((match = tagPattern.exec(content)) !== null) {
    const matchIndex = match.index!;
    
    const inCodeBlock = codeBlocks.some(
      block => matchIndex >= block.start && matchIndex <= block.end
    );
    
    if (!inCodeBlock) {
      tags.add(match[1]);
    }
  }
  
  return tags;
}

function findKeywordMatches(
  content: string,
  keyword: Keyword,
  codeBlocks: Array<{ start: number; end: number }>,
  frontmatter: FrontmatterBounds
): boolean {
  const searchTerms = [keyword.keyword];
  if (keyword.variations) {
    searchTerms.push(...keyword.variations);
  }
  
  for (const term of searchTerms) {
    const flags = keyword.caseSensitive ? "g" : "gi";
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, flags);
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const matchIndex = match.index!;
      
      if (frontmatter.exists && matchIndex >= 0 && matchIndex < frontmatter.end * (content.split("\n")[0].length + 1)) {
        continue;
      }
      
      const inCodeBlock = codeBlocks.some(
        block => matchIndex >= block.start && matchIndex <= block.end
      );
      
      if (!inCodeBlock) {
        return true;
      }
    }
  }
  
  return false;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insertTags(content: string, tagsToAdd: string[]): string {
  if (tagsToAdd.length === 0) {
    return content;
  }
  
  const tagString = tagsToAdd.map(tag => `#${tag}`).join(" ");
  const lines = content.split("\n");
  
  const frontmatter = extractFrontmatter(content);
  
  const existingTagLinePattern = /^#[a-zA-Z0-9\-_\/]+(\s+#[a-zA-Z0-9\-_\/]+)*\s*$/;
  let lastTagLineIndex = -1;
  let startSearchIndex = frontmatter.exists ? frontmatter.end : 0;
  
  for (let i = startSearchIndex; i < lines.length; i++) {
    if (existingTagLinePattern.test(lines[i].trim())) {
      lastTagLineIndex = i;
    }
  }
  
  if (lastTagLineIndex >= 0) {
    lines[lastTagLineIndex] = lines[lastTagLineIndex].trim() + " " + tagString;
  } else {
    let insertIndex = lines.length;
    
    while (insertIndex > 0 && lines[insertIndex - 1].trim() === "") {
      insertIndex--;
    }
    
    if (insertIndex === lines.length) {
      lines.push("");
      lines.push(tagString);
    } else {
      lines.splice(insertIndex, 0, "", tagString);
    }
  }
  
  return lines.join("\n");
}

export async function migrateTagsInFile(
  filePath: string,
  oldTags: string[],
  newTags: string[]
): Promise<boolean> {
  try {
    let content = await Deno.readTextFile(filePath);
    let modified = false;
    
    for (const oldTag of oldTags) {
      const oldTagPattern = new RegExp(`#${escapeRegExp(oldTag)}\\b`, 'g');
      if (oldTagPattern.test(content)) {
        content = content.replace(oldTagPattern, '');
        modified = true;
      }
    }
    
    if (modified) {
      const existingTags = extractExistingTags(content);
      const tagsToAdd = newTags.filter(tag => !existingTags.has(tag));
      
      if (tagsToAdd.length > 0) {
        content = insertTags(content, tagsToAdd);
      }
      
      await Deno.writeTextFile(filePath, content);
      return true;
    }
  } catch (error) {
    console.error(`Error migrating tags in ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return false;
}

export async function removeTagsFromFile(
  filePath: string,
  tagsToRemove: string[]
): Promise<boolean> {
  try {
    let content = await Deno.readTextFile(filePath);
    let modified = false;
    
    for (const tag of tagsToRemove) {
      const tagPattern = new RegExp(`#${escapeRegExp(tag)}\\b`, 'g');
      if (tagPattern.test(content)) {
        content = content.replace(tagPattern, '');
        modified = true;
      }
    }
    
    if (modified) {
      content = content.replace(/\n\s*\n\s*$/g, '\n').replace(/\s+\n/g, '\n');
      await Deno.writeTextFile(filePath, content);
      return true;
    }
  } catch (error) {
    console.error(`Error removing tags from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return false;
}

export async function processFile(
  filePath: string,
  keywords: Keyword[]
): Promise<ProcessResult> {
  const result: ProcessResult = {
    modified: false,
    addedTags: [],
    matchedKeywords: [],
  };
  
  try {
    let content = await Deno.readTextFile(filePath);
    
    const existingTags = extractExistingTags(content);
    const frontmatter = extractFrontmatter(content);
    const codeBlocks = extractCodeBlocks(content);
    
    const expectedTags: Set<string> = new Set();
    const matchedKeywords: string[] = [];
    
    for (const keyword of keywords) {
      if (findKeywordMatches(content, keyword, codeBlocks, frontmatter)) {
        matchedKeywords.push(keyword.keyword);
        
        for (const tag of keyword.tags) {
          expectedTags.add(tag);
        }
        
        await updateKeywordStats(keyword.keyword, {
          lastTriggered: new Date().toISOString(),
          matchCount: (keyword.matchCount || 0) + 1,
        });
      }
    }
    
    result.matchedKeywords = matchedKeywords;
    
    const allKeywordTags = new Set<string>();
    for (const keyword of keywords) {
      for (const tag of keyword.tags) {
        allKeywordTags.add(tag);
      }
    }
    
    const tagsToRemove = Array.from(existingTags).filter(tag => 
      allKeywordTags.has(tag) && !expectedTags.has(tag)
    );
    
    const tagsToAdd = Array.from(expectedTags).filter(tag => !existingTags.has(tag));
    
    if (tagsToRemove.length > 0) {
      for (const tag of tagsToRemove) {
        const tagPattern = new RegExp(`#${escapeRegExp(tag)}\\b`, 'g');
        content = content.replace(tagPattern, '');
      }
      content = content.replace(/\s+\n/g, '\n').replace(/\n+$/g, '\n');
      result.modified = true;
    }
    
    if (tagsToAdd.length > 0) {
      content = insertTags(content, tagsToAdd);
      result.modified = true;
      result.addedTags = tagsToAdd;
    }
    
    if (result.modified) {
      await Deno.writeTextFile(filePath, content);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return result;
}