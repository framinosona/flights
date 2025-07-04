// ==============================
// TILE PROVIDER SYSTEM
// ==============================

/**
 * Tile provider configuration for different map services
 */
const TileProviders = {
    OPENSTREETMAP: {
        name: 'OpenStreetMap',
        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    },
    OPENTOPOMAP: {
        name: 'OpenTopoMap',
        urlTemplate: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenTopoMap contributors',
        maxZoom: 17
    },
    CARTODB_POSITRON: {
        name: 'CartoDB Positron',
        urlTemplate: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        attribution: '© CartoDB',
        maxZoom: 19
    },
    CARTODB_DARK: {
        name: 'CartoDB Dark',
        urlTemplate: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        attribution: '© CartoDB',
        maxZoom: 19
    },
    OPENSTREETMAP_DARK: {
        name: 'OpenStreetMap Dark',
        urlTemplate: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
        attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors',
        maxZoom: 19
    },
    ESRI_WORLD_IMAGERY: {
        name: 'ESRI World Imagery',
        urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© ESRI',
        maxZoom: 19
    },
    BING_SATELLITE: {
        name: 'Bing Satellite',
        urlTemplate: null, // Special handling for quadkey system
        attribution: '© Microsoft',
        maxZoom: 19
    }
};

// Current active tile provider
let currentTileProvider = TileProviders.ESRI_WORLD_IMAGERY;

/**
 * Converts tile coordinates to Bing Maps quadkey format
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate  
 * @param {number} z - Zoom level
 * @returns {string} Quadkey string
 */
function tileToQuadkey(x, y, z) {
    let quadkey = "";
    for (let i = z; i > 0; i--) {
        let digit = 0;
        const mask = 1 << (i - 1);
        if ((x & mask) !== 0) digit++;
        if ((y & mask) !== 0) digit += 2;
        quadkey += digit.toString();
    }
    return quadkey;
}

/**
 * Gets a tile URL for given coordinates using the current tile provider
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {number} z - Zoom level
 * @returns {string} Complete tile URL
 */
function getTileUrl(x, y, z) {
    const provider = currentTileProvider;
    //console.log(`Using tile provider: ${provider.name} for tile (${x}, ${y}, ${z})`);
    
    if (provider === TileProviders.BING_SATELLITE) {
        // Special handling for Bing's quadkey system
        const quadkey = tileToQuadkey(x, y, z);
        return `https://t.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/${quadkey}?${virtualEarthParams}`;
    } else {
        // Standard XYZ tile system
        return provider.urlTemplate
            .replace('{x}', x.toString())
            .replace('{y}', y.toString())
            .replace('{z}', z.toString());
    }
}

/**
 * Sets the active tile provider
 * @param {Object} provider - Tile provider configuration from TileProviders
 */
function setTileProvider(provider) {
    currentTileProvider = provider;
    console.log(`Switched to tile provider: ${provider.name}`);
}

// ==============================
// GLOBAL VARIABLES AND INITIALIZATION
// ==============================

var canvas = document.getElementById("renderCanvas");
var virtualEarthParams = "mkt=en-US&it=Z,L"; // Parameters for Bing Maps imagery (it=A&n=z)


/**
 * Starts the main render loop for the Babylon.js engine
 * @param {BABYLON.Engine} engine - The Babylon.js engine instance
 * @param {HTMLCanvasElement} canvas - The canvas element to render to
 */
var startRenderLoop = function (engine, canvas) {
    engine.runRenderLoop(function () {
        if (sceneToRender && sceneToRender.activeCamera) {
            sceneToRender.render();
        }
    });
}

// Global engine and scene variables
var engine = null;
var scene = null;
var sceneToRender = null;

/**
 * Creates a default Babylon.js engine with optimized settings
 * @returns {BABYLON.Engine} Configured Babylon.js engine
 */
var createDefaultEngine = function () { return new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false }); };

// ==============================
// TILE SYSTEM CLASSES AND UTILITIES
// ==============================

