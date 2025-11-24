// ==============================
// EARTH TILE SYSTEM AND RENDERING
// ==============================

const tileDefinition = 0;

let sharedEarthResources = {
  baseEarthMaterial: null,
};

function initSharedResources() {
  sharedEarthResources.baseEarthMaterial = new BABYLON.StandardMaterial(
    "baseMaterial",
    window.scene
  );
  sharedEarthResources.baseEarthMaterial.wireframe = false;
  sharedEarthResources.baseEarthMaterial.backFaceCulling = false;
  sharedEarthResources.baseEarthMaterial.ambientColor = BABYLON.Color3.FromHexString("#4d4d4d"); // Slightly increased ambient
  sharedEarthResources.baseEarthMaterial.diffuseColor = BABYLON.Color3.FromHexString("#ffffff"); // Keep diffuse at full for texture
  sharedEarthResources.baseEarthMaterial.specularColor = BABYLON.Color3.FromHexString("#0d0d0d"); // Very low specular
  sharedEarthResources.baseEarthMaterial.specularPower = 64; // Higher specular power for tighter highlights
}

/**
 * Represents a tile identifier in the hierarchical tile system
 * Used for progressive loading of Earth imagery at different zoom levels
 */
class TileId {
  constructor(x, y, zoom) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
  }

  /**
   * Gets the four child tiles at the next zoom level
   * @returns {Array<TileId>} Array of four child tile IDs
   */
  get children() {
    return [
      new TileId(this.x * 2, this.y * 2, this.zoom + 1),
      new TileId(this.x * 2 + 1, this.y * 2, this.zoom + 1),
      new TileId(this.x * 2, this.y * 2 + 1, this.zoom + 1),
      new TileId(this.x * 2 + 1, this.y * 2 + 1, this.zoom + 1),
    ];
  }
}

// ==============================
// TILE GEOMETRY CALCULATION FUNCTIONS
// ==============================

/**
 * Calculates the angular size of a tile for level-of-detail determination
 * @param {number} tileY - Y coordinate of the tile
 * @param {number} tileZ - Zoom level of the tile
 * @returns {number} Angular size of the tile in radians
 */
function getTileAngle(tileY, tileZ) {
  var tileR = 2 ** tileZ;
  var tileS = (2 * Math.PI) / tileR;
  var y = Math.PI - tileY * tileS;

  if (2 * tileY < tileR) {
    // northern hemisphere, use bottom edge
    y -= tileS;
  }

  var gd = 2 * Math.atan(Math.exp(y)) - Math.PI / 2;
  return tileS * Math.cos(gd);
}

// Cache for storing vertex data to avoid recalculation
var vertexDataMap = {};

/**
 * Generates vertex data for a specific tile using Web Mercator projection
 * Creates a spherical mesh segment that represents a portion of the Earth
 * @param {number} tileY - Y coordinate of the tile
 * @param {number} tileZ - Zoom level of the tile
 * @returns {BABYLON.VertexData} Vertex data for the tile mesh
 */
function getVertexDataForTile(tileY, tileZ) {
  var key = tileY + ":" + tileZ;

  // Return cached vertex data if available
  if (key in vertexDataMap) {
    return vertexDataMap[key];
  }

  // Calculate tile parameters for Web Mercator projection
  var tileR = 2 ** tileZ;
  var tileS = (2 * Math.PI) / tileR;
  var ty = Math.PI - tileY * tileS;

  //Set arrays for positions and indices
  var positions = [];
  var indices = [];
  var uvs = [];
  var subdivisions = 4; // Reduced from 8 for better performance

  // Generate vertices for the tile mesh
  for (var sy = 0; sy <= subdivisions + 0.5; sy++) {
    var v = sy / subdivisions;
    var y = ty - tileS * v;
    var gd = 2 * Math.atan(Math.exp(y)) - Math.PI / 2; // Web Mercator to lat conversion
    var pz = Math.sin(gd);
    var cos = Math.cos(gd);

    for (var sx = 0; sx <= subdivisions + 0.5; sx++) {
      var u = sx / subdivisions;
      var x = tileS * u;
      var px = Math.cos(x);
      var py = Math.sin(x);
      var p = new BABYLON.Vector3(px * cos, pz, py * cos); // Spherical coordinates
      positions.push(p.x);
      positions.push(p.y);
      positions.push(p.z);
      uvs.push(u);
      uvs.push(1 - v);

      // Generate triangle indices for the mesh
      if (sx < subdivisions && sy < subdivisions) {
        var idx = sy * (subdivisions + 1) + sx;
        indices.push(idx);
        indices.push(idx + subdivisions + 1);
        indices.push(idx + 1);
        indices.push(idx + 1);
        indices.push(idx + subdivisions + 1);
        indices.push(idx + subdivisions + 2);
      }
    }
  }

  //Create a vertexData object
  var vertexData = new BABYLON.VertexData();

  //Assign positions and indices to vertexData
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.uvs = uvs;

  // Calculate proper normals for the mesh
  var normals = [];
  BABYLON.VertexData.ComputeNormals(positions, indices, normals);
  vertexData.normals = normals;

  // Cache the vertex data for future use
  vertexDataMap[key] = vertexData;
  return vertexData;
}

