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
  error: null,
};

// ==============================
// CONFIGURATION AND CONSTANTS
// ==============================

const FLIGHT_CONFIG = {
  // Visualization settings
  airportPoint: {
    diameter: 0.008,
    radius: 1,
    colors: {
      default: { emissive: [1, 0.8, 0.2], diffuse: [1, 0.9, 0.4] },
      hover: { emissive: [1, 1, 0.5], diffuse: [1, 1, 0.7] },
    },
  },
  flightArc: {
    radius: 1,
    thickness: 0.001,
    tessellation: 6,
    points: 50,
    height: 0.05,
    colors: {
      default: { emissive: [0.3, 0.7, 2.5], diffuse: [0.2, 0.5, 1.8] },
    },
    alpha: 0.4,
  },
  // Performance settings
  batchSize: 100,
  maxRetries: 3,
  retryDelay: 1000,
  // File paths
  dataPaths: {
    airports: "js/data/airports_by_iata.json",
    flights: "js/data/flight_logs.json",
  },
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
  if (!data || typeof data !== "object") {
    console.error("✈️ ❌ Airport data is null or not an object");
    return false;
  }

  const sampleKeys = Object.keys(data).slice(0, 5);
  for (const key of sampleKeys) {
    const airport = data[key];
    if (
      !airport.latitude ||
      !airport.longitude ||
      typeof airport.latitude !== "number" ||
      typeof airport.longitude !== "number"
    ) {
      console.error(`✈️ ❌ Invalid airport data structure for ${key}:`, airport);
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
  if (!Array.isArray(data) && typeof data !== "object") {
    console.error("✈️ ❌ Flight data is not an array or object");
    return false;
  }

  const flights = Array.isArray(data) ? data : Object.values(data);
  if (flights.length === 0) {
    console.warn("✈️ ⚠️ Flight data is empty");
    return false;
  }

  const sampleFlights = flights.slice(0, 5);
  for (const flight of sampleFlights) {
    if (!flight.from_code || !flight.to_code) {
      console.error("✈️ ❌ Invalid flight data structure:", flight);
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
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      console.warn(`✈️ ⚠️ Invalid coordinates: lat=${lat}, lng=${lng}`);
      return null;
    }

    // Convert to radians
    const latRad = (lat * Math.PI) / 180;
    const lngRad = ((lng - 180) * Math.PI) / 180; // Adjust for coordinate system

    // Convert to 3D coordinates
    return new BABYLON.Vector3(
      radius * Math.cos(lngRad) * Math.cos(latRad),
      radius * Math.sin(latRad),
      radius * Math.sin(lngRad) * Math.cos(latRad)
    );
  } catch (error) {
    console.error("✈️ ❌ Error converting coordinates to position:", error);
    return null;
  }
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
    console.log("✈️ 📍 Loading airport coordinates...");

    const response = await fetch(FLIGHT_CONFIG.dataPaths.airports);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!validateAirportData(data)) {
      throw new Error("Invalid airport data structure");
    }

    console.log(`✈️ ✅ Airport coordinates loaded successfully`);
    console.log(`✈️ 📊 Loaded ${Object.keys(data).length} airports`);

    return data;
  } catch (error) {
    console.error(`✈️ ❌ Error loading airport coordinates (attempt ${retryCount + 1}):`, error);

    // Retry logic with exponential backoff
    if (retryCount < FLIGHT_CONFIG.maxRetries) {
      const delay = FLIGHT_CONFIG.retryDelay * Math.pow(2, retryCount);
      console.log(`✈️ 🔄 Retrying in ${delay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      return loadAirportCoords(retryCount + 1);
    }

    // Set error state and re-throw after max retries
    throw new Error(
      `Failed to load airport coordinates after ${FLIGHT_CONFIG.maxRetries} attempts: ${error.message}`
    );
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

    const response = await fetch(FLIGHT_CONFIG.dataPaths.flights);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!validateFlightData(data)) {
      throw new Error("Invalid flight data structure");
    }

    const flightArray = Array.isArray(data) ? data : Object.values(data);

    console.log(`✈️ ✅ Flight logs loaded successfully`);
    console.log(`✈️ 📊 Loaded ${flightArray.length} flights`);

    return data;
  } catch (error) {
    console.error(`✈️ ❌ Error loading flight logs (attempt ${retryCount + 1}):`, error);

    // Retry logic with exponential backoff
    if (retryCount < FLIGHT_CONFIG.maxRetries) {
      const delay = FLIGHT_CONFIG.retryDelay * Math.pow(2, retryCount);
      console.log(`✈️ 🔄 Retrying in ${delay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      return loadFlightLogs(retryCount + 1);
    }

    // Set error state and re-throw after max retries
    throw new Error(
      `Failed to load flight logs after ${FLIGHT_CONFIG.maxRetries} attempts: ${error.message}`
    );
  }
}

/**
 * Loads all flight data concurrently with simple caching
 * @returns {Promise<{airportCoords: Object, flightLogs: Array}>} Combined flight data
 */
async function loadFlightData() {
  // Return cached data if already loaded
  if (flightSystem.airportCoords && flightSystem.flightLogs) {
    console.log("✈️ ✅ Using cached flight data");
    return {
      airportCoords: flightSystem.airportCoords,
      flightLogs: flightSystem.flightLogs,
    };
  }

  try {
    // Load both datasets concurrently for better performance
    const [airportCoords, flightLogs] = await Promise.all([loadAirportCoords(), loadFlightLogs()]);

    // Cache the data
    flightSystem.airportCoords = airportCoords;
    flightSystem.flightLogs = flightLogs;

    console.log(`✈️ ✅ All flight data loaded successfully`);

    return { airportCoords, flightLogs };
  } catch (error) {
    console.error("✈️ ❌ Failed to load flight data:", error);
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
 * Extracts distinct airports from flight logs with enhanced validation and parallel processing
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

    console.log(
      `✈️ 🔍 Processing ${flightArray.length} flights for distinct airports with parallel processing...`
    );

    // PARALLEL PROCESSING: Split flights into chunks for concurrent processing
    const chunkSize = Math.max(100, Math.floor(flightArray.length / 4)); // Process in 4 chunks minimum
    const chunks = [];

    for (let i = 0; i < flightArray.length; i += chunkSize) {
      chunks.push(flightArray.slice(i, i + chunkSize));
    }

    // Process each chunk and collect results
    const processChunk = (flightChunk, chunkIndex) => {
      const chunkAirports = new Map();
      let chunkProcessed = 0;
      let chunkSkipped = 0;

      flightChunk.forEach((flight, index) => {
        try {
          // Validate flight data
          if (!flight || typeof flight !== "object") {
            chunkSkipped++;
            return;
          }

          // Helper function to process an airport
          const processAirport = (airportCode, airportName) => {
            if (airportCode && airportCoords[airportCode]) {
              const airportData = airportCoords[airportCode];

              // Validate airport coordinates
              if (
                typeof airportData.latitude === "number" &&
                typeof airportData.longitude === "number" &&
                !isNaN(airportData.latitude) &&
                !isNaN(airportData.longitude)
              ) {
                chunkAirports.set(airportCode, {
                  code: airportCode,
                  name: airportName || airportData.airport || "Unknown",
                  airport: airportData.airport || "Unknown Airport",
                  country_code: airportData.country_code || "XX",
                  region: airportData.region || "Unknown",
                  latitude: airportData.latitude,
                  longitude: airportData.longitude,
                  icao: airportData.icao || airportCode,
                });
              } else {
                console.warn(`✈️ ⚠️ Invalid coordinates for airport ${airportCode}:`, airportData);
              }
            } else if (airportCode) {
              console.warn(`✈️ ⚠️ Airport data not found for code: ${airportCode}`);
            }
          };

          // Process both origin and destination airports
          processAirport(flight.from_code, flight.from);
          processAirport(flight.to_code, flight.to);

          chunkProcessed++;
        } catch (error) {
          console.error(`✈️ ❌ Error processing flight ${chunkIndex}-${index}:`, error, flight);
          chunkSkipped++;
        }
      });

      return { airports: chunkAirports, processed: chunkProcessed, skipped: chunkSkipped };
    };

    // Process all chunks in parallel using Promise-based approach for immediate execution
    const chunkResults = chunks.map((chunk, index) => processChunk(chunk, index));

    // Merge results from all chunks
    chunkResults.forEach((result) => {
      result.airports.forEach((airport, code) => {
        distinctAirports.set(code, airport);
      });
      processedFlights += result.processed;
      skippedFlights += result.skipped;
    });

    const airports = Array.from(distinctAirports.values());

    console.log(
      `✈️ ✅ Found ${airports.length} distinct airports from ${processedFlights} flights (processed in ${chunks.length} parallel chunks)`
    );
    if (skippedFlights > 0) {
      console.warn(`✈️ ⚠️ Skipped ${skippedFlights} flights due to data issues`);
    }

    return airports;
  } catch (error) {
    console.error("✈️ ❌ Error extracting distinct airports:", error);
    return [];
  }
}

/**
 * Creates a 3D point/sphere at an airport location with enhanced error handling
 * @param {Object} airport - Airport data object
 * @param {number} radius - Distance from Earth center
 * @returns {BABYLON.Mesh|null} The created airport point mesh or null if failed
 */
function createAirportPoint(airport, radius = FLIGHT_CONFIG.airportPoint.radius) {
  try {
    // Validate inputs
    if (!window.scene) {
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
      window.scene
    );

    if (!airportSphere) {
      throw new Error("Failed to create airport sphere mesh");
    }

    // Position the sphere
    airportSphere.position = position;

    // Create enhanced material with error handling
    const materialName = `airportMat_${airport.code}_${Date.now()}`;
    const pointMaterial = new BABYLON.StandardMaterial(materialName, window.scene);

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
    airportSphere.actionManager = new BABYLON.ActionManager(window.scene);

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
    console.error(`✈️ ❌ Error creating airport point for ${airport?.code || "unknown"}:`, error);
    return null;
  }
}

/**
 * Creates airport points for all distinct airports with enhanced parallel batch processing
 * @param {Array} distinctAirports - Array of unique airport objects
 * @returns {Promise<Array>} Array of created airport point meshes
 */
async function createAirportPoints(distinctAirports) {
  if (!window.scene) {
    throw new Error("Scene is required for creating airport points");
  }

  if (!Array.isArray(distinctAirports) || distinctAirports.length === 0) {
    console.warn("✈️ ⚠️ No airports provided for point creation");
    return [];
  }

  console.log(
    `✈️ 🏗️ Creating points for ${distinctAirports.length} airports with parallel processing...`
  );

  try {
    const createdPoints = [];
    const batchSize = FLIGHT_CONFIG.batchSize;
    let processedCount = 0;
    let errorCount = 0;

    // Process airports in batches with parallel creation within each batch
    for (let i = 0; i < distinctAirports.length; i += batchSize) {
      const batch = distinctAirports.slice(i, i + batchSize);

      // PARALLEL CREATION: Create all airport points in the batch simultaneously
      const batchPromises = batch.map(async (airport) => {
        try {
          const airportPoint = createAirportPoint(airport);
          if (airportPoint) {
            flightSystem.airportPoints.push(airportPoint);
            return airportPoint;
          } else {
            throw new Error(`Failed to create point for ${airport.code}`);
          }
        } catch (error) {
          console.warn(`✈️ ❌ Error creating point for ${airport?.code}:`, error);
          throw error;
        }
      });

      // Wait for all points in this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);

      // Count successes and failures
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          createdPoints.push(result.value);
          processedCount++;
        } else {
          errorCount++;
        }
      });

      // Yield control to prevent blocking (only between batches)
      if (i + batchSize < distinctAirports.length) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }

      // Progress logging
      const progress = Math.min(100, ((i + batchSize) / distinctAirports.length) * 100);
      if (progress >= 100 || (progress > 0 && progress % 25 === 0)) {
        console.log(
          `✈️ 🔄 Airport points progress: ${progress.toFixed(0)}% (${processedCount}/${
            distinctAirports.length
          })`
        );
      }
    }

    console.log(`✈️ ✅ Created ${processedCount} airport points with parallel batch processing`);
    if (errorCount > 0) {
      console.warn(`✈️ ⚠️ Failed to create ${errorCount} airport points`);
    }

    return createdPoints;
  } catch (error) {
    console.error("✈️ ❌ Error creating airport points:", error);
    throw error;
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
    if (!point1 || !point2 || typeof t !== "number" || isNaN(t)) {
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
    console.warn("✈️ ⚠️ Error in spherical interpolation:", error);
    // Fallback to linear interpolation
    return BABYLON.Vector3.Lerp(point1, point2, t);
  }
}

