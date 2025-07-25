// ==============================
// EARTH TILES
// ==============================

window.tileProviders = {
  OPENSTREETMAP: {
    // Load time from last test = 17ms
    name: "OpenStreetMap",
    description:
      "A collaborative mapping project that provides free geographic data and mapping to anyone who wants to use it.",
    short: "Community maps",
    urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    northCapColor: "#aad3df",
    southCapColor: "#f2efe9",
  },
  OPENTOPOMAP: {
    // Load time from last test = 1389ms
    name: "OpenTopoMap",
    description: "A topographic map of the world, based on OpenStreetMap data.",
    short: "Topographic map",
    urlTemplate: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap contributors",
    northCapColor: "#97d2e3",
    southCapColor: "#ae625a",
  },
  CARTODB_POSITRON: {
    // Load time from last test = 18ms
    name: "CartoDB Positron",
    description: "A light, neutral basemap designed for use with CartoDB's mapping platform.",
    short: "Light theme",
    urlTemplate: "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attribution: "© CartoDB",
    northCapColor: "#d4dadc",
    southCapColor: "#fafaf8",
  },
  CARTODB_DARK: {
    // Load time from last test = 15ms
    name: "CartoDB Dark",
    description: "A dark-themed basemap from CartoDB, suitable for night mode applications.",
    short: "Dark theme",
    urlTemplate: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution: "© CartoDB",
    northCapColor: "#262626",
    southCapColor: "#000000",
  },
  CARTODB_VOYAGER: {
    // Load time from last test = 13ms
    name: "CartoDB Voyager",
    description: "A modern, detailed basemap from CartoDB with a focus on urban areas.",
    short: "Urban focus",
    urlTemplate: "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    attribution: "© CartoDB",
    northCapColor: "#d5e8eb",
    southCapColor: "#fbf8f3",
  },
  ESRI_WORLD_IMAGERY: {
    // Load time from last test = 54ms
    name: "ESRI World Imagery",
    description: "High-resolution satellite imagery from ESRI, suitable for detailed mapping.",
    short: "Satellite view",
    urlTemplate:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© ESRI",
    northCapColor: "#054355",
    southCapColor: "#f6f8fe",
  },
  ESRI_WORLD_TOPO_MAP: {
    // Load time from last test = 54ms
    name: "ESRI World Topo Map",
    description: "A topographic map from ESRI, providing detailed terrain information.",
    short: "Topographic map",
    urlTemplate:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "© ESRI",
    northCapColor: "#bae7fe",
    southCapColor: "#fdfdfd",
  },
  BING_SATELLITE: {
    // Load time from last test = 83ms
    name: "Bing Satellite",
    description: "High-resolution satellite imagery from Microsoft Bing.",
    short: "High-res imagery",
    urlTemplate: null, // Special handling for quadkey system
    attribution: "© Microsoft",
    northCapColor: "#01121f",
    southCapColor: "#e2e5f2",
  },
};
window.tileProvider = window.tileProviders.BING_SATELLITE;

/**
 * Sets the active Earth tile provider
 * @param {Object} provider - Earth Tile provider configuration from TileProviders
 */
window.setTileProvider = function (provider) {
  window.tileProvider = provider;
  console.log(`🌍 ✅ Switched to earth tile provider: ${provider.name}`);

  // Reinitialize the Earth with the new provider
  reinitializeEarthWithNewProvider().catch((error) => {
    console.error("🌍 ❌ Failed to reinitialize Earth with new provider:", error);
  });
};

/**
 * Reinitializes Earth with the new tile provider
 * Disposes current Earth and recreates it with the new imagery source
 */
