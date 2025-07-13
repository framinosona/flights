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
    adaptToDeviceRatio: true, // Better for high-DPI displays
    antialias: true, // Enable antialiasing
    powerPreference: "high-performance", // Request high-performance GPU
  });
  // Validate engine creation
  if (!window.engine) {
    throw new Error("Engine creation failed - engine should not be null");
  }
}

function initRenderLoop() {
  window.engine.runRenderLoop(function () {
    if (window.scene && window.scene.activeCamera) {
      window.scene.render();
    }
  });
}

/**
 * Creates and configures the main scene with lighting and camera
 */
function initScene() {
  window.scene ||= new BABYLON.Scene(window.engine);
  // Validate scene creation
  if (!window.scene) {
    throw new Error("Scene creation failed - scene should not be null");
  }
  console.log("🔧 ✅ Scene created successfully");
  window.scene.ambientColor = BABYLON.Color3.FromHexString("#333344"); // Reduced ambient light for more realistic look
  window.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Ensure solid black background

  // Performance optimizations (but keep auto-clear enabled for proper background)
  window.scene.freezeActiveMeshes(); // Optimize rendering for static meshes
  window.scene.autoClear = true; // Enable automatic clearing for proper background
  window.scene.autoClearDepthAndStencil = true;
  console.log("🔧 ✅ Scene properties configured");
}

/**
 * Creates and configures the main scene with lighting and camera
 */
function initCamera() {
  var initCameraPosition = new BABYLON.Vector3(-1.949, 1.861, -0.225); // Europe centric position
  window.camera ||= new BABYLON.ArcRotateCamera(
    "camera1",
    0,
    0,
    0,
    BABYLON.Vector3.Zero(), // Look at the center of the Earth
    window.scene
  );

  // Validate camera creation
  if (!window.camera) {
    throw new Error("Camera creation failed - camera should not be null");
  }
  window.camera.setPosition(initCameraPosition);
  console.log("🎥 ✅ Camera created at position:", window.camera.position);
  window.camera.lowerRadiusLimit = 1.05;
  window.camera.upperRadiusLimit = 3;
  window.camera.wheelDeltaPercentage = 0.01;
  window.camera.minZ = 0.01;
  window.camera.maxZ = 300; // Extended range to accommodate sun sphere at distance 100
  window.camera.attachControl(window.canvas, true);
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
    console.log("🔧 🚀 Starting application initialization...");

    // In this file :
    await tryInitializeAsync("🔧", "Engine Creation", initEngineAsync);
    await tryInitializeAsync("🔧", "Scene Creation", initScene);
    await tryInitializeAsync("🔄", "Render Loop", initRenderLoop);
    await tryInitializeAsync("🎥", "Camera Creation", initCamera);

    // PARALLEL PHASE 1: Independent visual systems (can run simultaneously)
    console.log("🔧 🚀 Starting parallel initialization of visual systems...");
    const visualSystemsPromises = [
      tryInitializeAsync("💡", "Lights", initializeLighting),
      tryInitializeAsync("☀️", "Sun", initSun),
      tryInitializeAsync("🌌", "Space", initializeSpaceEnvironment),
    ];

    const visualResults = await Promise.allSettled(visualSystemsPromises);

    // Log any failures but continue
    const visualEmojis = ["💡", "☀️", "🌌"];
    const visualLabels = ["Lights", "Sun", "Space"];
    visualResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.warn(`${visualEmojis[index]} ⚠️ ${visualLabels[index]} failed:`, result.reason);
      } else {
        console.log(`${visualEmojis[index]} ✅ ${visualLabels[index]} initialized successfully`);
      }
    });

    // PARALLEL PHASE 2: Data-heavy systems (Earth and Flights can load concurrently)
    console.log("🔧 🚀 Starting parallel initialization of data systems...");
    const dataSystemsPromises = [
      tryInitializeAsync("🌍", "Earth", initializeEarth),
      tryInitializeAsync("🔧", "Flights", initializeFlights),
    ];

    const dataResults = await Promise.allSettled(dataSystemsPromises);

    // Handle data system results
    const dataEmojis = ["🌍", "✈️"];
    const dataLabels = ["Earth", "Flights"];
    dataResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`${dataEmojis[index]} ❌ ${dataLabels[index]} failed:`, result.reason);
      } else {
        console.log(`${dataEmojis[index]} ✅ ${dataLabels[index]} initialized successfully`);
      }
    });

    console.log("🚀 ✅ Application initialized successfully!");
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
    // Dispose sun resources first
    if (typeof window.disposeSun === "function") {
      window.disposeSun();
    }

    if (window.scene) {
      window.scene.dispose();
      window.scene = null;
      console.log("🔧 ✅ Scene disposed");
    }

    if (window.engine) {
      window.engine.dispose();
      window.engine = null;
      console.log("🔧 ✅ Engine disposed");
    }
    console.log("🔧 ✅ All resources cleaned up");
  } catch (error) {
    console.error("🔧 ❌ Error during cleanup:", error);
  }
}

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
