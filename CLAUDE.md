# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Tasks

**Development and building:**
- `deno task dev` - Run with file watching for development
- `deno task run` - Run the CLI once
- `deno task compile` - Compile to standalone executable `qn`
- `deno task global-install` - Compile and install globally to ~/.deno/bin/qn

**Running the CLI:**
- `deno run --allow-read --allow-write --allow-env --allow-run main.ts` - Direct execution
- The CLI name is `qn` (quick notes)

## Architecture Overview

This is a Deno-based CLI tool for quick note-taking with a git-like interface, using Cliffy for command parsing.

**Core modules:**
- `main.ts` - Entry point with main command and CLI parsing
- `src/config.ts` - Configuration management with aliases system stored in ~/.config/qn/config.json
- `src/note.ts` - Note creation, slug generation, and file operations 
- `src/editor.ts` - Integration with system editor ($EDITOR or vi fallback)
- `src/commands/alias.ts` - Alias management subcommand

**Key design patterns:**
- Alias system maps friendly names to directory paths for note storage
- Automatic slug generation from first line of content (max 5 words, lowercase, hyphenated)
- Notes saved as `.md` files with slugified filenames
- Configuration stored as JSON in standard user config directory
- Editor integration via temporary files

**Permissions required:**
- `--allow-read` - Reading config and temporary files
- `--allow-write` - Writing notes and config
- `--allow-env` - Accessing HOME and EDITOR environment variables  
- `--allow-run` - Launching external editor

The tool supports both inline mode (`-m "message"`) and interactive editor mode for note creation, with flexible directory targeting via aliases or direct paths.