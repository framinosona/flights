// ==============================
// SCENE SETUP AND CORE BABYLON.JS FUNCTIONALITY
// ==============================

// Global variables
var canvas = document.getElementById("renderCanvas");

// Validate canvas element exists
if (!canvas) {
  console.error("🔧 ❌ Canvas element 'renderCanvas' not found!");
  throw new Error("Required canvas element is missing");
}

async function initEngineAsync() {
  window.engine ||= new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    disableWebGL2Support: false,
    adaptToDeviceRatio: true, // Enabled for better performance on high-DPI displays
    antialias: true,
    powerPreference: "high-performance",
    doNotHandleContextLost: true,
  });

  // Reduce resolution on high-DPI displays for better performance
  //window.engine.setHardwareScalingLevel(1.5); // 1.5 = render at ~67% resolution

  // Validate engine creation
  if (!window.engine) {
    throw new Error("Engine creation failed - engine should not be null");
  }

  console.log("🔧 ✅ Engine created with performance optimizations");
}

function initRenderLoop() {
  // Optional: Limit FPS to 30 for better performance (comment out for 60fps)
  const targetFPS = 30;
  const frameTime = 1000 / targetFPS;
  let lastFrameTime = performance.now();

  window.engine.runRenderLoop(function () {
    const now = performance.now();
    const elapsed = now - lastFrameTime;

    // Throttle to target FPS
    if (elapsed >= frameTime) {
      lastFrameTime = now - (elapsed % frameTime);

      if (window.scene && window.scene.activeCamera) {
        window.scene.render();
      }
    }
  });
}

/**
 * Creates and configures the main scene
 */
function initScene() {
  window.scene ||= new BABYLON.Scene(window.engine);
  // Validate scene creation
  if (!window.scene) {
    throw new Error("Scene creation failed");
  }

  window.scene.ambientColor = BABYLON.Color3.FromHexString("#333344");
  window.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

  // Performance optimizations
  window.scene.autoClear = true;
  window.scene.autoClearDepthAndStencil = true;
  window.scene.blockMaterialDirtyMechanism = true; // Prevent unnecessary material updates
  window.scene.skipPointerMovePicking = true; // Disable pointer move picking for performance
  window.scene.skipFrustumClipping = false; // Keep frustum culling enabled
  window.scene.useRightHandedSystem = false;

  // Reduce render targets and post-processing overhead
  window.scene.constantlyUpdateMeshUnderPointer = false;

  console.log("🔧 ✅ Scene created with performance optimizations");
}

// ==============================
// ERROR HANDLING UTILITIES
// ==============================

/**
 * Shows a user-friendly error message overlay
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showErrorMessage(title, message) {
  try {
    // Remove any existing error overlay
    const existingOverlay = document.getElementById("error-overlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Create error overlay
    const errorDiv = document.createElement("div");
    errorDiv.id = "error-overlay";
    errorDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(220, 53, 69, 0.95); color: white; padding: 20px;
            border-radius: 10px; font-family: Arial, sans-serif; text-align: center;
            z-index: 1000; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.2);
        `;

    errorDiv.innerHTML = `
            <h3 style="margin-top: 0; color: #fff;">🚫 ${title}</h3>
            <p style="margin: 10px 0; line-height: 1.4;">${message}</p>
            <button onclick="this.parentElement.remove()" style="
                background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);
                padding: 8px 16px; border-radius: 5px; cursor: pointer; margin-top: 10px;
                font-size: 14px;
            ">Close</button>
            <p style="margin-bottom: 0; font-size: 12px; opacity: 0.8; margin-top: 10px;">
                Check browser console for technical details.
            </p>
        `;

    document.body.appendChild(errorDiv);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (errorDiv && errorDiv.parentElement) {
        errorDiv.remove();
      }
    }, 10000);
  } catch (error) {
    console.error("❌ Error showing error message:", error);
    // Fallback to alert if DOM manipulation fails
    alert(`${title}: ${message}`);
  }
}

// ==============================
// APPLICATION INITIALIZATION
// ==============================
async function tryInitializeAsync(emoji, label, initFn) {
  if (typeof initFn === "function") {
    console.log(`${emoji} 🏗️ ${label} - Initializing...`);
    try {
      await initFn();
      console.log(`${emoji} ✅ ${label} - Initialization successful`);
    } catch (error) {
      console.error(`${emoji} ❌ ${label} - Initialization error:`, error);
      throw error;
    }
  } else {
    console.warn(`${emoji} ⚠️ ${label} - Function not found, skipping...`);
    return null;
  }
}

/**
 * Main initialization function that sets up the Babylon.js engine and scene
 * Handles engine creation, error recovery, and starts the render loop
 */
