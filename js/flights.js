// ==============================
// FLIGHT VISUALIZATION SYSTEM
// ==============================

// Global state management for flight data
let flightSystem = {
    airportCoords: null,
    flightLogs: null,
    airportPoints: [],
    flightArcs: [],
    initialized: false,
    error: null
};

// Performance and error tracking
let flightPerformance = {
    dataLoadTime: 0,
    arcCreationTime: 0,
    pointCreationTime: 0,
    totalFlights: 0,
    totalAirports: 0,
    errorCount: 0
};

// ==============================
// CONFIGURATION AND CONSTANTS
// ==============================

const FLIGHT_CONFIG = {
    // Visualization settings
    airportPoint: {
        diameter: 0.008,
        radius: 1.005, // Slightly above Earth surface
        colors: {
            default: { emissive: [1, 0.8, 0.2], diffuse: [1, 0.9, 0.4] },
            hover: { emissive: [1, 1, 0.5], diffuse: [1, 1, 0.7] }
        }
    },
    flightArc: {
        radius: 1.01,
        thickness: 0.001,
        tessellation: 6,
        points: 50,
        height: 0.05,
        colors: {
            default: { emissive: [0.3, 0.7, 2.5], diffuse: [0.2, 0.5, 1.8] }
        },
        alpha: 0.4
    },
    // Performance settings
    batchSize: 100,
    maxRetries: 3,
    retryDelay: 1000,
    // File paths
    dataPaths: {
        airports: "js/data/airports_by_iata.json",
        flights: "js/data/flight_logs.json"
    }
};

// ==============================
// UTILITY AND VALIDATION FUNCTIONS
// ==============================

/**
 * Validates airport coordinate data structure
 * @param {Object} data - Airport coordinates data
 * @returns {boolean} True if data is valid
 */
function validateAirportData(data) {
    if (!data || typeof data !== 'object') {
        console.error("Airport data is null or not an object");
        return false;
    }
    
    const sampleKeys = Object.keys(data).slice(0, 5);
    for (const key of sampleKeys) {
        const airport = data[key];
        if (!airport.latitude || !airport.longitude || 
            typeof airport.latitude !== 'number' || 
            typeof airport.longitude !== 'number') {
            console.error(`Invalid airport data structure for ${key}:`, airport);
            return false;
        }
    }
    
    return true;
}

/**
 * Validates flight log data structure
 * @param {Array} data - Flight logs array
 * @returns {boolean} True if data is valid
 */
function validateFlightData(data) {
    if (!Array.isArray(data) && typeof data !== 'object') {
        console.error("Flight data is not an array or object");
        return false;
    }
    
    const flights = Array.isArray(data) ? data : Object.values(data);
    if (flights.length === 0) {
        console.warn("Flight data is empty");
        return false;
    }
    
    const sampleFlights = flights.slice(0, 5);
    for (const flight of sampleFlights) {
        if (!flight.from_code || !flight.to_code) {
            console.error("Invalid flight data structure:", flight);
            return false;
        }
    }
    
    return true;
}

/**
 * Safely converts coordinates to 3D position
 * @param {number} lat - Latitude in degrees
 * @param {number} lng - Longitude in degrees
 * @param {number} radius - Distance from center
 * @returns {BABYLON.Vector3|null} 3D position or null if invalid
 */
function coordinatesToPosition(lat, lng, radius = 1.0) {
    try {
        // Validate input coordinates
        if (typeof lat !== 'number' || typeof lng !== 'number' || 
            isNaN(lat) || isNaN(lng) || 
            lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.warn(`Invalid coordinates: lat=${lat}, lng=${lng}`);
            return null;
        }
        
        // Convert to radians
        const latRad = lat * Math.PI / 180;
        const lngRad = (lng - 180) * Math.PI / 180; // Adjust for coordinate system
        
        // Convert to 3D coordinates
        return new BABYLON.Vector3(
            radius * Math.cos(lngRad) * Math.cos(latRad),
            radius * Math.sin(latRad),
            radius * Math.sin(lngRad) * Math.cos(latRad)
        );
    } catch (error) {
        console.error("Error converting coordinates to position:", error);
        return null;
    }
}

/**
 * Logs performance metrics for debugging
 */
function logPerformanceMetrics() {
    console.group("🚀 Flight System Performance Metrics");
    console.log(`Data Load Time: ${flightPerformance.dataLoadTime}ms`);
    console.log(`Arc Creation Time: ${flightPerformance.arcCreationTime}ms`);
    console.log(`Point Creation Time: ${flightPerformance.pointCreationTime}ms`);
    console.log(`Total Flights: ${flightPerformance.totalFlights}`);
    console.log(`Total Airports: ${flightPerformance.totalAirports}`);
    console.log(`Error Count: ${flightPerformance.errorCount}`);
    console.groupEnd();
}

// ==============================
// ENHANCED DATA LOADING FUNCTIONS
// ==============================

/**
 * Loads airport coordinate data with enhanced error handling and validation
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise<Object>} Promise that resolves to airport coordinates object
 */
