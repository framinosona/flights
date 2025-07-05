// ==============================
// SCENE SETUP AND CORE BABYLON.JS FUNCTIONALITY
// ==============================

// Global variables
var canvas = document.getElementById("renderCanvas");
var engine = null;
var scene = null;
var sceneToRender = null;

// Validate canvas element exists
if (!canvas) {
    console.error("Canvas element 'renderCanvas' not found!");
    throw new Error("Required canvas element is missing");
}

/**
 * Creates a default Babylon.js engine with optimized settings
 * @returns {BABYLON.Engine} Configured Babylon.js engine
 */
var createDefaultEngine = function () { 
    try {
        return new BABYLON.Engine(canvas, true, { 
            preserveDrawingBuffer: true, 
            stencil: true, 
            disableWebGL2Support: false,
            adaptToDeviceRatio: true, // Better for high-DPI displays
            antialias: true, // Enable antialiasing
            powerPreference: "high-performance" // Request high-performance GPU
        }); 
    } catch (error) {
        console.error("Failed to create Babylon.js engine:", error);
        throw error;
    }
};

/**
 * Starts the main render loop for the Babylon.js engine
 * @param {BABYLON.Engine} engine - The Babylon.js engine instance
 * @param {HTMLCanvasElement} canvas - The canvas element to render to
 */
var startRenderLoop = function (engine, canvas) {
    if (!engine) {
        console.error("Cannot start render loop: engine is null");
        return;
    }
    
    engine.runRenderLoop(function () {
        if (sceneToRender && sceneToRender.activeCamera) {
            sceneToRender.render();
        }
    });
    
    console.log("✅ Render loop started successfully");
};

/**
 * Creates and configures the main scene with lighting and camera
 * @param {BABYLON.Engine} engine - The Babylon.js engine instance
 * @returns {BABYLON.Scene} The configured scene
 */
var createScene = function (engine) {
    if (!engine) {
        throw new Error("Cannot create scene: engine is null");
    }
    
    // ==============================
    // SCENE SETUP AND LIGHTING
    // ==============================

    var scene = new BABYLON.Scene(engine);
    scene.ambientColor = new BABYLON.Color3(0.2, 0.2, 0.3); // Reduced ambient light for more realistic look
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Ensure solid black background
    
    // Performance optimizations (but keep auto-clear enabled for proper background)
    scene.freezeActiveMeshes(); // Optimize rendering for static meshes
    scene.autoClear = true; // Enable automatic clearing for proper background
    scene.autoClearDepthAndStencil = true;

    // Main directional light (sun)
    var sunLight = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(0.5, -0.5, 0.8), scene);
    sunLight.intensity = 0.6; // Reduced intensity for softer lighting
    sunLight.diffuse = new BABYLON.Color3(1.0, 0.98, 0.95); // Slightly warm, more neutral sunlight
    
    // Subtle fill light to prevent complete darkness
    var fillLight = new BABYLON.DirectionalLight("fill", new BABYLON.Vector3(-0.3, 0.2, -0.5), scene);
    fillLight.intensity = 0.4; // Increased fill light
    fillLight.diffuse = new BABYLON.Color3(0.3, 0.4, 0.6); // Cool blue fill light

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
    
    // Store lights globally for easy access
    window.sunLight = sunLight;
    window.fillLight = fillLight;
    
    console.log("✅ Scene created successfully with camera and lighting");
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
            camera.angularSensibilityX = camera.angularSensibilityY = 6000 / Math.log2(camera.radius);
            camera.wheelPrecision = 1000 / Math.log2(camera.radius);
        }
    });
};

// ==============================
// LIGHTING CONTROL UTILITIES
// ==============================

/**
 * Gets the main lights from the scene
 * @returns {Object} Object containing sunLight and fillLight references
 */
var getSceneLights = function() {
    const sunLight = window.sunLight || (window.scene && window.scene.getLightByName("sun"));
    const fillLight = window.fillLight || (window.scene && window.scene.getLightByName("fill"));
    
    if (!sunLight || !fillLight) {
        console.warn("Scene lights not found. Make sure scene is initialized.");
        return { sunLight: null, fillLight: null };
    }
    
    return { sunLight, fillLight };
};

/**
 * Lighting control functions
 */
