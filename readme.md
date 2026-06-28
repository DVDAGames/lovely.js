# Lovely.js

Patched LÖVE web runtime bundles for [Lovely](https://github.com/DVDAGames/lovely).

Lovely.js no longer treats the old `love.js` npm CLI as the product. It is the
runtime-builder side of the Lovely toolchain: it packages browser runtime
artifacts that the Lovely CLI can verify, cache, and copy into web builds.

## Prior Art

This project builds on the earlier `love.js` ecosystem. The immediate upstream
was [Davidobot/love.js](https://github.com/Davidobot/love.js), which modernized
the original [TannerRogalsky/love.js](https://github.com/TannerRogalsky/love.js)
work for newer LÖVE and Emscripten versions.

Those projects made LÖVE-on-the-web practical. Lovely.js continues from that
foundation because the earlier repositories appear inactive and the Lovely
ecosystem needs a maintained runtime bundle pipeline.

The modern Lovely.js code is MIT licensed by DVDA Games. Inherited `love.js`
notices are preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Build

```sh
npm test
npm run build
```

The build currently repackages the inherited prebuilt LÖVE 11.5/Emscripten
2.0.0 artifacts from `src/compat` and `src/release` into runtime bundles:

```text
dist/web-compat
dist/web-threaded
```

Each output includes a `lovely-runtime.json` manifest with file checksums.
The bundle also includes a default `index.html` template and Lovely-owned
browser support files: `lovely-game-loader.js` for direct `game.love` loading
and `lovely-web-shims.js` for canvas, fullscreen, resize, and text-input
helpers.

## Runtime Variants

`web-compat` is the default Itch.io target. It avoids pthreads and does not
require cross-origin isolation headers.

`web-threaded` uses the threaded runtime and requires hosts to serve the page
with:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Repo Responsibilities

Lovely.js owns:

- patched LÖVE web runtime artifacts,
- runtime manifests and checksums,
- runtime build/release automation,
- browser/runtime patches needed by Lovely games.
- web loader and browser compatibility shims.

Lovely owns:

- game archive creation,
- web HTML generation,
- game data packaging,
- Itch/desktop publishing workflows,
- runtime resolution and cache verification.

See [docs/runtime-contract.md](docs/runtime-contract.md) for the bundle
contract between the two repositories.