async function loadAirportCoords(retryCount = 0) {
    try {
        console.log("📍 Loading airport coordinates...");
        const startTime = performance.now();
        
        const response = await fetch(FLIGHT_CONFIG.dataPaths.airports);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!validateAirportData(data)) {
            throw new Error("Invalid airport data structure");
        }
        
        const loadTime = performance.now() - startTime;
        flightPerformance.dataLoadTime += loadTime;
        
        console.log(`✅ Airport coordinates loaded successfully (${loadTime.toFixed(2)}ms)`);
        console.log(`📊 Loaded ${Object.keys(data).length} airports`);
        
        return data;
        
    } catch (error) {
        flightPerformance.errorCount++;
        console.error(`❌ Error loading airport coordinates (attempt ${retryCount + 1}):`, error);
        
        // Retry logic with exponential backoff
        if (retryCount < FLIGHT_CONFIG.maxRetries) {
            const delay = FLIGHT_CONFIG.retryDelay * Math.pow(2, retryCount);
            console.log(`🔄 Retrying in ${delay}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return loadAirportCoords(retryCount + 1);
        }
        
        // Set error state and re-throw after max retries
        throw new Error(`Failed to load airport coordinates after ${FLIGHT_CONFIG.maxRetries} attempts: ${error.message}`);
    }
}

/**
 * Loads flight log data with enhanced error handling and validation
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise<Array|Object>} Promise that resolves to flight logs
 */
async function loadFlightLogs(retryCount = 0) {
    try {
        console.log("✈️ Loading flight logs...");
        const startTime = performance.now();
        
        const response = await fetch(FLIGHT_CONFIG.dataPaths.flights);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!validateFlightData(data)) {
            throw new Error("Invalid flight data structure");
        }
        
        const loadTime = performance.now() - startTime;
        flightPerformance.dataLoadTime += loadTime;
        
        const flightArray = Array.isArray(data) ? data : Object.values(data);
        flightPerformance.totalFlights = flightArray.length;
        
        console.log(`✅ Flight logs loaded successfully (${loadTime.toFixed(2)}ms`);
        console.log(`📊 Loaded ${flightArray.length} flights`);
        
        return data;
        
    } catch (error) {
        flightPerformance.errorCount++;
        console.error(`❌ Error loading flight logs (attempt ${retryCount + 1}):`, error);
        
        // Retry logic with exponential backoff
        if (retryCount < FLIGHT_CONFIG.maxRetries) {
            const delay = FLIGHT_CONFIG.retryDelay * Math.pow(2, retryCount);
            console.log(`🔄 Retrying in ${delay}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return loadFlightLogs(retryCount + 1);
        }
        
        // Set error state and re-throw after max retries
        throw new Error(`Failed to load flight logs after ${FLIGHT_CONFIG.maxRetries} attempts: ${error.message}`);
    }
}

/**
 * Loads all flight data concurrently with simple caching
 * @returns {Promise<{airportCoords: Object, flightLogs: Array}>} Combined flight data
 */
async function loadFlightData() {
    // Return cached data if already loaded
    if (flightSystem.airportCoords && flightSystem.flightLogs) {
        console.log("✅ Using cached flight data");
        return {
            airportCoords: flightSystem.airportCoords,
            flightLogs: flightSystem.flightLogs
        };
    }
    
    try {
        console.group("🌍 Loading Flight Data");
        const startTime = performance.now();
        
        // Load both datasets concurrently for better performance
        const [airportCoords, flightLogs] = await Promise.all([
            loadAirportCoords(),
            loadFlightLogs()
        ]);
        
        // Cache the data
        flightSystem.airportCoords = airportCoords;
        flightSystem.flightLogs = flightLogs;
        
        const totalTime = performance.now() - startTime;
        console.log(`✅ All flight data loaded successfully in ${totalTime.toFixed(2)}ms`);
        console.groupEnd();
        
        return { airportCoords, flightLogs };
        
    } catch (error) {
        console.error("❌ Failed to load flight data:", error);
        console.groupEnd();
        throw error;
    }
}

// Maintain backward compatibility
const getAirportCoords = loadAirportCoords;
const getFlightLogs = loadFlightLogs;
// ==============================
// ENHANCED AIRPORT POINT VISUALIZATION
// ==============================

/**
 * Extracts distinct airports from flight logs with enhanced validation
 * @param {Object} airportCoords - Airport coordinates data
 * @param {Object|Array} flightLogs - Flight logs data
 * @returns {Array} Array of unique airport objects with validated data
 */
function getDistinctAirports(airportCoords, flightLogs) {
    try {
        if (!airportCoords || !flightLogs) {
            throw new Error("Missing required data: airportCoords or flightLogs");
        }
        
        const distinctAirports = new Map();
        const flightArray = Array.isArray(flightLogs) ? flightLogs : Object.values(flightLogs);
        let processedFlights = 0;
        let skippedFlights = 0;
        
        console.log(`🔍 Processing ${flightArray.length} flights for distinct airports...`);
        
        flightArray.forEach((flight, index) => {
            try {
                // Validate flight data
                if (!flight || typeof flight !== 'object') {
                    skippedFlights++;
                    return;
                }
                
                // Process origin airport
                if (flight.from_code && airportCoords[flight.from_code]) {
                    const airportData = airportCoords[flight.from_code];
                    
                    // Validate airport coordinates
                    if (typeof airportData.latitude === 'number' && 
                        typeof airportData.longitude === 'number' &&
                        !isNaN(airportData.latitude) && !isNaN(airportData.longitude)) {
                        
                        distinctAirports.set(flight.from_code, {
                            code: flight.from_code,
                            name: flight.from || airportData.airport || 'Unknown',
                            airport: airportData.airport || 'Unknown Airport',
                            country_code: airportData.country_code || 'XX',
                            region: airportData.region || 'Unknown',
                            latitude: airportData.latitude,
                            longitude: airportData.longitude,
                            icao: airportData.icao || flight.from_code
                        });
                    } else {
                        console.warn(`Invalid coordinates for airport ${flight.from_code}:`, airportData);
                    }
                } else if (flight.from_code) {
                    console.warn(`Airport data not found for code: ${flight.from_code}`);
                }
                
                // Process destination airport
                if (flight.to_code && airportCoords[flight.to_code]) {
                    const airportData = airportCoords[flight.to_code];
                    
                    // Validate airport coordinates
                    if (typeof airportData.latitude === 'number' && 
                        typeof airportData.longitude === 'number' &&
                        !isNaN(airportData.latitude) && !isNaN(airportData.longitude)) {
                        
                        distinctAirports.set(flight.to_code, {
                            code: flight.to_code,
                            name: flight.to || airportData.airport || 'Unknown',
                            airport: airportData.airport || 'Unknown Airport',
                            country_code: airportData.country_code || 'XX',
                            region: airportData.region || 'Unknown',
                            latitude: airportData.latitude,
                            longitude: airportData.longitude,
                            icao: airportData.icao || flight.to_code
                        });
                    } else {
                        console.warn(`Invalid coordinates for airport ${flight.to_code}:`, airportData);
                    }
                } else if (flight.to_code) {
                    console.warn(`Airport data not found for code: ${flight.to_code}`);
                }
                
                processedFlights++;
                
            } catch (error) {
                console.error(`Error processing flight ${index}:`, error, flight);
                skippedFlights++;
            }
        });
        
        const airports = Array.from(distinctAirports.values());
        flightPerformance.totalAirports = airports.length;
        
        console.log(`✅ Found ${airports.length} distinct airports from ${processedFlights} flights`);
        if (skippedFlights > 0) {
            console.warn(`⚠️ Skipped ${skippedFlights} flights due to data issues`);
        }
        
        return airports;
        
    } catch (error) {
        console.error("❌ Error extracting distinct airports:", error);
        flightPerformance.errorCount++;
        return [];
    }
}

/**
 * Creates a 3D point/sphere at an airport location with enhanced error handling
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @param {Object} airport - Airport data object
 * @param {number} radius - Distance from Earth center
 * @returns {BABYLON.Mesh|null} The created airport point mesh or null if failed
 */
function createAirportPoint(scene, airport, radius = FLIGHT_CONFIG.airportPoint.radius) {
    try {
        // Validate inputs
        if (!scene) {
            throw new Error("Scene is required");
        }
        if (!airport || !airport.latitude || !airport.longitude) {
            throw new Error("Valid airport data with coordinates is required");
        }
        
        // Convert coordinates to 3D position
        const position = coordinatesToPosition(airport.latitude, airport.longitude, radius);
        if (!position) {
            throw new Error(`Failed to convert coordinates for airport ${airport.code}`);
        }
        
        // Create sphere with enhanced naming for debugging
        const sphereName = `airport_${airport.code}_${Date.now()}`;
        const airportSphere = BABYLON.MeshBuilder.CreateSphere(
            sphereName,
            { diameter: FLIGHT_CONFIG.airportPoint.diameter },
            scene
        );
        
        if (!airportSphere) {
            throw new Error("Failed to create airport sphere mesh");
        }
        
        // Position the sphere
        airportSphere.position = position;
        
        // Create enhanced material with error handling
        const materialName = `airportMat_${airport.code}_${Date.now()}`;
        const pointMaterial = new BABYLON.StandardMaterial(materialName, scene);
        
        if (!pointMaterial) {
            throw new Error("Failed to create airport material");
        }
        
        // Set material properties
        const colors = FLIGHT_CONFIG.airportPoint.colors.default;
        pointMaterial.emissiveColor = new BABYLON.Color3(...colors.emissive);
        pointMaterial.diffuseColor = new BABYLON.Color3(...colors.diffuse);
        pointMaterial.specularColor = new BABYLON.Color3(1, 1, 0.8);
        pointMaterial.disableLighting = true;
        pointMaterial.alpha = 0.9;
        
        airportSphere.material = pointMaterial;
        
        // Store airport data and metadata
        airportSphere.airportData = airport;
        airportSphere.createdAt = Date.now();
        airportSphere.isFlightSystemObject = true;
        
        // Configure interaction
        airportSphere.isPickable = true;
        airportSphere.actionManager = new BABYLON.ActionManager(scene);
        
        // Store original material properties for hover effects
        airportSphere.originalEmissive = pointMaterial.emissiveColor.clone();
        airportSphere.originalDiffuse = pointMaterial.diffuseColor.clone();
        
        // Add hover effects
        airportSphere.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
                const hoverColors = FLIGHT_CONFIG.airportPoint.colors.hover;
                pointMaterial.emissiveColor = new BABYLON.Color3(...hoverColors.emissive);
                pointMaterial.diffuseColor = new BABYLON.Color3(...hoverColors.diffuse);
            })
        );
        
        airportSphere.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
                pointMaterial.emissiveColor = airportSphere.originalEmissive.clone();
                pointMaterial.diffuseColor = airportSphere.originalDiffuse.clone();
            })
        );
        
        return airportSphere;
        
    } catch (error) {
        console.error(`❌ Error creating airport point for ${airport?.code || 'unknown'}:`, error);
        flightPerformance.errorCount++;
        return null;
    }
}