window.setRealisticLighting = function() {
    const { sunLight, fillLight } = getSceneLights();
    
    if (sunLight && fillLight && window.scene) {
        // Realistic earth lighting
        sunLight.intensity = 0.8;
        fillLight.intensity = 0.3;
        window.scene.ambientColor = new BABYLON.Color3(0.2, 0.2, 0.3);
        console.log("✅ Applied realistic lighting");
    } else {
        console.warn("⚠️ Could not apply realistic lighting - scene or lights not available");
    }
};

window.setBrightLighting = function() {
    const { sunLight, fillLight } = getSceneLights();
    
    if (sunLight && fillLight && window.scene) {
        // Bright, even lighting
        sunLight.intensity = 1.2;
        fillLight.intensity = 0.8;
        window.scene.ambientColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        console.log("✅ Applied bright lighting");
    } else {
        console.warn("⚠️ Could not apply bright lighting - scene or lights not available");
    }
};

window.setDarkLighting = function() {
    const { sunLight, fillLight } = getSceneLights();
    
    if (sunLight && fillLight && window.scene) {
        // Dark, moody lighting
        sunLight.intensity = 0.4;
        fillLight.intensity = 0.1;
        window.scene.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.15);
        console.log("✅ Applied dark lighting");
    } else {
        console.warn("⚠️ Could not apply dark lighting - scene or lights not available");
    }
};

// ==============================
// ERROR HANDLING UTILITIES
// ==============================

/**
 * Shows a user-friendly error message overlay
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showErrorMessage(title, message) {
    try {
        // Remove any existing error overlay
        const existingOverlay = document.getElementById('error-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Create error overlay
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-overlay';
        errorDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(220, 53, 69, 0.95); color: white; padding: 20px;
            border-radius: 10px; font-family: Arial, sans-serif; text-align: center;
            z-index: 1000; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.2);
        `;
        
        errorDiv.innerHTML = `
            <h3 style="margin-top: 0; color: #fff;">🚫 ${title}</h3>
            <p style="margin: 10px 0; line-height: 1.4;">${message}</p>
            <button onclick="this.parentElement.remove()" style="
                background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);
                padding: 8px 16px; border-radius: 5px; cursor: pointer; margin-top: 10px;
                font-size: 14px;
            ">Close</button>
            <p style="margin-bottom: 0; font-size: 12px; opacity: 0.8; margin-top: 10px;">
                Check browser console for technical details.
            </p>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv && errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
        
    } catch (error) {
        console.error("Error showing error message:", error);
        // Fallback to alert if DOM manipulation fails
        alert(`${title}: ${message}`);
    }
}

// ==============================
// APPLICATION INITIALIZATION
// ==============================

/**
 * Main initialization function that sets up the Babylon.js engine and scene
 * Handles engine creation, error recovery, and starts the render loop
 */
