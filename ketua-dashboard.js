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

  function navigate(page) {
    if (!pageMeta[page]) return;
    $$(".page-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.panel === page));
    $$(".nav-item[data-page]").forEach(item => item.classList.toggle("active", item.dataset.page === page));
    $("#breadcrumbCurrent").textContent = pageMeta[page][1];
    $("#pageEyebrow").textContent = pageMeta[page][0];
    $("#pageTitle").textContent = pageMeta[page][1];
    $("#pageDescription").textContent = pageMeta[page][2];
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    $("#menuToggle").addEventListener("click", openSidebar);
    $("#sidebarClose").addEventListener("click", closeSidebar);
    $("#sidebarBackdrop").addEventListener("click", closeSidebar);
    $("#refreshButton").addEventListener("click", loadDashboard);
    $("#withdrawForm").addEventListener("submit", event => {
      event.preventDefault();
      showToast("Pengajuan withdraw belum diaktifkan karena endpoint backend belum ditetapkan.");
    });
    $("#logoutButton").addEventListener("click", () => {
      showToast("Logout akan diaktifkan setelah alur autentikasi dashboard ditetapkan.");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initDate();
    initEvents();
    loadDashboard();
  });

  // Ekspos konfigurasi untuk tahap integrasi, bukan untuk dipanggil oleh pengguna.
  window.YayasanKetuaDashboard = { API_CONFIG, apiRequest, applyDashboardData, navigate };
})();