/**
 * Creates airport points for all distinct airports with batch processing
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @param {Array} distinctAirports - Array of unique airport objects
 * @returns {Promise<Array>} Array of created airport point meshes
 */
async function createAirportPoints(scene, distinctAirports) {
    if (!scene) {
        throw new Error("Scene is required for creating airport points");
    }
    
    if (!Array.isArray(distinctAirports) || distinctAirports.length === 0) {
        console.warn("No airports provided for point creation");
        return [];
    }
    
    console.log(`🏗️ Creating points for ${distinctAirports.length} airports...`);
    const startTime = performance.now();
    
    try {
        const createdPoints = [];
        const batchSize = FLIGHT_CONFIG.batchSize;
        let processedCount = 0;
        let errorCount = 0;
        
        // Process airports in batches to avoid blocking the main thread
        for (let i = 0; i < distinctAirports.length; i += batchSize) {
            const batch = distinctAirports.slice(i, i + batchSize);
            
            for (const airport of batch) {
                const airportPoint = createAirportPoint(scene, airport);
                if (airportPoint) {
                    createdPoints.push(airportPoint);
                    flightSystem.airportPoints.push(airportPoint);
                    processedCount++;
                } else {
                    errorCount++;
                }
            }
            
            // Yield control to prevent blocking
            if (i + batchSize < distinctAirports.length) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        const creationTime = performance.now() - startTime;
        flightPerformance.pointCreationTime = creationTime;
        
        console.log(`✅ Created ${processedCount} airport points in ${creationTime.toFixed(2)}ms`);
        if (errorCount > 0) {
            console.warn(`⚠️ Failed to create ${errorCount} airport points`);
        }
        
        return createdPoints;
        
    } catch (error) {
        const creationTime = performance.now() - startTime;
        flightPerformance.pointCreationTime = creationTime;
        flightPerformance.errorCount++;
        
        console.error("❌ Error creating airport points:", error);
        throw error;
    }
}

/**
 * Safely removes all airport points from the scene with cleanup
 */
function clearAirportPoints() {
    try {
        console.log(`🧹 Clearing ${flightSystem.airportPoints.length} airport points...`);
        let cleanedCount = 0;
        let errorCount = 0;
        
        flightSystem.airportPoints.forEach((point, index) => {
            try {
                if (point && typeof point.dispose === 'function') {
                    // Clean up action manager first
                    if (point.actionManager) {
                        point.actionManager.dispose();
                        point.actionManager = null;
                    }
                    
                    // Clean up material
                    if (point.material && typeof point.material.dispose === 'function') {
                        point.material.dispose();
                    }
                    
                    // Dispose the mesh
                    point.dispose();
                    cleanedCount++;
                } else {
                    console.warn(`Invalid airport point at index ${index}`);
                    errorCount++;
                }
            } catch (error) {
                console.error(`Error disposing airport point ${index}:`, error);
                errorCount++;
            }
        });
        
        // Clear the array
        flightSystem.airportPoints = [];
        
        console.log(`✅ Cleared ${cleanedCount} airport points`);
        if (errorCount > 0) {
            console.warn(`⚠️ ${errorCount} points had cleanup errors`);
        }
        
    } catch (error) {
        console.error("❌ Error clearing airport points:", error);
        flightPerformance.errorCount++;
        
        // Force clear the array even if cleanup fails
        flightSystem.airportPoints = [];
    }
}

// ==============================
// ENHANCED FLIGHT ARC CREATION FUNCTIONS
// ==============================

/**
 * Safely performs spherical linear interpolation between two points
 * @param {BABYLON.Vector3} point1 - First 3D point (normalized)
 * @param {BABYLON.Vector3} point2 - Second 3D point (normalized)
 * @param {number} t - Interpolation parameter (0-1)
 * @returns {BABYLON.Vector3|null} Interpolated point or null if calculation fails
 */
function safeSlerp(point1, point2, t) {
    try {
        // Validate inputs
        if (!point1 || !point2 || typeof t !== 'number' || isNaN(t)) {
            return null;
        }
        
        const dot = BABYLON.Vector3.Dot(point1, point2);
        const clampedDot = Math.max(-1, Math.min(1, dot)); // Clamp to avoid floating point errors
        const theta = Math.acos(Math.abs(clampedDot)); // Use absolute value to handle edge cases
        
        const sinTheta = Math.sin(theta);
        if (sinTheta < 1e-6) {
            // Points are too close or antipodal - use linear interpolation
            return BABYLON.Vector3.Lerp(point1, point2, t);
        }
        
        // Calculate interpolation weights
        const a = Math.sin((1 - t) * theta) / sinTheta;
        const b = Math.sin(t * theta) / sinTheta;
        
        return point1.scale(a).add(point2.scale(b));
        
    } catch (error) {
        console.warn("Error in spherical interpolation:", error);
        // Fallback to linear interpolation
        return BABYLON.Vector3.Lerp(point1, point2, t);
    }
}

/**
 * Creates a 3D flight arc between two geographic coordinates with enhanced error handling
 * @param {BABYLON.Scene} scene - The Babylon.js scene to add the arc to
 * @param {number} lat1 - Origin latitude in degrees
 * @param {number} lng1 - Origin longitude in degrees
 * @param {number} lat2 - Destination latitude in degrees
 * @param {number} lng2 - Destination longitude in degrees
 * @param {number} radius - Optional radius from Earth center
 * @param {Object} options - Optional styling and behavior options
 * @returns {BABYLON.Mesh|null} The created flight arc tube mesh or null if failed
 */
function createFlightArc(scene, lat1, lng1, lat2, lng2, radius = FLIGHT_CONFIG.flightArc.radius, options = {}) {
    try {
        // Validate inputs
        if (!scene) {
            throw new Error("Scene is required");
        }
        
        // Validate coordinates
        const coords = [
            { name: 'lat1', value: lat1, min: -90, max: 90 },
            { name: 'lng1', value: lng1, min: -180, max: 180 },
            { name: 'lat2', value: lat2, min: -90, max: 90 },
            { name: 'lng2', value: lng2, min: -180, max: 180 }
        ];
        
        for (const coord of coords) {
            if (typeof coord.value !== 'number' || isNaN(coord.value) || 
                coord.value < coord.min || coord.value > coord.max) {
                throw new Error(`Invalid ${coord.name}: ${coord.value}`);
            }
        }
        
        // Check if origin and destination are too close
        const latDiff = Math.abs(lat2 - lat1);
        const lngDiff = Math.abs(lng2 - lng1);
        if (latDiff < 0.1 && lngDiff < 0.1) {
            console.warn(`Flight arc too short: ${lat1},${lng1} to ${lat2},${lng2}`);
            return null;
        }
        
        // Convert coordinates to 3D positions
        const point1 = coordinatesToPosition(lat1, lng1, radius);
        const point2 = coordinatesToPosition(lat2, lng2, radius);
        
        if (!point1 || !point2) {
            throw new Error("Failed to convert coordinates to 3D positions");
        }
        
        // Generate arc path points using enhanced interpolation
        const numPoints = options.points || FLIGHT_CONFIG.flightArc.points;
        const arcHeight = options.height || FLIGHT_CONFIG.flightArc.height;
        const arcPoints = [];
        
        const normalizedPoint1 = point1.normalize();
        const normalizedPoint2 = point2.normalize();
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            
            // Get interpolated direction using safe slerp
            const interpolated = safeSlerp(normalizedPoint1, normalizedPoint2, t);
            if (!interpolated) {
                console.warn(`Failed to interpolate point ${i}`);
                continue;
            }
            
            // Add arc height for visual appeal
            const heightFactor = Math.sin(t * Math.PI) * arcHeight;
            const finalRadius = radius + heightFactor;
            
            const arcPoint = interpolated.normalize().scale(finalRadius);
            arcPoints.push(arcPoint);
        }
        
        if (arcPoints.length < 2) {
            throw new Error("Insufficient arc points generated");
        }
        
        // Create enhanced arc mesh
        const arcName = `flightArc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const arcTube = BABYLON.MeshBuilder.CreateTube(arcName, {
            path: arcPoints,
            radius: options.thickness || FLIGHT_CONFIG.flightArc.thickness,
            tessellation: options.tessellation || FLIGHT_CONFIG.flightArc.tessellation,
            cap: BABYLON.Mesh.CAP_ALL
        }, scene);
        
        if (!arcTube) {
            throw new Error("Failed to create arc tube mesh");
        }
        
        // Create enhanced material
        const materialName = `arcMaterial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const arcMaterial = new BABYLON.StandardMaterial(materialName, scene);
        
        if (!arcMaterial) {
            throw new Error("Failed to create arc material");
        }
        
        // Set material properties
        const colors = options.colors || FLIGHT_CONFIG.flightArc.colors.default;
        arcMaterial.emissiveColor = new BABYLON.Color3(...colors.emissive);
        arcMaterial.diffuseColor = new BABYLON.Color3(...colors.diffuse);
        arcMaterial.specularColor = new BABYLON.Color3(0.8, 0.9, 1);
        arcMaterial.disableLighting = true;
        arcMaterial.alpha = options.alpha || FLIGHT_CONFIG.flightArc.alpha;
        
        arcTube.material = arcMaterial;
        
        // Store metadata
        arcTube.isFlightSystemObject = true;
        arcTube.createdAt = Date.now();
        arcTube.flightData = {
            origin: { lat: lat1, lng: lng1 },
            destination: { lat: lat2, lng: lng2 },
            distance: Math.acos(Math.max(-1, Math.min(1, BABYLON.Vector3.Dot(normalizedPoint1, normalizedPoint2)))) * 6371 // km
        };
        
        return arcTube;
        
    } catch (error) {
        console.error(`❌ Error creating flight arc (${lat1},${lng1}) to (${lat2},${lng2}):`, error);
        flightPerformance.errorCount++;
        return null;
    }
}

