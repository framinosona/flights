
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
                console.log("Airport coordinates loaded from file");
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
        radius: 0.003, // Slightly thicker for lightsaber effect
        tessellation: 12, // More sides for smoother glow
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
 * Initializes flight arcs in the scene
 * Loads airport coordinates and flight logs, then creates arcs for each flight
 * Ensures arcs are created only once to avoid duplicates
 * @param {BABYLON.Scene} scene - The Babylon.js scene to add flight arcs to
 */
var initializeFlightArcs = function (scene) {
    // Load both airport coordinates and flight logs concurrently
    var airportCoordsPromise = getAirportCoords();
    var flightLogsPromise = getFlightLogs();

    Promise.all([airportCoordsPromise, flightLogsPromise]).then(
        ([airportCoords, flightLogs]) => {
            const flightArray = Object.values(flightLogs);
            //console.log(`Creating flight arcs for ${flightArray.length} flights`);

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
                        1.01               // Radius slightly above Earth surface
                    );
                } else {
                    // Log missing airport data for debugging
                    if (!fromAirport) console.warn(`Airport not found: ${flight.from_code}`);
                    if (!toAirport) console.warn(`Airport not found: ${flight.to_code}`);
                }
            }

            console.log("Flight arcs creation completed");
        }
    ).catch(error => {
        console.error("Error initializing flight arcs:", error);
    });
};