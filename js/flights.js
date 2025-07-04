// ==============================
// FLIGHT VISUALIZATION SYSTEM
// ==============================

// Global variables for flight data
var airportCoords = null;
var flightLogs = null;

// ==============================
// DATA LOADING FUNCTIONS
// ==============================

/**
 * Loads airport coordinate data from JSON file
 * Fetches IATA airport codes with their latitude/longitude coordinates
 * @returns {Promise<Object>} Promise that resolves to airport coordinates object
 */
var getAirportCoords = async function () {

    var promise = new Promise((resolve, reject) => {
        fetch("js/data/airports_by_iata.json")
            .then(response => response.json())
            .then(data => {
                flightLogs = data;
                resolve(flightLogs);
            })
            .then(data => {
                airportCoords = data;
                //console.log("Airport coordinates loaded from file");
                resolve(airportCoords);
            })
            .catch(error => {
                console.error("Error loading airport coordinates:", error);
                reject(error);
            });
    });

    return promise;
};

/**
 * Loads flight log data from JSON file
 * Contains flight routes with origin and destination airport codes
 * @returns {Promise<Array>} Promise that resolves to flight logs array
 */
var getFlightLogs = async function () {
    var promise = new Promise((resolve, reject) => {
        fetch("js/data/flight_logs.json")
            .then(response => response.json())
            .then(data => {
                flightLogs = data;
                resolve(flightLogs);
            })
            .catch(error => {
                console.error("Error loading flight logs:", error);
                reject(error);
            });
    });

    return promise;
};
// ==============================
// AIRPORT POINT VISUALIZATION
// ==============================

// Global variable to track created airport points
var airportPoints = [];

/**
 * Extracts distinct airports from flight logs to avoid duplicates
 * @param {Object} airportCoords - Airport coordinates data
 * @param {Object} flightLogs - Flight logs data
 * @returns {Array} Array of unique airport objects with their data
 */
var getDistinctAirports = function(airportCoords, flightLogs) {
    const distinctAirports = new Map(); // Use Map to avoid duplicates
    const flightArray = Object.values(flightLogs);
    
    // Collect all unique airport codes from flight logs
    flightArray.forEach(flight => {
        // Add origin airport
        if (flight.from_code && airportCoords[flight.from_code]) {
            const airportData = airportCoords[flight.from_code];
            distinctAirports.set(flight.from_code, {
                code: flight.from_code,
                name: flight.from,
                airport: airportData.airport,
                country_code: airportData.country_code,
                region: airportData.region,
                latitude: airportData.latitude,
                longitude: airportData.longitude,
                icao: airportData.icao
            });
        }
        
        // Add destination airport
        if (flight.to_code && airportCoords[flight.to_code]) {
            const airportData = airportCoords[flight.to_code];
            distinctAirports.set(flight.to_code, {
                code: flight.to_code,
                name: flight.to,
                airport: airportData.airport,
                country_code: airportData.country_code,
                region: airportData.region,
                latitude: airportData.latitude,
                longitude: airportData.longitude,
                icao: airportData.icao
            });
        }
    });
    
    //console.log(`Found ${distinctAirports.size} distinct airports`);
    return Array.from(distinctAirports.values());
};

/**
 * Creates a 3D point/sphere at an airport location
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @param {Object} airport - Airport data object
 * @param {number} radius - Distance from Earth center (default: 1.005)
 * @returns {BABYLON.Mesh} The created airport point mesh
 */