/**
 * Creates multiple flight arcs with batch processing and progress tracking
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @param {Array} flights - Array of flight objects with from/to coordinates
 * @param {Object} airportCoords - Airport coordinates lookup
 * @returns {Promise<Array>} Array of created flight arc meshes
 */
async function createFlightArcs(scene, flights, airportCoords) {
    if (!scene) {
        throw new Error("Scene is required for creating flight arcs");
    }
    
    if (!Array.isArray(flights) || flights.length === 0) {
        console.warn("No flights provided for arc creation");
        return [];
    }
    
    console.log(`🚀 Creating arcs for ${flights.length} flights...`);
    const startTime = performance.now();
    
    try {
        const createdArcs = [];
        const batchSize = FLIGHT_CONFIG.batchSize;
        let processedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        // Process flights in batches
        for (let i = 0; i < flights.length; i += batchSize) {
            const batch = flights.slice(i, i + batchSize);
            
            for (const flight of batch) {
                try {
                    // Validate flight data
                    if (!flight || !flight.from_code || !flight.to_code) {
                        skippedCount++;
                        continue;
                    }
                    
                    const fromAirport = airportCoords[flight.from_code];
                    const toAirport = airportCoords[flight.to_code];
                    
                    if (!fromAirport || !toAirport) {
                        skippedCount++;
                        continue;
                    }
                    
                    // Create the flight arc
                    const arc = createFlightArc(
                        scene,
                        fromAirport.latitude,
                        fromAirport.longitude,
                        toAirport.latitude,
                        toAirport.longitude
                    );
                    
                    if (arc) {
                        createdArcs.push(arc);
                        flightSystem.flightArcs.push(arc);
                        processedCount++;
                    } else {
                        errorCount++;
                    }
                    
                } catch (error) {
                    errorCount++;
                }
            }
            
            // Yield control to prevent blocking
            if (i + batchSize < flights.length) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
            
            // Progress update (less frequent)
            const progress = Math.min(100, ((i + batchSize) / flights.length) * 100);
            if (progress >= 100 || (progress > 0 && progress % 50 === 0)) {
                console.log(`🔄 Flight arc progress: ${progress.toFixed(0)}%`);
            }
        }
        
        const creationTime = performance.now() - startTime;
        flightPerformance.arcCreationTime = creationTime;
        
        console.log(`✅ Created ${processedCount} flight arcs in ${creationTime.toFixed(2)}ms`);
        if (skippedCount > 0) {
            console.warn(`⚠️ Skipped ${skippedCount} flights due to missing airport data`);
        }
        if (errorCount > 0) {
            console.warn(`⚠️ Failed to create ${errorCount} flight arcs due to errors`);
        }
        
        return createdArcs;
        
    } catch (error) {
        const creationTime = performance.now() - startTime;
        flightPerformance.arcCreationTime = creationTime;
        flightPerformance.errorCount++;
        
        console.error("❌ Error creating flight arcs:", error);
        throw error;
    }
}

