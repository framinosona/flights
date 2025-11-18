// ==============================
// SUN VISUAL RENDERING
// ==============================

const sunDistance = 200; // Realistic distance from Earth center for visibility

function initSun() {
  var sunPosition = calculateSunPosition();
  console.log("☀️ 📊 Calculated sun position:", sunPosition);

  // Scale the sun position to a realistic astronomical distance for visibility
  var scaledSunPosition = sunPosition.scale(sunDistance);

  initSunSphere(scaledSunPosition);

  var sunDirection = sunPosition.normalize();
  sunDirection.scaleInPlace(-1);
  console.log(`☀️ 📊 Adjusted sun direction:`, sunDirection);
  initSunLight(scaledSunPosition, sunDirection);

  // Initialize volumetric light scattering effect
  initVolumetricLightScattering(scaledSunPosition);

  // Set up periodic updates
  window.sunUpdateInterval = setInterval(() => {
    var sunPosition = calculateSunPosition();
    // Scale the sun position to the same realistic distance
    var scaledSunPosition = sunPosition.scale(sunDistance);
    updateSunSphere(scaledSunPosition);

    var sunDirection = sunPosition.normalize();
    sunDirection.scaleInPlace(-1);
    updateSunLight(sunPosition, sunDirection);

    // Update volumetric light scattering position
    updateVolumetricLightScattering(scaledSunPosition);
  }, 15 * 60 * 1000); // Update every 15 minutes
  console.log("☀️ 🔄 Sun tracking set up with 15-minute intervals");
}

/**
 * Calculates the sun's position based on current date and time
 * @returns {BABYLON.Vector3} The sun's direction vector
 */
function calculateSunPosition() {
  console.log("☀️ 📊 Calculating sun position based on current time...");
  // Get current date and time
  var now = new Date();
  var dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  var totalDaysInYear = 365 + (now.getFullYear() % 4 === 0 ? 1 : 0); // Account for leap years

  // Calculate solar declination (Earth's tilt effect)
  var declination =
    23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / totalDaysInYear) * (Math.PI / 180);

  // Calculate hour angle based on current UTC time
  var utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  var hourAngle = (utcHours - 12) * 15 * (Math.PI / 180); // Convert to radians
  console.log(
    `☀️ 📊 Sun declination: ${declination.toFixed(4)} rad, Hour angle: ${hourAngle.toFixed(4)} rad`
  );

  // Calculate sun position in 3D space
  // Match the coordinate system used in flights.js where longitude is adjusted by -180°
  // - X axis points towards 0° longitude (Greenwich) but adjusted for coordinate system
  // - Y axis points towards North Pole
  // - Z axis completes the right-hand coordinate system

  var sunX = Math.cos(declination) * Math.cos(hourAngle);
  var sunY = Math.sin(declination);
  var sunZ = Math.cos(declination) * Math.sin(hourAngle);

  // Apply coordinate system adjustment to match Earth tile system
  // Rotate by 180° around Y-axis to align with the coordinate system used in flights.js
  var adjustedSunX = -sunX; // Flip X to account for coordinate system offset
  var adjustedSunZ = -sunZ; // Flip Z to maintain proper lighting direction
  var sunPosition = new BABYLON.Vector3(adjustedSunX, sunY, adjustedSunZ);
  console.log(`☀️ 📊 Calculated sun position:`, sunPosition);

  return sunPosition;
}

// ==============================
// SUN LIGHT
// ==============================

/**
 * Creates a distant Sun that provides realistic lighting
 * @param {BABYLON.Vector3} sunDirection - The new direction vector for the sun light
 */
function initSunLight(sunPosition, sunDirection) {
  // Create directional light to simulate the Sun
  console.log("☀️ 🏗️ Creating sun lighting...");
  //window.sunLight ||= new BABYLON.DirectionalLight("sunlight", sunDirection, window.scene);
  window.sunLight ||= new BABYLON.SpotLight(
    "sunlight",
    sunPosition,
    sunDirection,
    Math.PI / 3,
    2,
    window.scene
  );

  // Configure sun properties
  window.sunLight.intensity = 0.9; // Bright sunlight
  window.sunLight.diffuse = BABYLON.Color3.FromHexString("#fff2cc"); // Slightly warm white
  window.sunLight.specular = BABYLON.Color3.FromHexString("#ffffffff"); // Bright specular highlights

  // Enable shadows (optional)
  window.sunLight.setEnabled(true);
  console.log("☀️ ✅ Sun lighting created with realistic position");
}

/**
 * Updates the sun light direction based on current time
 * @param {BABYLON.Vector3} sunDirection - The new direction vector for the sun light
 */