var createAirportPoint = function(scene, airport, radius) {
    radius = radius || 1; // Slightly above Earth surface
    
    // Convert latitude/longitude to radians
    var latRad = airport.latitude * Math.PI / 180;
    var lngRad = (airport.longitude - 180) * Math.PI / 180; // Adjust longitude for coordinate system
    
    // Convert to 3D coordinates (matching the tile system)
    var position = new BABYLON.Vector3(
        radius * Math.cos(lngRad) * Math.cos(latRad),
        radius * Math.sin(latRad),
        radius * Math.sin(lngRad) * Math.cos(latRad)
    );
    
    // Create a small sphere for the airport point
    var airportSphere = BABYLON.MeshBuilder.CreateSphere(
        `airport_${airport.code}`, 
        { diameter: 0.008 }, // Small but visible size
        scene
    );
    
    // Position the sphere at the airport location
    airportSphere.position = position;
    
    // Create glowing material for the airport point
    var pointMaterial = new BABYLON.StandardMaterial(`airportMat_${airport.code}`, scene);
    pointMaterial.emissiveColor = new BABYLON.Color3(1, 0.8, 0.2); // Warm yellow/orange glow
    pointMaterial.diffuseColor = new BABYLON.Color3(1, 0.9, 0.4); // Bright yellow core
    pointMaterial.specularColor = new BABYLON.Color3(1, 1, 0.8); // White-yellow specular
    pointMaterial.disableLighting = true; // Always visible
    pointMaterial.alpha = 0.9;
    
    airportSphere.material = pointMaterial;
    
    // Store airport data on the mesh for future reference
    airportSphere.airportData = airport;
    
    // Enable picking for mouse interactions
    airportSphere.isPickable = true;
    
    // Store original material properties for hover effects
    airportSphere.originalEmissive = pointMaterial.emissiveColor.clone();
    airportSphere.originalDiffuse = pointMaterial.diffuseColor.clone();
    
    return airportSphere;
};

/**
 * Creates airport points for all distinct airports
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @param {Array} distinctAirports - Array of unique airport objects
 */
var createAirportPoints = function(scene, distinctAirports) {
    //console.log(`Creating points for ${distinctAirports.length} airports`);
    
    distinctAirports.forEach(airport => {
        const airportPoint = createAirportPoint(scene, airport);
        airportPoints.push(airportPoint);
    });
    
    //console.log(`Created ${airportPoints.length} airport points`);
};

/**
 * Removes all airport points from the scene
 */
var clearAirportPoints = function() {
    airportPoints.forEach(point => {
        if (point.dispose) {
            point.dispose();
        }
    });
    airportPoints = [];
    console.log("Airport points cleared");
};

// ==============================
// FLIGHT ARC CREATION FUNCTIONS
// ==============================

/**
 * Creates a 3D flight arc between two geographic coordinates
 * Generates a curved tube that follows the great circle path between airports
 * @param {BABYLON.Scene} scene - The Babylon.js scene to add the arc to
 * @param {number} lat1 - Origin latitude in degrees
 * @param {number} lng1 - Origin longitude in degrees
 * @param {number} lat2 - Destination latitude in degrees
 * @param {number} lng2 - Destination longitude in degrees
 * @param {number} radius - Optional radius from Earth center (default: 1.01)
 * @returns {BABYLON.Mesh} The created flight arc tube mesh
 */
