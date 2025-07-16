// Menu control functions
let isFraminosonaMenuOpen = false;
const framinosonaMenu = document.getElementById("framinosona-menu-panel");
const framinosonaTopSideBlock = document.getElementById("framinosona-side-ui-block-top");
const framinosonaMenuCloseIconMobile = document.getElementById("framinosona-menu-mobile-toggle");

function toggleMenu() {
  if (isFraminosonaMenuOpen) {
    closeMenu();
  } else {
    openMenu();
  }
}

function openMenu() {
  framinosonaMenu.classList.add("open");
  framinosonaTopSideBlock.classList.add("menu-open");
  framinosonaMenuCloseIconMobile.classList.add("open");
  isFraminosonaMenuOpen = true;
}

function closeMenu() {
  framinosonaMenu.classList.remove("open");
  framinosonaTopSideBlock.classList.remove("menu-open");
  framinosonaMenuCloseIconMobile.classList.remove("open");
  isFraminosonaMenuOpen = false;
}

// Tile provider selection functionality
function initializeTileProviderSelector() {
  const tileProviderGrid = document.querySelector(".tile-provider-grid");

  if (!tileProviderGrid) {
    console.warn("🌍 ⚠️ Tile provider grid not found");
    return;
  }

  // Clear existing content
  tileProviderGrid.innerHTML = "";

  // Generate tile provider options dynamically
  if (window.tileProviders) {
    Object.entries(window.tileProviders).forEach(([key, provider], index) => {
      const button = document.createElement("button");
      button.className = "tile-provider-option";
      button.dataset.provider = key;

      // Set active state for current provider
      if (window.tileProvider === provider) {
        button.classList.add("active");
      }

      // Use short description if available, otherwise use description or fallback
      const info = provider.short || provider.description || "Map tiles";

      button.innerHTML = `
        <span class="provider-name">${provider.name}</span>
        <span class="provider-info">${info}</span>
      `;

      tileProviderGrid.appendChild(button);
    });
  }

  // Add event listeners to dynamically generated options
  const tileProviderOptions = document.querySelectorAll(".tile-provider-option");

  tileProviderOptions.forEach((option) => {
    option.addEventListener("click", function () {
      const providerKey = this.dataset.provider;

      // Remove active class from all options
      tileProviderOptions.forEach((opt) => opt.classList.remove("active"));

      // Add active class to clicked option
      this.classList.add("active");

      // Switch tile provider if the function exists
      if (window.tileProviders && window.tileProviders[providerKey] && window.setTileProvider) {
        window.setTileProvider(window.tileProviders[providerKey]);
        console.log(`🌍 Switched to: ${window.tileProviders[providerKey].name}`);
      } else {
        console.warn(
          `🌍 ⚠️ Tile provider ${providerKey} not found or setTileProvider function not available`
        );
      }
    });
  });

  console.log(`🌍 ✅ Generated ${tileProviderOptions.length} tile provider options`);
}

// Skybox selection functionality
function initializeSkyboxSelector() {
  const skyboxGrid = document.querySelector(".skybox-grid");

  if (!skyboxGrid) {
    console.warn("🌌 ⚠️ Skybox grid not found");
    return;
  }

  // Clear existing content
  skyboxGrid.innerHTML = "";

  // Generate skybox options dynamically
  if (window.skyboxSets) {
    Object.entries(window.skyboxSets).forEach(([key, skyboxSet], index) => {
      const button = document.createElement("button");
      button.className = "skybox-option";
      button.dataset.skybox = key;

      // Set active state for current skybox
      if (window.skyboxSet === skyboxSet) {
        button.classList.add("active");
      }

      button.innerHTML = `
        <span class="skybox-name">${skyboxSet.name}</span>
        <span class="skybox-info">${skyboxSet.description}</span>
      `;

      skyboxGrid.appendChild(button);
    });
  }

  // Add event listeners to dynamically generated options
  const skyboxOptions = document.querySelectorAll(".skybox-option");

  skyboxOptions.forEach((option) => {
    option.addEventListener("click", function () {
      const skyboxKey = this.dataset.skybox;

      // Remove active class from all options
      skyboxOptions.forEach((opt) => opt.classList.remove("active"));

      // Add active class to clicked option
      this.classList.add("active");

      // Switch skybox if the function exists
      if (window.skyboxSets && window.skyboxSets[skyboxKey] && window.setSkybox) {
        window.setSkybox(window.skyboxSets[skyboxKey]);
        console.log(`🌌 Switched to: ${window.skyboxSets[skyboxKey].name}`);
      } else {
        console.warn(`🌌 ⚠️ Skybox ${skyboxKey} not found or setSkybox function not available`);
      }
    });
  });

  console.log(`🌌 ✅ Generated ${skyboxOptions.length} skybox options`);
}

function initializeMenu() {
  console.log("💡 ✅ Initializing menu...");

  // Initialize tile provider selector
  initializeTileProviderSelector();

  // Initialize skybox selector
  initializeSkyboxSelector();

  console.log("💡 ✅ Menu initialized successfully");
}
window.initializeMenu = initializeMenu;

document.addEventListener("DOMContentLoaded", function () {
  initializeMenu();
});

framinosonaTopSideBlock.addEventListener("click", toggleMenu);
framinosonaMenuCloseIconMobile.addEventListener("click", toggleMenu);

// Optional: Close menu when clicking outside
document.addEventListener("click", function (event) {
  if (
    isFraminosonaMenuOpen &&
    !framinosonaMenu.contains(event.target) &&
    !framinosonaTopSideBlock.contains(event.target) &&
    !framinosonaMenuCloseIconMobile.contains(event.target)
  ) {
    closeMenu();
  }
});
