(() => {
  "use strict";
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("sidebarScrim");
  const dashboard = document.getElementById("dashboardPage");
  const placeholder = document.getElementById("placeholderPage");
  const placeholderTitle = document.getElementById("placeholderTitle");

  const pageNames = {
    dashboard:"Dashboard", yayasan:"Data Yayasan", dapur:"Data Dapur SPPG",
    pengguna:"Manajemen Pengguna", akses:"Hak Akses & Role",
    aktivitas:"Aktivitas Pengguna", audit:"Audit Log",
    database:"Monitoring Database", server:"Monitoring Server",
    pengaturan:"Pengaturan Sistem", keamanan:"Keamanan Akun",
    backup:"Backup & Pemulihan"
  };

  function closeSidebar() {
    sidebar.classList.remove("open");
    scrim.classList.remove("visible");
  }

  function navigate(page) {
    const key = pageNames[page] ? page : "dashboard";
    document.querySelectorAll(".nav-link").forEach(button => {
      button.classList.toggle("active", button.dataset.page === key);
    });
    const isDashboard = key === "dashboard";
    dashboard.hidden = !isDashboard;
    placeholder.hidden = isDashboard;
    if (!isDashboard) placeholderTitle.textContent = pageNames[key];
    closeSidebar();
    window.scrollTo({top:0, behavior:"smooth"});
  }

  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-page]");
    if (trigger) navigate(trigger.dataset.page);
  });

  document.getElementById("mobileMenu").addEventListener("click", () => {
    sidebar.classList.add("open");
    scrim.classList.add("visible");
  });
  document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
  scrim.addEventListener("click", closeSidebar);

  document.getElementById("fullscreenButton").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      alert("Mode layar penuh tidak didukung browser ini.");
    }
  });

  document.getElementById("trendPeriod").addEventListener("change", event => {
    document.querySelector(".demo-note").textContent =
      `Ilustrasi ${event.target.value} bulan — data aktual menunggu integrasi backend.`;
  });

  document.querySelector(".notification-button").addEventListener("click", () => {
    alert("Notifikasi akan tersedia setelah backend diintegrasikan.");
  });

  document.getElementById("profileButton").addEventListener("click", () => navigate("keamanan"));
  document.getElementById("userMenu").addEventListener("click", () => navigate("keamanan"));
  document.getElementById("logoutButton").addEventListener("click", () => {
    const confirmed = confirm("Apakah Anda ingin keluar dari halaman Super Admin?");
    if (confirmed) alert("Fitur keluar akan diaktifkan setelah integrasi autentikasi.");
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 950) closeSidebar();
  });
})();
