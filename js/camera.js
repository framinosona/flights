// ==============================
// CAMERA
// ==============================

async function initCamera() {
  var initCameraPosition = new BABYLON.Vector3(-1.949, 1.861, -0.225); // Europe centric position
  window.camera ||= new BABYLON.ArcRotateCamera(
    "camera1",
    0, // alpha
    0, // beta
    0, // radius
    BABYLON.Vector3.Zero(), // Look at the center of the Earth
    window.scene
  );

  // Validate camera creation
  if (!window.camera) {
    throw new Error("Camera creation failed");
  }
  window.camera.setPosition(initCameraPosition);
  console.log("🎥 ✅ Camera created");
  // Radius limits
  window.camera.lowerRadiusLimit = 2;
  window.camera.upperRadiusLimit = 8;
  window.camera.radius = 5; // Set initial radius
  // Navigation sensitivity
  window.camera.wheelPrecision = 100;
  window.camera.wheelDeltaPercentage = 0.005;
  window.camera.angularSensibilityX = 4000;
  window.camera.angularSensibilityY = 4000;
  window.camera.panningSensibility = 2000;
  // Render distance
  window.camera.minZ = 0.01;
  window.camera.maxZ = 300;
  window.camera.attachControl(window.canvas);
}