async function initFunction() {
  console.group("🚀 3D Flight Visualization - Initialization");

  try {
    // Core initialization
    await tryInitializeAsync("🔧", "Engine", initEngineAsync);
    await tryInitializeAsync("🔧", "Scene", initScene);
    await tryInitializeAsync("🔧", "Render Loop", initRenderLoop);
    await tryInitializeAsync("🎥", "Camera", initCamera);

    // PARALLEL PHASE 1: Independent visual systems
    const visualSystemsPromises = [
      tryInitializeAsync("💡", "Lights", initializeLighting),
      tryInitializeAsync("☀️", "Sun", initSun),
      tryInitializeAsync("🌌", "Space", initializeSpaceEnvironment),
    ];

    const visualResults = await Promise.allSettled(visualSystemsPromises);
    visualResults.forEach((result, index) => {
      const labels = ["Lights", "Sun", "Space"];
      if (result.status === "rejected") {
        console.warn(`⚠️ ${labels[index]} failed:`, result.reason);
      }
    });

    // PARALLEL PHASE 2: Data-heavy systems
    const dataSystemsPromises = [
      tryInitializeAsync("🌍", "Earth", initializeEarth),
      tryInitializeAsync("✈️", "Flights", initializeFlights),
    ];

    const dataResults = await Promise.allSettled(dataSystemsPromises);
    dataResults.forEach((result, index) => {
      const labels = ["Earth", "Flights"];
      if (result.status === "rejected") {
        console.error(`❌ ${labels[index]} failed:`, result.reason);
      }
    });

    console.log("🚀 ✅ Initialization complete");
  } catch (error) {
    console.error("🚀 ❌ Failed to initialize application:", error);

    // Display user-friendly error message
    showErrorMessage(
      "Initialization Failed",
      "The 3D visualization could not be started. Please refresh the page and try again."
    );

    throw error;
  }
}

// ==============================
// CLEANUP AND DISPOSAL
// ==============================

/**
 * Properly disposes of all Babylon.js resources
 */
function disposeScene() {
  try {
    console.log("🔧 🗑️ Starting comprehensive scene cleanup..."); // Dispose all module resources in dependency order
    // (Most dependent modules first, core modules last)

    if (typeof window.disposeFlights === "function") {
      window.disposeFlights();
    }

    if (typeof window.disposeSun === "function") {
      window.disposeSun();
    }

    if (typeof window.disposeEarth === "function") {
      window.disposeEarth();
    }

    if (typeof window.disposeTileProviders === "function") {
      window.disposeTileProviders();
    }

    if (typeof window.disposeLighting === "function") {
      window.disposeLighting();
    }

    if (typeof window.disposeSpace === "function") {
      window.disposeSpace();
    }

    // Dispose any remaining scene resources
    if (window.scene) {
      // Dispose any remaining meshes
      const remainingMeshes = window.scene.meshes.slice(); // Create copy
      let remainingDisposed = 0;
      remainingMeshes.forEach((mesh) => {
        if (mesh && !mesh.isDisposed()) {
          if (mesh.material) {
            if (mesh.material.diffuseTexture) {
              mesh.material.diffuseTexture.dispose();
            }
            mesh.material.dispose();
          }
          mesh.dispose();
          remainingDisposed++;
        }
      });

      if (remainingDisposed > 0) {
        console.log(`🔧 ✅ Disposed ${remainingDisposed} remaining meshes`);
      }

      // Dispose scene
      window.scene.dispose();
      window.scene = null;
      console.log("🔧 ✅ Scene disposed");
    }

    // Dispose engine
    if (window.engine) {
      window.engine.dispose();
      window.engine = null;
      console.log("🔧 ✅ Engine disposed");
    }

    console.log("🔧 ✅ All resources cleaned up successfully");
  } catch (error) {
    console.error("🔧 ❌ Error during cleanup:", error);
  }
}

/**
 * Master disposal function that can be called manually
 * Disposes all application resources in the correct order
 */
window.disposeAll = function () {
  console.log("🔧 🎯 Master disposal initiated...");
  disposeScene();
  console.log("🔧 🎯 Master disposal complete");
};

// ==============================
// EVENT HANDLERS
// ==============================

// Handle window resize events to maintain proper rendering
window.addEventListener("resize", function () {
  if (window.engine) {
    try {
      window.engine.resize();
      console.log("📐 ✅ Engine resized for new window dimensions");
    } catch (error) {
      console.warn("📐 ⚠️ Error during engine resize:", error);
    }
  }
});

// Handle visibility change to pause/resume rendering
document.addEventListener("visibilitychange", function () {
  if (window.engine) {
    if (document.hidden) {
      window.engine.stopRenderLoop();
      console.log("⏸️ Render loop paused (tab hidden)");
    } else {
      initRenderLoop();
      console.log("▶️ Render loop resumed (tab visible)");
    }
  }
});

// Handle page unload to cleanup resources
window.addEventListener("beforeunload", function () {
  console.log("🗑️ Cleaning up resources before page unload");
  disposeScene();
});

// Initialize the application and set up scene rendering
initFunction()
  .then(() => {
    console.log("🎬 ✅ Scene ready for rendering");
  })
  .catch((error) => {
    console.error("🚀 ❌ Application startup failed:", error);
  });
