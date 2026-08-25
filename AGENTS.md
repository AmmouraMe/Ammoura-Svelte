# Agent Guidelines

Guidelines for AI agents (Claude Code, Amp, GitHub Copilot, etc.) working on
this codebase.

## Development Workflow

### Commands

- **Dev**: `npm run dev` - Start development server
- **Build**: `npm run build` - Build for production (includes Cloudflare
  adapter)
- **Preview**: `npm run preview` - Preview production build locally
- **Deploy**: `npm run deploy` or `wrangler deploy` - Deploy to Cloudflare
- **Lint**: `npm run lint` - Run ESLint
- **Format**: `npm run format` - Format code with Prettier
- **Test**: `npm test` - Run tests with Vitest
- **Single test**: `npm test -- tests/file.test.ts` - Run specific test file

### Contribution Workflow

Every repository in the **AmmouraMe** organization follows the same four steps —
`Ammoura-Svelte`, `nabu`, `teaser`, and anything added later. Humans and AI
agents work the same way.

1. **Start from an issue, and claim it.** Work is tracked in GitHub Issues.
   Before writing code, take the issue: assign yourself, or comment that you
   are picking it up. This is what stops two people — or two agents — landing
   on the same work.
2. **Work on a branch.** Never commit to `main`. Cut `feature/<short-name>` for
   new work or `fix/<short-name>` for a bug. Include the issue number when it
   helps: `feature/68-code-editor`.
3. **Open a draft PR early.** As soon as there is a first commit, open the pull
   request **as a draft**. Do not wait until the work is done. An early draft
   shows what is in flight, gives CI somewhere to run, and lets reviewers
   comment before the design hardens. Link the issue in the body (`Closes #68`)
   so it closes on merge.
4. **Finish, then mark ready for review.** When the feature or fix is complete
   and the quality gates are green, update the PR description to say what
   actually landed, then take it out of draft and mark it **Ready for review**.

In short: the issue says _what_, the branch holds _how_, the draft PR shows
_progress_, and "ready for review" means _done_.

### Commits

- Use atomic commits with clear, descriptive messages
- Write commit messages in imperative mood: "Add feature" not "Added feature"
- Include issue or ticket references when applicable (e.g., `refs #123`)
- Keep commits logically grouped; avoid mixing unrelated changes

## Code Standards

### Framework & Language

- **Primary Framework**: SvelteKit with TypeScript
- **Deployment**: Cloudflare Pages with Wrangler
- **Package Manager**: npm
- **Testing**: Vitest for unit tests

### Code Style

- **Formatting**: 2 spaces indentation, semicolons required, single quotes for
  strings
- **TypeScript**: Strict mode enabled; explicit return types on all functions;
  use App namespace types
- **Naming Conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for components, stores, and classes
  - `UPPER_SNAKE_CASE` for constants and environment variables
- **Imports**: ES6 imports; organize by:
  1. SvelteKit imports (`import { ... } from '$app/...'`)
  2. External/third-party libraries
  3. Internal modules (relative paths)

### File Structure

Follow SvelteKit conventions:

- `src/routes/` - Route components and layouts
- `src/lib/` - Reusable components and utilities
- `src/stores/` - Svelte stores
- `src/types/` - TypeScript type definitions
- `tests/` - Test files (mirror src/ structure)

### Components

- Use `.svelte` file extension
- Declare props with `export let` statements at the top
- Use `$:` reactive statements for computed values
- Keep components focused and reusable
- Document component props with JSDoc comments

### Error Handling

- Use SvelteKit's error pages (create `+error.svelte` in routes)
- Wrap async operations in try/catch blocks
- Return meaningful error messages to users
- Log errors appropriately for debugging

### Documentation & Comments

- Use JSDoc for public APIs and exported functions/components
- Write comments for complex logic or non-obvious decisions
- Avoid obvious comments on simple code
- Keep README and docs up to date with API changes

## Browser API Restrictions

**NEVER use native browser dialogs:**

- **prompt()** → Use `promptStore.show()` from `$lib/stores/prompt`
- **alert()** → Use `toastStore` from `$lib/stores/toast`
- **confirm()** → Use `confirmStore.show()` from `$lib/stores/confirm`

See `.github/copilot-instructions.md` for detailed usage examples.

## Integration Notes

- **GitHub Copilot**: Uses this file as context; maintain clear, structured
  guidelines
- **Amp**: References this file for code style and command conventions; keep
  examples accurate and tested
- Both agents follow the code standards above; consistency across
  agent-generated code is prioritized
