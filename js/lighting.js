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
  window.fillLight.diffuse = new BABYLON.Color3(0.2, 0.3, 0.5); // Cool blue fill light (Earth's atmosphere)
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
    console.warn("📷 No active camera found, using default direction");
    var cameraDirection = new BABYLON.Vector3(0, 0, 1);
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
  window.cameraLight.diffuse = new BABYLON.Color3(0.6, 0.7, 0.9); // Cool, atmospheric blue-white
  window.cameraLight.specular = new BABYLON.Color3(0.1, 0.1, 0.2); // Minimal specular for soft look

  console.log("📷 Camera-following light created");

  // Set up camera light direction updates on camera movement
  window.scene.registerBeforeRender(() => {
    if (!window.cameraLight || !window.scene.activeCamera) {
      console.warn("📷 Camera light or active camera not found, skipping update");
      return;
    }

    var camera = window.scene.activeCamera;
    var cameraPosition = camera.position;
    var target = camera.getTarget();
    var newDirection = target.subtract(cameraPosition).normalize();

    window.cameraLight.direction = newDirection;
  });

  console.log("📷 Camera-following light enabled with real-time updates");
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
  console.log("🚀 Starting parallel lighting initialization...");

  const lightingPromises = [
    tryInitializeAsync("🌙 Fill Light", initFillLight),
    tryInitializeAsync("📷 Camera Light", initCameraLight),
  ];

  const results = await Promise.allSettled(lightingPromises);

  // Check results and log any failures
  const lightLabels = ["🌙 Fill Light", "📷 Camera Light"];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn(`⚠️ ${lightLabels[index]} failed:`, result.reason);
    } else {
      console.log(`✅ ${lightLabels[index]} initialized successfully`);
    }
  });

  console.log("✅ Parallel lighting initialization complete");
}