async function reinitializeEarthWithNewProvider() {
  console.log(`🌍 🔄 Reinitializing Earth with new provider: ${window.tileProvider.name}`);

  try {
    // Step 1: Dispose current Earth resources
    if (typeof window.disposeEarth === "function") {
      console.log("🌍 🗑️ Disposing current Earth resources...");
      await window.disposeEarth();
    } else {
      console.warn("🌍 ⚠️ disposeEarth function not found, skipping disposal");
    }

    // Step 2: Small delay to ensure cleanup is complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Step 3: Reinitialize Earth with new provider
    if (typeof initializeEarth === "function") {
      console.log("🌍 🏗️ Reinitializing Earth with new tile provider...");
      await initializeEarth();
      console.log(`🌍 ✅ Earth reinitialized successfully with ${window.tileProvider.name}`);
    } else {
      console.error("🌍 ❌ initializeEarth function not found, cannot reinitialize");
      throw new Error("Earth initialization function not available");
    }

    // Step 4: Update pole colors to match new provider
    if (
      typeof window.setNorthPoleColor === "function" &&
      typeof window.setSouthPoleColor === "function"
    ) {
      window.setNorthPoleColor(window.tileProvider.northCapColor || "#aad3df");
      window.setSouthPoleColor(window.tileProvider.southCapColor || "#f2efe9");
      console.log("🌍 🎨 Pole colors updated to match new tile provider");
    }
  } catch (error) {
    console.error("🌍 ❌ Error reinitializing Earth with new provider:", error);
    throw error;
  }
}

// ==============================
// TILES TOOLS
// ==============================

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
 * @param {Object} tileProvider - Current tile provider configuration
 * @returns {string} Complete tile URL
 */
function getTileUrl(x, y, z, tileProvider) {
  if (tileProvider === window.tileProviders.BING_SATELLITE) {
    // Special handling for Bing's quadkey system
    const quadkey = tileToQuadkey(x, y, z);
    return `https://t.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/${quadkey}?it=A&n=z`;
  } else {
    // Standard XYZ tile system
    return tileProvider.urlTemplate
      .replace("{x}", x.toString())
      .replace("{y}", y.toString())
      .replace("{z}", z.toString());
  }
}

// ==============================
// TILES TESTS
// ==============================

/**
 * Tests a tile provider by attempting to load a sample tile
 * @param {Object} tileProvider - Tile provider configuration to test
 * @param {number} [x=0] - Sample tile X coordinate (default: 0)
 * @param {number} [y=0] - Sample tile Y coordinate (default: 0)
 * @param {number} [z=1] - Sample zoom level (default: 1)
 * @returns {Promise<Object>} Promise that resolves with test results
 */
function testTileProviderAtCoordinates(tileProvider, x = 0, y = 0, z = 1) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const testUrl = getTileUrl(x, y, z, tileProvider);

    console.log(`🌍 Testing tile provider: ${tileProvider.name}`);
    console.log(`🌍 Test URL: ${testUrl}`);

    const img = new Image();

    img.onload = function () {
      const loadTime = Date.now() - startTime;
      const result = {
        success: true,
        provider: tileProvider.name,
        url: testUrl,
        loadTime: loadTime,
        dimensions: {
          width: this.naturalWidth,
          height: this.naturalHeight,
        },
        message: `✅ Provider working - loaded in ${loadTime}ms`,
      };
      console.log(result.message);
      resolve(result);
    };

    img.onerror = function () {
      const loadTime = Date.now() - startTime;
      const result = {
        success: false,
        provider: tileProvider.name,
        url: testUrl,
        loadTime: loadTime,
        error: "Failed to load tile",
        message: `❌ Provider failed - error after ${loadTime}ms`,
      };
      console.log(result.message);
      resolve(result);
    };

    // Set a timeout to prevent hanging
    setTimeout(() => {
      if (!img.complete) {
        const result = {
          success: false,
          provider: tileProvider.name,
          url: testUrl,
          loadTime: Date.now() - startTime,
          error: "Timeout",
          message: `⏱️ Provider timeout - no response after 10 seconds`,
        };
        console.log(result.message);
        resolve(result);
      }
    }, 10000);

    img.src = testUrl;
  });
}

