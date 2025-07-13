// ==============================
// SPACE TILE SYSTEM AND RENDERING
// ==============================

// ==============================
// SKYBOX CONFIGURATION
// ==============================
window.skyboxSets = {
  // Using https://tools.wwwtyro.net/space-3d/index.html
  TYRO1: {
    name: "Tyro 1",
    baseName: "img/tyro1/",
  },
  TYRO2: {
    name: "Tyro 2",
    baseName: "img/tyro2/",
  },
};

window.skyboxSet = window.skyboxSets.TYRO1;

// ==============================
// SKYBOX CREATION FUNCTIONS
// ==============================

/**
 * Creates the main skybox mesh
 */
function initializeSpaceEnvironment() {
  setSkyboxSet(window.skyboxSet);
  console.log("✅ Skybox material applied");
  return true;
}

// ==============================
// SKYBOX RUNTIME SWITCHING
// ==============================

/**
 * Sets the active skybox set and updates the scene
 * @param {Object} skyboxSet - skybox object
 */
window.setSkybox = function (skyboxSet) {
  console.log(`🔄 Switching skybox...`);
  setSkyboxSet(skyboxSet);
  return true;
};

function setSkyboxSet(skyboxSet) {
  window.skyboxSet = skyboxSet;
  console.log(`🌌 Skybox set changed to: ${window.skyboxSet.name}`);

  var skyboxTexture = new BABYLON.CubeTexture(
    window.skyboxSet.baseName,
    window.scene,
    ["Right", "Top", "Front", "Left", "Bottom", "Back"].map((dir) => `${dir}.png`)
  );

  window.scene.createDefaultSkybox(skyboxTexture);
  console.log(`✅ Skybox textures updated for set: ${window.skyboxSet.name}`);
  return true;
}
