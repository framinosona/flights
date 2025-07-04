# 🌍 Interactive 3D Flight Visualization

A 3D globe visualization built with Babylon.js that displays flight routes and airports in an interactive Earth environment. Features dynamic tile loading, multiple map providers, and beautiful flight arc visualizations.
I've used my personal flights logs to demo.

![Flight Visualization Demo](https://img.shields.io/badge/Status-Active-brightgreen)
![Babylon.js](https://img.shields.io/badge/Babylon.js-Latest-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)

## ✨ Features

### 🌐 Dynamic Earth Rendering

- **Progressive tile loading** with level-of-detail optimization
- **Multiple map providers**: OpenStreetMap, CartoDB, ESRI World Imagery, Bing Satellite
- **Dark themes** available for night viewing
- **Realistic lighting** with sun and fill lights
- **Smooth camera controls** with adaptive sensitivity

### ✈️ Flight Visualization

- **3D flight arcs** following great circle paths between airports
- **Interactive airport points** with hover tooltips
- **Real flight data** from personal travel logs
- **Glowing visual effects** for enhanced aesthetics

### 🎮 Interactive Controls

- **Mouse/touch controls** for rotating and zooming the globe
- **Tooltip system** showing airport information on hover
- **Console utilities** for switching map styles and debugging
- **Camera position logging** for development

### 🛠️ Technical Features

- **Modular architecture** with separate concerns
- **Optimized performance** with mesh freezing and culling
- **Responsive design** that adapts to screen size
- **Debug utilities** for camera positioning and tile testing

## 🚀 Quick Start

1. **Clone the repository**

   ```bash
   git clone [your-repo-url]
   cd flights
   ```

2. **Serve the files** (required for loading JSON data)

   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Open in browser**

   `http://localhost:8000`

## 📁 Project Structure

```
flights/
├── index.html              # Main HTML file
├── README.md               # This file
├── css/
│   └── style.css          # Styling and tooltip CSS
├── js/
│   ├── scene.js           # Core Babylon.js setup and initialization
│   ├── earth.js           # Earth tile system and rendering
│   ├── flights.js         # Flight arcs and airport visualization
│   ├── tile-providers.js  # Map tile provider configurations
│   ├── debug.js           # Camera debug and logging utilities
│   └── data/
│       ├── airports_by_iata.json  # Airport coordinates database
│       └── flight_logs.json       # Personal flight history
├── favicon/               # Website icons and manifest
└── CNAME                 # GitHub Pages domain configuration
```

## 🎯 Usage

### Basic Interaction

- **Rotate**: Click and drag to rotate the globe
- **Zoom**: Use mouse wheel to zoom in/out
- **Hover**: Hover over yellow airport points to see details

### Console Commands

#### Map Style Controls

```javascript
// Switch map providers
useOpenStreetMap()          // Standard OpenStreetMap
useCartoDBDark()           // Dark theme map
useESRIWorldImagery()      // Satellite imagery
useBingSatellite()         // Bing satellite tiles

// Lighting controls
setRealisticLighting()     // Natural lighting
setBrightLighting()        // Bright illumination
setDarkLighting()          // Dim lighting
```

#### Airport Visualization

```javascript
// Airport point controls
toggleAirportPoints()      // Show/hide airport markers
setAirportPointColor('red') // Change color (yellow, red, blue, green, white)
setAirportPointSize(2.0)   // Scale size (1.0 = default)
hideAirportPoints()        // Hide all airports
showAirportPoints()        // Show all airports

// Information utilities
getAirportPointsInfo()     // Get statistics
findAirportsByCountry('US') // Find airports by country code
```

#### Camera & Debug

```javascript
// Camera positioning
setCameraPosition(-2, 2, -0.5)  // Set exact position
setCameraSpherical(2.5, 45, 60) // Set using spherical coordinates
logCameraPosition()              // Log current position

// Debug utilities
enableCameraLogging()            // Enable position logging
testTileUrl(0, 0, 1)            // Test tile loading
getCurrentTileProvider()         // Get current map provider info
```

## 🔧 Technical Details

### Architecture

The project uses a modular architecture with clear separation of concerns:

- **`scene.js`**: Core Babylon.js engine setup, scene creation, and main initialization
- **`earth.js`**: Earth-specific functionality including tile geometry and progressive loading
- **`tile-providers.js`**: Configurable map tile providers with multiple source options
- **`flights.js`**: Flight route visualization and airport point management
- **`debug.js`**: Development utilities for camera control and debugging

### Dependencies

- **Babylon.js**: 3D engine for WebGL rendering
- **Modern Browser**: Supports WebGL 2.0 and ES6+ features

### Performance Optimizations

- Mesh freezing after tile load completion
- Vertex data caching for tile geometry
- Progressive level-of-detail tile loading
- Optimized culling strategies
- Material freezing for static objects

## 📊 Data Format

### Airport Data (`airports_by_iata.json`)

```json
{
  "JFK": {
    "latitude": 40.6413,
    "longitude": -73.7781,
    "name": "John F. Kennedy International Airport",
    "city": "New York",
    "country": "US"
  }
}
```

### Flight Data (`flight_logs.json`)

```json
{
  "AA123_230615": {
    "flight_id": "AA 123",
    "from": "New York",
    "from_code": "JFK",
    "to": "London",
    "to_code": "LHR",
    "departure_date": "2023-06-15",
    "status": null
  }
}
```

## 🎨 Customization

### Adding New Map Providers

```javascript
// Add to TileProviders object in tile-providers.js
CUSTOM_PROVIDER: {
    name: 'Custom Map',
    urlTemplate: 'https://example.com/{z}/{x}/{y}.png',
    attribution: '© Custom Provider',
    maxZoom: 18
}
```

### Styling Airport Points

Airport points can be customized by modifying the `createAirportPoint` function in `flights.js`:

- Material properties (color, glow)
- Sphere size and geometry
- Hover effects and animations

### Camera Behavior

Modify camera limits and sensitivity in `scene.js`:

```javascript
camera.lowerRadiusLimit = 1.05;  // Minimum zoom
camera.upperRadiusLimit = 3;     // Maximum zoom
camera.wheelDeltaPercentage = .01; // Zoom sensitivity
```

## 🚦 Browser Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ❌ Internet Explorer (not supported)

## 🐛 Troubleshooting

### Common Issues

**Globe not loading?**

- Ensure you're serving files over HTTP/HTTPS (not file://)
- Check browser console for network errors
- Verify JSON data files are accessible

**Performance issues?**

- Try using a different map provider (ESRI is generally fastest)
- Reduce tile detail by modifying zoom limits in `earth.js`
- Check if WebGL 2.0 is supported in your browser

**Tiles not loading?**

- Test specific tile URLs using `testTileUrl()` console command
- Some providers may have rate limits or require API keys
- Try switching to a different tile provider

## 🛣️ Roadmap

- [ ] Add flight path animations
- [ ] Add airport tooltips with more details
- [ ] Mobile touch gesture improvements
- [ ] WebXR/VR support exploration

## 📄 License

This project is open source and available under the [BSD 3](LICENSE).

## 🙏 Acknowledgments

- **Babylon.js** team for the excellent 3D engine (D. Catuhe !!!)
- **OpenStreetMap**, **CartoDB**, **ESRI**, and **Microsoft** for map and tile services
- Airport coordinate data by **IATA**
