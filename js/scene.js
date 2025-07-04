// ==============================
// SCENE SETUP AND CORE BABYLON.JS FUNCTIONALITY
// ==============================

// Global variables
var canvas = document.getElementById("renderCanvas");
var engine = null;
var scene = null;
var sceneToRender = null;

/**
 * Creates a default Babylon.js engine with optimized settings
 * @returns {BABYLON.Engine} Configured Babylon.js engine
 */
var createDefaultEngine = function () { 
    return new BABYLON.Engine(canvas, true, { 
        preserveDrawingBuffer: true, 
        stencil: true, 
        disableWebGL2Support: false 
    }); 
};

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
};

/**
 * Creates and configures the main scene with lighting and camera
 * @param {BABYLON.Engine} engine - The Babylon.js engine instance
 * @returns {BABYLON.Scene} The configured scene
 */
var createScene = function (engine) {
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
    camera.setPosition(new BABYLON.Vector3(-1.949, 1.861, -0.225)); // Europe centric position
    camera.lowerRadiusLimit = 1.05;
    camera.upperRadiusLimit = 3;
    camera.wheelDeltaPercentage = .01;
    camera.minZ = .01;
    camera.maxZ = 5;
    camera.attachControl(canvas, true);

    // Setup camera sensitivity and debug logging
    setupCameraControls(camera, scene);

    return scene;
};

/**
 * Sets up camera controls and debug logging system
 * @param {BABYLON.ArcRotateCamera} camera - The camera to configure
 * @param {BABYLON.Scene} scene - The scene containing the camera
 */
var setupCameraControls = function(camera, scene) {
    // Track camera radius for sensitivity adjustments
    var oldRadius = -1;

    /**
     * Register after-render callback for camera updates and debug logging
     */
    scene.registerAfterRender(() => {
        // Debug camera position logging
        if (window.debugCameraLogging) {
            const currentPosition = camera.position.clone();
            const currentTarget = camera.getTarget().clone();
            
            // Only log if camera has moved significantly
            if (!window.lastLoggedPosition || 
                BABYLON.Vector3.Distance(currentPosition, window.lastLoggedPosition) > (window.cameraLogThreshold || 0.1)) {
                
                console.log('Camera Debug Info:', {
                    position: {
                        x: currentPosition.x.toFixed(3),
                        y: currentPosition.y.toFixed(3),
                        z: currentPosition.z.toFixed(3)
                    },
                    target: {
                        x: currentTarget.x.toFixed(3),
                        y: currentTarget.y.toFixed(3),
                        z: currentTarget.z.toFixed(3)
                    },
                    radius: camera.radius.toFixed(3),
                    alpha: (camera.alpha * 180 / Math.PI).toFixed(1) + '°',
                    beta: (camera.beta * 180 / Math.PI).toFixed(1) + '°'
                });
                
                window.lastLoggedPosition = currentPosition;
            }
        }

        // Update camera sensitivity based on zoom level for better user experience
        if (camera.radius != oldRadius) {
            oldRadius = camera.radius;
            camera.angularSensibilityX = camera.angularSensibilityY = 2000 / Math.log2(camera.radius);
        }
    });
};

// ==============================
// LIGHTING CONTROL UTILITIES
// ==============================

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

// ==============================
// APPLICATION INITIALIZATION
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
    
    // Create the main scene
    window.scene = createScene(engine);
    
    // Initialize the Earth (this will be called from earth.js)
    if (typeof initializeEarth === 'function') {
        initializeEarth(window.scene);
    }
    
    // Initialize flights (this will be called from flights.js)
    if (typeof initializeFlights === 'function') {
        initializeFlights(window.scene);
    }
};

// Initialize the application and set up scene rendering
initFunction().then(() => {
    sceneToRender = scene;
});

// ==============================
// EVENT HANDLERS
// ==============================

// Handle window resize events to maintain proper rendering
window.addEventListener("resize", function () {
    if (engine) {
        engine.resize();
    }
});