function updateSunLight(sunDirection) {
  if (!window.sunLight) {
    console.warn("☀️ ⚠️ Sun light not found, cannot update direction");
    return;
  }

  // Update sun light direction based on calculated position
  window.sunLight.direction = sunDirection;
  console.log(`☀️ Sun light direction updated to:`, sunDirection);
}

// ==============================
// VOLUMETRIC LIGHT SCATTERING
// ==============================

/**
 * Creates volumetric light scattering effect around the sun
 * @param {BABYLON.Vector3} sunPosition - The position of the sun
 */
function initVolumetricLightScattering(sunPosition) {
  console.log("☀️ 🏗️ Creating volumetric light scattering effect...");

  // Validate scene and camera exist
  if (!window.scene || !window.scene.activeCamera) {
    console.error(
      "☀️ ⚠️ Scene or camera not found - volumetric light scattering cannot be created"
    );
    return false;
  }

  // Check if VolumetricLightScatteringPostProcess is available
  if (!BABYLON.VolumetricLightScatteringPostProcess) {
    console.warn("☀️ ⚠️ VolumetricLightScatteringPostProcess not available - skipping effect");
    return false;
  }

  try {
    // Create volumetric light scattering post-process
    window.volumetricLightScattering = new BABYLON.VolumetricLightScatteringPostProcess(
      "volumetricLightScattering", // name
      1.0, // ratio (1.0 = full resolution)
      window.scene.activeCamera, // camera
      window.sunSphere, // mesh to use as light source (our sun sphere)
      50, // number of samples (reduced for better performance)
      BABYLON.Texture.BILINEAR_SAMPLINGMODE, // sampling mode
      window.scene.getEngine(), // engine
      false, // reusable
      window.scene // scene
    );

    // Configure volumetric light scattering properties
    window.volumetricLightScattering.exposure = 0.2; // Light intensity
    window.volumetricLightScattering.decay = 0.97; // Light decay rate
    window.volumetricLightScattering.weight = 0.4; // Effect strength
    window.volumetricLightScattering.density = 0.8; // Atmospheric density

    console.log("☀️ ✅ Volumetric light scattering effect created successfully");
    return true;
  } catch (error) {
    console.error("☀️ ❌ Failed to create volumetric light scattering:", error);
    return false;
  }
}

/**
 * Updates the volumetric light scattering position
 * @param {BABYLON.Vector3} sunPosition - The new position of the sun
 */
function updateVolumetricLightScattering(sunPosition) {
  if (!window.volumetricLightScattering || !window.sunSphere) {
    return;
  }

  // The volumetric light scattering automatically uses the sun sphere position
  // since we passed it as the mesh parameter during creation
  // No manual position updates needed
}

// ==============================
// SUN SPHERE
// ==============================

/**
 * Creates a visual representation of the Sun as a sphere
 * Positioned according to real-time astronomical calculations
 */
function initSunSphere(sunPosition) {
  console.log("☀️ 🏗️ Creating visual sun sphere...");

  // Validate scene exists
  if (!window.scene) {
    console.error("☀️ ⚠️ Scene not found - sun cannot be created");
    return false;
  }

  // Create sun sphere geometry
  window.sunSphere ||= BABYLON.MeshBuilder.CreateSphere(
    "sunSphere",
    {
      diameter: 3.0, // Appropriate size for a distant sun
      segments: 32, // Smooth sphere
    },
    window.scene
  );

  // Validate sun sphere creation
  if (!window.sunSphere) {
    console.error("☀️ ⚠️ Sun sphere creation failed");
    return false;
  }

  console.log("☀️ ✅ Sun sphere mesh created successfully");

  // Create glowing sun material using StandardMaterial with emissive properties
  window.sunMaterial = new BABYLON.StandardMaterial("sunMaterial", window.scene);

  // Configure sun appearance to be always bright and visible
  window.sunMaterial.diffuseColor = BABYLON.Color3.FromHexString("#ffcc66"); // Bright yellow-orange
  window.sunMaterial.emissiveColor = BABYLON.Color3.FromHexString("#ffcc66"); // Same emissive color for self-illumination
  window.sunMaterial.specularColor = BABYLON.Color3.FromHexString("#000000"); // No specular reflection
  window.sunMaterial.disableLighting = true; // Sun is unaffected by scene lighting

  // Apply material to sphere
  window.sunSphere.material = window.sunMaterial;

  // Position sun based on current astronomical position
  window.sunSphere.position = sunPosition;

  console.log("☀️ ✅ Visual sun sphere created and positioned");
  return true;
}

function updateSunSphere(sunPosition) {
  if (!window.sunSphere) {
    console.warn("☀️ ⚠️ Sun sphere not found, cannot update position");
    return;
  }

  // Position the sun sphere at the calculated astronomical position
  window.sunSphere.position = sunPosition;
}

