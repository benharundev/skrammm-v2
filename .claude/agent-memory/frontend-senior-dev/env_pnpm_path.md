---
name: env-pnpm-path
description: pnpm is not on PATH in non-login shells; absolute path and a wrapper are needed for shadcn
metadata:
  type: reference
---

In this sandbox/agent shell, `pnpm` is NOT on PATH (only node/npm from /opt/homebrew/bin). The real pnpm launcher is at `/Users/adib/Library/pnpm/bin/pnpm`, but that launcher resolves its target via a path relative to its own location, so a plain symlink breaks it.

**How to apply:** To run pnpm in a Bash tool call, either invoke `/Users/adib/Library/pnpm/bin/pnpm` directly, or use the wrapper script created at `/opt/homebrew/bin/pnpm` that execs `/Users/adib/Library/pnpm/global/v11/d80e-19e9a5214a6/node_modules/@pnpm/exe/pnpm`. The wrapper is required for `shadcn add`, which internally does `spawn pnpm` to install Radix deps and fails with ENOENT if pnpm is not resolvable on PATH.
