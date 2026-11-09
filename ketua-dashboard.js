/* Dashboard Ketua Yayasan
 * Frontend-only scaffold. Tidak ada data dummy.
 * Endpoint sengaja belum diaktifkan sampai kontrak API Ketua disepakati.
 */
(() => {
  "use strict";

  const API_CONFIG = {
    baseUrl: "https://sppg-keuangan-dev.yayasangawerancepasundan.workers.dev",
    // Isi path setelah endpoint khusus Ketua diverifikasi pada Worker.
    endpoints: {
      me: null,
      dashboard: null,
      approvals: null,
      approvalHistory: null,
      foundationFinance: null,
      kitchenFinance: null,
      personalBalance: null,
      withdrawals: null,
      withdrawalHistory: null,
      reports: null,
      notifications: null
    },
    credentials: "include"
  };

  const pageMeta = {
    overview: ["RINGKASAN YAYASAN", "Dashboard Ketua", "Pantau kondisi Yayasan, laporan dapur, dan hal yang memerlukan keputusan Anda."],
    approvals: ["KEPUTUSAN", "Persetujuan", "Tinjau permohonan yang masuk dalam batas kewenangan Ketua."],
    "approval-history": ["CATATAN KEPUTUSAN", "Riwayat Persetujuan", "Lihat keputusan yang pernah dilakukan oleh akun Ketua."],
    "foundation-finance": ["PEMANTAUAN", "Keuangan Yayasan", "Pantau arus kas dan laporan keuangan Yayasan tanpa mengubah pembukuan."],
    "kitchen-finance": ["PEMANTAUAN", "Keuangan Dapur", "Pantau laporan dapur dan pembayaran fee Yayasan sesuai cakupan akses."],
    reports: ["DOKUMEN", "Laporan", "Lihat laporan keuangan dan operasional yang tersedia untuk Ketua."],
    "personal-balance": ["HAK PRIBADI", "Saldo Pribadi", "Pantau saldo pribadi berdasarkan alokasi dan hari yang dikonfirmasi Bendahara."],
    withdrawals: ["HAK PRIBADI", "Pengajuan Withdraw", "Ajukan penarikan saldo pribadi. Pengajuan tidak langsung mengurangi saldo."],
    "withdrawal-history": ["HAK PRIBADI", "Riwayat Withdraw", "Pantau status pengajuan dan konfirmasi pembayaran."],
    notifications: ["PEMBERITAHUAN", "Notifikasi", "Pembaruan yang relevan dengan tugas dan kewenangan Ketua."],
    account: ["PENGATURAN", "Keamanan Akun", "Informasi akun Ketua Yayasan."]
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  let currentPage = "overview";
  let navigationDepth = 0;
  let handlingBackNavigation = false;
  let pageHistory = [];

function updateBackButton() {
const button = $("#backButton");
if (!button) return;

navigationDepth = pageHistory.length;

button.hidden = navigationDepth <= 0;
button.disabled = navigationDepth <= 0;
button.setAttribute("aria-hidden", navigationDepth <= 0 ? "true" : "false");
}
  function renderPage(page, behavior = "smooth", depth = navigationDepth) {
    if (!pageMeta[page]) return;

    currentPage = page;
    navigationDepth = Math.max(0, depth);

    $$(".page-panel").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.panel === page);
    });

    $$(".nav-item[data-page]").forEach(item => {
      item.classList.toggle("active", item.dataset.page === page);
    });

    $("#breadcrumbCurrent").textContent = pageMeta[page][1];
    $("#pageEyebrow").textContent = pageMeta[page][0];
    $("#pageTitle").textContent = pageMeta[page][1];
    $("#pageDescription").textContent = pageMeta[page][2];

    updateBackButton();
    closeSidebar();
    window.scrollTo({ top: 0, behavior });
  }

