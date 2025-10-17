# QN - Quick Notes CLI

A fast, git-like command-line interface for quick note-taking with alias support and automatic organization.

## Features

- **Quick note creation** with inline or editor mode
- **Alias system** for organizing notes across different directories
- **Automatic slug generation** from note titles
- **Editor integration** with your preferred text editor
- **Markdown support** with `.md` file format
- **Simple configuration** stored in standard user config directory

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

The compiled binary `qn` will be installed to `~/.deno/bin/qn`. Make sure this directory is in your PATH.

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

### Basic Commands

```bash
# Create a note in editor mode
qn

# Create a note with inline content
qn -m "This is my quick note"

# Create a note in a specific directory/alias
qn -o work -m "Meeting notes from today"

# Manage aliases
qn alias add work ~/Documents/work-notes
qn alias list
qn alias remove work
```

### Options

- `-m, --message <message>` - Note content (inline mode)
- `-o, --origin <path>` - Directory path or alias to save the note

## Configuration

Configuration is stored in `~/.config/qn/config.json` and includes:

- **Aliases**: Friendly names mapped to directory paths for note organization

### Alias Management

```bash
# Add an alias
qn alias add <name> <directory-path>

# List all aliases
qn alias list

# Remove an alias
qn alias remove <name>
```

## How It Works

1. **Note Creation**: Notes can be created either by opening your default editor or by providing content inline
2. **Automatic Naming**: File names are automatically generated from the first line of your note (max 5 words, lowercase, hyphenated)
3. **Directory Organization**: Use aliases to quickly save notes to different directories
4. **Markdown Format**: All notes are saved as `.md` files

## Examples

```bash
# Quick meeting note
qn -m "Team standup - discussed new feature roadmap"
# Saves as: team-standup-discussed-new.md

# Work note using alias
qn -o work -m "Project deadline moved to next Friday"

# Open editor for longer note
qn -o personal
# Opens your $EDITOR for writing
```

## Permissions

QN requires the following Deno permissions:

- `--allow-read` - Reading configuration and temporary files
- `--allow-write` - Writing notes and configuration
- `--allow-env` - Accessing HOME and EDITOR environment variables
- `--allow-run` - Launching external text editor

## Architecture

- **Entry Point**: `main.ts` - CLI parsing and main command logic
- **Configuration**: `src/config.ts` - Alias management and config file handling
- **Note Handling**: `src/note.ts` - Note creation and slug generation
- **Editor Integration**: `src/editor.ts` - External editor launching
- **Commands**: `src/commands/alias.ts` - Alias subcommand implementation
