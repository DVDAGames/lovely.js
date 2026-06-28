"use strict";

// Lovely-owned compatibility loader for the inherited Emscripten/LÖVE runtime.
// Load this before love.js. It fetches game.love and mounts it into the runtime
// filesystem during preRun so Module.arguments can remain ["./game.love", ...].
(function installLovelyGameLoader(global) {
  const defaultGameUrl = "game.love";
  const defaultMountPath = "/game.love";
  const rootDirectory = "/";
  const dependencyName = "lovely-game";
  const statusDownloading = "Downloading game...";
  const statusMounting = "Mounting game...";

  function moduleObject() {
    global.Module = global.Module || {};
    return global.Module;
  }

  function config() {
    return global.LovelyRuntime || {};
  }

  function gameUrl() {
    const runtimeConfig = config();
    const module = moduleObject();
    return runtimeConfig.game || module.lovelyGame || defaultGameUrl;
  }

  function mountPath() {
    const runtimeConfig = config();
    const module = moduleObject();
    return runtimeConfig.mountPath || module.lovelyMountPath || defaultMountPath;
  }

  function splitMountPath(value) {
    const normalized = value.startsWith("/") ? value : `/${value}`;
    const lastSlash = normalized.lastIndexOf("/");
    return {
      directory: normalized.slice(0, Math.max(1, lastSlash)),
      file: normalized.slice(lastSlash + 1) || defaultGameUrl,
    };
  }

  function ensureDirectory(module, directory) {
    if (directory === rootDirectory) {
      return;
    }

    const parts = directory.split("/").filter(Boolean);
    let current = rootDirectory;
    for (const part of parts) {
      try {
        module.FS_createPath(current, part, true, true);
      } catch (error) {
        if (!String(error).includes("File exists")) {
          throw error;
        }
      }
      current = `${current === rootDirectory ? "" : current}/${part}`;
    }
  }

  function setStatus(module, status) {
    if (typeof module.setStatus === "function") {
      module.setStatus(status);
    }
  }

  function printError(module, error) {
    const printer = module.printErr || global.console.error.bind(global.console);
    printer(error);
  }

  async function fetchGame(module) {
    setStatus(module, statusDownloading);
    const response = await global.fetch(gameUrl(), { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${gameUrl()}: ${response.status} ${response.statusText}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  function mountGame(module, bytes) {
    setStatus(module, statusMounting);
    const target = splitMountPath(mountPath());
    ensureDirectory(module, target.directory);
    module.FS_createDataFile(target.directory, target.file, bytes, true, true, true);
  }

  function install() {
    const module = moduleObject();
    module.preRun = module.preRun || [];
    module.preRun.push(function preloadLovelyGame() {
      module.addRunDependency(dependencyName);
      fetchGame(module)
        .then(bytes => {
          mountGame(module, bytes);
          module.removeRunDependency(dependencyName);
        })
        .catch(error => {
          printError(module, error);
          setStatus(module, "Could not load game.love - see the browser console.");
        });
    });
  }

  install();

  global.LovelyGameLoader = {
    install,
  };
})(window);
