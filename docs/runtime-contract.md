# Lovely.js Runtime Contract

Lovely.js produces versioned web runtime bundles for the Lovely CLI. It does
not package individual games. Game packaging belongs in Lovely so LÖVE projects
can build web releases with one command and without Node/npm setup.

## Bundle Layout

`npm run build` writes:

```text
dist/
  web-compat/
    index.html
    lovely-game-loader.js
    lovely-web-shims.js
    love.js
    love.wasm
    theme/
    lovely-runtime.json
  web-threaded/
    index.html
    lovely-game-loader.js
    lovely-web-shims.js
    love.js
    love.wasm
    love.worker.js
    theme/
    lovely-runtime.json
```

`web-compat` is the default Itch.io target. It avoids pthreads and therefore
does not require cross-origin isolation headers. `web-threaded` is for hosts
that can provide `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`.

## Manifest

Each bundle includes `lovely-runtime.json`:

```json
{
  "schema": 1,
  "target": "web",
  "variant": "web-compat",
  "loveVersion": "11.5",
  "emscriptenVersion": "2.0.0",
  "channel": "love-11-plus",
  "html": "index.html",
  "loader": "lovely-game-loader.js",
  "shims": "lovely-web-shims.js",
  "entrypoint": "love.js",
  "wasm": "love.wasm",
  "worker": null,
  "files": [
    {
      "path": "love.js",
      "sha256": "..."
    }
  ]
}
```

Lovely should verify the manifest and file checksums before copying a runtime
bundle into a game build.

## Default HTML

Each runtime bundle includes a basic `index.html` template. Lovely should use
that template when a project does not configure `targets.web.html_template`.
Project templates remain supported, but the default browser shell belongs to
Lovely.js so runtime-owned files stay in one place.

The default template expects Lovely to render:

```text
__GAME_TITLE__
__WEB_ARGUMENTS__
__WEB_MEMORY__
```

`__WEB_ARGUMENTS__` should include `"./game.love"` followed by any configured
project arguments.

## Current Loader Contract

Lovely.js now ships `lovely-game-loader.js`, which should be loaded before
`love.js`. It fetches `game.love` and mounts it at `/game.love` during
Emscripten `preRun`, so the page can keep:

```js
window.Module.arguments = ["./game.love"];
```

Projects may set `window.LovelyRuntime.game` before loading the game loader to
use a different archive URL, or `window.LovelyRuntime.mountPath` to mount the
archive somewhere other than `/game.love`.

The inherited runtime originally expected an Emscripten preload package:

```text
game.js
game.data
```

The old `love.js` npm CLI generated those files. Lovely.js keeps that behavior
inside the runtime bundle instead of asking the Lovely CLI to synthesize
browser/runtime glue.

The cleaner contract is for the runtime bundle to load `game.love` directly:

```text
game.love
lovely-game-loader.js
lovely-web-shims.js
love.js
love.wasm
```

Legacy `love.js` distribution surfaces such as the npm CLI, generated sample
output, manual spec app, and hardcoded rebuild scripts have been removed from
this repository. They were not part of the current runtime bundle contract and
were not exercised by CI.

## Migration Priorities

1. Keep the current LÖVE 11.5/Emscripten 2.0.0 output as the baseline bundle.
2. Add CI packaging and checksum manifests.
3. Move game archive packaging out of this repo and into Lovely.
4. Patch runtime issues: `Module.getMemory`, IDBFS safety, resize/fullscreen,
   mobile text input, shader compatibility, and Lua 5.2 compatibility helpers.
5. Upgrade Emscripten only when the baseline bundle is reproducible.
