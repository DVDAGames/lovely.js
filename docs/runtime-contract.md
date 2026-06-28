# Lovely.js Runtime Contract

Lovely.js produces versioned web runtime bundles for the Lovely CLI. It does
not package individual games. Game packaging belongs in Lovely so LÖVE projects
can build web releases with one command and without Node/npm setup.

## Bundle Layout

`npm run build` writes:

```text
dist/
  web-compat/
    love.js
    love.wasm
    theme/
    lovely-runtime.json
  web-threaded/
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

## Current Loader Contract

The inherited runtime expects an Emscripten preload package:

```text
game.js
game.data
```

The old `love.js` npm CLI generated those files. During migration, Lovely
should reimplement that packager behavior in Rust and this repo should only
ship engine/runtime files.

Legacy `love.js` distribution surfaces such as the npm CLI, generated sample
output, manual spec app, and hardcoded rebuild scripts have been removed from
this repository. They were not part of the current runtime bundle contract and
were not exercised by CI.

The later, cleaner contract is for the runtime to load `game.love` directly:

```text
game.love
love.js
love.wasm
```

That direct `.love` loader is the preferred end state, but it should be done as
a focused runtime patch after the bundle/release pipeline is stable.

## Migration Priorities

1. Keep the current LÖVE 11.5/Emscripten 2.0.0 output as the baseline bundle.
2. Add CI packaging and checksum manifests.
3. Move game packaging out of this repo and into Lovely.
4. Patch runtime issues: `Module.getMemory`, IDBFS safety, resize/fullscreen,
   mobile text input, shader compatibility, and Lua 5.2 compatibility helpers.
5. Upgrade Emscripten only when the baseline bundle is reproducible.
