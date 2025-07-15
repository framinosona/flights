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

// Example: Add click event to top side block to open menu
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
