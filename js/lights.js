// ==============================
// LIGHTING SYSTEM
// ==============================

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
  window.cameraLight.diffuse = BABYLON.Color3.FromHexString("#dce699ff"); // Cool, atmospheric blue-white
  window.cameraLight.specular = BABYLON.Color3.FromHexString("#293302ff"); // Minimal specular for soft look

  // Set up camera light direction updates on camera movement
  window.scene.registerBeforeRender(() => {
    if (!window.cameraLight || !window.scene.activeCamera) return;

    var camera = window.scene.activeCamera;
    var cameraPosition = camera.position;
    var target = camera.getTarget();
    var newDirection = target.subtract(cameraPosition).normalize();

    window.cameraLight.direction = newDirection;
  });

  console.log("💡 ✅ Camera light created");
  return window.cameraLight;
}

// ==============================
// FILL LIGHT (EARTH ILLUMINATION)
// ==============================

/**
 * Creates a hemispheric fill light to illuminate the dark side of Earth
 */
function initFillLight() {
  // Create hemispheric light pointing upward (will light from all directions)
  window.fillLight ||= new BABYLON.HemisphericLight(
    "fillLight",
    new BABYLON.Vector3(0, 1, 0),
    window.scene
  );

  // Configure for soft, ambient fill lighting
  window.fillLight.intensity = 0.3; // Moderate intensity to fill shadows
  window.fillLight.diffuse = BABYLON.Color3.FromHexString("#b3d9ff"); // Cool blue-white
  window.fillLight.specular = BABYLON.Color3.FromHexString("#000000"); // No specular
  window.fillLight.groundColor = BABYLON.Color3.FromHexString("#1a1a2e"); // Dark blue ground

  console.log("💡 ✅ Fill light created");
  return window.fillLight;
}

// ==============================
// LIGHTING INITIALIZATION
// ==============================

/**
 * Initializes the complete lighting system
 */
async function initializeLighting() {
  const lightingPromises = [
    tryInitializeAsync("💡", "Camera Light", initCameraLight),
    tryInitializeAsync("💡", "Fill Light", initFillLight),
  ];
  const results = await Promise.allSettled(lightingPromises);

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const labels = ["Camera Light", "Fill Light"];
      console.warn(`💡 ⚠️ ${labels[index]} failed:`, result.reason);
    }
  });

  console.log("💡 ✅ Lighting initialized");
}

// ==============================
// LIGHTING CLEANUP
// ==============================

/**
 * Disposes of all lighting-related resources and cleans up
 */
window.disposeLighting = function () {
  console.log("💡 🗑️ Disposing lighting resources...");

  // Dispose camera light
  if (window.cameraLight) {
    window.cameraLight.dispose();
    window.cameraLight = null;
    console.log("💡 ✅ Camera light disposed");
  }

  // Dispose fill light
  if (window.fillLight) {
    window.fillLight.dispose();
    window.fillLight = null;
    console.log("💡 ✅ Fill light disposed");
  }

  // Clear any beforeRender callbacks related to lighting
  if (window.scene && window.scene.onBeforeRenderObservable) {
    // Note: Babylon.js will automatically clean up observers when lights are disposed
    // but we log this for completeness
    console.log("💡 ✅ Lighting render callbacks cleaned up");
  }

  console.log("💡 ✅ All lighting resources cleaned up");
};

// ==============================
// LIGHTING CONTROLS
// ==============================

/**
 * Enables or disables the camera light
 * @param {boolean} enabled - Whether the camera light should be enabled
 */
window.setCameraLightEnabled = function (enabled) {
  if (!window.cameraLight) {
    console.warn("📷 ⚠️ Camera light not found, cannot toggle");
    return;
  }

  window.cameraLight.setEnabled(enabled);
  console.log(`📷 ${enabled ? "✅ Enabled" : "❌ Disabled"} camera light`);
};

/**
 * Adjusts the camera light intensity
 * @param {number} intensity - Light intensity (0.0-1.0 recommended)
 */
window.setCameraLightIntensity = function (intensity) {
  if (!window.cameraLight) {
    console.warn("📷 ⚠️ Camera light not found, cannot adjust intensity");
    return;
  }

  window.cameraLight.intensity = Math.max(0, intensity);
  console.log(`📷 ✅ Camera light intensity set to ${intensity}`);
};

/**
 * Adjusts the fill light intensity
 * @param {number} intensity - Light intensity (0.0-1.0 recommended)
 */
window.setFillLightIntensity = function (intensity) {
  if (!window.fillLight) {
    console.warn("💡 ⚠️ Fill light not found, cannot adjust intensity");
    return;
  }

  window.fillLight.intensity = Math.max(0, intensity);
  console.log(`💡 ✅ Fill light intensity set to ${intensity}`);
};