/**
 * Main scene creation function that sets up the 3D Earth with progressive tile loading
 * @returns {BABYLON.Scene} The configured Babylon.js scene
 */
var createScene = function () {

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
                new TileId(this.x * 2 + 1, this.y * 2 + 1, this.zoom + 1)];
        }
    }

    // ==============================
    // SCENE SETUP AND LIGHTING
    // ==============================

    var scene = new BABYLON.Scene(engine);
    scene.ambientColor = new BABYLON.Color3(0.2, 0.2, 0.3); // Reduced ambient light for more realistic look
    scene.clearColor = BABYLON.Color3.Black;

    // Main directional light (sun)
    var sunLight = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(0.5, -0.5, 0.8), scene);
    sunLight.intensity = 0.8; // Reduced intensity
    sunLight.diffuse = new BABYLON.Color3(1.0, 0.95, 0.8); // Slightly warm sunlight
    
    // Subtle fill light to prevent complete darkness
    var fillLight = new BABYLON.DirectionalLight("fill", new BABYLON.Vector3(-0.3, 0.2, -0.5), scene);
    fillLight.intensity = 0.3;
    fillLight.diffuse = new BABYLON.Color3(0.4, 0.6, 0.8); // Cool blue fill light

    // ==============================
    // CAMERA SETUP AND CONTROLS
    // ==============================

    var camera = new BABYLON.ArcRotateCamera("camera1", 0, 0, 0, new BABYLON.Vector3(0, 0, 0), scene);
    camera.setPosition(new BABYLON.Vector3(0, 1, -2));
    camera.lowerRadiusLimit = 1.05;
    camera.upperRadiusLimit = 3;
    camera.wheelDeltaPercentage = .01;
    camera.minZ = .01;
    camera.maxZ = 5;
    camera.attachControl(canvas, true);

    // Vector pointing up for tile rotation calculations
    var up = new BABYLON.Vector3(0, 1, 0);

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
        var subdivisions = 4; // Number of subdivisions for mesh detail

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
        vertexData.normals = positions; // Use positions as normals for sphere

        // Cache the vertex data for future use
        vertexDataMap[key] = vertexData;
        return vertexData;
    }

    // ==============================
    // TILE MESH CREATION AND TEXTURE LOADING
    // ==============================

    /**
     * Creates a mesh for a specific tile with satellite imagery texture
     * Uses Bing Maps quadkey system for tile identification
     * @param {TileId} tileId - The tile identifier
     * @returns {Promise<BABYLON.Mesh>} Promise that resolves to the tile mesh
     */
    var getMeshForTile = function (tileId) {

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
        mat.ambientColor = new BABYLON.Color3(0.6, 0.6, 0.6); // Reduced ambient contribution
        mat.diffuseColor = new BABYLON.Color3(1, 1, 1); // Keep diffuse at full for texture
        mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Reduced specular for less shine
        mat.specularPower = 32; // Lower specular power for softer highlights
        
        // Get tile URL using the current tile provider
        const tileUrl = getTileUrl(tileId.x, tileId.y, tileId.zoom);

        // Return promise that resolves when texture is loaded
        var promise = new Promise((resolve, reject) => {
            var texture = new BABYLON.Texture(
                tileUrl,
                scene,
                false,
                true,
                BABYLON.Texture.LINEAR_SAMPLINGMODE,
                async () => {
                    // Texture loaded successfully - configure and optimize mesh
                    mat.diffuseTexture = texture;
                    mat.diffuseTexture.wrapU = 0;
                    mat.diffuseTexture.wrapV = 0;
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
     */
    var getMeshes = async function (tileId) {
        var angle = getTileAngle(tileId.y, tileId.zoom);

        // Load tile directly if it's detailed enough for current view
        if (tileId.zoom > 0 && angle < Math.PI / 8) {
            var mesh = await getMeshForTile(tileId);
            mesh.isVisible = true;
            mesh.tileAngle = angle;
            loadedTiles.push(mesh);
        }
        else {
            // Subdivide into higher detail tiles
            var children = tileId.children;
            getMeshes(children[0]);
            getMeshes(children[1]);
            getMeshes(children[2]);
            getMeshes(children[3]);
        }
    };

    // Initialize the tile loading system with root tile
    getMeshes(new TileId(0, 0, 0));

    // ==============================
    // DYNAMIC CAMERA AND TILE REFINEMENT SYSTEM
    // ==============================

    // Track camera radius for sensitivity adjustments
    var oldRadius = -1;

    /**
     * Register after-render callback for dynamic tile refinement and camera updates
     * This runs every frame to:
     * 1. Adjust camera sensitivity based on zoom level
     * 2. Progressively refine tiles by subdividing lower resolution tiles
     */
    scene.registerAfterRender(() => {
        // Update camera sensitivity based on zoom level for better user experience
        if (camera.radius != oldRadius) {
            oldRadius = camera.radius;
            camera.angularSensibilityX = camera.angularSensibilityY = 2000 / Math.log2(camera.radius);
        }

        // Progressive tile refinement system
        if (loadedTiles.length > 0) {
            // Randomly select a tile for potential subdivision
            var index = Math.floor(Math.random() * loadedTiles.length);
            var mesh = loadedTiles[index];
            loadedTiles[index] = loadedTiles.pop();
            var tileId = mesh.tileId;

            // Only subdivide if we haven't reached maximum detail level
            if (tileId.zoom < 5) {
                var children = tileId.children;
                var child0 = getMeshForTile(children[0]);
                var child1 = getMeshForTile(children[1]);
                var child2 = getMeshForTile(children[2]);
                var child3 = getMeshForTile(children[3]);

                // Wait for all child tiles to load, then replace parent with children
                Promise.all([child0, child1, child2, child3]).then(async () => {
                    // Remove and dispose of parent tile
                    scene.removeMesh(mesh);
                    mesh.dispose();
                    
                    // Add child tiles to scene
                    var mesh0 = await child0;
                    var mesh1 = await child1;
                    var mesh2 = await child2;
                    var mesh3 = await child3;
                    mesh0.isVisible = true;
                    mesh1.isVisible = true;
                    mesh2.isVisible = true;
                    mesh3.isVisible = true;
                    scene.addMesh(mesh0);
                    scene.addMesh(mesh1);
                    scene.addMesh(mesh2);
                    scene.addMesh(mesh3);
                    
                    // Add child tiles to loaded tiles array for future refinement
                    loadedTiles.push(mesh0);
                    loadedTiles.push(mesh1);
                    loadedTiles.push(mesh2);
                    loadedTiles.push(mesh3);
                    
                    // Update spatial optimization structures
                    scene.createOrUpdateSelectionOctree();
                });
            }
        }
    });
    initializeFlights(scene);
    return scene;
};
// ==============================
// APPLICATION INITIALIZATION AND STARTUP
// ==============================

/**
 * Main initialization function that sets up the Babylon.js engine and scene
 * Handles engine creation, error recovery, and starts the render loop
 */
window.initFunction = async function () {

    /**
     * Attempts to create the Babylon.js engine with error handling
     * Falls back to default engine creation if custom creation fails
     * @returns {Promise<BABYLON.Engine>} The created engine instance
     */
    var asyncEngineCreation = async function () {
        try {
            return createDefaultEngine();
        } catch (e) {
            console.log("the available createEngine function failed. Creating the default engine instead");
            return createDefaultEngine();
        }
    }

    // Create the engine instance
    window.engine = await asyncEngineCreation();

    // Configure audio engine if available
    const engineOptions = window.engine.getCreationOptions?.();
    if (!engineOptions || engineOptions.audioEngine !== false) {
        // Audio engine configuration would go here
    }
    
    // Validate engine creation
    if (!engine) throw 'engine should not be null.';
    
    // Start the render loop and create the scene
    startRenderLoop(engine, canvas);
    window.scene = createScene();
};

// Initialize the application and set up scene rendering
initFunction().then(() => {
    sceneToRender = scene
});

// ==============================
// EVENT HANDLERS
// ==============================

// Handle window resize events to maintain proper rendering
window.addEventListener("resize", function () {
    engine.resize();
});

// ==============================
// TILE PROVIDER UTILITIES
// ==============================

/**
 * Switches to OpenStreetMap tiles
 */
window.useOpenStreetMap = function() {
    setTileProvider(TileProviders.OPENSTREETMAP);
};

/**
 * Switches to OpenTopoMap tiles (shows topographical features)
 */
window.useOpenTopoMap = function() {
    setTileProvider(TileProviders.OPENTOPOMAP);
};

/**
 * Switches to CartoDB Positron tiles (clean, minimal style)
 */
window.useCartoDBPositron = function() {
    setTileProvider(TileProviders.CARTODB_POSITRON);
};

/**
 * Switches to CartoDB Dark tiles (dark theme)
 */
window.useCartoDBDark = function() {
    setTileProvider(TileProviders.CARTODB_DARK);
};

/**
 * Switches to OpenStreetMap Dark tiles
 */
window.useOpenStreetMapDark = function() {
    setTileProvider(TileProviders.OPENSTREETMAP_DARK);
};

/**
 * Switches to ESRI World Imagery (satellite)
 */
window.useESRIWorldImagery = function() {
    setTileProvider(TileProviders.ESRI_WORLD_IMAGERY);
};

/**
 * Switches back to Bing Satellite tiles
 */
window.useBingSatellite = function() {
    setTileProvider(TileProviders.BING_SATELLITE);
};

/**
 * Lighting control functions
 */
window.setRealisticLighting = function() {
    if (window.scene) {
        // Find the lights in the scene
        const sunLight = window.scene.getLightByName("sun");
        const fillLight = window.scene.getLightByName("fill");
        
        if (sunLight && fillLight) {
            // Realistic earth lighting
            sunLight.intensity = 0.8;
            fillLight.intensity = 0.3;
            window.scene.ambientColor = new BABYLON.Color3(0.2, 0.2, 0.3);
            console.log("✅ Applied realistic lighting");
        }
    }
};

window.setBrightLighting = function() {
    if (window.scene) {
        const sunLight = window.scene.getLightByName("sun");
        const fillLight = window.scene.getLightByName("fill");
        
        if (sunLight && fillLight) {
            // Bright, even lighting
            sunLight.intensity = 1.2;
            fillLight.intensity = 0.8;
            window.scene.ambientColor = new BABYLON.Color3(0.6, 0.6, 0.6);
            console.log("✅ Applied bright lighting");
        }
    }
};

window.setDarkLighting = function() {
    if (window.scene) {
        const sunLight = window.scene.getLightByName("sun");
        const fillLight = window.scene.getLightByName("fill");
        
        if (sunLight && fillLight) {
            // Dark, moody lighting
            sunLight.intensity = 0.4;
            fillLight.intensity = 0.1;
            window.scene.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.15);
            console.log("✅ Applied dark lighting");
        }
    }
};

/**
 * Gets information about the current tile provider
 */
window.getCurrentTileProvider = function() {
    return {
        name: currentTileProvider.name,
        attribution: currentTileProvider.attribution,
        maxZoom: currentTileProvider.maxZoom
    };
};

/**
 * Tests a tile URL by attempting to load it
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {number} z - Zoom level
 * @returns {Promise} Promise that resolves if tile loads successfully
 */
window.testTileUrl = function(x = 0, y = 0, z = 1) {
    return new Promise((resolve, reject) => {
        const url = getTileUrl(x, y, z);
        const img = new Image();
        img.onload = () => {
            console.log(`✅ Tile loaded successfully: ${url}`);
            resolve(url);
        };
        img.onerror = () => {
            console.error(`❌ Failed to load tile: ${url}`);
            reject(url);
        };
        img.src = url;
    });
};
