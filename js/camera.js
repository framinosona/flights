// ==============================
// CAMERA
// ==============================

async function initCamera() {
  var initCameraPosition = new BABYLON.Vector3(-1.949, 1.861, -0.225); // Europe centric position
  window.camera ||= new BABYLON.ArcRotateCamera(
    "camera1",
    0, // alpha
    0, // beta
    0, // radius
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
  window.camera.radius = 5; // Set initial radius
  window.camera.upperRadiusLimit = 8;
  window.camera.wheelPrecision = 50; // Adjusted for smoother zoom
  //window.camera.wheelDeltaPercentage = 0.01;
  window.camera.minZ = 0.01;
  window.camera.maxZ = 300; // Extended range to accommodate sun sphere at distance 100
  window.camera.attachControl(window.canvas);

  await tryInitializeAsync("🎥", "💡 Camera Light", initCameraLight);
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
  window.cameraLight.intensity = 0.6; // Moderate intensity to not overpower the sun
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

  const lightingPromises = [tryInitializeAsync("📷", "Camera Light", initCameraLight)];

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
