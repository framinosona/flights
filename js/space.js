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
async function initializeSpaceEnvironment() {
  await setSkyboxSet(window.skyboxSet);
  console.log("🌌 ✅ Skybox material applied");
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
  console.log(`🌌 🔄 Switching skybox...`);
  setSkyboxSet(skyboxSet);
  return true;
};

async function setSkyboxSet(skyboxSet) {
  window.skyboxSet = skyboxSet;
  console.log(`🌌 ✅ Skybox set changed to: ${window.skyboxSet.name}`);

  // PARALLEL LOADING: Preload all skybox face textures concurrently
  const faceNames = ["right", "top", "front", "left", "bottom", "back"];
  const textureUrls = faceNames.map((dir) => `${window.skyboxSet.baseName}${dir}.png`);

  console.log("🌌 🚀 Starting parallel skybox texture preloading...");

  // Preload all textures in parallel before creating the cube texture
  const preloadPromises = textureUrls.map(
    (url) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(new Error(`Failed to load skybox texture: ${url}`));
        img.src = url;
      })
  );

  try {
    await Promise.all(preloadPromises);
    console.log("🌌 ✅ All skybox textures preloaded successfully");

    // Now create the cube texture with preloaded images
    var skyboxTexture = new BABYLON.CubeTexture(
      window.skyboxSet.baseName,
      window.scene,
      faceNames.map((dir) => `${dir}.png`)
    );

    window.scene.createDefaultSkybox(skyboxTexture);
    console.log(`🌌 ✅ Skybox textures updated for set: ${window.skyboxSet.name}`);
    return true;
  } catch (error) {
    console.error("🌌 ❌ Failed to preload skybox textures:", error);
    // Fallback to original behavior
    var skyboxTexture = new BABYLON.CubeTexture(
      window.skyboxSet.baseName,
      window.scene,
      faceNames.map((dir) => `${dir}.png`)
    );
    window.scene.createDefaultSkybox(skyboxTexture);
    return false;
  }
}

// ==============================
// SPACE CLEANUP
// ==============================

/**
 * Disposes of all space-related resources and cleans up
 */
window.disposeSpace = function () {
  console.log("🌌 🗑️ Disposing space resources...");

  // Dispose skybox
  if (window.scene && window.scene.environmentTexture) {
    window.scene.environmentTexture.dispose();
    window.scene.environmentTexture = null;
    console.log("🌌 ✅ Environment texture disposed");
  }

  // Dispose any skybox meshes
  if (window.scene) {
    const skyboxMeshes = window.scene.meshes.filter(
      (mesh) =>
        mesh.name &&
        (mesh.name.includes("skybox") ||
          mesh.name.includes("sky") ||
          mesh.name === "BackgroundSkybox" ||
          mesh.name === "hdrSkyBox")
    );

    skyboxMeshes.forEach((mesh) => {
      if (mesh && !mesh.isDisposed()) {
        if (mesh.material) {
          if (mesh.material.reflectionTexture) {
            mesh.material.reflectionTexture.dispose();
          }
          mesh.material.dispose();
        }
        mesh.dispose();
      }
    });

    if (skyboxMeshes.length > 0) {
      console.log(`🌌 ✅ Disposed ${skyboxMeshes.length} skybox meshes`);
    }
  }

  // Clear skybox references
  window.skyboxSet = null;

  console.log("🌌 ✅ All space resources cleaned up");
};
