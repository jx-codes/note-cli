# Notes CLI - Intelligent Note-Taking with Auto-Tagging

A powerful, git-like command-line interface for quick note-taking with intelligent auto-tagging, alias support, and real-time file monitoring.

## Features

- **Quick note creation** with inline or editor mode
- **Intelligent auto-tagging** based on content keyword detection
- **Real-time file monitoring** with automatic tag application
- **Advanced keyword management** with variations and case sensitivity
- **Alias system** for organizing notes across different directories
- **Automatic slug generation** from note titles
- **Editor integration** with your preferred text editor
- **Tag migration and synchronization** across existing files
- **Markdown support** with `.md` file format
- **Comprehensive configuration** stored in standard user config directory

## Installation

### Prerequisites

- [Deno](https://deno.land/) runtime

### Install from source

```bash
# Clone the repository
git clone <repository-url>
cd note-cli

# Compile and install globally
deno task global-install
```

The compiled binary `notes` will be installed to `~/.deno/bin/notes`. Make sure this directory is in your PATH.

### Development

```bash
# Run with file watching for development
deno task dev

# Run once
deno task run

# Compile to standalone executable
deno task compile
```

## Usage

### Basic Note Creation

```bash
# Create a note in editor mode
notes

# Create a note with inline content
notes -m "This is my quick note"

# Create a note in a specific directory/alias
notes -o work -m "Meeting notes from today"
```

### Directory Management (Aliases)

```bash
# Add an alias
notes alias add work ~/Documents/work-notes
notes alias list
notes alias remove work
```

### Keyword-Based Auto-Tagging

```bash
# Add a keyword that automatically adds tags
notes keyword add "docker" --tags devops,containerization

# Add keyword with variations and case sensitivity
notes keyword add "JavaScript" --tags programming,web-dev --variations "js,JS" --case-sensitive

# List all configured keywords
notes keyword list

# Update keyword tags
notes keyword update "docker" --tags devops,containers,deployment --migrate

# Append new tags to existing keyword
notes keyword append "docker" --tags kubernetes --sync

# Remove keyword and clean up tags
notes keyword clean "docker"
notes keyword remove "docker"
```

### File Synchronization

```bash
# Apply all keyword rules to existing files
notes keyword sync

# Preview changes without applying them
notes keyword sync --dry-run

# Watch files in real-time for automatic tagging
notes keyword watch
```

### Options

- `-m, --message <message>` - Note content (inline mode)
- `-o, --origin <path>` - Directory path or alias to save the note

## Configuration

Configuration is stored in `~/.config/qn/` and includes:

- **`config.json`**: Aliases and general settings
- **`keywords.json`**: Keyword definitions and auto-tagging rules
- **`watcher-state.json`**: File watcher state and processed file tracking

### Alias Management

```bash
# Add an alias
notes alias add <name> <directory-path>

# List all aliases
notes alias list

# Remove an alias
notes alias remove <name>
```

### Keyword Management

Keywords automatically add tags to notes when the keyword (or its variations) is detected in the content:

```bash
# Basic keyword with tags
notes keyword add "meeting" --tags work,discussion

# Advanced keyword with variations
notes keyword add "API" --tags programming,backend --variations "rest,graphql" --case-sensitive

# Update existing keyword
notes keyword update "meeting" --tags work,collaboration,discussion --migrate

# View keyword statistics
notes keyword list
```

## How It Works

### Note Creation
1. **Content Input**: Notes can be created via editor or inline mode
2. **Auto-tagging**: Content is scanned for configured keywords
3. **Tag Insertion**: Matching keywords trigger automatic tag addition
4. **File Naming**: File names are generated from the first line (max 5 words, lowercase, hyphenated)
5. **Directory Organization**: Notes are saved to specified directories or aliases

### Auto-Tagging System
- **Keyword Detection**: Scans note content for configured keywords and variations
- **Smart Matching**: Avoids tagging content inside code blocks or frontmatter
- **Tag Management**: Automatically adds/removes tags based on content changes
- **File Watching**: Real-time monitoring applies tags as files are modified

## Examples

### Basic Usage
```bash
# Quick meeting note with auto-tagging
notes -m "Team standup discussed Docker deployment strategies"
# Saves as: team-standup-discussed-docker.md
# Auto-adds: #meetings #devops #containerization (if keywords configured)

# Work note using alias
notes -o work -m "Project deadline moved to next Friday"

# Open editor for longer note
notes -o personal
# Opens your $EDITOR for writing
```

### Keyword Configuration
```bash
# Set up auto-tagging for development topics
notes keyword add "docker" --tags devops,containerization
notes keyword add "react" --tags frontend,javascript,programming
notes keyword add "meeting" --tags work,collaboration --variations "standup,call"

# Create a note that gets auto-tagged
notes -m "Docker deployment meeting scheduled for tomorrow"
# Result: Auto-tagged with #devops #containerization #work #collaboration
```

### File Watching
```bash
# Start real-time monitoring
notes keyword watch

# The watcher will automatically tag new and modified files
# based on your keyword configuration
```

## Permissions

Notes CLI requires the following Deno permissions:

- `--allow-read` - Reading configuration, temporary files, and monitoring directories
- `--allow-write` - Writing notes and configuration files
- `--allow-env` - Accessing HOME and EDITOR environment variables
- `--allow-run` - Launching external text editor

## Architecture

- **Entry Point**: `main.ts` - CLI parsing and main command logic
- **Configuration**: `src/config.ts` - Alias management and config file handling
- **Note Handling**: `src/note.ts` - Note creation and slug generation
- **Editor Integration**: `src/editor.ts` - External editor launching
- **Keyword System**: `src/keyword.ts` - Keyword management and storage
- **Auto-Tagging**: `src/tagger.ts` - Content analysis and tag processing
- **File Watching**: `src/watcher.ts` - Real-time file monitoring and processing
- **Commands**: 
  - `src/commands/alias.ts` - Alias subcommand implementation
  - `src/commands/keyword.ts` - Keyword management subcommands

## Advanced Features

### Tag Migration
When updating keyword tags, use `--migrate` to update existing files:
```bash
notes keyword update "docker" --tags devops,containers,kubernetes --migrate
```

### Bulk Operations
Apply keyword rules to all existing files:
```bash
notes keyword sync
```

### Real-time Processing
Monitor directories for changes and auto-tag new content:
```bash
notes keyword watch --verbose
```
