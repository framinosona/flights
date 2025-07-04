// ==============================
// TILE PROVIDER SYSTEM
// ==============================

/**
 * Tile provider configuration for different map services
 */
const TileProviders = {
    OPENSTREETMAP: {
        name: 'OpenStreetMap',
        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    },
    OPENTOPOMAP: {
        name: 'OpenTopoMap',
        urlTemplate: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenTopoMap contributors',
        maxZoom: 17
    },
    CARTODB_POSITRON: {
        name: 'CartoDB Positron',
        urlTemplate: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        attribution: '© CartoDB',
        maxZoom: 19
    },
    CARTODB_DARK: {
        name: 'CartoDB Dark',
        urlTemplate: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        attribution: '© CartoDB',
        maxZoom: 19
    },
    OPENSTREETMAP_DARK: {
        name: 'OpenStreetMap Dark',
        urlTemplate: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
        attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors',
        maxZoom: 19
    },
    ESRI_WORLD_IMAGERY: {
        name: 'ESRI World Imagery',
        urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© ESRI',
        maxZoom: 19
    },
    BING_SATELLITE: {
        name: 'Bing Satellite',
        urlTemplate: null, // Special handling for quadkey system
        attribution: '© Microsoft',
        maxZoom: 19
    }
};

// Current active tile provider
let currentTileProvider = TileProviders.ESRI_WORLD_IMAGERY;

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
 * @returns {string} Complete tile URL
 */
function getTileUrl(x, y, z) {
    const provider = currentTileProvider;
    
    if (provider === TileProviders.BING_SATELLITE) {
        // Special handling for Bing's quadkey system
        const quadkey = tileToQuadkey(x, y, z);
        return `https://t.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/${quadkey}?it=A&n=z`;
    } else {
        // Standard XYZ tile system
        return provider.urlTemplate
            .replace('{x}', x.toString())
            .replace('{y}', y.toString())
            .replace('{z}', z.toString());
    }
}

/**
 * Sets the active tile provider
 * @param {Object} provider - Tile provider configuration from TileProviders
 */
function setTileProvider(provider) {
    currentTileProvider = provider;
    console.log(`Switched to tile provider: ${provider.name}`);
}

// ==============================
// TILE PROVIDER UTILITIES
// ==============================

/**
 * Switches to OpenStreetMap tiles
 */
window.useOpenStreetMap = function() {
    setTileProvider(TileProviders.OPENSTREETMAP);
};

/**
 * Switches to OpenTopoMap tiles (shows topographical features)
 */
window.useOpenTopoMap = function() {
    setTileProvider(TileProviders.OPENTOPOMAP);
};

/**
 * Switches to CartoDB Positron tiles (clean, minimal style)
 */
window.useCartoDBPositron = function() {
    setTileProvider(TileProviders.CARTODB_POSITRON);
};

/**
 * Switches to CartoDB Dark tiles (dark theme)
 */
window.useCartoDBDark = function() {
    setTileProvider(TileProviders.CARTODB_DARK);
};

/**
 * Switches to OpenStreetMap Dark tiles
 */
window.useOpenStreetMapDark = function() {
    setTileProvider(TileProviders.OPENSTREETMAP_DARK);
};

/**
 * Switches to ESRI World Imagery (satellite)
 */
window.useESRIWorldImagery = function() {
    setTileProvider(TileProviders.ESRI_WORLD_IMAGERY);
};

/**
 * Switches back to Bing Satellite tiles
 */
window.useBingSatellite = function() {
    setTileProvider(TileProviders.BING_SATELLITE);
};

/**
 * Gets information about the current tile provider
 */
window.getCurrentTileProvider = function() {
    return {
        name: currentTileProvider.name,
        attribution: currentTileProvider.attribution,
        maxZoom: currentTileProvider.maxZoom
    };
};

/**
 * Tests a tile URL by attempting to load it
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {number} z - Zoom level
 * @returns {Promise} Promise that resolves if tile loads successfully
 */
window.testTileUrl = function(x = 0, y = 0, z = 1) {
    return new Promise((resolve, reject) => {
        const url = getTileUrl(x, y, z);
        const img = new Image();
        img.onload = () => {
            console.log(`✅ Tile loaded successfully: ${url}`);
            resolve(url);
        };
        img.onerror = () => {
            console.error(`❌ Failed to load tile: ${url}`);
            reject(url);
        };
        img.src = url;
    });
};