/**
 * Safely removes all flight arcs from the scene with cleanup
 */
function clearFlightArcs() {
    try {
        console.log(`🧹 Clearing ${flightSystem.flightArcs.length} flight arcs...`);
        let cleanedCount = 0;
        let errorCount = 0;
        
        flightSystem.flightArcs.forEach((arc, index) => {
            try {
                if (arc && typeof arc.dispose === 'function') {
                    // Clean up material
                    if (arc.material && typeof arc.material.dispose === 'function') {
                        arc.material.dispose();
                    }
                    
                    // Dispose the mesh
                    arc.dispose();
                    cleanedCount++;
                } else {
                    console.warn(`Invalid flight arc at index ${index}`);
                    errorCount++;
                }
            } catch (error) {
                console.error(`Error disposing flight arc ${index}:`, error);
                errorCount++;
            }
        });
        
        // Clear the array
        flightSystem.flightArcs = [];
        
        console.log(`✅ Cleared ${cleanedCount} flight arcs`);
        if (errorCount > 0) {
            console.warn(`⚠️ ${errorCount} arcs had cleanup errors`);
        }
        
    } catch (error) {
        console.error("❌ Error clearing flight arcs:", error);
        flightPerformance.errorCount++;
        
        // Force clear the array even if cleanup fails
        flightSystem.flightArcs = [];
    }
}

// ==============================
// ENHANCED FLIGHT VISUALIZATION INITIALIZATION
// ==============================

/**
 * Initializes the complete flight visualization system with comprehensive error handling
 * @param {BABYLON.Scene} scene - The Babylon.js scene to add visualization to
 * @param {Object} options - Optional configuration settings
 * @returns {Promise<Object>} Initialization result with statistics
 */