var createFlightArc = function (scene, lat1, lng1, lat2, lng2, radius) {
    radius = radius || 1.01; // Default radius slightly above Earth surface

    // ==============================
    // COORDINATE CONVERSION
    // ==============================

    // Convert latitude/longitude to radians
    var lat1Rad = lat1 * Math.PI / 180;
    var lng1Rad = (lng1 - 180) * Math.PI / 180; // Adjust longitude by -180 degrees for coordinate system
    var lat2Rad = lat2 * Math.PI / 180;
    var lng2Rad = (lng2 - 180) * Math.PI / 180; // Adjust longitude by -180 degrees for coordinate system

    // Convert lat/lng to 3D coordinates on sphere using Earth's coordinate system
    // Coordinate system matches the tile system: (cos(lng)*cos(lat), sin(lat), sin(lng)*cos(lat))
    var point1 = new BABYLON.Vector3(
        radius * Math.cos(lng1Rad) * Math.cos(lat1Rad),
        radius * Math.sin(lat1Rad),
        radius * Math.sin(lng1Rad) * Math.cos(lat1Rad)
    );

    var point2 = new BABYLON.Vector3(
        radius * Math.cos(lng2Rad) * Math.cos(lat2Rad),
        radius * Math.sin(lat2Rad),
        radius * Math.sin(lng2Rad) * Math.cos(lat2Rad)
    );

    // ==============================
    // GREAT CIRCLE PATH CALCULATION
    // ==============================

    // Calculate the great circle path using spherical linear interpolation
    var numPoints = 50; // Number of points along the arc for smooth curve
    var arcPoints = [];

    for (var i = 0; i <= numPoints; i++) {
        var t = i / numPoints; // Interpolation parameter from 0 to 1

        // Spherical linear interpolation (slerp) for great circle path
        var dot = BABYLON.Vector3.Dot(point1.normalize(), point2.normalize());
        dot = Math.max(-1, Math.min(1, dot)); // Clamp to avoid floating point errors
        var theta = Math.acos(dot); // Angle between the two points

        var sinTheta = Math.sin(theta);
        if (sinTheta === 0) {
            // Points are identical or antipodal - use simple interpolation
            arcPoints.push(point1.clone());
            continue;
        }

        // Calculate interpolation weights
        var a = Math.sin((1 - t) * theta) / sinTheta;
        var b = Math.sin(t * theta) / sinTheta;

        var interpolated = point1.scale(a).add(point2.scale(b));

        // Add arc height for visual appeal (makes flight path curve above surface)
        var arcHeight = Math.sin(t * Math.PI) * 0.05; // Peak height at middle of arc
        interpolated = interpolated.normalize().scale(radius + arcHeight);

        arcPoints.push(interpolated);
    }

    // ==============================
    // ARC MESH CREATION AND STYLING
    // ==============================

    // Create the arc using a tube geometry for better visibility than lines
    var arcTube = BABYLON.MeshBuilder.CreateTube("flightArc", {
        path: arcPoints,
        radius: 0.001, // Slightly thicker for lightsaber effect
        tessellation: 6, // More sides for smoother glow
        cap: BABYLON.Mesh.CAP_ALL // Cap both ends of the tube
    }, scene);

    // Create material with blue lightsaber glow effect
    var arcMaterial = new BABYLON.StandardMaterial("arcMaterial", scene);
    arcMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.7, 2.5); // Intense blue lightsaber glow
    arcMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.5, 1.8); // Bright blue core
    arcMaterial.specularColor = new BABYLON.Color3(0.8, 0.9, 1); // Blue-white specular highlights
    arcMaterial.disableLighting = true; 
    arcMaterial.alpha = 0.4;

    arcTube.material = arcMaterial;

    return arcTube;
};

// ==============================
// FLIGHT VISUALIZATION INITIALIZATION
// ==============================

/**
 * Initializes flight arcs and airport points in the scene
 * Loads airport coordinates and flight logs, then creates arcs for each flight and points for each airport
 * Ensures arcs and points are created only once to avoid duplicates
 * @param {BABYLON.Scene} scene - The Babylon.js scene to add flight arcs and airport points to
 */
var initializeFlights = function (scene) {
    
    // Load both airport coordinates and flight logs concurrently
    var airportCoordsPromise = getAirportCoords();
    var flightLogsPromise = getFlightLogs();

    Promise.all([airportCoordsPromise, flightLogsPromise]).then(
        ([airportCoords, flightLogs]) => {
            const flightArray = Object.values(flightLogs);
            
            // Get distinct airports first
            const distinctAirports = getDistinctAirports(airportCoords, flightLogs);
            
            // Create airport points
            createAirportPoints(scene, distinctAirports);
        
            // Create arc for each flight in the logs
            for (const flight of flightArray) {
                const fromAirport = airportCoords[flight.from_code];
                const toAirport = airportCoords[flight.to_code];
                //console.log(`Adding from ${flight.from_code} (${fromAirport.latitude}, ${fromAirport.longitude}) to ${flight.to_code} (${toAirport.latitude}, ${toAirport.longitude})`);

                // Only create arc if both airports are found in the coordinate data
                if (fromAirport && toAirport) {
                    createFlightArc(
                        scene,
                        fromAirport.latitude,   // Origin latitude
                        fromAirport.longitude,   // Origin longitude
                        toAirport.latitude,     // Destination latitude
                        toAirport.longitude,     // Destination longitude
                        1               // Radius slightly above Earth surface
                    );
                } else {
                    // Log missing airport data for debugging
                    if (!fromAirport) console.warn(`Airport not found: ${flight.from_code}`);
                    if (!toAirport) console.warn(`Airport not found: ${flight.to_code}`);
                }
            }

            //console.log("Flight arcs and airport points creation completed");
        }
    ).catch(error => {
        console.error("Error initializing flight arcs:", error);
    });
};


