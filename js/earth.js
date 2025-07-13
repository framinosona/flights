// ==============================
// EARTH TILE SYSTEM AND RENDERING
// ==============================

tileDefinition = 4;

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
  var subdivisions = 8; // Increased subdivisions for smoother geometry

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
  // Vector pointing up for tile rotation calculations
  var up = new BABYLON.Vector3(0, 1, 0);

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
  var mat = new BABYLON.StandardMaterial("mat " + tileId, window.scene);
  mat.wireframe = false;
  mat.backFaceCulling = false;
  mat.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Slightly increased ambient
  mat.diffuseColor = new BABYLON.Color3(1, 1, 1); // Keep diffuse at full for texture
  mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Very low specular
  mat.specularPower = 64; // Higher specular power for tighter highlights

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
        mat.diffuseTexture = texture;
        mat.diffuseTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE; // Prevent wrapping artifacts
        mat.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE; // Prevent wrapping artifacts
        mat.diffuseTexture.anisotropicFilteringLevel = 4; // Improve texture quality at angles
        mat.freeze(); // Freeze material for performance
        mesh.material = mat;
        window.scene.addMesh(mesh);
        mesh.freezeWorldMatrix(); // Freeze transformations for performance
        mesh.freezeNormals();
        mesh.doNotSyncBoundingInfo = true;
        mesh.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
        resolve(mesh);
      },
      () => {
        // Texture loading failed
        console.warn(`Failed to load texture for tile ${tileId.x},${tileId.y},${tileId.zoom}`);
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
    // Subdivide into higher detail tiles
    var children = tileId.children;
    getMeshes(children[0]);
    getMeshes(children[1]);
    getMeshes(children[2]);
    getMeshes(children[3]);
  }
};

function initPoleCaps() {
  // North pole cap - using a sphere segment for proper curvature
  const northPoleCap = BABYLON.MeshBuilder.CreateSphere(
    "northCap",
    {
      diameter: 2,
      segments: 16,
      slice: 0.028, // Only show the top portion of the sphere
    },
    window.scene
  );
  northPoleCap.position = new BABYLON.Vector3(0, 0, 0); // Position at north pole

  // South pole cap - create as a separate sphere and flip it
  const southPoleCap = BABYLON.MeshBuilder.CreateSphere(
    "southCap",
    {
      diameter: 2,
      segments: 16,
      slice: 0.028,
    },
    window.scene
  );
  southPoleCap.position = new BABYLON.Vector3(0, 0, 0); // Position at south pole
  southPoleCap.rotation.z = Math.PI; // Flip upside down for south pole

  // Create a dark material for the polar caps
  var northPoleMat = new BABYLON.StandardMaterial("northPoleMat", window.scene);
  northPoleMat.wireframe = false;
  northPoleMat.backFaceCulling = false;
  northPoleMat.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Very dark for polar regions
  northPoleMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Almost black
  northPoleMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02); // Minimal specular
  northPoleMat.specularPower = 32;

  northPoleCap.material = northPoleMat;

  var southPoleMat = northPoleMat.clone("southPoleMat");
  southPoleMat.ambientColor = new BABYLON.Color3(0.8, 0.8, 0.8); // Lighter for south pole
  southPoleMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Lighter for south pole
  southPoleMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Minimal specular for south pole
  southPoleMat.specularPower = 32;

  southPoleCap.material = southPoleMat;

  console.log("✅ Spherical polar caps created");
}

/**
 * Sets up the progressive tile refinement system
 */
function initTileRefinement() {
  console.log("Setting up progressive refinement...");

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

  console.log("✅ Progressive refinement system ready");
  console.log(`🔄 Tile refinement will process up to ${tileDefinition} zoom levels`);
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
    console.warn("Error refining tile:", error);
  }
}

// ==============================
// EARTH INITIALIZATION
// ==============================

/**
 * Initializes the initial Earth tiles
 */
async function initEarthTiles() {
  console.log("Loading initial tiles...");
  await getMeshes(new TileId(0, 0, 0));
  console.log("✅ Initial tiles loaded");
}

/**
 * Initializes the Earth tile system in the given scene
 */
async function initializeEarth() {
  await tryInitializeAsync("🌍 Earth Tiles", initEarthTiles);
  await tryInitializeAsync("🔄 Tile Refinement", initTileRefinement);
  await tryInitializeAsync("🧊 Polar Caps", initPoleCaps);
}