async function initializeFlights(scene, options = {}) {
    // Simple check - if already initialized, return status
    if (flightSystem.initialized) {
        console.log("✅ Flight system already initialized");
        return {
            success: true,
            message: "Flight system already initialized",
            stats: {
                airports: flightSystem.airportPoints.length,
                flights: flightSystem.flightArcs.length
            }
        };
    }
    
    if (!scene) {
        const error = new Error("Scene is required for flight initialization");
        console.error("❌", error.message);
        return { success: false, error: error.message };
    }
    
    console.group("✈️ Flight System");
    const initStartTime = performance.now();
    
    try {
        // Step 1: Load flight data (uses caching)
        console.log("📥 Loading flight data...");
        const { airportCoords, flightLogs } = await loadFlightData();
        
        // Step 2: Process airports
        console.log("🏗️ Processing airports...");
        const distinctAirports = getDistinctAirports(airportCoords, flightLogs);
        
        if (distinctAirports.length === 0) {
            throw new Error("No valid airports found in flight data");
        }
        
        // Step 3: Create airport points
        console.log("📍 Creating airport points...");
        const airportStartTime = performance.now();
        
        await createAirportPoints(scene, distinctAirports);
        
        const airportEndTime = performance.now();
        console.log(`✅ ${flightSystem.airportPoints.length} airport points created in ${(airportEndTime - airportStartTime).toFixed(2)}ms`);
        
        // Step 4: Create flight arcs
        console.log("🚀 Creating flight arcs...");
        const arcStartTime = performance.now();
        
        const flightArray = Array.isArray(flightLogs) ? flightLogs : Object.values(flightLogs);
        await createFlightArcs(scene, flightArray, airportCoords);
        
        const arcEndTime = performance.now();
        console.log(`✅ ${flightSystem.flightArcs.length} flight arcs created in ${(arcEndTime - arcStartTime).toFixed(2)}ms`);
        
        // Step 5: Finalize initialization
        flightSystem.initialized = true;
        const totalTime = performance.now() - initStartTime;
        
        // Log comprehensive results
        console.log("📊 Initialization Complete!");
        logPerformanceMetrics();
        
        const result = {
            success: true,
            message: `Flight system initialized successfully in ${totalTime.toFixed(2)}ms`,
            stats: {
                airports: flightSystem.airportPoints.length,
                flights: flightSystem.flightArcs.length,
                totalFlights: flightPerformance.totalFlights,
                totalAirports: flightPerformance.totalAirports,
                errors: flightPerformance.errorCount,
                performance: {
                    totalTime: totalTime,
                    dataLoadTime: flightPerformance.dataLoadTime,
                    pointCreationTime: flightPerformance.pointCreationTime,
                    arcCreationTime: flightPerformance.arcCreationTime
                }
            }
        };
        
        console.log(`✅ Flight system ready! (${totalTime.toFixed(2)}ms total)`);
        console.groupEnd();
        
        return result;
        
    } catch (error) {
        flightSystem.error = error;
        flightPerformance.errorCount++;
        
        const totalTime = performance.now() - initStartTime;
        console.error(`❌ Flight system failed (${totalTime.toFixed(2)}ms):`, error);
        console.groupEnd();
        
        return {
            success: false,
            error: error.message,
            stats: {
                airports: flightSystem.airportPoints.length,
                flights: flightSystem.flightArcs.length,
                errors: flightPerformance.errorCount,
                performance: {
                    totalTime: totalTime,
                    dataLoadTime: flightPerformance.dataLoadTime,
                    pointCreationTime: flightPerformance.pointCreationTime,
                    arcCreationTime: flightPerformance.arcCreationTime
                }
            }
        };
    }
}

/**
 * Completely resets the flight visualization system
 * @returns {Promise<void>}
 */
async function resetFlightSystem() {
    console.log("🔄 Resetting flight visualization system...");
    
    try {
        // Clear all visual elements
        clearFlightArcs();
        clearAirportPoints();
        
        // Reset state
        flightSystem.initialized = false;
        flightSystem.error = null;
        flightSystem.airportCoords = null;
        flightSystem.flightLogs = null;
        
        // Reset performance metrics
        Object.keys(flightPerformance).forEach(key => {
            flightPerformance[key] = 0;
        });
        
        console.log("✅ Flight system reset completed");
        
    } catch (error) {
        console.error("❌ Error resetting flight system:", error);
        throw error;
    }
}

/**
 * Gets comprehensive status information about the flight system
 * @returns {Object} Current status and statistics
 */
function getFlightSystemStatus() {
    return {
        initialized: flightSystem.initialized,
        error: flightSystem.error?.message || null,
        statistics: {
            airports: {
                total: flightSystem.airportPoints.length,
                visible: flightSystem.airportPoints.filter(p => p.isVisible).length
            },
            flights: {
                total: flightSystem.flightArcs.length,
                visible: flightSystem.flightArcs.filter(a => a.isVisible).length
            }
        },
        performance: { ...flightPerformance },
        dataStatus: {
            airportCoordsLoaded: !!flightSystem.airportCoords,
            flightLogsLoaded: !!flightSystem.flightLogs
        }
    };
}


// ==============================
// ENHANCED AIRPORT VISUALIZATION UTILITIES
// ==============================

/**
 * Toggles visibility of all airport points with enhanced feedback
 */
window.toggleAirportPoints = function() {
    try {
        if (flightSystem.airportPoints.length === 0) {
            console.warn("⚠️ No airport points available to toggle");
            return false;
        }
        
        const currentVisibility = flightSystem.airportPoints.length > 0 ? flightSystem.airportPoints[0].isVisible : false;
        const newVisibility = !currentVisibility;
        
        let changedCount = 0;
        flightSystem.airportPoints.forEach(point => {
            if (point && typeof point.isVisible !== 'undefined') {
                point.isVisible = newVisibility;
                changedCount++;
            }
        });
        
        console.log(`✅ ${changedCount} airport points ${newVisibility ? 'shown' : 'hidden'}`);
        return newVisibility;
        
    } catch (error) {
        console.error("❌ Error toggling airport points:", error);
        return false;
    }
};

/**
 * Shows all airport points with validation
 */