/**
 * Creates a 3D flight arc between two geographic coordinates with enhanced error handling
 * @param {number} lat1 - Origin latitude in degrees
 * @param {number} lng1 - Origin longitude in degrees
 * @param {number} lat2 - Destination latitude in degrees
 * @param {number} lng2 - Destination longitude in degrees
 * @param {number} radius - Optional radius from Earth center
 * @param {Object} options - Optional styling and behavior options
 * @returns {BABYLON.Mesh|null} The created flight arc tube mesh or null if failed
 */
function createFlightArc(
  lat1,
  lng1,
  lat2,
  lng2,
  radius = FLIGHT_CONFIG.flightArc.radius,
  options = {}
) {
  try {
    // Validate inputs
    if (!window.scene) {
      throw new Error("Scene is required");
    }

    // Validate coordinates
    const coords = [
      { name: "lat1", value: lat1, min: -90, max: 90 },
      { name: "lng1", value: lng1, min: -180, max: 180 },
      { name: "lat2", value: lat2, min: -90, max: 90 },
      { name: "lng2", value: lng2, min: -180, max: 180 },
    ];

    for (const coord of coords) {
      if (
        typeof coord.value !== "number" ||
        isNaN(coord.value) ||
        coord.value < coord.min ||
        coord.value > coord.max
      ) {
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
    const arcName = `flightArc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const arcTube = BABYLON.MeshBuilder.CreateTube(
      arcName,
      {
        path: arcPoints,
        radius: options.thickness || FLIGHT_CONFIG.flightArc.thickness,
        tessellation: options.tessellation || FLIGHT_CONFIG.flightArc.tessellation,
        cap: BABYLON.Mesh.CAP_ALL,
      },
      window.scene
    );

    if (!arcTube) {
      throw new Error("Failed to create arc tube mesh");
    }

    // Create enhanced material
    const materialName = `arcMaterial_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const arcMaterial = new BABYLON.StandardMaterial(materialName, window.scene);

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
      distance:
        Math.acos(
          Math.max(-1, Math.min(1, BABYLON.Vector3.Dot(normalizedPoint1, normalizedPoint2)))
        ) * 6371, // km
    };

    return arcTube;
  } catch (error) {
    console.error(`❌ Error creating flight arc (${lat1},${lng1}) to (${lat2},${lng2}):`, error);
    return null;
  }
}

/**
 * Creates multiple flight arcs with enhanced parallel batch processing
 * @param {Array} flights - Array of flight objects with from/to coordinates
 * @param {Object} airportCoords - Airport coordinates lookup
 * @returns {Promise<Array>} Array of created flight arc meshes
 */
async function createFlightArcs(flights, airportCoords) {
  if (!window.scene) {
    throw new Error("Scene is required for creating flight arcs");
  }

  if (!Array.isArray(flights) || flights.length === 0) {
    console.warn("✈️ ⚠️ No flights provided for arc creation");
    return [];
  }

  console.log(`✈️ 🚀 Creating arcs for ${flights.length} flights with parallel processing...`);

  try {
    const createdArcs = [];
    const batchSize = FLIGHT_CONFIG.batchSize;
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process flights in batches with parallel creation within each batch
    for (let i = 0; i < flights.length; i += batchSize) {
      const batch = flights.slice(i, i + batchSize);

      // PARALLEL CREATION: Create all flight arcs in the batch simultaneously
      const batchPromises = batch.map(async (flight) => {
        try {
          // Validate flight data
          if (!flight || !flight.from_code || !flight.to_code) {
            return { success: false, reason: "skipped", flight };
          }

          const fromAirport = airportCoords[flight.from_code];
          const toAirport = airportCoords[flight.to_code];

          if (!fromAirport || !toAirport) {
            return { success: false, reason: "skipped", flight };
          }

          // Create the flight arc
          const arc = createFlightArc(
            fromAirport.latitude,
            fromAirport.longitude,
            toAirport.latitude,
            toAirport.longitude
          );

          if (arc) {
            flightSystem.flightArcs.push(arc);
            return { success: true, arc, flight };
          } else {
            return { success: false, reason: "creation_failed", flight };
          }
        } catch (error) {
          return { success: false, reason: "error", error, flight };
        }
      });

      // Wait for all arcs in this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);

      // Process results and count outcomes
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          const flightResult = result.value;
          if (flightResult.success) {
            createdArcs.push(flightResult.arc);
            processedCount++;
          } else if (flightResult.reason === "skipped") {
            skippedCount++;
          } else {
            errorCount++;
          }
        } else {
          errorCount++;
        }
      });

      // Yield control to prevent blocking (only between batches)
      if (i + batchSize < flights.length) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }

      // Progress update (less frequent)
      const progress = Math.min(100, ((i + batchSize) / flights.length) * 100);
      if (progress >= 100 || (progress > 0 && progress % 25 === 0)) {
        console.log(
          `✈️ 🔄 Flight arc progress: ${progress.toFixed(0)}% (${processedCount}/${flights.length})`
        );
      }
    }

    console.log(`✈️ ✅ Created ${processedCount} flight arcs with parallel batch processing`);
    if (skippedCount > 0) {
      console.warn(`✈️ ⚠️ Skipped ${skippedCount} flights due to missing airport data`);
    }
    if (errorCount > 0) {
      console.warn(`✈️ ⚠️ Failed to create ${errorCount} flight arcs due to errors`);
    }

    return createdArcs;
  } catch (error) {
    console.error("✈️ ❌ Error creating flight arcs:", error);
    throw error;
  }
}

