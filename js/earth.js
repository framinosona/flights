// ==============================
// EARTH TILE SYSTEM AND RENDERING
// ==============================

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
            new TileId(this.x * 2 + 1, this.y * 2 + 1, this.zoom + 1)
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
var getTileAngle = function (tileY, tileZ) {
    var tileR = 2 ** tileZ;
    var tileS = 2 * Math.PI / tileR;
    var y = Math.PI - tileY * tileS;

    if (2 * tileY < tileR) {
        // northern hemisphere, use bottom edge
        y -= tileS;
    }

    var gd = 2 * Math.atan(Math.exp(y)) - Math.PI / 2;
    return tileS * Math.cos(gd);
};

// Cache for storing vertex data to avoid recalculation
var vertexDataMap = {};

/**
 * Generates vertex data for a specific tile using Web Mercator projection
 * Creates a spherical mesh segment that represents a portion of the Earth
 * @param {number} tileY - Y coordinate of the tile
 * @param {number} tileZ - Zoom level of the tile
 * @returns {BABYLON.VertexData} Vertex data for the tile mesh
 */
var getVertexDataForTile = function (tileY, tileZ) {
    var key = tileY + ":" + tileZ;

    // Return cached vertex data if available
    if (key in vertexDataMap) {
        return vertexDataMap[key];
    }

    // Calculate tile parameters for Web Mercator projection
    var tileR = 2 ** tileZ;
    var tileS = 2 * Math.PI / tileR;
    var ty = Math.PI - tileY * tileS;

    //Set arrays for positions and indices
    var positions = [];
    var indices = [];
    var uvs = [];
    var subdivisions = 8; // Increased subdivisions for smoother geometry

    // Generate vertices for the tile mesh
    for (var sy = 0; sy <= subdivisions + .5; sy++) {
        var v = sy / subdivisions;
        var y = ty - tileS * v;
        var gd = 2 * Math.atan(Math.exp(y)) - Math.PI / 2; // Web Mercator to lat conversion
        var pz = Math.sin(gd);
        var cos = Math.cos(gd);

        for (var sx = 0; sx <= subdivisions + .5; sx++) {
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
};

// ==============================
// TILE MESH CREATION AND TEXTURE LOADING
// ==============================

/**
 * Creates a mesh for a specific tile with satellite imagery texture
 * @param {TileId} tileId - The tile identifier
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @returns {Promise<BABYLON.Mesh>} Promise that resolves to the tile mesh
 */
var getMeshForTile = function (tileId, scene) {
    // Vector pointing up for tile rotation calculations
    var up = new BABYLON.Vector3(0, 1, 0);

    // Calculate tile positioning parameters
    var tileR = 2 ** tileId.zoom;
    var tileS = 2 * Math.PI / tileR;
    var tx = tileId.x * tileS - Math.PI;
    var ty = Math.PI - tileId.y * tileS;

    //Create a custom mesh  
    var mesh = new BABYLON.Mesh("tile " + tileId, scene);
    mesh.isVisible = false; // Initially hidden until texture loads
    mesh.tileId = tileId;
    mesh.rotate(up, -2 * Math.PI * tileId.x / tileR); // Rotate for proper positioning

    //Apply vertexData to custom mesh
    var vertexData = getVertexDataForTile(tileId.y, tileId.zoom);
    vertexData.applyToMesh(mesh);

    // Create material from tile imagery
    var mat = new BABYLON.StandardMaterial("mat " + tileId, scene);
    mat.wireframe = false;
    mat.backFaceCulling = true;
    mat.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Slightly increased ambient
    mat.diffuseColor = new BABYLON.Color3(1, 1, 1); // Keep diffuse at full for texture
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Very low specular
    mat.specularPower = 64; // Higher specular power for tighter highlights
    
    // Get tile URL using the current tile provider
    const tileUrl = getTileUrl(tileId.x, tileId.y, tileId.zoom);

    // Return promise that resolves when texture is loaded
    var promise = new Promise((resolve, reject) => {
        var texture = new BABYLON.Texture(
            tileUrl,
            scene,
            false, // noMipmap - set to false for better quality
            true,  // invertY
            BABYLON.Texture.TRILINEAR_SAMPLINGMODE, // Better filtering
            async () => {
                // Texture loaded successfully - configure and optimize mesh
                mat.diffuseTexture = texture;
                mat.diffuseTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE; // Prevent wrapping artifacts
                mat.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE; // Prevent wrapping artifacts
                mat.diffuseTexture.anisotropicFilteringLevel = 4; // Improve texture quality at angles
                mat.freeze(); // Freeze material for performance
                mesh.material = mat;
                scene.addMesh(mesh);
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
            });
    });

    return promise;
};

// ==============================
// PROGRESSIVE TILE LOADING SYSTEM
// ==============================

// Array to track all loaded tiles for progressive refinement
var loadedTiles = [];

/**
 * Recursively loads tiles based on level-of-detail requirements
 * Determines whether to load a tile directly or subdivide into children
 * @param {TileId} tileId - The tile to process
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 */
var getMeshes = async function (tileId, scene) {
    var angle = getTileAngle(tileId.y, tileId.zoom);

    // Load tile directly if it's detailed enough for current view
    if (tileId.zoom > 0 && angle < Math.PI / 8) {
        var mesh = await getMeshForTile(tileId, scene);
        mesh.isVisible = true;
        mesh.tileAngle = angle;
        loadedTiles.push(mesh);
    }
    else {
        // Subdivide into higher detail tiles
        var children = tileId.children;
        getMeshes(children[0], scene);
        getMeshes(children[1], scene);
        getMeshes(children[2], scene);
        getMeshes(children[3], scene);
    }
};

/**
 * Sets up the progressive tile refinement system
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 */
var setupTileRefinement = function(scene) {
    let refinementActive = false; // Prevent concurrent refinements
    
    scene.registerAfterRender(() => {
        // Progressive tile refinement system - throttled to prevent visual artifacts
        if (loadedTiles.length > 0 && !refinementActive) {
            refinementActive = true;
            
            // Randomly select a tile for potential subdivision (less frequently)
            if (Math.random() < 0.1) { // Only 10% chance per frame
                var index = Math.floor(Math.random() * loadedTiles.length);
                var mesh = loadedTiles[index];
                
                if (mesh && mesh.tileId && !mesh.isDisposed()) {
                    loadedTiles[index] = loadedTiles.pop();
                    var tileId = mesh.tileId;

                    // Only subdivide if we haven't reached maximum detail level
                    if (tileId.zoom < 5) { // Reduced max zoom to prevent excessive detail
                        var children = tileId.children;
                        var child0 = getMeshForTile(children[0], scene);
                        var child1 = getMeshForTile(children[1], scene);
                        var child2 = getMeshForTile(children[2], scene);
                        var child3 = getMeshForTile(children[3], scene);

                        // Wait for all child tiles to load, then replace parent with children
                        Promise.all([child0, child1, child2, child3]).then(async () => {
                            try {
                                // Remove and dispose of parent tile
                                scene.removeMesh(mesh);
                                if (mesh.material) mesh.material.dispose();
                                mesh.dispose();
                                
                                // Add child tiles to scene
                                var mesh0 = await child0;
                                var mesh1 = await child1;
                                var mesh2 = await child2;
                                var mesh3 = await child3;
                                
                                // Validate meshes before adding
                                [mesh0, mesh1, mesh2, mesh3].forEach(childMesh => {
                                    if (childMesh && !childMesh.isDisposed()) {
                                        childMesh.isVisible = true;
                                        scene.addMesh(childMesh);
                                        loadedTiles.push(childMesh);
                                    }
                                });
                                
                                // Update spatial optimization structures
                                scene.createOrUpdateSelectionOctree();
                            } catch (error) {
                                console.warn('Error during tile refinement:', error);
                            } finally {
                                refinementActive = false;
                            }
                        }).catch(error => {
                            console.warn('Error loading child tiles:', error);
                            refinementActive = false;
                        });
                    } else {
                        refinementActive = false;
                    }
                } else {
                    refinementActive = false;
                }
            } else {
                refinementActive = false;
            }
        } else if (!refinementActive) {
            refinementActive = false;
        }
    });
};

// ==============================
// EARTH INITIALIZATION
// ==============================

/**
 * Initializes the Earth tile system in the given scene
 * @param {BABYLON.Scene} scene - The Babylon.js scene to add the Earth to
 */
var initializeEarth = function (scene) {
    console.group("🌍 Earth System");
    console.log('Setting up Earth tile system...');
    
    try {
        // Initialize the tile loading system with root tile
        console.log('Loading initial tiles...');
        getMeshes(new TileId(0, 0, 0), scene);
        
        // Setup progressive tile refinement
        console.log('Setting up progressive refinement...');
        setupTileRefinement(scene);
        
        console.log('✅ Earth system ready');
    } catch (error) {
        console.error('❌ Earth initialization failed:', error);
    } finally {
        console.groupEnd();
    }
};