// ==============================
// SUN SPHERE RUNTIME CONTROLS
// ==============================

/**
 * Shows or hides the visual sun sphere
 * @param {boolean} visible - Whether the sun should be visible
 */
window.setSunVisibility = function (visible) {
  if (!window.sunSphere) {
    console.warn("☀️ ⚠️ Sun sphere not found, cannot set visibility");
    return;
  }

  window.sunSphere.setEnabled(visible);
  console.log(`☀️ ✅ Sun sphere visibility set to: ${visible}`);
};

/**
 * Updates the sun sphere size
 * @param {number} diameter - New diameter for the sun sphere
 */
window.setSunSize = function (diameter) {
  if (!window.sunSphere) {
    console.warn("☀️ ⚠️ Sun sphere not found, cannot set size");
    return;
  }

  window.sunSphere.scaling = new BABYLON.Vector3(diameter, diameter, diameter);
  console.log(`☀️ ✅ Sun sphere size set to: ${diameter}`);
};

// ==============================
// SUN CONTROLS
// ==============================

/**
 * Enables or disables the entire sun system (light and sphere)
 * @param {boolean} enabled - Whether the sun should be enabled
 */
window.setSunEnabled = function (enabled) {
  // Control sun light
  if (window.sunLight) {
    window.sunLight.setEnabled(enabled);
    console.log(`☀️ ${enabled ? "✅ Enabled" : "❌ Disabled"} sun light`);
  } else {
    console.warn("☀️ ⚠️ Sun light not found, cannot toggle");
  }

  // Control sun sphere visibility
  if (window.sunSphere) {
    window.sunSphere.setEnabled(enabled);
    console.log(`☀️ ${enabled ? "✅ Enabled" : "❌ Disabled"} sun sphere`);
  } else {
    console.warn("☀️ ⚠️ Sun sphere not found, cannot toggle");
  }

  console.log(`☀️ ${enabled ? "✅ Enabled" : "❌ Disabled"} complete sun system`);
};

/**
 * Enables or disables only the sun light (keeps sphere visible)
 * @param {boolean} enabled - Whether the sun light should be enabled
 */
window.setSunLightEnabled = function (enabled) {
  if (!window.sunLight) {
    console.warn("☀️ ⚠️ Sun light not found, cannot toggle");
    return;
  }

  window.sunLight.setEnabled(enabled);
  console.log(`☀️ ${enabled ? "✅ Enabled" : "❌ Disabled"} sun light only`);
};

/**
 * Adjusts the sun light intensity
 * @param {number} intensity - Light intensity (0.5-2.0 recommended)
 */
window.setSunLightIntensity = function (intensity) {
  if (!window.sunLight) {
    console.warn("☀️ ⚠️ Sun light not found, cannot adjust intensity");
    return;
  }

  window.sunLight.intensity = Math.max(0, intensity);
  console.log(`☀️ ✅ Sun light intensity set to ${intensity}`);
};

/**
 * Shows or hides only the sun sphere (keeps light enabled)
 * @param {boolean} visible - Whether the sun sphere should be visible
 */
window.setSunSphereVisible = function (visible) {
  if (!window.sunSphere) {
    console.warn("☀️ ⚠️ Sun sphere not found, cannot toggle visibility");
    return;
  }

  window.sunSphere.setEnabled(visible);
  console.log(`☀️ ${visible ? "✅ Shown" : "❌ Hidden"} sun sphere`);
};

// ==============================
// SUN CLEANUP
// ==============================

/**
 * Disposes of the sun sphere and cleans up resources
 */
window.disposeSun = function () {
  // Clear update interval
  if (window.sunUpdateInterval) {
    clearInterval(window.sunUpdateInterval);
    window.sunUpdateInterval = null;
    console.log("☀️ ✅ Sun update interval cleared");
  }

  // Dispose of sun sphere
  if (window.sunSphere) {
    window.sunSphere.dispose();
    window.sunSphere = null;
    console.log("☀️ ✅ Sun sphere disposed");
  }

  // Dispose of sun material
  if (window.sunMaterial) {
    window.sunMaterial.dispose();
    window.sunMaterial = null;
    console.log("☀️ ✅ Sun material disposed");
  }

  // Dispose of sun light
  if (window.sunLight) {
    window.sunLight.dispose();
    window.sunLight = null;
    console.log("☀️ ✅ Sun light disposed");
  }

  // Dispose of volumetric light scattering effect
  if (window.volumetricLightScattering) {
    window.volumetricLightScattering.dispose();
    window.volumetricLightScattering = null;
    console.log("☀️ ✅ Volumetric light scattering disposed");
  }

  console.log("☀️ ✅ All sun resources cleaned up");
};
