const sidebar = document.getElementById("mySidebar");
const overlay = document.getElementById("myOverlay");
const openBtn = document.getElementById("openSidebarBtn");
const closeBtn = document.getElementById("closeSidebarBtn");

// Function to open the sidebar
function w3_open() {
  sidebar.classList.add("open");
  overlay.classList.add("active");
}

// Function to close the sidebar
function w3_close() {
  sidebar.classList.remove("open");
  overlay.classList.remove("active");
}

// Add event listeners to the buttons and the overlay
if (openBtn) openBtn.addEventListener("click", w3_open);
if (closeBtn) closeBtn.addEventListener("click", w3_close);
if (overlay) overlay.addEventListener("click", w3_close);

// This ensures all navigation links close the sidebar when clicked
document.querySelectorAll('#mySidebar a').forEach(link => {
  link.addEventListener('click', w3_close);
});