// ==============================
// ENHANCED FLIGHT VISUALIZATION INITIALIZATION
// ==============================

/**
 * Initializes the complete flight visualization system with comprehensive error handling
 * @returns {Promise<Object>} Initialization result with statistics
 */
async function initializeFlights() {
  // Simple check - if already initialized, return status
  if (flightSystem.initialized) {
    console.log("✈️ ✅ Flight system already initialized");
    return true;
  }

  if (!window.scene) {
    const error = new Error("Scene is required for flight initialization");
    console.error("✈️ ❌", error.message);
    throw error;
  }

  try {
    // Step 1: Load flight data (uses caching)
    console.log("✈️ 📥 Loading flight data...");
    const { airportCoords, flightLogs } = await loadFlightData();

    // Step 2: Process airports
    console.log("✈️ 🏗️ Processing airports...");
    const distinctAirports = getDistinctAirports(airportCoords, flightLogs);

    if (distinctAirports.length === 0) {
      throw new Error("No valid airports found in flight data");
    }

    // Step 3 & 4: PARALLEL CREATION - Create airport points and flight arcs simultaneously
    console.log("✈️ 🚀 Starting parallel creation of airport points and flight arcs...");
    const flightArray = Array.isArray(flightLogs) ? flightLogs : Object.values(flightLogs);

    const creationPromises = [
      createAirportPoints(distinctAirports),
      createFlightArcs(flightArray, airportCoords),
    ];

    const [airportResults, arcResults] = await Promise.allSettled(creationPromises);

    // Check results and handle any failures
    if (airportResults.status === "fulfilled") {
      console.log(`✈️ ✅ ${flightSystem.airportPoints.length} airport points created`);
    } else {
      console.error("✈️ ❌ Airport points creation failed:", airportResults.reason);
      throw airportResults.reason;
    }

    if (arcResults.status === "fulfilled") {
      console.log(`✈️ ✅ ${flightSystem.flightArcs.length} flight arcs created`);
    } else {
      console.error("✈️ ❌ Flight arcs creation failed:", arcResults.reason);
      throw arcResults.reason;
    }

    // Step 5: Finalize initialization
    flightSystem.initialized = true;

    console.log("✈️ 📊 Initialization Complete!", {
      airports: flightSystem.airportPoints.length,
      flights: flightSystem.flightArcs.length,
    });

    console.log("✈️ ✅ Flight system ready with parallel processing!");

    return true;
  } catch (error) {
    flightSystem.error = error;
    console.error("✈️ ❌ Flight system failed:", error);
    throw error;
  }
}
