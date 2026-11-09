/* Dashboard Ketua Yayasan - terhubung ke Worker dan Cloudflare D1. */
(() => {
  "use strict";
  
  const API_CONFIG = {
    baseUrl: "https://sppg-keuangan-dev.yayasangawerancagepasundan.workers.dev",
    endpoints: {
  me: "/api/auth/me",
  dashboard: "/api/ketua/overview",
  approvals: "/api/ketua/approvals",
  approvalHistory: "/api/ketua/approval-history",
  foundationFinance: "/api/ketua/finance/books",
  kitchenFinance: "/api/ketua/finance/kitchens",
  personalBalance: "/api/ketua/personal-balance",
  withdrawals: "/api/ketua/withdrawals",
  withdrawalHistory: "/api/ketua/withdrawals",
  reports: "/api/ketua/reports",
  notifications: "/api/ketua/notifications"
},
    credentials: "omit"
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

  const AUTH_TOKEN_KEY = "sppg_auth_token";
   function getAuthToken() {
  return (
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    sessionStorage.getItem(AUTH_TOKEN_KEY)
  );
}
  const LOGIN_PAGE = "./index.html";

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
  clearSession();
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

  function getAuthToken() {
  return localStorage.getItem("sppg_auth_token")
    || sessionStorage.getItem("sppg_auth_token")
    || "";
}

async function apiRequest(endpointKey, options = {}) {
  const path = API_CONFIG.endpoints[endpointKey];

  if (!path) {
    throw new Error(`Endpoint "${endpointKey}" belum dikonfigurasi.`);
  }

  const token = getAuthToken();

  if (!token) {
    throw new Error("Token login tidak ditemukan. Silakan login kembali.");
  }

  const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
    ...options,
    credentials: API_CONFIG.credentials,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || `Permintaan gagal (${response.status}).`);
  }

  return result;
}

  // Adapter data dari endpoint Dashboard Ketua yang membaca D1.
  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value ?? "—";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[char]));
  }

  function formatRupiah(value) {
    if (value === null || value === undefined || value === "") return "—";
    return new Intl.NumberFormat("id-ID", {
      style: "currency", currency: "IDR", maximumFractionDigits: 0
    }).format(Number(value));
  }

