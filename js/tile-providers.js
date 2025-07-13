// ==============================
// EARTH TILES
// ==============================

window.tileProviders = {
  OPENSTREETMAP: {
    // Load time from last test = 17ms
    name: "OpenStreetMap",
    urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  },
  OPENTOPOMAP: {
    // Load time from last test = 1389ms
    name: "OpenTopoMap",
    urlTemplate: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap contributors",
    maxZoom: 17,
  },
  CARTODB_POSITRON: {
    // Load time from last test = 18ms
    name: "CartoDB Positron",
    urlTemplate: "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attribution: "© CartoDB",
    maxZoom: 19,
  },
  CARTODB_DARK: {
    // Load time from last test = 15ms
    name: "CartoDB Dark",
    urlTemplate: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution: "© CartoDB",
    maxZoom: 19,
  },
  CARTODB_VOYAGER: {
    // Load time from last test = 13ms
    name: "CartoDB Voyager",
    urlTemplate: "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    attribution: "© CartoDB",
    maxZoom: 19,
  },
  // TEST FAILED :
  // OPENSTREETMAP_DARK: {
  //   name: "OpenStreetMap Dark",
  //   urlTemplate: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
  //   attribution: "© Stadia Maps © OpenMapTiles © OpenStreetMap contributors",
  //   maxZoom: 19,
  // },
  ESRI_WORLD_IMAGERY: {
    // Load time from last test = 54ms
    name: "ESRI World Imagery",
    urlTemplate:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© ESRI",
    maxZoom: 19,
  },
  ESRI_WORLD_TOPO_MAP: {
    // Load time from last test = 54ms
    name: "ESRI World Topo Map",
    urlTemplate:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "© ESRI",
    maxZoom: 19,
  },
  BING_SATELLITE: {
    // Load time from last test = 83ms
    name: "Bing Satellite",
    urlTemplate: null, // Special handling for quadkey system
    attribution: "© Microsoft",
    maxZoom: 19,
  },
};
window.tileProvider = window.tileProviders.BING_SATELLITE;

/**
 * Sets the active Earth tile provider
 * @param {Object} provider - Earth Tile provider configuration from TileProviders
 */
window.setTileProvider = function (provider) {
  window.tileProvider = provider;
  console.log(`Switched to earth tile provider: ${provider.name}`);

  // Update the Earth scene with the new provider
  updateTilesWithNewProvider();
};

/**
 * Updates all loaded Earth tiles with the new tile provider
 * Refreshes all visible tiles to use the new imagery source
 */
function updateTilesWithNewProvider() {
  if (!window.scene || !window.loadedTiles || window.loadedTiles.length === 0) {
    console.warn("⚠️ No Earth tiles loaded or scene not available for provider update");
    return;
  }

  console.log(
    `🔄 Updating ${window.loadedTiles.length} tiles with new provider: ${window.tileProvider.name}`
  );

  // Create a copy of the tiles array to avoid modification during iteration
  const tilesToUpdate = [...window.loadedTiles];
  let updatedCount = 0;

  tilesToUpdate.forEach((mesh, index) => {
    if (mesh && mesh.tileId && !mesh.isDisposed() && mesh.material) {
      try {
        const tileId = mesh.tileId;
        const newTileUrl = getTileUrl(tileId.x, tileId.y, tileId.zoom, window.tileProvider);

        // Create new texture with the new provider
        const newTexture = new BABYLON.Texture(
          newTileUrl,
          window.scene,
          false, // noMipmap
          true, // invertY
          BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
          () => {
            // Texture loaded successfully
            if (mesh.material && mesh.material.diffuseTexture) {
              // Dispose old texture
              mesh.material.diffuseTexture.dispose();

              // Apply new texture
              mesh.material.diffuseTexture = newTexture;
              mesh.material.diffuseTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
              mesh.material.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
              mesh.material.diffuseTexture.anisotropicFilteringLevel = 4;

              updatedCount++;

              // Log progress periodically
              if (updatedCount === tilesToUpdate.length) {
                console.log(`🌍 Updated ${tilesToUpdate.length} tiles`);
              }
            }
          },
          () => {
            // Texture loading failed
            console.warn(
              `⚠️ Failed to load new texture for tile ${tileId.x},${tileId.y},${tileId.zoom}`
            );
            newTexture.dispose(); // Clean up failed texture
          }
        );
      } catch (error) {
        console.error(`❌ Error updating tile ${index}:`, error);
      }
    }
  });

  console.log(`✅ Started updating Earth tiles with ${window.tileProvider.name} provider`);
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

    console.log(`Testing tile provider: ${tileProvider.name}`);
    console.log(`Test URL: ${testUrl}`);

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
  console.log(`\n📍 Testing provider: ${provider.name}`);
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
        console.error(`Error testing ${provider.name} at ${coord.x},${coord.y},${coord.z}:`, error);
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