window.initFunction = async function () {
    console.group("🚀 3D Flight Visualization - Initialization");
    
    try {
        console.log("Starting application initialization...");
        
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
        console.group("🔧 Engine Creation");
        window.engine = await asyncEngineCreation();

        // Configure audio engine if available
        const engineOptions = window.engine.getCreationOptions?.();
        if (!engineOptions || engineOptions.audioEngine !== false) {
            // Audio engine configuration would go here
        }
        
        // Validate engine creation
        if (!window.engine) {
            throw new Error('Engine creation failed - engine should not be null');
        }
        
        console.log("✅ Babylon.js engine created successfully");
        console.groupEnd(); // End Engine Creation group
        
        // Start the render loop and create the scene
        startRenderLoop(window.engine, canvas);
        
        // Create the main scene
        console.group("🎬 Scene Creation");
        window.scene = createScene(window.engine);
        
        if (!window.scene) {
            throw new Error('Scene creation failed - scene should not be null');
        }
        console.log("✅ Scene setup completed");
        console.groupEnd(); // End Scene Creation group
        
        // Initialize the Earth (this will be called from earth.js)
        console.group("🌍 Earth Initialization");
        if (typeof initializeEarth === 'function') {
            console.log("Starting Earth tile system...");
            initializeEarth(window.scene);
            console.log("✅ Earth tile system ready");
        } else {
            console.warn("⚠️ initializeEarth function not found");
        }
        console.groupEnd(); // End Earth Initialization group
        
        // Initialize flights (enhanced async version with error handling)
        console.group("✈️ Flight System Initialization");
        if (typeof initializeFlights === 'function') {
            console.log("Starting flight visualization...");
            
            try {
                // Call the function and handle both Promise and non-Promise returns
                const result = initializeFlights(window.scene);
                
                // Check if the result is a Promise
                if (result && typeof result.then === 'function') {
                    // Handle as Promise
                    result
                        .then(initResult => {
                            if (initResult && initResult.success) {
                                console.log("✅ Flight system initialized:", initResult.message);
                                if (initResult.stats) {
                                    console.log(`📊 Loaded ${initResult.stats.airports} airports, ${initResult.stats.flights} flights`);
                                }
                            } else if (initResult && !initResult.success) {
                                console.error("❌ Flight system failed:", initResult.error);
                                showErrorMessage("Flight System Error", 
                                    `Failed to initialize flight visualization: ${initResult.error}`);
                            } else {
                                console.log("✅ Flight system initialized successfully");
                            }
                        })
                        .catch(error => {
                            console.error("❌ Flight initialization error:", error);
                            showErrorMessage("Flight System Error", 
                                `Unexpected error initializing flights: ${error.message}`);
                        });
                } else {
                    // Handle as synchronous function (legacy mode)
                    console.log("✅ Flight system initialized (legacy synchronous mode)");
                }
            } catch (error) {
                console.error("❌ Error calling initializeFlights:", error);
                showErrorMessage("Flight System Error", 
                    `Error initializing flights: ${error.message}`);
            }
        } else {
            console.warn("⚠️ initializeFlights function not found");
        }
        console.groupEnd(); // End Flight System Initialization group
        
        console.log("🎉 Application initialized successfully!");
        
    } catch (error) {
        console.error("❌ Failed to initialize application:", error);
        
        // Display user-friendly error message
        showErrorMessage("Initialization Failed", 
            "The 3D visualization could not be started. Please refresh the page and try again.");
        
        throw error;
    } finally {
        console.groupEnd(); // End main initialization group
    }
};

// Initialize the application and set up scene rendering
initFunction().then(() => {
    sceneToRender = window.scene; // Use window.scene for consistency
    console.log("🎬 Scene ready for rendering");
}).catch((error) => {
    console.error("💥 Application startup failed:", error);
});

// ==============================
// CLEANUP AND DISPOSAL
// ==============================

/**
 * Properly disposes of all Babylon.js resources
 */
window.disposeScene = function() {
    try {
        if (window.scene) {
            window.scene.dispose();
            window.scene = null;
            console.log("✅ Scene disposed");
        }
        
        if (window.engine) {
            window.engine.dispose();
            window.engine = null;
            console.log("✅ Engine disposed");
        }
        
        sceneToRender = null;
        console.log("🧹 All resources cleaned up");
    } catch (error) {
        console.error("❌ Error during cleanup:", error);
    }
};

/**
 * Gets current performance statistics
 */
window.getPerformanceInfo = function() {
    if (window.engine && window.scene) {
        return {
            fps: window.engine.getFps().toFixed(2),
            deltaTime: window.engine.getDeltaTime().toFixed(2),
            activeMeshes: window.scene.getActiveMeshes().length,
            totalMeshes: window.scene.meshes.length,
            materials: window.scene.materials.length,
            textures: window.scene.textures.length,
            drawCalls: window.engine.getGlInfo().drawCalls
        };
    } else {
        console.warn("Performance info not available - scene not initialized");
        return null;
    }
};

// ==============================
// EVENT HANDLERS
// ==============================

// Handle window resize events to maintain proper rendering
window.addEventListener("resize", function () {
    if (window.engine) {
        try {
            window.engine.resize();
            console.log("📐 Engine resized for new window dimensions");
        } catch (error) {
            console.warn("⚠️ Error during engine resize:", error);
        }
    }
});

// Handle visibility change to pause/resume rendering
document.addEventListener('visibilitychange', function() {
    if (window.engine) {
        if (document.hidden) {
            window.engine.stopRenderLoop();
            console.log("⏸️ Render loop paused (tab hidden)");
        } else {
            startRenderLoop(window.engine, canvas);
            console.log("▶️ Render loop resumed (tab visible)");
        }
    }
});

// Handle page unload to cleanup resources
window.addEventListener('beforeunload', function() {
    if (typeof window.disposeScene === 'function') {
        window.disposeScene();
    }
});