// ==============================
// TILE MESH CREATION AND TEXTURE LOADING
// ==============================

/**
 * Creates a mesh for a specific tile with satellite imagery texture
 * @param {TileId} tileId - The tile identifier
 * @returns {Promise<BABYLON.Mesh>} Promise that resolves to the tile mesh
 */
function getMeshForTile(tileId) {
  // Vector pointing up' for tile rotation calculations
  var up = BABYLON.Vector3.Up();

  // Calculate tile positioning parameters
  var tileR = 2 ** tileId.zoom;
  //var tileS = (2 * Math.PI) / tileR;
  //var tx = tileId.x * tileS - Math.PI;
  //var ty = Math.PI - tileId.y * tileS;

  //Create a custom mesh
  var mesh = new BABYLON.Mesh("tile " + tileId, window.scene);
  mesh.isVisible = false; // Initially hidden until texture loads
  mesh.tileId = tileId;
  mesh.rotate(up, (-2 * Math.PI * tileId.x) / tileR); // Rotate for proper positioning

  //Apply vertexData to custom mesh
  var vertexData = getVertexDataForTile(tileId.y, tileId.zoom);
  vertexData.applyToMesh(mesh);

  // Create material from tile imagery
  var tileMaterial = sharedEarthResources.baseEarthMaterial.clone("tileMaterial " + tileId);

  // Get tile URL using the current tile provider
  const tileUrl = getTileUrl(tileId.x, tileId.y, tileId.zoom, window.tileProvider);

  // Return promise that resolves when texture is loaded
  var promise = new Promise((resolve, reject) => {
    var texture = new BABYLON.Texture(
      tileUrl,
      window.scene,
      false, // noMipmap - set to false for better quality
      true, // invertY
      BABYLON.Texture.TRILINEAR_SAMPLINGMODE, // Better filtering
      async () => {
        // Texture loaded successfully - configure and optimize mesh
        tileMaterial.diffuseTexture = texture;
        tileMaterial.diffuseTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE; // Prevent wrapping artifacts
        tileMaterial.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE; // Prevent wrapping artifacts
        tileMaterial.diffuseTexture.anisotropicFilteringLevel = 4; // Improve texture quality at angles
        tileMaterial.freeze(); // Freeze material for performance
        mesh.material = tileMaterial;
        window.scene.addMesh(mesh);
        mesh.freezeWorldMatrix(); // Freeze transformations for performance
        mesh.freezeNormals();
        mesh.doNotSyncBoundingInfo = true;
        mesh.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
        resolve(mesh);
      },
      () => {
        // Texture loading failed
        console.warn(`🌍 ⚠️ Failed to load texture for tile:`, tileId);
        reject();
      }
    );
  });

  return promise;
}

// ==============================
// PROGRESSIVE TILE LOADING SYSTEM
// ==============================

// Array to track all loaded tiles for progressive refinement
window.loadedTiles = [];

/**
 * Recursively loads tiles based on level-of-detail requirements
 * Determines whether to load a tile directly or subdivide into children
 * @param {TileId} tileId - The tile to process
 */
var getMeshes = async function (tileId) {
  var angle = getTileAngle(tileId.y, tileId.zoom);

  // Load tile directly if it's detailed enough for current view
  if (tileId.zoom > 0 && angle < Math.PI / 8) {
    var mesh = await getMeshForTile(tileId);
    mesh.isVisible = true;
    mesh.tileAngle = angle;
    window.loadedTiles.push(mesh);
  } else {
    // Subdivide into higher detail tiles - PARALLEL LOADING
    var children = tileId.children;
    const childPromises = children.map((childId) => getMeshes(childId));
    await Promise.allSettled(childPromises); // Load all child tiles in parallel
  }
};

