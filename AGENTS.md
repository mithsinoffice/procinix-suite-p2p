# AI / agent context

- **Universal UI rules (edit here for humans):** [docs/universal-ui-rules.md](docs/universal-ui-rules.md)
- **Shared form styles in code:** `src/components/ui/formTokens.ts` — add variants here when standards evolve.
- **Cursor auto-loaded rule:** `.cursor/rules/procinix-universal-ui.mdc` (`alwaysApply: true`) — update when the doc changes so tooling stays aligned.
- **Master bulk parity rule:** `.cursor/rules/master-bulk-sync.mdc` (`alwaysApply: true`) — when any master field changes, update `masterSchemaRegistry`, bulk upload/template mapping, validation, and download/export together in the same task.
