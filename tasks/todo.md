# Readability cleanup

- [x] Goal: make application code readable without changing behavior
- [x] Locate hard-to-read source files and existing project patterns
- [x] Reformat JSX, CSS, HTML, and dense domain expressions
- [x] Run tests and production build
- [x] Record results

## Acceptance criteria

- Application behavior and styling remain unchanged.
- Dense one-line JSX and CSS are consistently formatted.
- Tests and production build pass.

## Working notes

- No formatter is installed; avoid adding a dependency for a one-time cleanup.
- Keep Firebase and project configuration unchanged because they are already readable.

## Results

- Formatted application JSX, JavaScript, CSS, tests, and the static design mockup.
- Split dense declarations and control flow; consolidated duplicate schedule form CSS.
- Verified with `pnpm test`, `pnpm build`, and `git diff --check`.
