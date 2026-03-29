# esp-template

A minimal template project showing how to use [`@graysonlang/esp`](https://github.com/graysonlang/esp) in an independent repo, with matching VS Code configuration for building and debugging.

## What this is

`esp` is a set of esbuild plugins and a build runner designed to streamline frontend development. This repo is the starting point for a new esp-based project, and doubles as a check that esp's example configuration and VS Code integration work correctly outside of the esp repo itself — i.e., as a real consumer would use it.

## Using this as a template

This repo is a GitHub template — click **Use this template** to start a new project from it, or clone it directly. There is no scaffolding CLI and no prompts; everything that can be a dependency lives in `esp`, so the checked-in surface is small enough to adjust by hand.

After creating your repo, edit [package.json](package.json):

- `name`, `version`, `description`, `homepage`, `bugs.url`, `repository.url` — point these at your project
- keep `private: true` unless you actually intend to publish

Leave `config.esp_dev_cert_name` alone — it names the shared esp local development certificate used by the `https` scripts, not anything specific to this project.

Then replace [app/](app/) and [src/](src/) with your own sources, updating `entryPoints` in [scripts/build.mjs](scripts/build.mjs) to match. The VS Code workspace file is [main.code-workspace](main.code-workspace) — deliberately generic, so there is nothing to rename.

Ports are derived from the absolute path of `scripts/build.mjs`, so every clone and worktree gets its own http/https/debug ports and two of them never collide — there is nothing to configure. Run `npm run ports` to see the ones for your checkout.

## Output directory convention

Two output directories, with fixed meanings across esp-based projects:

- **`www/`** — the built web content: the demo/app page, what the dev server serves and what deploys to GitHub Pages. This is what `scripts/build.mjs` emits, and it is never published to npm.
- **`dist/`** — the source distribution: a packaged library bundle plus type declarations, pointed at by `main`/`types`/`exports` and listed in `files`. Emitted by a separate `scripts/dist.mjs` using esbuild and `tsc` directly, not by esp's runner.

This template only produces `www/`, since it is an app rather than a library. `dist/` is gitignored anyway so that adding a library build later needs no other changes — the two never contend for the same directory.

## GitHub Pages

[.github/workflows/pages.yml](.github/workflows/pages.yml) builds `www/` and deploys it to GitHub Pages, but it is **off by default** — a repo created from this template will not try to publish, and will not fail CI, until you ask it to.

To publish, first point Pages at Actions once: **Settings → Pages → Build and deployment → Source → GitHub Actions**. The default there is branch-based, which this workflow cannot deploy to.

Then either publish on demand — **Actions → Deploy to GitHub Pages → Run workflow** — or deploy on every push to `main` by adding an Actions variable (**Settings → Secrets and variables → Actions → Variables → New repository variable**):

| Name | Value |
| --- | --- |
| `ENABLE_PAGES` | `true` |

Without the variable, pushes skip the job — a neutral result rather than a failed run. Manual runs work either way.

## Build info

[scripts/build.mjs](scripts/build.mjs) substitutes two constants at build time via esbuild's `define`: `__APP_VERSION__` (from `package.json`) and `__COMMIT_SHA__` (`git rev-parse --short HEAD`, falling back to `GITHUB_SHA` for detached CI checkouts, then `unknown`). [src/index.js](src/index.js) reads them and re-exports them as a frozen `buildInfo` object, so nothing outside that module touches the raw globals:

```js
import { buildInfo } from './src/index.js';
console.info(`${buildInfo.version} (${buildInfo.commit})`);
```

Because these are compile-time substitutions rather than runtime lookups, there is no `package.json` read and no `child_process` in the shipped bundle.

## Structure

- [scripts/build.mjs](scripts/build.mjs) — the build script, which wires up esp's `runBuild` runner with project-specific esbuild options (entry points, plugins, output directory, etc.)
- [app/main.js](app/main.js) — the app entry point
- [src/index.js](src/index.js) — the library entry point, exporting `buildInfo` (see below)
- [.vscode/tasks.json](.vscode/tasks.json) — VS Code tasks that invoke the `vscode:build` and `vscode:debug` npm scripts, with a custom problem matcher to surface esbuild errors and warnings inline in the editor
- [.vscode/launch_template.json](.vscode/launch_template.json) — source of truth for the VS Code launch configurations that attach Chrome to the dev server with source maps, using the debug tasks as `preLaunchTask`. The runner renders it to `.vscode/launch.json` (gitignored, since the ports are per-checkout) on `npm install` and on every serve/watch; render it by hand with `npm run sync:launch`

## Usage

Install dependencies:

```sh
npm install
```

**Build** (one-shot, minified):

```sh
npm run build
```

**Dev server** (watch mode, source maps, auto-launches browser):

```sh
npm run dev
```

**VS Code** — open the workspace (`main.code-workspace`), then use the default build task (`Cmd+Shift+B`) to build, or launch "Debug in Chrome" from the Run and Debug panel to start the dev server and attach the debugger.

## VS Code integration notes

The tasks in [.vscode/tasks.json](.vscode/tasks.json) use a `background` problem matcher that watches for the `[esbuild-ready]` sentinel line emitted by esp's dev server, which tells VS Code when the initial build is complete and the browser can be launched. The "Kill debug server" task tears down the watch process when the debug session ends.
