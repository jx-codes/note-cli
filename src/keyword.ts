import { ensureDir } from "@std/fs";
import { join } from "@std/path";

export interface Keyword {
  keyword: string;
  tags: string[];
  caseSensitive: boolean;
  variations?: string[];
  createdAt: string;
  lastTriggered?: string;
  matchCount?: number;
}

export interface KeywordConfig {
  keywords: Keyword[];
}

const CONFIG_DIR = join(Deno.env.get("HOME") || "", ".config", "qn");
const KEYWORDS_FILE = join(CONFIG_DIR, "keywords.json");

export async function loadKeywords(): Promise<KeywordConfig> {
  try {
    const data = await Deno.readTextFile(KEYWORDS_FILE);
    return JSON.parse(data);
  } catch {
    return { keywords: [] };
  }
}

export async function saveKeywords(config: KeywordConfig): Promise<void> {
  await ensureDir(CONFIG_DIR);
  await Deno.writeTextFile(KEYWORDS_FILE, JSON.stringify(config, null, 2));
}

export function processTags(tagInput: string): string[] {
  const tags = tagInput.split(",").map(tag => {
    let processed = tag.trim();
    
    processed = processed.replace(/\s+/g, "-");
    
    processed = processed.replace(/[^a-zA-Z0-9\-_\/]/g, "");
    
    processed = processed.replace(/-+/g, "-");
    
    processed = processed.replace(/^-+|-+$/g, "");
    
    return processed;
  }).filter(tag => tag.length > 0);
  
  return [...new Set(tags)];
}

export async function addKeyword(
  keyword: string, 
  tags: string[], 
  options: {
    caseSensitive?: boolean;
    variations?: string[];
  } = {}
): Promise<void> {
  const config = await loadKeywords();
  
  const existingIndex = config.keywords.findIndex(k => k.keyword === keyword);
  
  if (existingIndex >= 0) {
    config.keywords[existingIndex] = {
      keyword,
      tags,
      caseSensitive: options.caseSensitive || false,
      variations: options.variations,
      createdAt: config.keywords[existingIndex].createdAt,
      lastTriggered: config.keywords[existingIndex].lastTriggered,
      matchCount: config.keywords[existingIndex].matchCount,
    };
  } else {
    config.keywords.push({
      keyword,
      tags,
      caseSensitive: options.caseSensitive || false,
      variations: options.variations,
      createdAt: new Date().toISOString(),
      matchCount: 0,
    });
  }
  
  await saveKeywords(config);
}

export async function removeKeyword(keyword: string): Promise<boolean> {
  const config = await loadKeywords();
  const originalLength = config.keywords.length;
  
  config.keywords = config.keywords.filter(k => k.keyword !== keyword);
  
  if (config.keywords.length < originalLength) {
    await saveKeywords(config);
    return true;
  }
  
  return false;
}

export async function listKeywords(): Promise<Keyword[]> {
  const config = await loadKeywords();
  return config.keywords;
}

export async function getKeywordByName(keyword: string): Promise<Keyword | null> {
  const config = await loadKeywords();
  return config.keywords.find(k => k.keyword === keyword) || null;
}

export async function updateKeywordStats(
  keyword: string, 
  updates: { lastTriggered?: string; matchCount?: number }
): Promise<void> {
  const config = await loadKeywords();
  const keywordObj = config.keywords.find(k => k.keyword === keyword);
  
  if (keywordObj) {
    if (updates.lastTriggered) {
      keywordObj.lastTriggered = updates.lastTriggered;
    }
    if (updates.matchCount !== undefined) {
      keywordObj.matchCount = updates.matchCount;
    }
    await saveKeywords(config);
  }
}

export async function updateKeyword(
  keyword: string,
  updates: {
    tags?: string[];
    caseSensitive?: boolean;
    variations?: string[];
  }
): Promise<{ oldTags: string[]; newTags: string[] } | null> {
  const config = await loadKeywords();
  const keywordObj = config.keywords.find(k => k.keyword === keyword);
  
  if (!keywordObj) {
    return null;
  }
  
  const oldTags = [...keywordObj.tags];
  
  if (updates.tags) {
    keywordObj.tags = updates.tags;
  }
  if (updates.caseSensitive !== undefined) {
    keywordObj.caseSensitive = updates.caseSensitive;
  }
  if (updates.variations !== undefined) {
    keywordObj.variations = updates.variations;
  }
  
  await saveKeywords(config);
  
  return {
    oldTags,
    newTags: keywordObj.tags,
  };
}

export async function appendTags(
  keyword: string,
  newTags: string[]
): Promise<{ oldTags: string[]; newTags: string[]; addedTags: string[] } | null> {
  const config = await loadKeywords();
  const keywordObj = config.keywords.find(k => k.keyword === keyword);
  
  if (!keywordObj) {
    return null;
  }
  
  const oldTags = [...keywordObj.tags];
  const existingTagSet = new Set(keywordObj.tags);
  const tagsToAdd = newTags.filter(tag => !existingTagSet.has(tag));
  
  if (tagsToAdd.length === 0) {
    return {
      oldTags,
      newTags: oldTags,
      addedTags: [],
    };
  }
  
  keywordObj.tags.push(...tagsToAdd);
  await saveKeywords(config);
  
  return {
    oldTags,
    newTags: [...keywordObj.tags],
    addedTags: tagsToAdd,
  };
}