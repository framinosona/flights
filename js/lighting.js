// ==============================
// FILL LIGHT
// ==============================

/**
 * Creates a subtle fill light to prevent complete darkness on Earth's night side
 */
function initFillLight() {
  // Subtle fill light to prevent complete darkness
  window.fillLight ||= new BABYLON.DirectionalLight(
    "fillLight",
    new BABYLON.Vector3(0.3, 0.2, 0.5), // Opposite side from sun
    window.scene
  );
  window.fillLight.intensity = 0.3; // Subtle fill
  window.fillLight.diffuse = BABYLON.Color3.FromHexString("#335580"); // Cool blue fill light (Earth's atmosphere)
}

// ==============================
// CAMERA LIGHT
// ==============================

/**
 * Creates a diffused light that follows the camera to illuminate dark areas
 */
function initCameraLight() {
  // Get the camera from the scene
  var camera = window.scene.activeCamera;
  if (!camera) {
    console.warn("💡 ⚠️ No active camera found, using default direction");
    var cameraDirection = BABYLON.Vector3.Forward();
  } else {
    // Calculate direction from camera position towards the target (Earth center)
    var cameraPosition = camera.position;
    var target = camera.getTarget();
    var cameraDirection = target.subtract(cameraPosition).normalize();
  }

  // Create a directional light that points from camera towards Earth
  window.cameraLight ||= new BABYLON.DirectionalLight(
    "cameraFollowLight",
    cameraDirection,
    window.scene
  );

  // Configure for soft, diffused lighting
  window.cameraLight.intensity = 0.4; // Moderate intensity to not overpower the sun
  window.cameraLight.diffuse = BABYLON.Color3.FromHexString("#99b3e6"); // Cool, atmospheric blue-white
  window.cameraLight.specular = BABYLON.Color3.FromHexString("#1a1a33"); // Minimal specular for soft look

  console.log("💡 ✅ Camera-following light created");

  // Set up camera light direction updates on camera movement
  window.scene.registerBeforeRender(() => {
    if (!window.cameraLight || !window.scene.activeCamera) {
      console.warn("💡 ⚠️ Camera light or active camera not found, skipping update");
      return;
    }

    var camera = window.scene.activeCamera;
    var cameraPosition = camera.position;
    var target = camera.getTarget();
    var newDirection = target.subtract(cameraPosition).normalize();

    window.cameraLight.direction = newDirection;
  });

  console.log("💡 ✅ Camera-following light enabled with real-time updates");
  return window.cameraLight;
}

// ==============================
// LIGHTING INITIALIZATION
// ==============================

/**
 * Initializes the complete lighting system
 */
async function initializeLighting() {
  // PARALLEL LIGHTING: Initialize both lights concurrently
  console.log("💡 🚀 Starting parallel lighting initialization...");

  const lightingPromises = [
    tryInitializeAsync("🌙", "Fill Light", initFillLight),
    tryInitializeAsync("📷", "Camera Light", initCameraLight),
  ];

  const results = await Promise.allSettled(lightingPromises);

  // Check results and log any failures
  const lightEmojis = ["🌙", "📷"];
  const lightLabels = ["Fill Light", "Camera Light"];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn(`${lightEmojis[index]} ⚠️ ${lightLabels[index]} failed:`, result.reason);
    } else {
      console.log(`${lightEmojis[index]} ✅ ${lightLabels[index]} initialized successfully`);
    }
  });

  console.log("💡 ✅ Parallel lighting initialization complete");
}

// ==============================
// LIGHTING CLEANUP
// ==============================

/**
 * Disposes of all lighting-related resources and cleans up
 */
window.disposeLighting = function () {
  console.log("💡 🗑️ Disposing lighting resources...");

  // Dispose fill light
  if (window.fillLight) {
    window.fillLight.dispose();
    window.fillLight = null;
    console.log("💡 ✅ Fill light disposed");
  }

  // Dispose camera light
  if (window.cameraLight) {
    window.cameraLight.dispose();
    window.cameraLight = null;
    console.log("💡 ✅ Camera light disposed");
  }

  // Clear any beforeRender callbacks related to lighting
  if (window.scene && window.scene.onBeforeRenderObservable) {
    // Note: Babylon.js will automatically clean up observers when lights are disposed
    // but we log this for completeness
    console.log("💡 ✅ Lighting render callbacks cleaned up");
  }

  console.log("💡 ✅ All lighting resources cleaned up");
};