function navigate(page) {
  if (!pageMeta[page] || page === currentPage) return;

  pageHistory.push(currentPage);

  const nextDepth = pageHistory.length;
  renderPage(page, "smooth", nextDepth);

  if (!handlingBackNavigation) {
    window.history.pushState(
      {
        ketuaDashboard: true,
        page,
        depth: nextDepth,
        pageHistory: [...pageHistory]
      },
      "",
      `#${page}`
    );
  }
}

  function initAndroidBackNavigation() {
    const rootState = {
      ketuaDashboard: true,
      page: "overview",
      depth: 0,
      guard: true
    };

    window.history.replaceState(
      rootState,
      "",
      `${window.location.pathname}${window.location.search}#overview`
    );
    window.history.pushState(
      rootState,
      "",
      `${window.location.pathname}${window.location.search}#overview`
    );

    window.addEventListener("popstate", event => {
      const openedModal = $(".modal-backdrop.show");
      
if (openedModal) {
  closeModal(openedModal, true);

  window.history.pushState(
    {
      ketuaDashboard: true,
      page: currentPage,
      depth: navigationDepth,
      pageHistory: [...pageHistory]
    },
    "",
    `#${currentPage}`
  );

  return;
}

      const state = event.state;

if (state?.ketuaDashboard && pageMeta[state.page]) {
  handlingBackNavigation = true;

  pageHistory = Array.isArray(state.pageHistory)
    ? [...state.pageHistory]
    : [];

  renderPage(state.page, "auto", pageHistory.length);

  handlingBackNavigation = false;
}

      // Di root, pasang kembali guard agar Back Android tidak keluar dari aplikasi.
      if (currentPage === "overview" && navigationDepth === 0) {
        window.history.pushState(
          rootState,
          "",
          `${window.location.pathname}${window.location.search}#overview`
        );
        updateBackButton();
      }
    });
  }

  function updateNotificationPermissionUI() {
    const status = $("#notificationPermissionStatus");
    const button = $("#notificationPermissionButton");

    if (!status || !button) return;

    if (!("Notification" in window)) {
      status.textContent = "Browser/perangkat ini belum mendukung notifikasi web.";
      button.disabled = true;
      button.textContent = "Tidak didukung";
      return;
    }

    const permission = Notification.permission;

    if (permission === "granted") {
      status.textContent = "Izin notifikasi sudah diberikan pada perangkat ini.";
      button.textContent = "Notifikasi Aktif";
      button.disabled = true;
    } else if (permission === "denied") {
      status.textContent = "Izin pernah ditolak. Ubah izin Notifikasi melalui pengaturan situs di browser/perangkat.";
      button.textContent = "Buka Petunjuk Izin";
      button.disabled = false;
    } else {
      status.textContent = "Aktifkan izin agar perangkat dapat menerima pemberitahuan dari aplikasi.";
      button.textContent = "Aktifkan Notifikasi";
      button.disabled = false;
    }
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      updateNotificationPermissionUI();
      return;
    }

    if (!window.isSecureContext) {
      showToast("Izin notifikasi memerlukan HTTPS.");
      return;
    }

    if (Notification.permission === "denied") {
      showToast("Buka pengaturan situs pada browser, lalu izinkan Notifikasi untuk aplikasi ini.");
      return;
    }

    try {
      // Harus dipanggil dari klik pengguna; browser menampilkan dialog resminya.
      const permission = await Notification.requestPermission();
      updateNotificationPermissionUI();

      if (permission === "granted") {
        showToast("Izin notifikasi perangkat berhasil diaktifkan.");
      } else if (permission === "denied") {
        showToast("Izin notifikasi ditolak. Anda dapat mengubahnya di pengaturan perangkat.");
      } else {
        showToast("Izin notifikasi belum diputuskan.");
      }
    } catch (error) {
      showToast(`Permintaan izin notifikasi gagal: ${error.message}`);
    }
  }