function applyDashboardData(response) {
  if (!response || !response.data) return;

  const data = response.data;
  const summary = data.summary || {};

  const values = {
    foundationBalance: summary.foundation_balance,
    foundationIncome: summary.foundation_income,
    foundationExpense: summary.foundation_expense,
    verifiedFees: summary.verified_fees,
    personalBalance: summary.personal_balance,
    pendingApprovals: summary.pending_approvals,
    approvedThisMonth: summary.approved_this_month,
    rejectedThisMonth: summary.rejected_this_month,
    totalRequests: summary.total_requests,
    withdrawLimit: summary.withdraw_limit
  };

  Object.entries(values).forEach(([key, value]) => {
    $$(`[data-value="${key}"]`).forEach(el => {
      el.textContent = ["pendingApprovals","approvedThisMonth","rejectedThisMonth","totalRequests"].includes(key)
        ? (value ?? "—")
        : (key === "withdrawLimit" && value == null ? "Belum ditetapkan" : formatRupiah(value));
    });
  });

  setText("#withdrawAvailableBalance", formatRupiah(summary.personal_balance));
  setText("#breadcrumbCurrent", "Dashboard Ketua Yayasan");
  const kitchenRows = $("#dashboardKitchenRows");
  if (kitchenRows) {
    const kitchens = Array.isArray(data.kitchen_finance) ? data.kitchen_finance : [];
    kitchenRows.innerHTML = kitchens.length
      ? kitchens.map((k, i) => `<tr><td><span class="kitchen-dot kitchen-dot-${i%3}"></span>${escapeHtml(k.kitchen_name || "Dapur")}</td><td>${rupiah(k.monthly_income)}</td><td>${rupiah(k.monthly_expense)}</td><td>${rupiah(k.balance)}</td></tr>`).join("")
      : `<tr><td colspan="4" class="table-empty">Belum ada dapur pada yayasan ini.</td></tr>`;
  }
  const chart = $("#foundationCashflowChart");
  if (chart) {
    const points = Array.isArray(data.cashflow_trend) ? data.cashflow_trend : [];
    if (points.length) {
      const max = Math.max(1, ...points.flatMap(p => [Number(p.income||0),Number(p.expense||0)]));
      chart.innerHTML = `<div class="cashflow-bars">${points.map(p => {
        const income=Math.max(0,Number(p.income||0));
        const expense=Math.max(0,Number(p.expense||0));
        const hi=Math.max(5,Math.round(income/max*100));
        const he=Math.max(5,Math.round(expense/max*100));
        const label=p.period ? p.period.slice(5) : "";
        return `<div class="cashflow-month"><div class="cashflow-pair"><span class="cashflow-income" style="height:${hi}%"></span><span class="cashflow-expense" style="height:${he}%"></span></div><small>${label}</small></div>`;
      }).join("")}</div><div class="cashflow-legend"><span><i class="legend-income"></i>Pemasukan</span><span><i class="legend-expense"></i>Pengeluaran</span></div>`;
    } else {
      chart.textContent = "Belum ada transaksi terposting untuk periode grafik.";
    }
  }
  const donut=$("#kitchenStatusLegend");
  const donutCenter=$(".donut-placeholder");
  if(donut && Array.isArray(data.kitchen_finance)){
    const items=data.kitchen_finance;
    const total=items.reduce((sum,x)=>sum+Math.max(0,Number(x.balance||0)),0);
    donut.innerHTML=items.length?items.map((x,i)=>`<div><i class="kitchen-dot kitchen-dot-${i%3}"></i>${escapeHtml(x.kitchen_name)}<br><b>${rupiah(x.balance)}</b></div>`).join(""):"Belum ada data saldo dapur.";
    if(donutCenter) donutCenter.innerHTML=`${rupiah(total)}<small>Total Saldo Dapur</small>`;
  }
  if (data.foundation?.foundation_name) {
    document.title = "Dashboard Ketua Yayasan";
  }

  const name = data.user?.full_name || data.user?.name;

  if (name) {
    setText("#userName", name);
    setText("#topUserName", name);
    setText("#accountName", name);
  }

  if (Number.isFinite(summary.pending_approvals)) {
    const count = $("#approvalCount");
    count.textContent = String(summary.pending_approvals);
    count.hidden = summary.pending_approvals < 1;
  }

  if (Number.isFinite(summary.unread_notifications)) {
    const count = $("#notificationCount");
    count.textContent = String(summary.unread_notifications);
    count.hidden = summary.unread_notifications < 1;
    $("#topNotificationDot").hidden = summary.unread_notifications < 1;
  }
}

  async function apiPath(path, options = {}) {
    const token = getAuthToken();
    if (!token) throw new Error("Token login tidak ditemukan. Silakan login kembali.");
    const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      ...options,
      credentials: "omit",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || `Permintaan gagal (${response.status}).`);
    }
    return result;
  }

  const rupiah = value => formatRupiah(value);
  const dateText = value => value ? new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(value)) : "—";
  const statusText = value => ({
    PENDING:"Menunggu", IN_PROGRESS:"Diproses", APPROVED:"Disetujui",
    REJECTED:"Ditolak", COMPLETED:"Selesai", SUBMITTED:"Diajukan",
    UNDER_REVIEW:"Ditinjau", PAID:"Dibayar", CANCELLED:"Dibatalkan"
  }[value] || value || "—");

  function renderApprovalRows(rows, targetId, withActions = false) {
    const target=$(targetId);
    if (!target) return;
    if (!rows?.length) {
      target.innerHTML=`<tr><td colspan="${withActions?7:6}" class="table-empty">Tidak ada permohonan pada daftar ini.</td></tr>`;
      return;
    }
    target.innerHTML=rows.map((r,i)=>`<tr>
      <td>${i+1}</td><td>${dateText(r.submitted_at||r.created_at)}</td>
      <td>${escapeHtml(r.request_title||r.request_type||"Permohonan")}</td>
      <td>${escapeHtml(r.kitchen_name||r.requester_name||r.module_name||"Yayasan")}</td>
      <td>${rupiah(r.amount)}</td><td><span class="status-pill">${statusText(r.request_status)}</span></td>
      ${withActions?`<td><button class="button button-primary button-small" data-approval-action="APPROVE" data-id="${r.id}">Setujui</button> <button class="button button-danger button-small" data-approval-action="REJECT" data-id="${r.id}">Tolak</button></td>`:""}
    </tr>`).join("");
  }

  function renderTransactions(rows,targetId) {
    const target=$(targetId); if(!target) return;
    if(!rows?.length){target.innerHTML='<tr><td colspan="5" class="table-empty">Belum ada transaksi yang diposting.</td></tr>';return;}
    target.innerHTML=rows.map(t=>`<tr><td>${dateText(t.transaction_date)}</td><td>${escapeHtml(t.transaction_number)}</td><td>${escapeHtml(t.description)}</td><td>${escapeHtml(t.transaction_type)}</td><td>${rupiah(t.total_amount)}</td></tr>`).join("");
  }

  async function loadSupportingData() {
    const tasks = [
      ["approvals", async r=>renderApprovalRows(r.data,"#dashboardApprovalRows",false)],
      ["approvals", async r=>renderApprovalRows(r.data,"#approvalsPageRows",true)],
      ["approval-history", async r=>renderApprovalRows(r.data,"#approvalHistoryRows",false)],
      ["foundation-finance", async r=>renderTransactions(r.data?.[0]?.transactions,"#foundationFinanceRows")],
      ["kitchen-finance", async r=>{
        const el=$("#kitchenFinanceRows"); if(!el)return;
        const rows=r.data||[];
        el.innerHTML=rows.length?rows.map(x=>`<tr><td>${escapeHtml(x.kitchen_name)}</td><td>${dateText(x.billing_start_date)} – ${dateText(x.billing_end_date)}</td><td>${rupiah(x.billed_amount)}</td><td>${rupiah(x.verified_amount)}</td><td>${statusText(x.payment_status)}</td></tr>`).join(""):'<tr><td colspan="5" class="table-empty">Belum ada tagihan fee dapur.</td></tr>';
      }],
      ["personal-balance", async r=>{
        const el=$("#personalLedgerRows"); if(!el)return;
        const rows=r.data?.ledger||[];
        el.innerHTML=rows.length?rows.map(x=>`<tr><td>${dateText(x.created_at)}</td><td>${escapeHtml(x.description||x.reference_type)}</td><td>${x.entry_type==="CREDIT"?"Kredit":"Debit"}</td><td>${rupiah(x.amount)}</td></tr>`).join(""):'<tr><td colspan="4" class="table-empty">Belum ada mutasi saldo pribadi.</td></tr>';
      }],
      ["withdrawals", async r=>{
        const rows=r.data||[];
        const el=$("#withdrawalHistoryRows"); if(el) el.innerHTML=rows.length?rows.map(x=>`<tr><td>${escapeHtml(x.request_number)}</td><td>${dateText(x.created_at)}</td><td>${rupiah(x.amount)}</td><td>${statusText(x.request_status)}</td><td>${escapeHtml(x.payment_reference||"—")}</td></tr>`).join(""):'<tr><td colspan="5" class="table-empty">Belum ada pengajuan withdraw.</td></tr>';
        if(rows[0]){setText("#latestWithdrawalTitle",`Withdraw Ketua ${rupiah(rows[0].amount)}`);setText("#latestWithdrawalStatus",statusText(rows[0].request_status));}
      }],
      ["reports", async r=>{
        const el=$("#reportsList"); if(!el)return;
        const rows=r.data||[];
        el.innerHTML=rows.length?rows.map(x=>`<article class="data-list-item"><strong>${escapeHtml(x.report_title)}</strong><small>${escapeHtml(x.report_type)} · ${dateText(x.created_at)} · ${statusText(x.report_status)}</small></article>`).join(""):'<p class="table-empty">Belum ada dokumen laporan yang tersedia.</p>';
      }],
      ["notifications", async r=>{
        const el=$("#notificationsList"); if(!el)return;
        const rows=r.data||[];
        el.innerHTML=rows.length?rows.map(x=>`<article class="data-list-item"><strong>${escapeHtml(x.title)}</strong><p>${escapeHtml(x.message)}</p><small>${dateText(x.created_at)} ${x.is_read?"· Dibaca":"· Belum dibaca"}</small>${!x.is_read?` <button class="button button-secondary button-small" data-read-notification="${x.id}">Tandai dibaca</button>`:""}</article>`).join(""):'<p class="table-empty">Tidak ada notifikasi.</p>';
      }]
    ];
    await Promise.allSettled(tasks.map(async ([key,fn])=>fn(await apiRequest(key))));
  }

  async function loadDashboard() {
    const notice = $("#dataNotice");
    try {
      const response = await apiRequest("dashboard");
      applyDashboardData(response);
      notice.hidden = true;
      $("#connectionText").textContent = "Database D1 terhubung";
      $("#accountConnection").textContent = "Terhubung";
      $(".status-dot").style.background = "#36c79a";
      await loadSupportingData();
    } catch (error) {
      $("#connectionText").textContent = "Koneksi database bermasalah";
      $("#accountConnection").textContent = "Tidak terhubung";
      notice.hidden = false;
      notice.querySelector("strong").textContent = "Data database belum dapat dimuat";
      notice.querySelector("p").textContent = error.message;
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
    $("#fullscreenButton")?.addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      } catch (error) { showToast("Mode layar penuh tidak tersedia pada browser ini."); }
    });
    $("#sidebarClose").addEventListener("click", closeSidebar);
    $("#sidebarBackdrop").addEventListener("click", closeSidebar);
    $("#refreshButton").addEventListener("click", loadDashboard);
    $("#notificationPermissionButton")?.addEventListener("click", requestNotificationPermission);
    $("#withdrawForm").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        const amount = Number($("#withdrawAmount").value);
        const purpose = $("#withdrawPurpose").value.trim();
        const result = await apiRequest("withdrawals", {
          method: "POST",
          body: JSON.stringify({ amount, purpose })
        });
        showToast(result.message || "Pengajuan withdraw berhasil dikirim.");
        form.reset();
        closeModal($("#withdrawModal"));
        await loadDashboard();
      } catch (error) {
        showToast(error.message);
      } finally {
        submit.disabled = false;
      }
    });

    $("#operationalForm").addEventListener("submit", event => {
      event.preventDefault();
      showToast("Modul pengajuan operasional memerlukan alur transaksi dan persetujuan tersendiri.");
    });
    document.addEventListener("click", async event => {
      const approval=event.target.closest("[data-approval-action]");
      if(approval){
        const action=approval.dataset.approvalAction;
        const id=approval.dataset.id;
        const notes=window.prompt(action==="APPROVE"?"Catatan persetujuan (opsional):":"Alasan penolakan:");
        if(action==="REJECT" && notes===null) return;
        approval.disabled=true;
        try {
          const result=await apiPath(`/api/ketua/approvals/${encodeURIComponent(id)}/action`,{
            method:"POST",body:JSON.stringify({action,notes:notes||""})
          });
          showToast(result.message||"Keputusan disimpan.");
          await loadDashboard();
        } catch(error){showToast(error.message);approval.disabled=false;}
      }
      const readButton=event.target.closest("[data-read-notification]");
      if(readButton){
        try{
          await apiPath("/api/ketua/notifications",{method:"PATCH",body:JSON.stringify({id:readButton.dataset.readNotification})});
          await loadSupportingData();
        }catch(error){showToast(error.message);}
      }
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
