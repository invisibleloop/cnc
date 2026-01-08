# CNC - Conventional Commit Creator

An interactive CLI tool that helps developers craft perfectly structured [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) with optional AI assistance powered by Ollama.

## Features

- 🤖 **AI-Powered Commit Generation** - Automatically generates commit messages from your staged changes using local LLMs via Ollama
- ✅ **Conventional Commit Compliance** - Ensures all commits follow the Conventional Commits specification
- 🎯 **Interactive Prompts** - User-friendly interface for manual commit creation
- 🔄 **Smart Fallbacks** - Gracefully falls back to manual mode if AI is unavailable
- 📝 **Commitlint Compatible** - Generates messages that pass commitlint validation
- 🏷️ **Flexible Branch References** - Choose where to include branch tags: header, footer, or skip entirely
- 📦 **Publish-Aware Commit Types** - Filters commit types based on whether you're publishing (e.g., to npm)
- ✏️ **Edit AI Suggestions** - Review, accept, edit, or regenerate AI-generated commits
- 🎨 **Beautiful UI** - Clean, intuitive interface powered by @clack/prompts

## Installation

### Installing CNC

```bash
# Clone or navigate to the repository
cd cnc

# Install dependencies
npm install

# Make the CLI globally available (optional)
npm link
```

### Installing Ollama (Optional, for AI Features)

Ollama provides local AI capabilities without requiring cloud APIs or API keys.

#### macOS

```bash
# Using Homebrew
brew install ollama

# Or download from the website
# Visit https://ollama.ai and download the macOS installer
```

#### Linux

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Windows