async function performLogout() {
  const token =
    localStorage.getItem("sppg_auth_token") ||
    sessionStorage.getItem("sppg_auth_token");

  // Hapus sesi lokal terlebih dahulu.
  localStorage.removeItem("sppg_auth_token");
  sessionStorage.removeItem("sppg_auth_token");

  // Langsung kembali ke halaman login.
  window.location.replace(LOGIN_PAGE);

  // Cabut sesi di server tanpa menahan pengalihan.
  if (token) {
    fetch(`${API_CONFIG.baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      },
      keepalive: true
    }).catch(error => {
      console.warn("Logout server:", error.message);
    });
  }
}

  function openSidebar() {
    $("#sidebar").classList.add("open");
    $("#sidebarBackdrop").classList.add("show");
  }

  function closeSidebar() {
    $("#sidebar").classList.remove("open");
    $("#sidebarBackdrop").classList.remove("show");
  }

  async function apiRequest(endpointKey, options = {}) {
    const path = API_CONFIG.endpoints[endpointKey];
    if (!path) throw new Error(`Endpoint "${endpointKey}" belum dikonfigurasi.`);
    const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      ...options,
      credentials: API_CONFIG.credentials,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    if (!response.ok) throw new Error(`Permintaan gagal (${response.status}).`);
    if (response.status === 204) return null;
    return response.json();
  }

  // Adapter data: pemetaan properti API ke elemen UI dilakukan setelah kontrak backend final.
  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value ?? "—";
  }

  function formatRupiah(value) {
    if (value === null || value === undefined || value === "") return "—";
    return new Intl.NumberFormat("id-ID", {
      style: "currency", currency: "IDR", maximumFractionDigits: 0
    }).format(Number(value));
  }

  function applyDashboardData(data) {
    if (!data || typeof data !== "object") return;
    const values = {
      foundationBalance: data.foundation_balance,
      verifiedFees: data.verified_fees,
      personalBalance: data.personal_balance,
      pendingApprovals: data.pending_approvals
    };
    Object.entries(values).forEach(([key, value]) => {
      $$(`[data-value="${key}"]`).forEach(el => {
        el.textContent = key === "pendingApprovals"
          ? (value === null || value === undefined ? "—" : String(value))
          : formatRupiah(value);
      });
    });

    setText("#withdrawAvailableBalance", formatRupiah(data.personal_balance));
    if (data.user?.name) {
      setText("#userName", data.user.name);
      setText("#topUserName", data.user.name);
      setText("#accountName", data.user.name);
    }
    if (Number.isFinite(data.pending_approvals)) {
      const count = $("#approvalCount");
      count.textContent = String(data.pending_approvals);
      count.hidden = data.pending_approvals < 1;
    }
    if (Number.isFinite(data.unread_notifications)) {
      const count = $("#notificationCount");
      count.textContent = String(data.unread_notifications);
      count.hidden = data.unread_notifications < 1;
      $("#topNotificationDot").hidden = data.unread_notifications < 1;
    }
  }

  async function loadDashboard() {
    const notice = $("#dataNotice");
    try {
      const data = await apiRequest("dashboard");
      applyDashboardData(data);
      notice.hidden = true;
      $("#connectionText").textContent = "Terhubung ke backend";
      $("#accountConnection").textContent = "Terhubung";
      $(".status-dot").style.background = "#36c79a";
    } catch (error) {
      // Endpoint belum dikonfigurasi: tetap tampilkan keadaan kosong, bukan data rekaan.
      $("#connectionText").textContent = "Backend belum dikonfigurasi";
      $("#accountConnection").textContent = "Belum terhubung";
      notice.hidden = false;
      if (!API_CONFIG.endpoints.dashboard) {
        notice.querySelector("strong").textContent = "Frontend siap disambungkan";
        notice.querySelector("p").textContent = "Endpoint dashboard Ketua belum ditetapkan. Tidak ada data contoh yang ditampilkan.";
      } else {
        notice.querySelector("strong").textContent = "Data belum dapat dimuat";
        notice.querySelector("p").textContent = error.message;
      }
    }
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal || modal.classList.contains("show")) return;

    modal.hidden = false;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    window.history.pushState(
      { ketuaDashboard: true, page: currentPage, depth: navigationDepth, modal: modalId },
      "",
      `#${currentPage}-${modalId}`
    );

    const firstInput = modal.querySelector("input, select, textarea, button");
    firstInput?.focus();
  }

  function closeModal(modal, fromPopstate = false) {
    if (!modal) return;

    if (!fromPopstate && window.history.state?.modal) {
      window.history.back();
      return;
    }

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    modal.hidden = true;

    if (!document.querySelector('.modal-backdrop.show')) {
      document.body.classList.remove("modal-open");
    }
  }

  function initModals() {
    const modalTriggers = [
      ["openWithdrawModal", "withdrawModal"],
      ["openOperationalModal", "operationalModal"]
    ];

    modalTriggers.forEach(([buttonId, modalId]) => {
      const button = document.getElementById(buttonId);
      button?.addEventListener("click", () => openModal(modalId));
    });

    $$('[data-open-modal]').forEach(button => {
      button.addEventListener("click", () => {
        openModal(button.dataset.openModal);
      });
    });

    $$(".modal-backdrop").forEach(modal => {
      modal.querySelectorAll("[data-close-modal]").forEach(button => {
        button.addEventListener("click", () => closeModal(modal));
      });

      modal.addEventListener("click", event => {
        if (event.target === modal) closeModal(modal);
      });
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;

      const openedModal = $(".modal-backdrop.show");
      if (openedModal) closeModal(openedModal);
    });
  }

  function initDate() {
    const now = new Date();
    $("#currentDate").textContent = new Intl.DateTimeFormat("id-ID", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric"
    }).format(now);
    $("#yearNow").textContent = now.getFullYear();
  }

  function initEvents() {
    $$(".nav-item[data-page]").forEach(item => item.addEventListener("click", () => navigate(item.dataset.page)));
    $$("[data-navigate]").forEach(item => item.addEventListener("click", () => navigate(item.dataset.navigate)));
    $("#backButton")?.addEventListener("click", () => {
      if (navigationDepth > 0 || window.history.state?.modal) {
        window.history.back();
      } else {
        showToast("Anda sudah berada di Dashboard Ketua.");
      }
    });
    $("#menuToggle").addEventListener("click", openSidebar);
    $("#sidebarClose").addEventListener("click", closeSidebar);
    $("#sidebarBackdrop").addEventListener("click", closeSidebar);
    $("#refreshButton").addEventListener("click", loadDashboard);
    $("#notificationPermissionButton")?.addEventListener("click", requestNotificationPermission);
    $("#withdrawForm").addEventListener("submit", event => {
      event.preventDefault();
      showToast("Pengajuan withdraw belum dikirim. Endpoint backend belum ditetapkan.");
    });

    $("#operationalForm").addEventListener("submit", event => {
      event.preventDefault();
      showToast("Pengajuan operasional belum dikirim. Alur backend persetujuan belum ditetapkan.");
    });
    $("#logoutButton").addEventListener("click", () => {
      const confirmed = window.confirm(
        "Apakah Anda yakin ingin keluar dari akun Ketua Yayasan?"
      );
      if (confirmed) performLogout();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.scrollTo({ top: 0, behavior: "auto" });
    initDate();
    initAndroidBackNavigation();
    initEvents();
    initModals();
    updateNotificationPermissionUI();
    loadDashboard();
  });

  // Ekspos konfigurasi untuk tahap integrasi, bukan untuk dipanggil oleh pengguna.
  window.YayasanKetuaDashboard = { API_CONFIG, apiRequest, applyDashboardData, navigate };
})();
