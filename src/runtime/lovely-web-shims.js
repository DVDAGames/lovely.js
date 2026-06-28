"use strict";

// Browser-side compatibility helpers for LÖVE web runtimes.
// These are runtime-agnostic: if the active runtime exposes matching hooks,
// Lovely uses them; otherwise the helpers degrade into ordinary DOM behavior.
(function installLovelyWeb(global) {
  const minimumCanvasSize = 1;
  const hiddenInputSize = "1px";
  const mobileFontSize = "16px";
  const fullscreenZIndex = "9999";
  const keyboardEventCodePoint = 0;
  let mobileInput = null;
  let textInputActive = false;
  let touchListener = null;
  let resizeObserver = null;

  function isMobileDevice() {
    return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/u.test(navigator.userAgent);
  }

  function canvasById(canvasId) {
    return document.getElementById(canvasId || "canvas");
  }

  function containerById(containerId, canvas) {
    return document.getElementById(containerId || "game-container")
      || (canvas && canvas.parentElement)
      || document.body;
  }

  function createMobileTextInput(canvasId) {
    if (mobileInput) {
      return mobileInput;
    }

    mobileInput = document.createElement("input");
    mobileInput.type = "text";
    mobileInput.autocapitalize = "none";
    mobileInput.autocomplete = "off";
    mobileInput.autocorrect = "off";
    mobileInput.spellcheck = false;
    mobileInput.style.position = "fixed";
    mobileInput.style.left = "0";
    mobileInput.style.top = "0";
    mobileInput.style.width = hiddenInputSize;
    mobileInput.style.height = hiddenInputSize;
    mobileInput.style.opacity = "0";
    mobileInput.style.fontSize = mobileFontSize;
    mobileInput.style.pointerEvents = "none";
    document.body.appendChild(mobileInput);

    mobileInput.addEventListener("input", event => {
      const canvas = canvasById(canvasId);
      if (!canvas || !event.data) {
        return;
      }
      const keyCode = event.data.codePointAt(keyboardEventCodePoint);
      canvas.dispatchEvent(new KeyboardEvent("keypress", {
        key: event.data,
        code: event.data,
        charCode: keyCode,
        keyCode,
        which: keyCode,
        bubbles: true,
      }));
      mobileInput.value = "";
    });

    return mobileInput;
  }

  function startTextInput(canvasId) {
    const canvas = canvasById(canvasId);
    if (!canvas) {
      return;
    }
    createMobileTextInput(canvasId);
    textInputActive = true;

    if (!isMobileDevice() || touchListener) {
      return;
    }

    touchListener = function focusMobileInput() {
      if (textInputActive && mobileInput) {
        mobileInput.focus();
      }
    };
    canvas.addEventListener("touchstart", touchListener, { passive: true });
  }

  function stopTextInput(canvasId) {
    const canvas = canvasById(canvasId);
    textInputActive = false;
    if (mobileInput) {
      mobileInput.blur();
    }
    if (canvas && touchListener) {
      canvas.removeEventListener("touchstart", touchListener);
    }
    touchListener = null;
  }

  function resizeCanvas(canvasId, containerId) {
    const canvas = canvasById(canvasId);
    if (!canvas) {
      return;
    }
    const container = containerById(containerId, canvas);
    const bounds = container.getBoundingClientRect();
    const width = Math.max(minimumCanvasSize, Math.floor(bounds.width || canvas.clientWidth || canvas.width));
    const height = Math.max(minimumCanvasSize, Math.floor(bounds.height || canvas.clientHeight || canvas.height));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      if (
        global.Module
        && global.Module.canvas === canvas
        && typeof global.Module.setCanvasSize === "function"
      ) {
        try {
          global.Module.setCanvasSize(width, height);
        } catch (error) {
          console.warn("LovelyWeb resize: Module.setCanvasSize failed", error);
        }
      }
      window.dispatchEvent(new UIEvent("resize"));
    }
  }

  function install(options) {
    const resolvedOptions = options || {};
    const canvasId = resolvedOptions.canvasId || "canvas";
    const containerId = resolvedOptions.containerId || "game-container";
    const canvas = canvasById(canvasId);
    if (!canvas) {
      return;
    }

    global.SDL_StartTextInput = global.SDL_StartTextInput || function globalStartTextInput() {
      startTextInput(canvasId);
    };
    global.SDL_StopTextInput = global.SDL_StopTextInput || function globalStopTextInput() {
      stopTextInput(canvasId);
    };

    window.addEventListener("resize", function handleResize() {
      resizeCanvas(canvasId, containerId);
    });
    document.addEventListener("fullscreenchange", function handleFullscreenChange() {
      resizeCanvas(canvasId, containerId);
    });

    if ("ResizeObserver" in global) {
      resizeObserver = new ResizeObserver(function handleObservedResize() {
        resizeCanvas(canvasId, containerId);
      });
      resizeObserver.observe(containerById(containerId, canvas));
    }

    resizeCanvas(canvasId, containerId);
  }

  function toggleFullscreen(containerId, canvasId) {
    const canvas = canvasById(canvasId);
    const container = containerById(containerId, canvas);
    if (isMobileDevice() && canvas) {
      const active = canvas.style.position === "fixed";
      canvas.style.position = active ? "" : "fixed";
      canvas.style.inset = active ? "" : "0";
      canvas.style.width = active ? "" : "100vw";
      canvas.style.height = active ? "" : "100vh";
      canvas.style.maxWidth = active ? "" : "none";
      canvas.style.maxHeight = active ? "" : "none";
      canvas.style.zIndex = active ? "" : fullscreenZIndex;
      document.body.style.overflow = active ? "" : "hidden";
      resizeCanvas(canvasId, containerId);
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (container.requestFullscreen) {
      container.requestFullscreen();
    }
  }

  global.LovelyWeb = {
    install,
    resizeCanvas,
    startTextInput,
    stopTextInput,
    toggleFullscreen,
  };
})(window);