/**
 * Tests a single tile provider across multiple zoom levels and coordinates
 * @param {Object} provider - Tile provider configuration to test
 * @param {Array<number>} zoomLevels - Zoom levels to test
 * @param {number} samplesPerZoom - Number of coordinate samples per zoom level
 * @returns {Promise<Object>} Promise that resolves with test results for the provider
 */
async function testTileProvider(provider, zoomLevels, samplesPerZoom) {
  console.log(`🌍 📍 Testing provider: ${provider.name}`);
  const providerResults = {
    provider: provider.name,
    tests: [],
    summary: {
      total: 0,
      successful: 0,
      failed: 0,
      avgLoadTime: 0,
    },
  };

  let totalLoadTime = 0;

  // Test across different zoom levels
  for (const zoom of zoomLevels) {
    const tilesAtZoom = Math.pow(2, zoom); // Number of tiles per dimension at this zoom

    // Generate sample coordinates for this zoom level
    const coordinates = [];
    for (let i = 0; i < samplesPerZoom; i++) {
      const x = Math.floor(Math.random() * tilesAtZoom);
      const y = Math.floor(Math.random() * tilesAtZoom);
      coordinates.push({ x, y, z: zoom });
    }

    // Test each coordinate
    for (const coord of coordinates) {
      try {
        const testResult = await testTileProviderAtCoordinates(provider, coord.x, coord.y, coord.z);
        providerResults.tests.push({
          coordinates: coord,
          ...testResult,
        });

        if (testResult.success) {
          providerResults.summary.successful++;
          totalLoadTime += testResult.loadTime;
        } else {
          providerResults.summary.failed++;
        }
        providerResults.summary.total++;
      } catch (error) {
        console.error(`🌍 Error testing ${provider.name} at:`, coord, error);
        providerResults.summary.failed++;
        providerResults.summary.total++;
      }
    }
  }

  // Calculate average load time
  if (providerResults.summary.successful > 0) {
    providerResults.summary.avgLoadTime = Math.round(
      totalLoadTime / providerResults.summary.successful
    );
  }

  // Log summary for this provider
  const successRate = (
    (providerResults.summary.successful / providerResults.summary.total) *
    100
  ).toFixed(1);
  console.log(
    `${provider.name}: ${providerResults.summary.successful}/${providerResults.summary.total} successful (${successRate}%) - Avg: ${providerResults.summary.avgLoadTime}ms`
  );

  return providerResults;
}

/**
 * Extracts the cap colors from a tile provider by analyzing top and bottom polar tiles
 * @param {Object} provider - Tile provider configuration to test
 * @param {number} [zoom=1] - Zoom level to test (default: 1)
 * @returns {Promise<Object>} Promise that resolves with extracted cap colors
 */
async function extractCapColors(provider, zoom = 1) {
  console.log(`🎨 Extracting cap colors for: ${provider.name}`);

  const results = {
    provider: provider.name,
    zoom: zoom,
    northCap: null,
    southCap: null,
    configuredNorthCap: provider.northCapColor,
    configuredSouthCap: provider.southCapColor,
    accuracy: {
      northMatch: false,
      southMatch: false,
    },
  };

  try {
    // For zoom level 1, we have 2x2 tiles (4 total)
    // Top tiles: y=0 (north pole area)
    // Bottom tiles: y=1 (south pole area)
    const tilesAtZoom = Math.pow(2, zoom);

    // Test north cap (top edge of northernmost tiles)
    const northTileY = 0;
    const northTileX = Math.floor(tilesAtZoom / 2); // Center tile

    // Test south cap (bottom edge of southernmost tiles)
    const southTileY = tilesAtZoom - 1;
    const southTileX = Math.floor(tilesAtZoom / 2); // Center tile

    console.log(`🎨 Testing north cap: tile ${northTileX},${northTileY},${zoom}`);
    const northColor = await extractColorFromTileEdge(
      provider,
      northTileX,
      northTileY,
      zoom,
      "top"
    );

    console.log(`🎨 Testing south cap: tile ${southTileX},${southTileY},${zoom}`);
    const southColor = await extractColorFromTileEdge(
      provider,
      southTileX,
      southTileY,
      zoom,
      "bottom"
    );

    results.northCap = northColor;
    results.southCap = southColor;

    // Check accuracy against configured values
    if (northColor && provider.northCapColor) {
      results.accuracy.northMatch = colorsMatch(northColor.hex, provider.northCapColor);
    }
    if (southColor && provider.southCapColor) {
      results.accuracy.southMatch = colorsMatch(southColor.hex, provider.southCapColor);
    }

    // Log results
    console.log(`🎨 ${provider.name} cap colors:`);
    console.log(
      `  North: ${northColor?.hex || "N/A"} (configured: ${provider.northCapColor}) ${
        results.accuracy.northMatch ? "✅" : "❌"
      }`
    );
    console.log(
      `  South: ${southColor?.hex || "N/A"} (configured: ${provider.southCapColor}) ${
        results.accuracy.southMatch ? "✅" : "❌"
      }`
    );
  } catch (error) {
    console.error(`🎨 ❌ Error extracting cap colors for ${provider.name}:`, error);
    results.error = error.message;
  }

  return results;
}

