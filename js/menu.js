// Menu control functions
let isFraminosonaMenuOpen = false;
const framinosonaMenu = document.getElementById("framinosona-menu");
const framinosonaTopSideBlock = document.getElementById("framinosona-top-side-ui-block");

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
  isFraminosonaMenuOpen = true;
}

function closeMenu() {
  framinosonaMenu.classList.remove("open");
  framinosonaTopSideBlock.classList.remove("menu-open");
  isFraminosonaMenuOpen = false;
}

// Tile provider selection functionality
function initializeTileProviderSelector() {
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
}

document.addEventListener("DOMContentLoaded", function () {
  initializeTileProviderSelector();
});

framinosonaTopSideBlock.addEventListener("click", toggleMenu);

// Optional: Close menu when clicking outside
document.addEventListener("click", function (event) {
  if (
    isFraminosonaMenuOpen &&
    !framinosonaMenu.contains(event.target) &&
    !framinosonaTopSideBlock.contains(event.target)
  ) {
    closeMenu();
  }
});
