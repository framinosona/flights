// ==============================
// LIGHTING SYSTEM
// ==============================

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
  await tryInitializeAsync("💡", "Fill Light", initFillLight);
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

  // Dispose fill light
  if (window.fillLight) {
    window.fillLight.dispose();
    window.fillLight = null;
    console.log("💡 ✅ Fill light disposed");
  }

  console.log("💡 ✅ All lighting resources cleaned up");
};

// ==============================
// LIGHTING CONTROLS
// ==============================

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