/**
 * Extracts the dominant color from a specific edge of a tile
 * @param {Object} provider - Tile provider configuration
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {number} z - Zoom level
 * @param {string} edge - Edge to sample ('top' or 'bottom')
 * @returns {Promise<Object>} Promise that resolves with color information
 */
function extractColorFromTileEdge(provider, x, y, z, edge) {
  return new Promise((resolve, reject) => {
    const tileUrl = getTileUrl(x, y, z, provider);
    const img = new Image();

    img.crossOrigin = "anonymous"; // Enable cross-origin for canvas

    img.onload = function () {
      try {
        // Create canvas to analyze the image
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = this.naturalWidth;
        canvas.height = this.naturalHeight;

        // Draw the image
        ctx.drawImage(this, 0, 0);

        // Sample pixels from the specified edge
        const sampleY = edge === "top" ? 0 : canvas.height - 1;
        const pixelSamples = [];

        // Sample every 10th pixel across the width for performance
        const sampleStep = Math.max(1, Math.floor(canvas.width / 50));

        for (let x = 0; x < canvas.width; x += sampleStep) {
          const pixelData = ctx.getImageData(x, sampleY, 1, 1).data;
          pixelSamples.push({
            r: pixelData[0],
            g: pixelData[1],
            b: pixelData[2],
            a: pixelData[3],
          });
        }

        // Calculate the average color
        const avgColor = calculateAverageColor(pixelSamples);

        resolve({
          edge: edge,
          tileCoords: { x, y, z },
          tileUrl: tileUrl,
          samplesCount: pixelSamples.length,
          rgb: avgColor,
          hex: rgbToHex(avgColor.r, avgColor.g, avgColor.b),
          samples: pixelSamples.slice(0, 5), // Include first 5 samples for debugging
        });
      } catch (error) {
        reject(new Error(`Canvas analysis failed: ${error.message}`));
      }
    };

    img.onerror = function () {
      reject(new Error(`Failed to load tile: ${tileUrl}`));
    };

    // Set timeout
    setTimeout(() => {
      if (!img.complete) {
        reject(new Error(`Timeout loading tile: ${tileUrl}`));
      }
    }, 10000);

    img.src = tileUrl;
  });
}

/**
 * Calculates the average color from an array of pixel samples
 * @param {Array<Object>} samples - Array of pixel color objects with r, g, b properties
 * @returns {Object} Average color with r, g, b properties
 */
function calculateAverageColor(samples) {
  if (samples.length === 0) return { r: 0, g: 0, b: 0 };

  const total = samples.reduce(
    (acc, sample) => ({
      r: acc.r + sample.r,
      g: acc.g + sample.g,
      b: acc.b + sample.b,
    }),
    { r: 0, g: 0, b: 0 }
  );

  return {
    r: Math.round(total.r / samples.length),
    g: Math.round(total.g / samples.length),
    b: Math.round(total.b / samples.length),
  };
}