function initPoleCaps() {
  // North pole cap - using a sphere segment for proper curvature
  window.northPoleCap = BABYLON.MeshBuilder.CreateSphere(
    "northCap",
    {
      diameter: 2,
      segments: 16,
      slice: 0.028, // Only show the top portion of the sphere
    },
    window.scene
  );
  window.northPoleCap.position = BABYLON.Vector3.Zero(); // Position at north pole

  // South pole cap - create as a separate sphere and flip it
  window.southPoleCap = BABYLON.MeshBuilder.CreateSphere(
    "southCap",
    {
      diameter: 2,
      segments: 16,
      slice: 0.028,
    },
    window.scene
  );
  window.southPoleCap.position = BABYLON.Vector3.Zero(); // Position at south pole
  window.southPoleCap.rotation.z = Math.PI; // Flip upside down for south pole

  // Create a dark material for the polar caps
  var northPoleMat = sharedEarthResources.baseEarthMaterial.clone("northPoleMat");
  window.northPoleCap.material = northPoleMat;
  window.setNorthPoleColor(window.tileProvider.northCapColor || "#aad3df"); // Default to light blue

  var southPoleMat = sharedEarthResources.baseEarthMaterial.clone("southPoleMat");
  window.southPoleCap.material = southPoleMat;
  window.setSouthPoleColor(window.tileProvider.southCapColor || "#f2efe9"); // Default to light gray

  console.log("🌍 ✅ Spherical polar caps created");
}

window.setNorthPoleColor = function (color) {
  if (window.northPoleCap && window.northPoleCap.material) {
    window.northPoleCap.material.diffuseColor = BABYLON.Color3.FromHexString(color);
    window.northPoleCap.material.ambientColor = BABYLON.Color3.FromHexString(color);
    console.log(`🌍 ✅ North pole cap color set to: ${color}`);
  } else {
    console.warn("🌍 ⚠️ North pole cap not found or material missing");
  }
};

window.setSouthPoleColor = function (color) {
  if (window.southPoleCap && window.southPoleCap.material) {
    window.southPoleCap.material.diffuseColor = BABYLON.Color3.FromHexString(color);
    console.log(`🌍 ✅ South pole cap color set to: ${color}`);
  } else {
    console.warn("🌍 ⚠️ South pole cap not found or material missing");
  }
};

/**
 * Sets up the progressive tile refinement system
 */
function initTileRefinement() {
  // Simple camera-based refinement trigger
  window.scene.registerAfterRender(() => {
    // Find tiles that can be refined (haven't reached max zoom level)
    const tilesToRefine = window.loadedTiles.filter(
      (mesh) => mesh && mesh.tileId && !mesh.isDisposed() && mesh.tileId.zoom < tileDefinition
    );

    // Refine one tile per frame to avoid performance issues
    if (tilesToRefine.length > 0) {
      const mesh = tilesToRefine[0];
      refineTile(mesh);
    }
  });

  console.log("🌍 ✅ Tile refinement initialized (max zoom: ${tileDefinition})");
}

/**
 * Refines a single tile by replacing it with its children
 * @param {BABYLON.Mesh} mesh - The tile mesh to refine
 */
async function refineTile(mesh) {
  if (!mesh || !mesh.tileId || mesh.isDisposed()) return;

  const tileId = mesh.tileId;
  const children = tileId.children;

  try {
    // Load all child tiles
    const childPromises = children.map((childId) => getMeshForTile(childId));
    const childMeshes = await Promise.all(childPromises);

    // Remove parent from loaded tiles array
    const index = window.loadedTiles.indexOf(mesh);
    if (index > -1) {
      window.loadedTiles.splice(index, 1);
    }

    // Dispose parent mesh
    window.scene.removeMesh(mesh);
    if (mesh.material) mesh.material.dispose();
    mesh.dispose();

    // Add child meshes to scene and tracking array
    childMeshes.forEach((childMesh) => {
      if (childMesh && !childMesh.isDisposed()) {
        childMesh.isVisible = true;
        window.scene.addMesh(childMesh);
        window.loadedTiles.push(childMesh);
      }
    });
  } catch (error) {
    console.warn("🌍 ⚠️ Error refining tile:", error);
  }
}

// ==============================
// EARTH INITIALIZATION
// ==============================