window.showAirportPoints = function() {
    try {
        if (flightSystem.airportPoints.length === 0) {
            console.warn("⚠️ No airport points available to show");
            return false;
        }
        
        let changedCount = 0;
        flightSystem.airportPoints.forEach(point => {
            if (point && typeof point.isVisible !== 'undefined') {
                point.isVisible = true;
                changedCount++;
            }
        });
        
        console.log(`✅ ${changedCount} airport points shown`);
        return true;
        
    } catch (error) {
        console.error("❌ Error showing airport points:", error);
        return false;
    }
};

/**
 * Hides all airport points with validation
 */
window.hideAirportPoints = function() {
    try {
        if (flightSystem.airportPoints.length === 0) {
            console.warn("⚠️ No airport points available to hide");
            return false;
        }
        
        let changedCount = 0;
        flightSystem.airportPoints.forEach(point => {
            if (point && typeof point.isVisible !== 'undefined') {
                point.isVisible = false;
                changedCount++;
            }
        });
        
        console.log(`✅ ${changedCount} airport points hidden`);
        return true;
        
    } catch (error) {
        console.error("❌ Error hiding airport points:", error);
        return false;
    }
};

/**
 * Changes the color of airport points with enhanced validation and options
 * @param {string} color - Color name or 'random' for random colors
 * @returns {boolean} Success status
 */
window.setAirportPointColor = function(color = 'yellow') {
    try {
        if (flightSystem.airportPoints.length === 0) {
            console.warn("⚠️ No airport points available to color");
            return false;
        }
        
        const predefinedColors = {
            yellow: { emissive: [1, 0.8, 0.2], diffuse: [1, 0.9, 0.4] },
            red: { emissive: [1, 0.2, 0.2], diffuse: [1, 0.4, 0.4] },
            blue: { emissive: [0.2, 0.4, 1], diffuse: [0.4, 0.6, 1] },
            green: { emissive: [0.2, 1, 0.2], diffuse: [0.4, 1, 0.4] },
            white: { emissive: [1, 1, 1], diffuse: [1, 1, 1] },
            orange: { emissive: [1, 0.5, 0], diffuse: [1, 0.7, 0.2] },
            purple: { emissive: [0.8, 0.2, 1], diffuse: [0.9, 0.4, 1] },
            cyan: { emissive: [0.2, 1, 1], diffuse: [0.4, 1, 1] },
            pink: { emissive: [1, 0.2, 0.6], diffuse: [1, 0.4, 0.8] }
        };
        
        let changedCount = 0;
        
        flightSystem.airportPoints.forEach(point => {
            if (!point || !point.material) return;
            
            try {
                let colorData;
                
                if (color === 'random') {
                    // Generate random color
                    colorData = {
                        emissive: [Math.random(), Math.random(), Math.random()],
                        diffuse: [Math.random() * 0.8 + 0.2, Math.random() * 0.8 + 0.2, Math.random() * 0.8 + 0.2]
                    };
                } else {
                    colorData = predefinedColors[color.toLowerCase()] || predefinedColors.yellow;
                }
                
                point.material.emissiveColor = new BABYLON.Color3(...colorData.emissive);
                point.material.diffuseColor = new BABYLON.Color3(...colorData.diffuse);
                
                // Update stored original colors for hover effects
                point.originalEmissive = point.material.emissiveColor.clone();
                point.originalDiffuse = point.material.diffuseColor.clone();
                
                changedCount++;
                
            } catch (error) {
                console.warn(`Failed to update color for airport point:`, error);
            }
        });
        
        console.log(`✅ Changed color of ${changedCount} airport points to ${color}`);
        return true;
        
    } catch (error) {
        console.error("❌ Error setting airport point color:", error);
        return false;
    }
};

/**
 * Changes the size of airport points with validation and bounds checking
 * @param {number} scale - Scale factor (0.1 to 5.0 recommended)
 * @returns {boolean} Success status
 */
window.setAirportPointSize = function(scale = 1.0) {
    try {
        if (flightSystem.airportPoints.length === 0) {
            console.warn("⚠️ No airport points available to resize");
            return false;
        }
        
        // Validate scale parameter
        if (typeof scale !== 'number' || isNaN(scale) || scale <= 0) {
            console.error("❌ Invalid scale value. Must be a positive number.");
            return false;
        }
        
        // Clamp scale to reasonable bounds
        const clampedScale = Math.max(0.1, Math.min(5.0, scale));
        if (clampedScale !== scale) {
            console.warn(`⚠️ Scale clamped to ${clampedScale} (was ${scale})`);
        }
        
        let changedCount = 0;
        
        flightSystem.airportPoints.forEach(point => {
            if (point && point.scaling) {
                try {
                    point.scaling = new BABYLON.Vector3(clampedScale, clampedScale, clampedScale);
                    changedCount++;
                } catch (error) {
                    console.warn("Failed to scale airport point:", error);
                }
            }
        });
        
        console.log(`✅ Scaled ${changedCount} airport points to ${clampedScale}x`);
        return true;
        
    } catch (error) {
        console.error("❌ Error setting airport point size:", error);
        return false;
    }
};

/**
 * Gets comprehensive information about airports currently displayed
 * @returns {Object} Detailed airport statistics and information
 */
window.getAirportPointsInfo = function() {
    try {
        if (flightSystem.airportPoints.length === 0) {
            return {
                totalAirports: 0,
                visible: 0,
                countries: [],
                regions: [],
                message: "No airport points available"
            };
        }
        
        const visiblePoints = flightSystem.airportPoints.filter(p => p && p.isVisible);
        const countries = [...new Set(flightSystem.airportPoints
            .filter(p => p && p.airportData && p.airportData.country_code)
            .map(p => p.airportData.country_code))]
            .sort();
            
        const regions = [...new Set(flightSystem.airportPoints
            .filter(p => p && p.airportData && p.airportData.region)
            .map(p => p.airportData.region))]
            .sort();
        
        const info = {
            totalAirports: flightSystem.airportPoints.length,
            visible: visiblePoints.length,
            countries: countries,
            regions: regions,
            countryCount: countries.length,
            regionCount: regions.length,
            systemStatus: {
                initialized: flightSystem.initialized,
                loading: flightSystem.loading,
                hasError: !!flightSystem.error
            }
        };
        
        console.group("📊 Airport Points Information");
        console.log(`Total Airports: ${info.totalAirports}`);
        console.log(`Visible: ${info.visible}`);
        console.log(`Countries: ${info.countryCount}`);
        console.log(`Regions: ${info.regionCount}`);
        console.log("Countries:", info.countries);
        console.groupEnd();
        
        return info;
        
    } catch (error) {
        console.error("❌ Error getting airport points info:", error);
        return { error: error.message };
    }
};