// ==============================
// AIRPORT VISUALIZATION UTILITIES
// ==============================

/**
 * Toggles visibility of all airport points
 */
window.toggleAirportPoints = function() {
    const visible = airportPoints.length > 0 ? !airportPoints[0].isVisible : false;
    airportPoints.forEach(point => {
        point.isVisible = !visible;
    });
    console.log(`Airport points ${!visible ? 'shown' : 'hidden'}`);
};

/**
 * Shows all airport points
 */
window.showAirportPoints = function() {
    airportPoints.forEach(point => {
        point.isVisible = true;
    });
    console.log("Airport points shown");
};

/**
 * Hides all airport points
 */
window.hideAirportPoints = function() {
    airportPoints.forEach(point => {
        point.isVisible = false;
    });
    console.log("Airport points hidden");
};

/**
 * Changes the color of airport points
 * @param {string} color - Color name ('yellow', 'red', 'blue', 'green', 'white')
 */
window.setAirportPointColor = function(color = 'yellow') {
    const colors = {
        yellow: { emissive: [1, 0.8, 0.2], diffuse: [1, 0.9, 0.4] },
        red: { emissive: [1, 0.2, 0.2], diffuse: [1, 0.4, 0.4] },
        blue: { emissive: [0.2, 0.4, 1], diffuse: [0.4, 0.6, 1] },
        green: { emissive: [0.2, 1, 0.2], diffuse: [0.4, 1, 0.4] },
        white: { emissive: [1, 1, 1], diffuse: [1, 1, 1] },
        orange: { emissive: [1, 0.5, 0], diffuse: [1, 0.7, 0.2] }
    };
    
    const colorData = colors[color] || colors.yellow;
    
    airportPoints.forEach(point => {
        if (point.material) {
            point.material.emissiveColor = new BABYLON.Color3(...colorData.emissive);
            point.material.diffuseColor = new BABYLON.Color3(...colorData.diffuse);
        }
    });
    
    console.log(`Airport points color changed to ${color}`);
};

/**
 * Changes the size of airport points
 * @param {number} scale - Scale factor (1.0 = default, 2.0 = double size, 0.5 = half size)
 */
window.setAirportPointSize = function(scale = 0.5) {
    airportPoints.forEach(point => {
        point.scaling = new BABYLON.Vector3(scale, scale, scale);
    });
    console.log(`Airport points scaled to ${scale}x`);
};

/**
 * Gets information about airports currently displayed
 */
window.getAirportPointsInfo = function() {
    const info = {
        totalAirports: airportPoints.length,
        visible: airportPoints.filter(p => p.isVisible).length,
        countries: [...new Set(airportPoints.map(p => p.airportData.country_code))].sort(),
        regions: [...new Set(airportPoints.map(p => p.airportData.region))].sort()
    };
    
    console.log("Airport Points Info:", info);
    return info;
};

/**
 * Finds airports by country code
 * @param {string} countryCode - Two-letter country code (e.g., 'US', 'GB', 'JP')
 */
window.findAirportsByCountry = function(countryCode) {
    const airports = airportPoints
        .filter(point => point.airportData.country_code === countryCode.toUpperCase())
        .map(point => ({
            code: point.airportData.code,
            name: point.airportData.name,
            airport: point.airportData.airport,
            region: point.airportData.region
        }));
    
    console.log(`Found ${airports.length} airports in ${countryCode}:`, airports);
    return airports;
};
