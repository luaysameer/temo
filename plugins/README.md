# Plugins

This repo is set up as a local Claude Code plugin marketplace with two vendored plugins:

- **code-review** — runs `/code-review` to automatically review a pull request with multiple agents, filtered by confidence score. See [plugins/code-review/README.md](code-review/README.md).
- **ponytail** — "lazy senior dev" mode that pushes Claude toward the simplest working solution (YAGNI, stdlib first). Adds session hooks and `/ponytail*` skills. See [plugins/ponytail/README.md](ponytail/README.md).

## Install

From a Claude Code session in this repo:

```
/plugin marketplace add .
/plugin install code-review@temo-plugins
/plugin install ponytail@temo-plugins
```

Note: `ponytail` registers a `SessionStart`/`SubagentStart`/`UserPromptSubmit` hook (`plugins/ponytail/hooks/claude-codex-hooks.json`) that runs local Node scripts to inject its ruleset automatically. Review `plugins/ponytail/hooks/` before installing if that's unwanted.
