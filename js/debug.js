// ==============================
// CAMERA DEBUG UTILITIES
// ==============================

/**
 * Enables camera position logging for debugging
 * @param {boolean} enabled - Whether to enable camera logging
 * @param {number} threshold - Minimum movement distance before logging (default: 0.1)
 */
window.enableCameraLogging = function(enabled = true, threshold = 0.1) {
    window.debugCameraLogging = enabled;
    window.cameraLogThreshold = threshold;
    window.lastLoggedPosition = null; // Reset last logged position
    
    console.log(`Camera logging ${enabled ? 'enabled' : 'disabled'}${enabled ? ` (threshold: ${threshold})` : ''}`);
};

/**
 * Disables camera position logging
 */
window.disableCameraLogging = function() {
    enableCameraLogging(false);
};

/**
 * Logs current camera position immediately
 */
window.logCameraPosition = function() {
    if (window.scene && window.scene.activeCamera) {
        const camera = window.scene.activeCamera;
        const position = camera.position;
        const target = camera.getTarget();
        
        console.log('Current Camera Position:', {
            position: {
                x: position.x.toFixed(3),
                y: position.y.toFixed(3),
                z: position.z.toFixed(3)
            },
            target: {
                x: target.x.toFixed(3),
                y: target.y.toFixed(3),
                z: target.z.toFixed(3)
            },
            radius: camera.radius.toFixed(3),
            alpha: (camera.alpha * 180 / Math.PI).toFixed(1) + '°',
            beta: (camera.beta * 180 / Math.PI).toFixed(1) + '°'
        });
    } else {
        console.warn('Camera not available');
    }
};

/**
 * Sets camera to a specific position
 * @param {number} x - X position
 * @param {number} y - Y position  
 * @param {number} z - Z position
 */
window.setCameraPosition = function(x, y, z) {
    if (window.scene && window.scene.activeCamera) {
        window.scene.activeCamera.setPosition(new BABYLON.Vector3(x, y, z));
        console.log(`Camera position set to (${x}, ${y}, ${z})`);
    } else {
        console.warn('Camera not available');
    }
};

/**
 * Sets camera using spherical coordinates (radius, alpha, beta)
 * @param {number} radius - Distance from target
 * @param {number} alpha - Horizontal angle in degrees
 * @param {number} beta - Vertical angle in degrees
 */
window.setCameraSpherical = function(radius, alpha, beta) {
    if (window.scene && window.scene.activeCamera) {
        const camera = window.scene.activeCamera;
        camera.radius = radius;
        camera.alpha = alpha * Math.PI / 180; // Convert to radians
        camera.beta = beta * Math.PI / 180;   // Convert to radians
        console.log(`Camera set to radius: ${radius}, alpha: ${alpha}°, beta: ${beta}°`);
    } else {
        console.warn('Camera not available');
    }
};

// ==============================
// SYSTEM STATUS DEBUG UTILITIES
// ==============================

/**
 * Gets comprehensive system status information
 * @returns {Object} System status for scene, earth, and flights
 */
window.getSystemStatus = function() {
    const status = {
        scene: {
            exists: !!window.scene,
            meshCount: window.scene ? window.scene.meshes.length : 0,
            activeCamera: !!window.scene?.activeCamera,
            lights: window.scene ? window.scene.lights.length : 0
        },
        earth: {
            tilesLoaded: window.scene ? window.scene.meshes.filter(m => m.name && m.name.includes('tile')).length : 0
        },
        flights: {
            systemInitialized: typeof flightSystem !== 'undefined' ? flightSystem.initialized : false,
            systemError: typeof flightSystem !== 'undefined' ? flightSystem.error : null,
            airportPoints: typeof flightSystem !== 'undefined' ? flightSystem.airportPoints.length : 0,
            flightArcs: typeof flightSystem !== 'undefined' ? flightSystem.flightArcs.length : 0,
            functionExists: typeof initializeFlights === 'function'
        }
    };
    
    console.group("🔍 System Status");
    console.log("Scene:", status.scene);
    console.log("Earth:", status.earth);
    console.log("Flights:", status.flights);
    console.groupEnd();
    
    return status;
};

/**
 * Forces flight system reinitialization
 */
window.reinitializeFlights = async function() {
    console.group("🔄 Flight System Reinitialization");
    
    try {
        if (typeof resetFlightSystem === 'function') {
            console.log("Resetting flight system...");
            await resetFlightSystem();
        }
        
        if (typeof initializeFlights === 'function' && window.scene) {
            console.log("Reinitializing flights...");
            const result = await initializeFlights(window.scene);
            console.log("Result:", result);
            return result;
        } else {
            console.error("Missing dependencies:", {
                initializeFlights: typeof initializeFlights,
                scene: !!window.scene
            });
        }
    } catch (error) {
        console.error("Reinitialization failed:", error);
    } finally {
        console.groupEnd();
    }
};

/**
 * Quick status check with minimal output
 */
window.quickStatus = function() {
    const flightCount = typeof flightSystem !== 'undefined' ? flightSystem.flightArcs.length : 0;
    const airportCount = typeof flightSystem !== 'undefined' ? flightSystem.airportPoints.length : 0;
    const tileCount = window.scene ? window.scene.meshes.filter(m => m.name && m.name.includes('tile')).length : 0;
    
    console.log(`📊 Quick Status: ${tileCount} tiles, ${airportCount} airports, ${flightCount} flights`);
    return { tiles: tileCount, airports: airportCount, flights: flightCount };
};

/**
 * Tests if the data files are accessible
 */
window.testDataFiles = async function() {
    console.group("🧪 Data File Tests");
    
    const tests = [
        { name: "Airport Coords", url: FLIGHT_CONFIG.dataPaths.airports },
        { name: "Flight Logs", url: FLIGHT_CONFIG.dataPaths.flights }
    ];
    
    for (const test of tests) {
        try {
            console.log(`Testing ${test.name}...`);
            const response = await fetch(test.url);
            if (response.ok) {
                console.log(`✅ ${test.name}: OK (${response.status})`);
            } else {
                console.error(`❌ ${test.name}: Failed (${response.status})`);
            }
        } catch (error) {
            console.error(`❌ ${test.name}: Error - ${error.message}`);
        }
    }
    
    console.groupEnd();
};
