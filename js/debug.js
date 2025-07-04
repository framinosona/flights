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