/**
 * Converts RGB values to hexadecimal color string
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {string} Hexadecimal color string (e.g., "#ffffff")
 */
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Compares two color values for similarity
 * @param {string} color1 - First color in hex format
 * @param {string} color2 - Second color in hex format
 * @param {number} [tolerance=20] - Color difference tolerance (0-255)
 * @returns {boolean} True if colors are similar within tolerance
 */
function colorsMatch(color1, color2, tolerance = 20) {
  if (!color1 || !color2) return false;

  // Convert hex to RGB
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return false;

  // Calculate color difference using Euclidean distance
  const diff = Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) + Math.pow(rgb1.g - rgb2.g, 2) + Math.pow(rgb1.b - rgb2.b, 2)
  );

  return diff <= tolerance;
}

/**
 * Converts hexadecimal color string to RGB values
 * @param {string} hex - Hexadecimal color string (e.g., "#ffffff")
 * @returns {Object|null} RGB object with r, g, b properties or null if invalid
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Tests cap colors for all tile providers
 * @param {number} [zoom=1] - Zoom level to test
 * @returns {Promise<Array<Object>>} Promise that resolves with cap color results for all providers
 */
async function testAllCapColors(zoom = 1) {
  console.log("🎨 Testing cap colors for all tile providers...");
  const results = [];

  const providers = Object.values(window.tileProviders);

  for (const provider of providers) {
    try {
      const capColors = await extractCapColors(provider, zoom);
      results.push(capColors);
    } catch (error) {
      console.error(`🎨 ❌ Failed to test cap colors for ${provider.name}:`, error);
      results.push({
        provider: provider.name,
        error: error.message,
      });
    }

    // Small delay between providers to avoid overwhelming servers
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  const accurate = results.filter((r) => r.accuracy?.northMatch && r.accuracy?.southMatch).length;
  const total = results.filter((r) => !r.error).length;

  console.log(`\n🎨 Cap color testing complete!`);
  console.log(`📊 Accuracy: ${accurate}/${total} providers have correct cap colors`);

  // Show recommendations for incorrect colors
  results.forEach((result) => {
    if (result.accuracy && (!result.accuracy.northMatch || !result.accuracy.southMatch)) {
      console.log(`\n🔧 Recommended updates for ${result.provider}:`);
      if (!result.accuracy.northMatch && result.northCap) {
        console.log(`  northCapColor: "${result.northCap.hex}",`);
      }
      if (!result.accuracy.southMatch && result.southCap) {
        console.log(`  southCapColor: "${result.southCap.hex}",`);
      }
    }
  });

  return results;
}

/**
 * Tests all Earth tile providers across multiple zoom levels and coordinates
 * @param {Array<number>} [zoomLevels=[1, 2, 3]] - Zoom levels to test
 * @param {number} [samplesPerZoom=4] - Number of coordinate samples per zoom level
 * @returns {Promise<Array<Object>>} Promise that resolves with test results for all providers
 */
function testTileProviders(zoomLevels = [1, 2, 3], samplesPerZoom = 4) {
  return new Promise(async (resolve) => {
    console.log("🧪 Testing all Earth tile providers...");
    const results = [];

    // Get all Earth tile providers
    const providers = Object.values(window.tileProviders);

    for (const provider of providers) {
      const providerResults = await testTileProvider(provider, zoomLevels, samplesPerZoom);
      results.push(providerResults);
    }

    console.log("\n📊 Testing complete! Full results:", results);
    resolve(results);
  });
}

// ==============================
// TILE PROVIDERS CLEANUP
// ==============================

/**
 * Disposes of tile provider-related resources and cleans up
 */
window.disposeTileProviders = function () {
  console.log("🌍 🗑️ Disposing tile provider resources...");

  // Clear tile provider references
  window.tileProvider = null;

  // Note: The actual tile providers configuration (window.tileProviders)
  // is kept as it's just configuration data, not resources that need disposal

  console.log("🌍 ✅ Tile provider resources cleaned up");
};
