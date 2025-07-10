// ==============================
// SPACE ENVIRONMENT SYSTEM
// ==============================

/**
 * Creates a star sphere around the Earth for a realistic space environment
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @returns {BABYLON.Mesh} The star sphere mesh
 */
var createStarSphere = function (scene) {
  console.log("Creating star sphere...");

  // Create a large sphere to contain the stars
  var starSphere = BABYLON.MeshBuilder.CreateSphere(
    "starSphere",
    {
      diameter: 200, // Large enough to encompass the entire scene
      segments: 32,
    },
    scene
  );

  // Create material for the star sphere
  var starMaterial = new BABYLON.StandardMaterial("starMaterial", scene);

  // Create a dynamic texture for the stars
  var starTexture = new BABYLON.DynamicTexture("starTexture", 2048, scene);
  var starTextureContext = starTexture.getContext();

  // Fill background with deep space black
  starTextureContext.fillStyle = "#000011"; // Very dark blue-black for space
  starTextureContext.fillRect(0, 0, 2048, 2048);

  // Generate procedural stars
  var numStars = 8000; // Number of stars to generate
  for (var i = 0; i < numStars; i++) {
    var x = Math.random() * 2048;
    var y = Math.random() * 2048;
    var brightness = Math.random();
    var size = Math.random() * 2 + 0.5; // Star size between 0.5 and 2.5

    // Create different star colors (white, blue-white, yellow-white, red)
    var colorType = Math.random();
    var color;
    if (colorType < 0.6) {
      // White/blue-white stars (most common)
      var intensity = 200 + Math.floor(brightness * 55);
      color = `rgb(${intensity}, ${intensity}, ${Math.min(
        255,
        intensity + 20
      )})`;
    } else if (colorType < 0.8) {
      // Yellow-white stars
      var intensity = 180 + Math.floor(brightness * 75);
      color = `rgb(${Math.min(255, intensity + 30)}, ${intensity}, ${Math.max(
        120,
        intensity - 30
      )})`;
    } else {
      // Red stars (less common)
      var intensity = 150 + Math.floor(brightness * 105);
      color = `rgb(${intensity}, ${Math.max(80, intensity - 70)}, ${Math.max(
        60,
        intensity - 90
      )})`;
    }

    // Draw the star with a subtle glow effect
    starTextureContext.beginPath();
    starTextureContext.fillStyle = color;
    starTextureContext.arc(x, y, size, 0, 2 * Math.PI);
    starTextureContext.fill();

    // Add a subtle glow for brighter stars
    if (brightness > 0.7) {
      starTextureContext.beginPath();
      starTextureContext.fillStyle = color
        .replace(/rgb/, "rgba")
        .replace(/\)/, ", 0.3)");
      starTextureContext.arc(x, y, size * 2, 0, 2 * Math.PI);
      starTextureContext.fill();
    }
  }

  // Add some nebula-like effects (very subtle)
  for (var i = 0; i < 20; i++) {
    var x = Math.random() * 2048;
    var y = Math.random() * 2048;
    var size = 50 + Math.random() * 100;

    var gradient = starTextureContext.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, "rgba(120, 80, 200, 0.05)");
    gradient.addColorStop(0.5, "rgba(80, 120, 180, 0.02)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    starTextureContext.fillStyle = gradient;
    starTextureContext.fillRect(x - size, y - size, size * 2, size * 2);
  }

  // Update the texture
  starTexture.update();

  // Configure the material
  starMaterial.diffuseTexture = starTexture;
  starMaterial.emissiveTexture = starTexture; // Make stars glow
  starMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 1.0); // Slight blue tint
  starMaterial.backFaceCulling = false; // Render both sides
  starMaterial.disableLighting = true; // Stars emit their own light

  // Apply material to sphere
  starSphere.material = starMaterial;

  // Invert the sphere so stars are visible from inside
  starSphere.flipFaces(true);

  // Position and optimize the star sphere
  starSphere.position = BABYLON.Vector3.Zero();
  starSphere.infiniteDistance = true; // Always render at infinite distance
  starSphere.renderingGroupId = 0; // Render first (background)

  // Freeze for performance
  starSphere.freezeWorldMatrix();
  starSphere.doNotSyncBoundingInfo = true;

  console.log("✨ Star sphere created with", numStars, "stars");
  return starSphere;
};

/**
 * Initializes the complete space environment
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @returns {Object} Object containing space environment components
 */
var initializeSpaceEnvironment = function (scene) {
  console.group("🌌 Space Environment");
  console.log("Setting up space environment...");

  try {
    // Create star sphere background
    var starSphere = createStarSphere(scene);

    console.log("✅ Space environment ready");
    console.groupEnd();

    return {
      starSphere: starSphere,
    };
  } catch (error) {
    console.error("❌ Space environment initialization failed:", error);
    console.groupEnd();
    return null;
  }
};