/**
 * Initializes the initial Earth tiles
 */
async function initEarthTiles() {
  await getMeshes(new TileId(0, 0, 0));
  console.log("🌍 ✅ Initial tiles loaded");
}

/**
 * Initializes the Earth tile system in the given scene
 */
async function initializeEarth() {
  // PARALLEL PHASE 1: Independent Earth components that can load simultaneously
  const independentPromises = [
    tryInitializeAsync("🌍", "Shared Resources", initSharedResources),
    tryInitializeAsync("🌍", "Tile Refinement", initTileRefinement),
    tryInitializeAsync("🌍", "Polar Caps", initPoleCaps),
  ];

  // PARALLEL PHASE 2: Core tiles (must complete before refinement can work effectively)
  const independentResults = await Promise.allSettled(independentPromises);

  // Initialize core tiles (this needs to complete before other systems can use loadedTiles)
  await tryInitializeAsync("🌍", `Earth Tiles for ${window.tileProvider.name}`, initEarthTiles);

  // Log results of independent components
  const componentLabels = ["Shared Resources", "Tile Refinement", "Polar Caps"];
  independentResults.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn(`🌍 ⚠️ ${componentLabels[index]} failed:`, result.reason);
    }
  });

  console.log("🌍 ✅ Earth initialized");
}

// ==============================
// EARTH CLEANUP
// ==============================

/**
 * Disposes of all Earth-related resources and cleans up
 */
window.disposeEarth = function () {
  console.log("🌍 🗑️ Disposing Earth resources...");

  let disposedCount = 0;

  // Dispose loaded tiles
  if (window.loadedTiles && window.loadedTiles.length > 0) {
    window.loadedTiles.forEach((mesh) => {
      if (mesh && !mesh.isDisposed()) {
        if (mesh.material && mesh.material.diffuseTexture) {
          mesh.material.diffuseTexture.dispose();
        }
        if (mesh.material) {
          mesh.material.dispose();
        }
        mesh.dispose();
        disposedCount++;
      }
    });
    window.loadedTiles = [];
    console.log(`🌍 ✅ Disposed ${disposedCount} Earth tiles`);
  }

  // Dispose polar caps
  if (window.northPoleCap) {
    if (window.northPoleCap.material) {
      window.northPoleCap.material.dispose();
    }
    window.northPoleCap.dispose();
    window.northPoleCap = null;
    console.log("🌍 ✅ North pole cap disposed");
  }

  if (window.southPoleCap) {
    if (window.southPoleCap.material) {
      window.southPoleCap.material.dispose();
    }
    window.southPoleCap.dispose();
    window.southPoleCap = null;
    console.log("🌍 ✅ South pole cap disposed");
  }

  // Dispose shared Earth resources
  if (typeof sharedEarthResources !== "undefined") {
    if (sharedEarthResources.baseEarthMaterial) {
      sharedEarthResources.baseEarthMaterial.dispose();
      sharedEarthResources.baseEarthMaterial = null;
    }
    if (sharedEarthResources.northPoleMaterial) {
      sharedEarthResources.northPoleMaterial.dispose();
      sharedEarthResources.northPoleMaterial = null;
    }
    if (sharedEarthResources.southPoleMaterial) {
      sharedEarthResources.southPoleMaterial.dispose();
      sharedEarthResources.southPoleMaterial = null;
    }
    console.log("🌍 ✅ Shared Earth materials disposed");
  }

  // Dispose any remaining Earth-related meshes from scene
  if (window.scene) {
    const earthMeshes = window.scene.meshes.filter(
      (mesh) =>
        mesh.name &&
        (mesh.name.includes("tile") ||
          mesh.name.includes("earth") ||
          mesh.name.includes("pole") ||
          mesh.name.includes("cap"))
    );

    let sceneDisposedCount = 0;
    earthMeshes.forEach((mesh) => {
      if (mesh && !mesh.isDisposed()) {
        if (mesh.material) {
          if (mesh.material.diffuseTexture) {
            mesh.material.diffuseTexture.dispose();
          }
          mesh.material.dispose();
        }
        mesh.dispose();
        sceneDisposedCount++;
      }
    });

    if (sceneDisposedCount > 0) {
      console.log(`🌍 ✅ Disposed ${sceneDisposedCount} additional Earth meshes from scene`);
    }
  }

  console.log("🌍 ✅ All Earth resources cleaned up");
};
