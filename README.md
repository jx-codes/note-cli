# Quick Notes (qn) - Complete User Guide

A powerful CLI tool for quick note-taking with intelligent NLP-based auto-tagging using wink-nlp.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Taking Notes](#taking-notes)
3. [Managing Aliases](#managing-aliases)
4. [Auto-Tagging with Rules](#auto-tagging-with-rules)
5. [Discovering Patterns](#discovering-patterns)
6. [Syncing Tags](#syncing-tags)
7. [Advanced Examples](#advanced-examples)

---

## Getting Started

### First Steps

Check your qn version:

```bash
qn --version
```

Get help anytime:

```bash
qn --help
qn <command> --help  # Help for specific commands
```

---

## Taking Notes

### Quick Inline Notes

The fastest way to capture a thought:

```bash
qn -m "Your note content here"
```

**Example:**

```bash
qn -m "Learn Python decorators today. They're really powerful for adding functionality to functions without modifying them."
```

Output:

```
✓ Note saved: /path/to/notes/learn-python-decorators-today-theyre.md
```

### How Notes Work

- **Automatic naming**: The first 5 words become the filename (slugified and hyphenated)
- **Markdown format**: All notes are saved as `.md` files
- **One-liner**: Perfect for quick captures without opening an editor

### Saving to Specific Locations

Use the `-o` or `--origin` flag:

```bash
qn -m "Meeting notes from standup" -o ~/work/meetings
qn -m "Recipe for Thai curry" -o cooking  # Uses alias "cooking"
```

---

## Managing Aliases

Aliases are friendly shortcuts for directory paths. Instead of typing full paths, create memorable names.

### List All Aliases

```bash
qn alias
```

Output:

```
Configured aliases:
  work: /Users/you/Documents/work-notes (default)
  personal: /Users/you/Documents/personal
  coding: /Users/you/code-snippets
```

### Create an Alias

```bash
qn alias <name> <path>
```

**Examples:**

```bash
qn alias work ~/Documents/work-notes
qn alias recipes ~/cooking/recipes
qn alias journal /Users/you/personal/journal
```

### Set a Default Alias

The default alias is used when you don't specify `-o`:

```bash
qn alias <name> default
```

**Example:**

```bash
qn alias work default
```

Now `qn -m "Daily standup notes"` automatically saves to your work directory!

### Delete an Alias

```bash
qn alias delete <name>
```

**Example:**

```bash
qn alias delete old-project
# Output: Alias 'old-project' has been removed.
```

**Smart deletion**: If you delete the default alias, qn automatically picks another alias as the new default!

---

## Auto-Tagging with Rules

The real power of `qn` is intelligent auto-tagging using wink-nlp. Create rules that automatically tag your notes based on linguistic patterns.

### Rule Types

1. **Keyword**: Match specific words
2. **Pattern**: Match part-of-speech patterns (VERB NOUN, ADJ NOUN, etc.)
3. **Entity**: Match named entities (URLs, emails, dates, etc.)
4. **Literal**: Match exact phrases

### View All Rules

```bash
qn tag list
```

### Create Keyword Rules

#### Basic Keyword Rule

```bash
qn tag when keyword <word> --tags <tag1>,<tag2>
```

**Example:**

```bash
qn tag when keyword Python --tags programming,python
```

This tags any note containing "Python" with `#programming` and `#python`.

#### Keyword with Lemmatization

Lemmatization matches word roots (run, running, ran → run):

```bash
qn tag when keyword workout --lemma --tags fitness,health
```

Now "workout", "workouts", and "working out" all match!

#### Keyword with Filters

**Match only as a specific part of speech:**

```bash
qn tag when keyword book --tags reading,recommendation --pos NOUN
```

This only tags "book" when it's a noun (not the verb "to book").

**Require an entity type:**

```bash
qn tag when keyword meeting --tags meeting,scheduled --require-entity DATE
```

Only tags notes about meetings that also mention a date!

**Sentiment filter:**

```bash
qn tag when keyword project --tags work --sentiment-min 0.5
```

Only tags notes with positive sentiment about projects.

### Create Pattern Rules

Match grammatical structures using part-of-speech patterns.

#### Common Patterns

```bash
# "Learn Python", "visit Tokyo", "practice JavaScript"
qn tag when pattern "VERB PROPN" --tags learning,explore

# "good idea", "quick fix", "big problem"
qn tag when pattern "ADJ NOUN" --tags concept,idea

# "write code", "fix bug", "deploy app"
qn tag when pattern "VERB NOUN" --tags action,todo
```

#### Pattern with Sentiment Filter

```bash
qn tag when pattern "ADJ NOUN" --tags idea,concept --sentiment-min 0.5
```

Only matches positive descriptive phrases like "great opportunity" or "awesome feature"!

### Create Entity Rules

Tag based on what type of information appears in the note.

```bash
# Tag notes with dates
qn tag when entity DATE --tags deadline,scheduled

# Tag notes with URLs
qn tag when entity URL --tags link,reference

# Tag notes with emails
qn tag when entity EMAIL --tags contact,correspondence
```

### Create Literal Rules

Match exact phrases:

```bash
qn tag when literal "need to" --tags todo,action-item
qn tag when literal "don't forget" --tags reminder,important
qn tag when literal "follow up" --tags followup,todo
```

### Rule Management

#### View Rule Details

```bash
qn tag show <rule-id>
```

**Example:**

```bash
qn tag show keyword-python
```

Output:

```
Rule: keyword-python
Type: keyword
Match: Python
Lemmatization: enabled
Tags: #programming #python
Description: Tag notes about Python programming
Enabled: yes
Created: 10/19/2025, 4:06:31 PM
```

#### Disable/Enable Rules

Temporarily turn rules off without deleting them:

```bash
qn tag disable keyword-react
qn tag enable keyword-react
```

#### Delete Rules

```bash
qn tag remove <rule-id>
```

**Example:**

```bash
qn tag remove keyword-old-project
```

---

## Discovering Patterns

Before creating rules, explore what's in your notes!

### Discover Frequent Keywords

Find the most common words across all your notes:

```bash
qn discover keywords
```

Output:

```
Top keywords (50 results):

  docker               (15 occurrences)
  python               (12 occurrences)
  meeting              (8 occurrences)
  recipe               (5 occurrences)
  ...

Add a keyword rule:
  qn tag when keyword "<keyword>" --lemma --tags <your-tags>
```

**Tip**: Use this to understand your note-taking themes and create relevant rules!

### Test Pattern Matches

See what a pattern would match before creating a rule:

```bash
qn discover pattern "VERB PROPN"
```

Output:

```
Pattern "VERB PROPN" matches (3 results):

  learn Kubernetes               (2 occurrences)
  visit Tokyo                    (1 occurrences)
  practice Python                (1 occurrences)

Create a pattern rule:
  qn tag when pattern "VERB PROPN" --tags <your-tags>
```

### Search for Specific Keywords

Find where a keyword appears:

```bash
qn discover keyword "docker"
```

Output:

```
Keyword "docker" found 15 times

Sample matches (showing 5 of 15):
  "Docker"
  "docker-compose"
  "Dockerfile"
```

---

## Syncing Tags

After creating rules, apply them to your existing notes!

### Preview Changes (Dry Run)

See what would be tagged without making changes:

```bash
qn sync --dry-run
qn sync <alias> --dry-run  # For specific directory
```

**Example:**

```bash
qn sync work --dry-run
```

Output:

```
learn-python-decorators.md
  + #programming #python #learning #explore #todo #action-item

docker-commands-cheat-sheet.md
  + #devops #containers #learning #explore

meeting-notes-standup.md
  + #meeting #scheduled #deadline

==================================================
Processed: 15 files
Modified: 8 files
Tags added: 24
Tags removed: 0

This was a dry-run. Run 'qn sync work' to apply changes.
```

### Apply Tags

```bash
qn sync          # Sync default alias
qn sync work     # Sync specific alias
```

Output:

```
✓ learn-python-decorators.md
  + #programming #python #learning

✓ docker-commands-cheat-sheet.md
  + #devops #containers

==================================================
Processed: 15 files
Modified: 8 files
Tags added: 24
Tags removed: 0
```

### How Tags Appear in Notes

Tags are added at the end of your note file:

```markdown
Learn Python decorators today. They're really powerful for adding functionality to functions.

#programming #python #learning #explore #todo #action-item
```

---

## Advanced Examples

### Real-World Workflow

**1. Set up your workspace:**

```bash
qn alias work ~/Documents/work
qn alias personal ~/Documents/personal
qn alias work default
```

**2. Create tagging rules for your workflow:**

```bash
# Programming languages
qn tag when keyword Python --tags programming,python --lemma
qn tag when keyword JavaScript --tags programming,javascript --lemma
qn tag when keyword TypeScript --tags programming,typescript --lemma

# Work-related
qn tag when keyword meeting --tags meeting,scheduled --require-entity DATE
qn tag when literal "action item" --tags todo,urgent

# Learning goals
qn tag when pattern "VERB PROPN" --tags learning,goal

# Positive ideas
qn tag when pattern "ADJ NOUN" --tags idea --sentiment-min 0.5

# Dates and deadlines
qn tag when entity DATE --tags deadline,scheduled
qn tag when entity URL --tags reference,link
```

**3. Take notes throughout the day:**

```bash
qn -m "Meeting with team about Q4 planning. Action items: review roadmap, update docs. Follow up next Monday."
qn -m "Learn Kubernetes for container orchestration. Start with basics."
qn -m "Great idea: build a CLI tool for quick note-taking with auto-tagging!"
qn -m "Check out this article: https://blog.example.com/docker-best-practices"
```

**4. Discover patterns in your notes:**

```bash
qn discover keywords
# Analyze what you write about most

qn discover pattern "VERB PROPN"
# See your learning goals
```

**5. Apply tags to all your notes:**

```bash
qn sync --dry-run  # Preview first
qn sync            # Apply tags
```

### Complex Filtering Examples

**Tag positive meeting notes with dates:**

```bash
qn tag when keyword meeting \
  --tags meeting,positive \
  --require-entity DATE \
  --sentiment-min 0.3
```

**Tag technical learning goals:**

```bash
qn tag when pattern "VERB PROPN" \
  --tags learning,technical \
  --require-entity URL
```

**Tag urgent todos in negative context:**

```bash
qn tag when literal "urgent" \
  --tags urgent,critical \
  --sentiment-max -0.2
```

### Organizing with Tag Hierarchies

Use forward slashes for hierarchical tags:

```bash
qn tag when keyword React --tags programming/frontend,react
qn tag when keyword Django --tags programming/backend,python
qn tag when keyword Postgres --tags programming/database,sql
```

Your notes will have tags like:

```
#programming/frontend #react
#programming/backend #python
#programming/database #sql
```

---

## Tips and Best Practices

### 1. **Start Simple**

Don't create too many rules at once. Start with 5-10 basic keyword rules, sync, and see what gets tagged.

### 2. **Use Lemmatization**

Almost always use `--lemma` for keywords. It's much more flexible:

```bash
qn tag when keyword run --lemma --tags fitness
# Matches: run, running, ran, runs
```

### 3. **Preview with Discover**

Before creating a rule, use discover to test:

```bash
qn discover pattern "VERB PROPN"  # Test first
qn tag when pattern "VERB PROPN" --tags learning  # Then create
```

### 4. **Always Dry-Run Sync**

Check what will be tagged before applying:

```bash
qn sync --dry-run
```

### 5. **Use Descriptive Rule Names**

Add descriptions to remember why you created a rule:

```bash
qn tag when keyword docker --tags devops --description "Tag Docker and container-related notes"
```

### 6. **Disable Instead of Delete**

If you're unsure about a rule, disable it instead of deleting:

```bash
qn tag disable keyword-old-project
```

### 7. **Organize with Aliases**

Create aliases for different contexts:

```bash
qn alias work ~/work-notes
qn alias personal ~/personal
qn alias learning ~/dev-learning
qn alias recipes ~/cooking
```

---

## Quick Reference

### Note Taking

```bash
qn -m "note content"                    # Quick note
qn -m "note content" -o work            # Save to alias
qn -m "note content" -o ~/specific/path # Save to path
```

### Aliases

```bash
qn alias                                # List all
qn alias name /path                     # Create
qn alias name default                   # Set default
qn alias delete name                    # Delete
```

### Tagging Rules

```bash
qn tag list                             # List all rules
qn tag show <rule-id>                   # View details
qn tag when keyword <word> --tags ...   # Create keyword rule
qn tag when pattern "<PATTERN>" --tags ... # Create pattern rule
qn tag when entity <TYPE> --tags ...    # Create entity rule
qn tag when literal "<phrase>" --tags ... # Create literal rule
qn tag disable <rule-id>                # Disable rule
qn tag enable <rule-id>                 # Enable rule
qn tag remove <rule-id>                 # Delete rule
```

### Discovery

```bash
qn discover keywords                    # Find frequent words
qn discover pattern "VERB NOUN"         # Test pattern
qn discover keyword "word"              # Search for word
```

### Syncing

```bash
qn sync --dry-run                       # Preview changes
qn sync                                 # Apply to default
qn sync <alias>                         # Apply to specific alias
```

---

## Common POS Patterns

Here are useful part-of-speech patterns for rules:

- `VERB NOUN` - Actions: "fix bug", "write code"
- `VERB PROPN` - Learning goals: "learn Python", "visit Tokyo"
- `ADJ NOUN` - Descriptions: "good idea", "quick fix"
- `NOUN VERB` - Subject-action: "bug occurs", "test fails"
- `VERB DET NOUN` - "fix the bug", "write a function"
- `ADV ADJ` - Intensifiers: "very important", "really useful"

---

## Entity Types

Common entity types for rules:

- `DATE` - Dates and times
- `URL` - Web addresses
- `EMAIL` - Email addresses
- `PERSON` - Person names
- `PROPN` - Proper nouns (names, places)
- `HASHTAG` - Existing hashtags
- `MENTION` - @mentions

---

## Getting Help

- Run `qn --help` for general help
- Run `qn <command> --help` for command-specific help
- Check `qn --version` to see your version

---

## Example Complete Workflow

```bash
# Initial setup
qn alias notes ~/Documents/notes
qn alias notes default

# Create rules
qn tag when keyword Python --lemma --tags programming,python
qn tag when keyword meeting --require-entity DATE --tags meeting,scheduled
qn tag when pattern "VERB PROPN" --tags learning,goal
qn tag when entity URL --tags reference,link
qn tag when literal "need to" --tags todo,action

# Take some notes
qn -m "Meeting with Sarah on Friday. Need to review the Python codebase."
qn -m "Learn Kubernetes this month. Great tutorial: https://k8s.io/docs"
qn -m "Quick idea: build automation for deployment process"

# Discover patterns
qn discover keywords

# Apply tags
qn sync --dry-run
qn sync

# Check results - your notes now have automatic tags! 🎉
```

---

**Happy note-taking! 📝✨**
