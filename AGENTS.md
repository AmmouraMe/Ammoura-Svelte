# Agent Guidelines

Guidelines for AI agents (Amp, GitHub Copilot, etc.) working on this codebase.

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

### Git Workflow

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
