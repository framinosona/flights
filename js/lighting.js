// ==============================
// LIGHTING SYSTEM
// ==============================

/**
 * Calculates the sun's position based on current date and time
 * @returns {BABYLON.Vector3} The sun's direction vector
 */
var calculateSunPosition = function () {
  var now = new Date();
  var dayOfYear = Math.floor(
    (now - new Date(now.getFullYear(), 0, 0)) / 86400000
  );
  var totalDaysInYear = 365 + (now.getFullYear() % 4 === 0 ? 1 : 0); // Account for leap years

  // Calculate solar declination (Earth's tilt effect)
  var declination =
    23.45 *
    Math.sin((2 * Math.PI * (284 + dayOfYear)) / totalDaysInYear) *
    (Math.PI / 180);

  // Calculate hour angle based on current UTC time
  var utcHours =
    now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  var hourAngle = (utcHours - 12) * 15 * (Math.PI / 180); // Convert to radians

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

  // Invert the vector since we want the light direction (from sun to earth)
  return new BABYLON.Vector3(-adjustedSunX, -sunY, -adjustedSunZ);
};

/**
 * Creates a distant Sun that provides realistic lighting
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @returns {BABYLON.DirectionalLight} The sun light source
 */
var createSun = function (scene) {
  console.log("Creating sun lighting...");

  // Calculate realistic sun position based on current time
  var sunDirection = calculateSunPosition();
  var now = new Date();

  console.log(`Calculating sun position for ${now.toISOString()}`);

  // Calculate UTC info for debugging
  var utcHours =
    now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  var hourAngle = (utcHours - 12) * 15; // in degrees
  var dayOfYear = Math.floor(
    (now - new Date(now.getFullYear(), 0, 0)) / 86400000
  );
  var declination =
    23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365) * (180 / Math.PI); // in degrees

  console.log(
    `UTC Hours: ${utcHours.toFixed(2)}, Hour Angle: ${hourAngle.toFixed(2)}°`
  );
  console.log(
    `Declination: ${declination.toFixed(2)}°, Day of Year: ${dayOfYear}`
  );
  console.log(`Current time: ${now.toLocaleTimeString()} UTC`);
  console.log(
    `Sun direction: X=${sunDirection.x.toFixed(3)}, Y=${sunDirection.y.toFixed(
      3
    )}, Z=${sunDirection.z.toFixed(3)}`
  );

  // Create directional light to simulate the Sun
  var sunLight = new BABYLON.DirectionalLight("sunLight", sunDirection, scene);

  // Configure sun properties
  sunLight.intensity = 1.2; // Bright sunlight
  sunLight.diffuse = new BABYLON.Color3(1.0, 0.95, 0.8); // Slightly warm white
  sunLight.specular = new BABYLON.Color3(1.0, 1.0, 0.9); // Bright specular highlights

  // Enable shadows (optional)
  sunLight.setEnabled(true);

  console.log("☀️ Sun lighting created with realistic position");
  return sunLight;
};

/**
 * Creates a subtle fill light to prevent complete darkness on Earth's night side
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @returns {BABYLON.DirectionalLight} The fill light source
 */
var createFillLight = function (scene) {
  console.log("Creating fill lighting...");

  // Subtle fill light to prevent complete darkness
  var fillLight = new BABYLON.DirectionalLight(
    "fillLight",
    new BABYLON.Vector3(0.3, 0.2, 0.5), // Opposite side from sun
    scene
  );
  fillLight.intensity = 0.3; // Subtle fill
  fillLight.diffuse = new BABYLON.Color3(0.2, 0.3, 0.5); // Cool blue fill light (Earth's atmosphere)

  console.log("🌙 Fill lighting created");
  return fillLight;
};

/**
 * Updates the sun light position based on current time
 * @param {BABYLON.DirectionalLight} sunLight - The sun light to update
 */
var updateSunPosition = function (sunLight) {
  if (!sunLight) return;

  var newDirection = calculateSunPosition();
  sunLight.direction = newDirection;

  var now = new Date();
  console.log(`☀️ Sun position updated for ${now.toLocaleTimeString()} UTC`);
};

/**
 * Sets up automatic sun position updates
 * @param {BABYLON.DirectionalLight} sunLight - The sun light to update
 * @param {number} intervalMinutes - Update interval in minutes (default: 15)
 */
var setupSunTracking = function (sunLight, intervalMinutes = 15) {
  console.log(
    `🌞 Setting up sun tracking with ${intervalMinutes}-minute updates`
  );

  // Update immediately
  updateSunPosition(sunLight);

  // Set up periodic updates
  var updateInterval = setInterval(() => {
    updateSunPosition(sunLight);
  }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds

  // Store interval ID for potential cleanup
  sunLight.updateInterval = updateInterval;

  return updateInterval;
};

/**
 * Initializes the complete lighting system
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @param {Object} options - Configuration options
 * @param {boolean} options.enableSunTracking - Enable automatic sun position updates (default: true)
 * @param {number} options.trackingInterval - Update interval in minutes (default: 15)
 * @returns {Object} Object containing lighting components and controls
 */
var initializeLighting = function (scene, options = {}) {
  console.group("☀️ Lighting System");
  console.log("Setting up realistic lighting...");

  try {
    var enableSunTracking = options.enableSunTracking !== false; // Default to true
    var trackingInterval = options.trackingInterval || 15;

    // Create sun lighting with real-time position
    var sunLight = createSun(scene);

    // Create fill lighting
    var fillLight = createFillLight(scene);

    // Set up automatic sun tracking if enabled
    var trackingInterval = null;
    if (enableSunTracking) {
      trackingInterval = setupSunTracking(sunLight, trackingInterval);
    }

    // Store lights globally for easy access (if needed by other modules)
    window.sunLight = sunLight;
    window.fillLight = fillLight;

    console.log(
      "✅ Lighting system ready" +
        (enableSunTracking ? " with real-time sun tracking" : "")
    );
    console.groupEnd();

    return {
      sunLight: sunLight,
      fillLight: fillLight,
      trackingInterval: trackingInterval,
      updateSunPosition: () => updateSunPosition(sunLight),
      setupSunTracking: (interval) => setupSunTracking(sunLight, interval),
      calculateSunPosition: calculateSunPosition,
    };
  } catch (error) {
    console.error("❌ Lighting system initialization failed:", error);
    console.groupEnd();
    return null;
  }
};