/**
 * Finds airports by country code with enhanced search and validation
 * @param {string} countryCode - Two-letter country code (e.g., 'US', 'GB', 'JP')
 * @returns {Array} Array of airport objects in the specified country
 */
window.findAirportsByCountry = function(countryCode) {
    try {
        if (!countryCode || typeof countryCode !== 'string') {
            console.error("❌ Invalid country code provided");
            return [];
        }
        
        if (flightSystem.airportPoints.length === 0) {
            console.warn("⚠️ No airport points available to search");
            return [];
        }
        
        const upperCountryCode = countryCode.toUpperCase();
        
        const airports = flightSystem.airportPoints
            .filter(point => point && point.airportData && 
                   point.airportData.country_code === upperCountryCode)
            .map(point => ({
                code: point.airportData.code,
                name: point.airportData.name,
                airport: point.airportData.airport,
                region: point.airportData.region,
                coordinates: {
                    latitude: point.airportData.latitude,
                    longitude: point.airportData.longitude
                },
                visible: point.isVisible
            }))
            .sort((a, b) => a.code.localeCompare(b.code));
        
        console.log(`🔍 Found ${airports.length} airports in ${upperCountryCode}:`);
        if (airports.length > 0) {
            console.table(airports);
        }
        
        return airports;
        
    } catch (error) {
        console.error("❌ Error finding airports by country:", error);
        return [];
    }
};

/**
 * Advanced airport search with multiple criteria
 * @param {Object} criteria - Search criteria object
 * @returns {Array} Array of matching airport objects
 */
window.searchAirports = function(criteria = {}) {
    try {
        if (flightSystem.airportPoints.length === 0) {
            console.warn("⚠️ No airport points available to search");
            return [];
        }
        
        let results = [...flightSystem.airportPoints];
        
        // Filter by country
        if (criteria.country) {
            const country = criteria.country.toUpperCase();
            results = results.filter(point => 
                point.airportData && point.airportData.country_code === country);
        }
        
        // Filter by region
        if (criteria.region) {
            const region = criteria.region.toLowerCase();
            results = results.filter(point => 
                point.airportData && point.airportData.region && 
                point.airportData.region.toLowerCase().includes(region));
        }
        
        // Filter by airport code
        if (criteria.code) {
            const code = criteria.code.toUpperCase();
            results = results.filter(point => 
                point.airportData && point.airportData.code && 
                point.airportData.code.includes(code));
        }
        
        // Filter by name
        if (criteria.name) {
            const name = criteria.name.toLowerCase();
            results = results.filter(point => 
                point.airportData && 
                (point.airportData.name.toLowerCase().includes(name) ||
                 point.airportData.airport.toLowerCase().includes(name)));
        }
        
        // Filter by visibility
        if (typeof criteria.visible === 'boolean') {
            results = results.filter(point => point.isVisible === criteria.visible);
        }
        
        // Convert to output format
        const airports = results.map(point => ({
            code: point.airportData.code,
            name: point.airportData.name,
            airport: point.airportData.airport,
            country_code: point.airportData.country_code,
            region: point.airportData.region,
            coordinates: {
                latitude: point.airportData.latitude,
                longitude: point.airportData.longitude
            },
            visible: point.isVisible
        }));
        
        console.log(`🔍 Found ${airports.length} airports matching criteria:`, criteria);
        return airports;
        
    } catch (error) {
        console.error("❌ Error searching airports:", error);
        return [];
    }
};

// ==============================
// FLIGHT ARC UTILITIES
// ==============================

/**
 * Toggles visibility of all flight arcs
 */
window.toggleFlightArcs = function() {
    try {
        if (flightSystem.flightArcs.length === 0) {
            console.warn("⚠️ No flight arcs available to toggle");
            return false;
        }
        
        const currentVisibility = flightSystem.flightArcs.length > 0 ? flightSystem.flightArcs[0].isVisible : false;
        const newVisibility = !currentVisibility;
        
        let changedCount = 0;
        flightSystem.flightArcs.forEach(arc => {
            if (arc && typeof arc.isVisible !== 'undefined') {
                arc.isVisible = newVisibility;
                changedCount++;
            }
        });
        
        console.log(`✅ ${changedCount} flight arcs ${newVisibility ? 'shown' : 'hidden'}`);
        return newVisibility;
        
    } catch (error) {
        console.error("❌ Error toggling flight arcs:", error);
        return false;
    }
};

/**
 * Gets comprehensive system status and statistics
 */
window.getFlightSystemInfo = function() {
    const status = getFlightSystemStatus();
    console.group("🌍 Flight System Status");
    console.log("Initialized:", status.initialized);
    console.log("Loading:", status.loading);
    console.log("Error:", status.error || "None");
    console.log("Statistics:", status.statistics);
    console.log("Performance:", status.performance);
    console.groupEnd();
    return status;
};

/**
 * Reinitializes the flight system (useful for troubleshooting)
 */
window.reinitializeFlights = async function(scene) {
    try {
        console.log("🔄 Reinitializing flight system...");
        await resetFlightSystem();
        const result = await initializeFlights(scene);
        console.log("✅ Reinitialization completed:", result);
        return result;
    } catch (error) {
        console.error("❌ Error reinitializing flights:", error);
        return { success: false, error: error.message };
    }
};

// Maintain backward compatibility with legacy variable names
Object.defineProperty(window, 'airportPoints', {
    get: function() {
        console.warn("⚠️ Using deprecated 'airportPoints' global variable. Use flightSystem.airportPoints instead.");
        return flightSystem.airportPoints;
    }
});

// Export enhanced system for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        flightSystem,
        flightPerformance,
        FLIGHT_CONFIG,
        initializeFlights,
        resetFlightSystem,
        getFlightSystemStatus,
        loadFlightData,
        createFlightArc,
        createAirportPoint
    };
}