Download the installer from [https://ollama.ai](https://ollama.ai) and run it.

#### Verify Installation

```bash
# Check Ollama is installed
ollama --version

# Start the Ollama service
ollama serve

# In a new terminal, pull a model
ollama pull qwen2.5-coder:latest
```

**Note:** Ollama is completely optional. Without it, `cnc` will automatically fall back to manual mode with interactive prompts.

## Quick Start

### With AI (Recommended)

1. Start Ollama:
```bash
ollama serve
```

2. Pull a code-optimised model (first time only):
```bash
ollama pull qwen2.5-coder:latest
# or
ollama pull codellama
```

3. Stage your changes and run:
```bash
git add .
cnc
```

The tool will analyse your changes and suggest a commit message!

### Without AI (Manual Mode)

Simply run `cnc` without Ollama, and you'll be guided through interactive prompts:

```bash
git add .
cnc
```

## Usage

### AI-Assisted Workflow

When Ollama is running, `cnc` will:

1. Detect Ollama availability
2. Analyse your staged changes
3. Generate a conventional commit message
4. Present options:
   - **Accept** - Use the AI suggestion as-is
   - **Edit** - Modify the suggestion interactively
   - **Regenerate** - Ask AI to try again
   - **Manual** - Switch to manual prompts

### Manual Workflow

When Ollama is unavailable, or if you choose manual mode:

1. Indicate if this commit will be published (filters commit types)
2. Select commit type (feat, fix, perf for publish; all types otherwise)
3. Enter optional scope
4. Write a short description
5. Indicate if it's a breaking change
6. Add breaking change description (if applicable)
7. Add optional footer text
8. Choose where to include branch reference (if detected)

### Branch Reference Options

If your branch name follows patterns like:
- `feature/ABC-123-description`
- `fix/JIRA-456`
- `bugfix/TICKET-789`

The tool extracts the text after the first `/` (e.g., `ABC-123-description`, `JIRA-456`) and gives you three options:

- **Don't include** - Skip the branch reference entirely
- **In header** - Append to the commit description (e.g., `fix: resolve login bug ABC-123`)
- **In footer** - Add as a reference in the footer (e.g., `Refs #ABC-123`)

This flexibility allows you to choose the best placement for your workflow and project conventions.

### Publish-Aware Commit Types

When you indicate that a commit will be published (e.g., to npm), the tool filters commit types to only those that trigger semantic version bumps:

- **feat** - A new feature (triggers minor version bump: 0.X.0)
- **fix** - A bug fix (triggers patch version bump: 0.0.X)
- **perf** - Performance improvements (triggers patch version bump: 0.0.X)
- **Breaking changes** - Any type with `!` or `BREAKING CHANGE:` (triggers major version bump: X.0.0)

For non-publish commits, all conventional commit types are available:

- **docs** - Documentation only changes
- **style** - Code style changes (formatting, missing semicolons, etc.)
- **refactor** - Code changes that neither fix a bug nor add a feature
- **test** - Adding or updating tests
- **build** - Build system or external dependency changes
- **ci** - CI/CD configuration changes
- **chore** - Other changes that don't modify src or test files
- **revert** - Revert a previous commit

This ensures that only version-bumping commits are used when publishing packages.

## Examples

### AI-Generated Commit
```
$ cnc

◇  Conventional Commit Creator
│
◆  Generating commit message with AI...
│
┌  🤖 AI-generated commit message:
│
│  feat(ollama): add AI-powered commit generation
│
└

◇  What would you like to do?
│  ● Accept
│  ○ Edit
│  ○ Regenerate
│  ○ Manual

(selecting Accept)

◇  Where would you like to include the branch reference (ABC-123)?
│  ● Don't include
│  ○ In header
│  ○ In footer
```

### Manual Commit
```
$ cnc

◇  Conventional Commit Creator
│
◇  Will this commit be published (e.g., to npm)?
│  Yes
│
◇  Select commit type:
│  feat
│  (only feat, fix, perf shown for publish commits)
│
◇  Commit scope (optional):
│  parser
│
◇  Short description:
│  add ability to parse arrays
│
◇  Is this a breaking change?
│  Yes
│
◇  Describe the breaking change:
│  arrays are now parsed differently
│
◇  Footer (optional):
│
│
◇  Where would you like to include the branch reference (ABC-123)?
│  ○ Don't include
│  ○ In header
│  ● In footer
│
┌  Commit message preview:
│
│  feat(parser)!: add ability to parse arrays
│
│  BREAKING CHANGE: arrays are now parsed differently
│
│  Refs #ABC-123
│
└

◇  Create commit with this message?
│  Yes
│
◇  Commit created successfully!
```

## Configuration

### Changing the AI Model

Edit `lib/ollama.js` to change the default model:

```javascript
const OLLAMA_CONFIG = {
  baseUrl: 'http://localhost:11434',
  model: 'your-preferred-model:latest', // Change this
  timeout: 30000
};
```

Recommended models:
- `qwen2.5-coder:latest` - Excellent for code understanding
- `codellama:latest` - Good for general code tasks
- `deepseek-coder:latest` - Great for detailed analysis
- `llama3.2:latest` - General purpose, works well

### Commitlint Integration

This tool generates commits that comply with standard commitlint rules:

- Subject must be lowercase (automatically enforced)
- Subject must not end with a period
- Branch references can be optionally included when prompted

## How It Works

1. **Checks Ollama availability** - Pings `http://localhost:11434`
2. **Gets staged diff** - Runs `git diff --cached`
3. **Sends to AI** - Prompts the LLM to analyse changes (or uses manual prompts)
4. **Parses response** - Extracts type, scope, description, and breaking change info
5. **Prompts for branch reference placement** - Extracts branch tag and asks where to include it (header/footer/none)
6. **Validates** - Ensures conventional commit compliance and header length
7. **Creates commit** - Executes `git commit` with the message

For manual commits, the tool also asks about publish intent to filter available commit types.

## Requirements

- Node.js 14+ (ESM support)
- Git repository
- Ollama (optional, for AI features)

## Troubleshooting

### "Ollama not available"
- Make sure Ollama is running: `ollama serve`
- Check it's accessible: `curl http://localhost:11434/api/tags`
- Tool will automatically fall back to manual mode

### "No staged changes found"
- Stage your changes first: `git add .`
- Or stage specific files: `git add file.js`

### Commitlint errors
- The tool automatically formats commits for commitlint
- Ensures lowercase subjects
- Adds branch references
- Validates conventional commit structure

### AI generates invalid JSON
- Try regenerating the commit
- Switch to a different model
- Use manual mode as fallback

## Contributing

Issues and pull requests welcome!

## Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [Ollama Documentation](https://ollama.ai/docs)

## License

ISC
