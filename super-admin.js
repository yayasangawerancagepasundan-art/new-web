
(() => {
  "use strict";

  /* =========================================================
     KONFIGURASI UTAMA
     ========================================================= */
  
  const API_BASE_URL =
    "https://sppg-keuangan-dev.yayasangawerancagepasundan.workers.dev";

  const AUTH_TOKEN_KEY = "sppg_auth_token";
  const LOGIN_PAGE = "./index.html";

  const token =
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    sessionStorage.getItem(AUTH_TOKEN_KEY);

  /* =========================================================
     ELEMEN DASHBOARD
     ========================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const sidebar = $("#sidebar");
  const scrim = $("#sidebarScrim");
  const dashboard = $("#dashboardPage");
  const modulePage = $("#modulePage");
  const moduleTitle = $("#moduleTitle");
  const moduleContent = $("#moduleContent");

  let currentPage = "dashboard";
  let currentUser = null;
  let currentRoles = [];
  let currentModuleData = [];
  let requestController = null;

  /* =========================================================
     KONFIGURASI MENU DAN ENDPOINT
     ========================================================= */

  const pageNames = {
    dashboard: "Dashboard",
    yayasan: "Data Yayasan",
    dapur: "Data Dapur SPPG",
    pengguna: "Manajemen Pengguna",
    akses: "Hak Akses & Role",
    aktivitas: "Aktivitas Pengguna",
    audit: "Audit Log",
    database: "Monitoring Database",
    server: "Monitoring Server",
    pengaturan: "Pengaturan Sistem",
    keamanan: "Keamanan Akun",
    backup: "Backup & Pemulihan"
  };

  /*
   * Endpoint berikut merupakan kontrak API yang akan
   * diimplementasikan pada Worker.js tahap berikutnya.
   */

  const modules = {
    yayasan: {
      endpoint: "/api/admin/foundations",
      description: "Pengelolaan data induk yayasan.",
      columns: [
        ["foundation_name", "Nama Yayasan"],
        ["legal_number", "Nomor Legalitas"],
        ["npwp", "NPWP"],
        ["email", "Email"],
        ["phone", "Telepon"],
        ["status", "Status"]
      ],
      fields: [
        ["foundation_name", "Nama Yayasan", "text", true],
        ["legal_number", "Nomor Legalitas", "text", false],
        ["npwp", "NPWP", "text", false],
        ["address", "Alamat", "textarea", false],
        ["email", "Email", "email", false],
        ["phone", "Telepon", "text", false],
        ["status", "Status", "select", true, ["ACTIVE", "INACTIVE"]]
      ]
    },

    dapur: {
      endpoint: "/api/admin/kitchens",
      description: "Pengelolaan data dapur dan keterkaitan yayasan.",
      columns: [
        ["kitchen_code", "Kode Dapur"],
        ["kitchen_name", "Nama Dapur"],
        ["foundation_name", "Yayasan"],
        ["location", "Wilayah"],
        ["status", "Status"]
      ],
      fields: [
        ["foundation_id", "Yayasan Pemilik", "foundation", true],
        ["kitchen_code", "Kode Dapur", "auto-code", false],
        ["kitchen_name", "Nama Dapur", "text", true],
        ["location", "Wilayah", "text", false],
        ["address", "Alamat", "textarea", false],
        ["start_date", "Tanggal Mulai", "date", false],
        ["status", "Status", "select", true, ["ACTIVE", "INACTIVE"]]
      ]
    },

    pengguna: {
      endpoint: "/api/admin/users",
      description: "Pengelolaan akun, status, dan penugasan pengguna.",
      columns: [
        ["full_name", "Nama Lengkap"],
        ["username", "Username"],
        ["email", "Email"],
        ["role_names", "Role"],
        ["account_status", "Status Akun"],
        ["last_login_at", "Login Terakhir"]
      ],
      fields: [
        ["full_name", "Nama Lengkap", "text", true],
        ["username", "Username", "text", true],
        ["email", "Email", "email", true],
        ["phone", "Nomor Telepon", "text", false],
        ["password", "Password Awal", "password", true],
        ["role_code", "Kode Role", "text", true],
        ["foundation_id", "ID Yayasan", "text", false],
        ["account_status", "Status Akun", "select", true,
          ["PENDING", "ACTIVE", "INACTIVE", "FROZEN"]]
      ]
    },

    akses: {
      endpoint: "/api/admin/roles",
      description: "Pengaturan role dan hak akses pengguna.",
      columns: [
        ["role_code", "Kode Role"],
        ["role_name", "Nama Role"],
        ["description", "Keterangan"],
        ["is_system_role", "Role Sistem"]
      ],
      fields: [
        ["role_code", "Kode Role", "text", true],
        ["role_name", "Nama Role", "text", true],
        ["description", "Keterangan", "textarea", false]
      ]
    },

    aktivitas: {
      endpoint: "/api/admin/activity",
      description: "Riwayat aktivitas pengguna dalam sistem.",
      columns: [
        ["full_name", "Pengguna"],
        ["event_type", "Aktivitas"],
        ["module_name", "Modul"],
        ["event_status", "Status"],
        ["created_at", "Waktu"]
      ],
      readOnly: true
    },

    audit: {
      endpoint: "/api/admin/audit-logs",
      description: "Catatan perubahan data dan tindakan pengguna.",
      columns: [
        ["user_name", "Pengguna"],
        ["event_category", "Kategori"],
        ["event_action", "Tindakan"],
        ["module_name", "Modul"],
        ["event_status", "Status"],
        ["event_at", "Waktu"]
      ],
      readOnly: true
    },

    database: {
      endpoint: "/api/admin/monitoring/database",
      description: "Informasi koneksi dan kondisi database D1.",
      readOnly: true
    },

    server: {
      endpoint: "/api/admin/monitoring/server",
      description: "Status layanan Worker dan penyimpanan R2.",
      readOnly: true
    },

    pengaturan: {
      endpoint: "/api/admin/settings",
      description: "Parameter dan konfigurasi sistem.",
      columns: [
        ["setting_key", "Nama Pengaturan"],
        ["setting_value", "Nilai"],
        ["description", "Keterangan"]
      ],
      fields: [
        ["setting_key", "Nama Pengaturan", "text", true],
        ["setting_value", "Nilai", "textarea", true],
        ["description", "Keterangan", "textarea", false]
      ]
    },

    keamanan: {
      endpoint: "/api/admin/security",
      description: "Pengelolaan keamanan akun dan sesi pengguna.",
      readOnly: true
    },

    backup: {
      endpoint: "/api/admin/backups",
      description: "Pengelolaan backup dan pemulihan data.",
      readOnly: true
    }
  };

  /* =========================================================
     UTILITAS
     ========================================================= */

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function formatValue(value) {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value ?? "—";
  }

  function showNotification(message, type = "info") {
    const area = $("#notificationArea");
    if (!area) return;

    area.hidden = false;
    area.className = `notification-message ${type}`;
    area.textContent = message;

    window.clearTimeout(showNotification.timer);

    showNotification.timer = window.setTimeout(() => {
      area.hidden = true;
    }, 4500);
  }

  function showLoading(message = "Memuat data...") {
    moduleContent.innerHTML = `
      <div class="module-loading">
        <span>${escapeHTML(message)}</span>
      </div>
    `;
  }

  function showError(message) {
    moduleContent.innerHTML = `
      <div class="module-error">
        <strong>Data belum dapat ditampilkan</strong>
        <p>${escapeHTML(message)}</p>
        <button type="button" id="retryModule">Coba Lagi</button>
      </div>
    `;

    $("#retryModule")?.addEventListener("click", () => {
      loadModule(currentPage);
    });
  }

  function getToken() {
    return (
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      sessionStorage.getItem(AUTH_TOKEN_KEY)
    );
  }

  /* =========================================================
     PEMANGGILAN API
     ========================================================= */

  async function apiRequest(path, options = {}) {
    const currentToken = getToken();

    const headers = {
      "Accept": "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(currentToken
        ? { "Authorization": `Bearer ${currentToken}` }
        : {}),
      ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error("Respons server bukan JSON yang valid.");
    }

    if (response.status === 401) {
      clearSession();
      window.location.replace(LOGIN_PAGE);
      throw new Error("Sesi berakhir. Silakan login kembali.");
    }

    if (response.status === 403) {
      throw new Error(
        result.message || "Anda tidak memiliki hak akses."
      );
    }

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || `Permintaan gagal (${response.status}).`
      );
    }

    return result;
  }

  /* =========================================================
     PEMERIKSAAN SESI
     authMe() di Worker tidak diubah.
     ========================================================= */

  async function verifySession() {
    if (!getToken()) {
      window.location.replace(LOGIN_PAGE);
      return false;
    }

    try {
      const result = await apiRequest("/api/auth/me");

      if (!result.user) {
        throw new Error("Identitas pengguna tidak ditemukan.");
      }

      currentUser = result.user;
      currentRoles = result.roles || [];

      const isSuperAdmin = currentRoles.some(
        role => role.role_code === "SUPER_ADMIN"
      );

      if (!isSuperAdmin) {
        showNotification(
          "Akun ini tidak memiliki akses Super Admin.",
          "error"
        );

        window.location.replace(LOGIN_PAGE);
        return false;
      }

      renderUserIdentity();
      return true;

    } catch (error) {
      if (error.message.includes("Sesi")) return false;

      showNotification(error.message, "error");
      return false;
    }
  }

  function renderUserIdentity() {
    if (!currentUser) return;

    setText("headerFullName", currentUser.full_name);
    setText("headerUsername", currentUser.username);

    const initials = currentUser.full_name
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase();

    setText("headerAvatar", initials || "SA");
  }

  function clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  }

  /* =========================================================
     DASHBOARD STATISTIK
     ========================================================= */

  async function loadDashboard() {
    try {
      const result = await apiRequest("/api/admin/dashboard");
      const data = result.data || result.dashboard || {};

      setText("statFoundations", data.total_foundations ?? "—");
      setText("statKitchens", data.total_kitchens ?? "—");
      setText("statUsers", data.active_users ?? "—");

      setText(
        "statTransactions",
        data.transactions_amount !== undefined
          ? formatCurrency(data.transactions_amount)
          : "—"
      );

      setText(
        "statFoundationsStatus",
        `${data.active_foundations ?? 0} aktif`
      );

      setText(
        "statKitchensStatus",
        `${data.active_kitchens ?? 0} aktif`
      );

      setText(
        "statUsersStatus",
        `${data.online_users ?? 0} online`
      );

      setText(
        "statTransactionsStatus",
        data.transaction_period_label || "Periode berjalan"
      );

      renderRecentActivities(data.recent_activities || []);
      renderTransactionChart(data.transaction_trend || []);

    } catch (error) {
      setText("statFoundations", "—");
      setText("statKitchens", "—");
      setText("statUsers", "—");
      setText("statTransactions", "—");

      setText("statFoundationsStatus", "Data tidak tersedia");
      setText("statKitchensStatus", "Data tidak tersedia");
      setText("statUsersStatus", "Data tidak tersedia");
      setText("statTransactionsStatus", "Data tidak tersedia");

      renderRecentActivities([]);

      showNotification(
        `Dashboard: ${error.message}`,
        "warning"
      );
    }
  }

  function renderRecentActivities(items) {
    const container = $("#recentActivities");
    if (!container) return;

    if (!items.length) {
      container.innerHTML = `
        <div class="activity-row">
          <span class="activity-icon green-icon">◷</span>
          <div class="activity-copy">
            <strong>Belum ada aktivitas</strong>
            <small>Belum terdapat catatan aktivitas dari backend.</small>
          </div>
          <span class="activity-tag green-tag">Info</span>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="activity-row">
        <span class="activity-icon green-icon">◷</span>
        <div class="activity-copy">
          <strong>${escapeHTML(item.event_description || item.event_action || "Aktivitas")}</strong>
          <small>
            ${escapeHTML(item.full_name || "Pengguna")}
            · ${escapeHTML(formatDate(item.event_at || item.created_at))}
          </small>
        </div>
        <span class="activity-tag green-tag">
          ${escapeHTML(item.module_name || "Sistem")}
        </span>
      </div>
    `).join("");
  }

  function renderTransactionChart(items) {
    const container = $("#transactionChart");
    if (!container) return;

    if (!items.length) {
      container.innerHTML = `
        <div class="chart-tooltip" style="position:static;margin:auto">
          <span>Trend transaksi</span>
          <strong>Belum ada data transaksi</strong>
        </div>
      `;

      setText(
        "chartNote",
        "Grafik akan tampil setelah data transaksi tersedia."
      );

      return;
    }

    const maxValue = Math.max(
      ...items.map(item => Number(item.amount || 0)),
      1
    );

    const width = 760;
    const height = 235;
    const left = 55;
    const right = 20;
    const top = 25;
    const bottom = 30;

    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    const points = items.map((item, index) => {
      const x = items.length === 1
        ? left + plotWidth / 2
        : left + (index / (items.length - 1)) * plotWidth;

      const y = top + plotHeight -
        (Number(item.amount || 0) / maxValue) * plotHeight;

      return {
        x,
        y,
        label: item.label || item.period || "",
        amount: Number(item.amount || 0)
      };
    });

    const linePath = points
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
      )
      .join(" ");

    const areaPath =
      `${linePath} L ${points[points.length - 1].x} ${height - bottom}` +
      ` L ${points[0].x} ${height - bottom} Z`;

    container.innerHTML = `
      <svg
        class="trend-chart"
        viewBox="0 0 ${width} ${height}"
        role="img"
        aria-label="Grafik transaksi aktual"
      >
        <defs>
          <linearGradient id="liveAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#00e98b" stop-opacity=".42"/>
            <stop offset="1" stop-color="#00e98b" stop-opacity=".015"/>
          </linearGradient>
        </defs>

        ${[0, 1, 2, 3, 4].map(i => {
          const y = top + (plotHeight / 4) * i;

          return `
            <line
              x1="${left}"
              y1="${y}"
              x2="${width - right}"
              y2="${y}"
              class="grid-lines"
            />
          `;
        }).join("")}

        <path d="${areaPath}" fill="url(#liveAreaFill)"/>
        <path d="${linePath}" class="chart-line"/>

        ${points.map(point => `
          <circle
            cx="${point.x}"
            cy="${point.y}"
            r="5"
            class="chart-point"
          >
            <title>
              ${escapeHTML(point.label)}:
              ${escapeHTML(formatCurrency(point.amount))}
            </title>
          </circle>
        `).join("")}

        ${points.map(point => `
          <text
            x="${point.x}"
            y="${height - 5}"
            text-anchor="middle"
            class="month-label"
          >${escapeHTML(point.label)}</text>
        `).join("")}
      </svg>
    `;

    setText(
      "chartNote",
      "Grafik menggunakan data transaksi aktual dari database."
    );
  }

  /* =========================================================
     STATUS SISTEM
     ========================================================= */

  async function loadSystemStatus() {
    try {
      const result = await apiRequest("/api/health");

      setText("workerStatus", "Terhubung");
      setText(
        "databaseStatus",
        result.database === "connected"
          ? "Terhubung"
          : "Gangguan"
      );

      setText(
        "storageStatus",
        result.storage === "binding_available"
          ? "Binding tersedia"
          : "Tidak tersedia"
      );

    } catch (error) {
      setText("workerStatus", "Tidak terhubung");
      setText("databaseStatus", "Tidak diketahui");
      setText("storageStatus", "Tidak diketahui");

      showNotification(
        `Status sistem: ${error.message}`,
        "warning"
      );
    }

    /*
     * Status backup dan keamanan harus berasal dari
     * endpoint monitoring yang akan dibuat di Worker.
     */
    try {
      const result = await apiRequest(
        "/api/admin/monitoring/summary"
      );

      setText(
        "backupStatus",
        result.backup_status || "Belum dikonfigurasi"
      );

      setText(
        "securityStatus",
        result.security_status || "Belum diperiksa"
      );

    } catch {
      setText("backupStatus", "Belum tersedia");
      setText("securityStatus", "Belum tersedia");
    }
  }

  /* =========================================================
     NAVIGASI
     ========================================================= */

  function closeSidebar() {
    sidebar?.classList.remove("open");
    scrim?.classList.remove("visible");
  }

  function navigate(page) {
    const key = pageNames[page] ? page : "dashboard";

    currentPage = key;

    $$(".nav-link").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === key
      );
    });

    const isDashboard = key === "dashboard";

    dashboard.hidden = !isDashboard;
    modulePage.hidden = isDashboard;

    closeSidebar();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    if (isDashboard) {
      loadDashboard();
      return;
    }

    moduleTitle.textContent = pageNames[key];
    loadModule(key);
  }

  /* =========================================================
     PEMUATAN MODUL
     ========================================================= */

  async function loadModule(page) {
    const config = modules[page];

    if (!config) {
      showError("Konfigurasi modul tidak ditemukan.");
      return;
    }

    if (requestController) {
      requestController.abort();
    }

    requestController = new AbortController();

    showLoading("Mengambil data dari database...");

    try {
      const result = await apiRequest(config.endpoint, {
        signal: requestController.signal
      });

      if (currentPage !== page) return;

      const items =
        result.data ||
        result.items ||
        result.results ||
        [];

      currentModuleData = Array.isArray(items) ? items : [];

      renderModule(page, config, result);

    } catch (error) {
      if (error.name === "AbortError") return;

      showError(
        `${error.message} Pastikan endpoint modul telah tersedia pada Worker.`
      );
    }
  }

  function renderModule(page, config, result) {
    if (page === "database" || page === "server") {
      renderMonitoring(page, result);
      return;
    }

    if (page === "keamanan") {
      renderSecurity(result);
      return;
    }

    if (page === "backup") {
      renderBackup(result);
      return;
    }

    const items = currentModuleData;

    const actionButton = config.readOnly
      ? ""
      : `
        <button
          type="button"
          class="module-action-button"
          id="addRecordButton"
        >+ Tambah Data</button>
      `;

    const table = config.columns?.length
      ? renderTable(config.columns, items, page)
      : `<p>Data tersedia dalam format pemantauan.</p>`;

    moduleContent.innerHTML = `
      <div class="module-toolbar">
        <div>
          <p>${escapeHTML(config.description)}</p>
          <small>Total data: ${items.length}</small>
        </div>
        <div class="module-actions">
          <button type="button" id="refreshModule">↻ Muat Ulang</button>
          ${actionButton}
        </div>
      </div>

      <div class="module-table-wrap">
        ${table}
      </div>
    `;

    $("#refreshModule")?.addEventListener("click", () => {
      loadModule(page);
    });

    $("#addRecordButton")?.addEventListener("click", () => {
      openRecordForm(page);
    });

    $$(".edit-record").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        openRecordForm(page, items[index]);
      });
    });

    $$(".delete-record").forEach(button => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.index);
    const record = items[index];

    if (
      page === "yayasan" &&
      String(record.status).toUpperCase() === "INACTIVE"
    ) {
      activateRecord(page, record);
    } else {
      deleteRecord(page, record);
    }
  });
});
  }

  function renderTable(columns, items, page) {
    if (!items.length) {
      return `
        <div class="module-empty">
          <strong>Belum ada data</strong>
          <p>Data akan tampil setelah tersimpan di database.</p>
        </div>
      `;
    }

    const headings = columns.map(column =>
      `<th>${escapeHTML(column[1])}</th>`
    ).join("");

    const rows = items.map((item, index) => {
      const cells = columns.map(column => {
  const value = item[column[0]];

 if (
  ["yayasan", "dapur"].includes(page) &&
  column[0] === "status"
) {
  const status = String(value || "").toUpperCase();
  const isActive = ["ACTIVE", "AKTIF"].includes(status);

  const label = isActive ? "AKTIF" : "NONAKTIF";
  const color = isActive ? "#22c55e" : "#ef4444";
  const background = isActive
    ? "rgba(34,197,94,0.12)"
    : "rgba(239,68,68,0.12)";

  return `
    <td>
      <span style="
        display:inline-block;
        padding:5px 12px;
        border-radius:20px;
        font-size:12px;
        font-weight:700;
        color:${color};
        background:${background};
        border:1px solid ${color};
      ">${label}</span>
    </td>
  `;
}

  return `<td>${escapeHTML(formatValue(value))}</td>`;
}).join("");

      const isInactive =
  page === "yayasan" &&
  String(item.status).toUpperCase() === "INACTIVE";

const actions = modules[page].readOnly
  ? ""
  : `
    <td class="record-actions">
      <button
        type="button"
        class="edit-record"
        data-index="${index}"
      >Edit</button>

      <button
        type="button"
        class="delete-record"
        data-index="${index}"
      >${isInactive ? "Aktifkan" : "Nonaktifkan"}</button>
    </td>
  `;

      return `<tr>${cells}${actions}</tr>`;
    }).join("");

    return `
      <table class="module-table">
        <thead>
          <tr>
            ${headings}
            ${modules[page].readOnly ? "" : "<th>Tindakan</th>"}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  /* =========================================================
     FORM TAMBAH DAN EDIT DATA
     ========================================================= */

  async function openRecordForm(page, record = null) {
    const config = modules[page];

    if (!config?.fields?.length) {
      showNotification(
        "Formulir untuk modul ini belum dikonfigurasi.",
        "warning"
      );
      return;
    }

    const isEdit = Boolean(record);

    let foundationOptions = [];

    if (page === "dapur") {
      try {
        const foundationResult = await apiRequest("/api/admin/foundations");
        const allFoundations = foundationResult.data || [];

        foundationOptions = allFoundations.filter(item =>
          String(item.status).toUpperCase() === "ACTIVE" ||
          item.id === record?.foundation_id
        );
      } catch (error) {
        showNotification(
          `Daftar Yayasan tidak dapat dimuat: ${error.message}`,
          "error"
        );
        return;
      }

      if (!isEdit && foundationOptions.length === 0) {
        showNotification(
          "Belum ada Yayasan aktif. Aktifkan atau tambahkan Yayasan terlebih dahulu.",
          "warning"
        );
        return;
      }
    }

    const fieldsHTML = config.fields.map(field => {
      const [name, label, type, required, options] = field;

      const value = record?.[name] ?? "";

      if (type === "foundation") {
        return `
          <label class="form-field">
            <span>${escapeHTML(label)}</span>
            <select
              name="${escapeHTML(name)}"
              ${required ? "required" : ""}
              ${isEdit ? "disabled" : ""}
            >
              <option value="">Pilih Yayasan</option>
              ${foundationOptions.map(item => `
                <option
                  value="${escapeHTML(item.id)}"
                  ${String(value) === String(item.id) ? "selected" : ""}
                >${escapeHTML(item.foundation_code || "Tanpa kode")} — ${escapeHTML(item.foundation_name)}</option>
              `).join("")}
            </select>
            ${isEdit ? '<small>Yayasan pemilik tidak dapat diubah melalui formulir edit.</small>' : '<small>Daftar hanya menampilkan Yayasan aktif.</small>'}
          </label>
        `;
      }

      if (type === "auto-code") {
        return `
          <label class="form-field">
            <span>${escapeHTML(label)}</span>
            <input
              type="text"
              value="${escapeHTML(record?.kitchen_code || "Dibuat otomatis oleh sistem")}"
              readonly
              disabled
            >
            <small>Kode Dapur dibuat otomatis saat data disimpan dan tidak dapat diubah manual.</small>
          </label>
        `;
      }

      if (type === "textarea") {
        return `
          <label class="form-field">
            <span>${escapeHTML(label)}</span>
            <textarea
              name="${escapeHTML(name)}"
              ${required ? "required" : ""}
            >${escapeHTML(value)}</textarea>
          </label>
        `;
      }

      if (type === "select") {
        return `
          <label class="form-field">
            <span>${escapeHTML(label)}</span>
            <select
              name="${escapeHTML(name)}"
              ${required ? "required" : ""}
            >
              <option value="">Pilih ${escapeHTML(label)}</option>
              ${(options || []).map(option => `
                <option
                  value="${escapeHTML(option)}"
                  ${String(value) === option ? "selected" : ""}
                >${escapeHTML(option)}</option>
              `).join("")}
            </select>
          </label>
        `;
      }

      return `
        <label class="form-field">
          <span>${escapeHTML(label)}</span>
          <input
            type="${escapeHTML(type)}"
            name="${escapeHTML(name)}"
            value="${escapeHTML(value)}"
            ${required ? "required" : ""}
            ${name === "password" && isEdit ? "" : ""}
          >
        </label>
      `;
    }).join("");

    const modal = $("#modalContainer");

    modal.hidden = false;

    modal.innerHTML = `
      <div class="modal-backdrop">
        <form class="module-form" id="recordForm">
          <div class="modal-heading">
            <h3>${isEdit ? "Ubah Data" : "Tambah Data"}</h3>
            <button type="button" id="closeModal">×</button>
          </div>

          <div class="form-grid">
            ${fieldsHTML}
          </div>

          <div class="form-footer">
            <button type="button" id="cancelModal">Batal</button>
            <button type="submit" id="saveRecord">
              ${isEdit ? "Simpan Perubahan" : "Simpan Data"}
            </button>
          </div>
        </form>
      </div>
    `;

    const closeModal = () => {
      modal.hidden = true;
      modal.innerHTML = "";
    };

    $("#closeModal").addEventListener("click", closeModal);
    $("#cancelModal").addEventListener("click", closeModal);

    $("#recordForm").addEventListener("submit", async event => {
      event.preventDefault();

      const form = event.currentTarget;
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());

      Object.keys(payload).forEach(key => {
        if (payload[key] === "") delete payload[key];
      });

      const saveButton = $("#saveRecord");
      saveButton.disabled = true;
      saveButton.textContent = "Menyimpan...";

      try {
        const id = record?.id;

         const endpoint = id
         ? `${config.endpoint}?id=${encodeURIComponent(id)}`
         : config.endpoint;

        const method = id ? "PUT" : "POST";

        await apiRequest(endpoint, {
          method,
          body: JSON.stringify(payload)
        });

        closeModal();

        showNotification(
          isEdit
            ? "Data berhasil diperbarui."
            : "Data berhasil ditambahkan.",
          "success"
        );

        loadModule(page);

      } catch (error) {
        saveButton.disabled = false;
        saveButton.textContent = "Coba Simpan Lagi";

        showNotification(error.message, "error");
      }
    });
  }

  /* =========================================================
     NONAKTIFKAN DATA
     ========================================================= */
  async function activateRecord(page, record) {
  if (!record?.id) {
    showNotification(
      "ID data tidak ditemukan. Data tidak diubah.",
      "error"
    );
    return;
  }

  const confirmed = window.confirm(
    "Apakah Anda yakin ingin mengaktifkan kembali yayasan ini?"
  );

  if (!confirmed) return;

  try {
    await apiRequest(
      `${modules[page].endpoint}?id=${encodeURIComponent(record.id)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          status: "ACTIVE"
        })
      }
    );

    showNotification(
      "Yayasan berhasil diaktifkan kembali.",
      "success"
    );

    loadModule(page);

  } catch (error) {
    showNotification(error.message, "error");
  }
}
  async function deleteRecord(page, record) {
    if (!record?.id) {
      showNotification(
        "ID data tidak ditemukan. Data tidak diubah.",
        "error"
      );
      return;
    }

    const confirmed = window.confirm(
      "Apakah Anda yakin ingin menonaktifkan data ini?"
    );

    if (!confirmed) return;

    try {
      await apiRequest(
        `${modules[page].endpoint}?id=${encodeURIComponent(record.id)}`,
        {
          method: "DELETE"
        }
      );

      showNotification(
        "Permintaan penonaktifan berhasil.",
        "success"
      );

      loadModule(page);

    } catch (error) {
      showNotification(error.message, "error");
    }
  }

  /* =========================================================
     MONITORING DATABASE DAN SERVER
     ========================================================= */

  function renderMonitoring(page, result) {
    const data = result.data || result;

    const entries = Object.entries(data).filter(
      ([key]) => key !== "success"
    );

    moduleContent.innerHTML = `
      <div class="module-toolbar">
        <p>${escapeHTML(modules[page].description)}</p>
        <button type="button" id="refreshModule">↻ Periksa Ulang</button>
      </div>

      <div class="monitor-grid">
        ${entries.map(([key, value]) => `
          <div class="monitor-item">
            <span>${escapeHTML(key.replaceAll("_", " "))}</span>
            <strong>${escapeHTML(formatValue(value))}</strong>
          </div>
        `).join("")}
      </div>
    `;

    $("#refreshModule")?.addEventListener("click", () => {
      loadModule(page);
    });
  }

  /* =========================================================
     KEAMANAN AKUN
     ========================================================= */

  function renderSecurity(result) {
    const data = result.data || result;
    const sessions = data.sessions || [];

    moduleContent.innerHTML = `
      <div class="module-toolbar">
        <p>Informasi sesi dan keamanan akun.</p>
        <button type="button" id="refreshModule">↻ Periksa Ulang</button>
      </div>

      <div class="monitor-grid">
        <div class="monitor-item">
          <span>Pengguna</span>
          <strong>${escapeHTML(currentUser?.full_name || "—")}</strong>
        </div>

        <div class="monitor-item">
          <span>Status Akun</span>
          <strong>${escapeHTML(currentUser?.account_status || "—")}</strong>
        </div>

        <div class="monitor-item">
          <span>Jumlah Sesi</span>
          <strong>${sessions.length}</strong>
        </div>
      </div>

      <h3>Sesi Pengguna</h3>

      ${
        sessions.length
          ? `
            <div class="module-table-wrap">
              <table class="module-table">
                <thead>
                  <tr>
                    <th>Perangkat</th>
                    <th>Login</th>
                    <th>Aktivitas Terakhir</th>
                    <th>Kedaluwarsa</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${sessions.map(session => `
                    <tr>
                      <td>${escapeHTML(session.user_agent || "—")}</td>
                      <td>${escapeHTML(formatDate(session.created_at))}</td>
                      <td>${escapeHTML(formatDate(session.last_activity_at))}</td>
                      <td>${escapeHTML(formatDate(session.expires_at))}</td>
                      <td>${session.revoked_at ? "Dicabut" : "Aktif"}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `
          : `<p>Belum ada informasi sesi tambahan.</p>`
      }
    `;

    $("#refreshModule")?.addEventListener("click", () => {
      loadModule("keamanan");
    });
  }

  /* =========================================================
     BACKUP DAN PEMULIHAN
     ========================================================= */

  function renderBackup(result) {
    const data = result.data || result;
    const backups = data.backups || [];

    moduleContent.innerHTML = `
      <div class="module-toolbar">
        <div>
          <p>${escapeHTML(modules.backup.description)}</p>
          <small>
            Backup dan pemulihan harus tercatat serta dapat diverifikasi.
          </small>
        </div>

        <div class="module-actions">
          <button type="button" id="refreshModule">↻ Muat Ulang</button>
          <button type="button" id="createBackup">Buat Backup</button>
        </div>
      </div>

      ${
        backups.length
          ? `
            <div class="module-table-wrap">
              <table class="module-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Jenis</th>
                    <th>Status</th>
                    <th>Lokasi Arsip</th>
                  </tr>
                </thead>
                <tbody>
                  ${backups.map(item => `
                    <tr>
                      <td>${escapeHTML(formatDate(item.created_at))}</td>
                      <td>${escapeHTML(item.backup_type || "—")}</td>
                      <td>${escapeHTML(item.status || "—")}</td>
                      <td>${escapeHTML(item.storage_key || "—")}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `
          : `
            <div class="module-empty">
              <strong>Belum ada riwayat backup</strong>
              <p>Riwayat akan tampil setelah proses backup tersedia.</p>
            </div>
          `
      }
    `;

    $("#refreshModule")?.addEventListener("click", () => {
      loadModule("backup");
    });

    $("#createBackup")?.addEventListener("click", async () => {
      const confirmed = window.confirm(
        "Jalankan permintaan backup database sekarang?"
      );

      if (!confirmed) return;

      try {
        const response = await apiRequest(
          "/api/admin/backups",
          {
            method: "POST",
            body: JSON.stringify({ backup_type: "MANUAL" })
          }
        );

        showNotification(
          response.message || "Permintaan backup diterima.",
          "success"
        );

        loadModule("backup");

      } catch (error) {
        showNotification(error.message, "error");
      }
    });
  }

  /* =========================================================
     NOTIFIKASI
     ========================================================= */

  async function loadNotifications() {
    try {
      const result = await apiRequest(
        "/api/admin/notifications"
      );

      const items = result.data || result.items || [];

      const button = $("#notificationButton");

      if (button) {
        button.dataset.count = String(items.length);
        button.title = `${items.length} notifikasi`;
      }

    } catch {
      // Notifikasi belum tersedia tidak mengganggu dashboard.
    }
  }

  /* =========================================================
     LOGOUT
     ========================================================= */

  async function logout() {
    const confirmed = window.confirm(
      "Apakah Anda yakin ingin keluar dari Sistem Super Admin?"
    );

    if (!confirmed) return;

    try {
      await apiRequest("/api/auth/logout", {
        method: "POST"
      });
    } catch (error) {
      console.warn("Logout server:", error.message);
    } finally {
      clearSession();
      window.location.replace(LOGIN_PAGE);
    }
  }

  /* =========================================================
     EVENT LISTENER
     ========================================================= */

  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-page]");

    if (trigger) {
      navigate(trigger.dataset.page);
    }
  });

  $("#mobileMenu")?.addEventListener("click", () => {
    sidebar?.classList.add("open");
    scrim?.classList.add("visible");
  });

  $("#sidebarClose")?.addEventListener("click", closeSidebar);
  scrim?.addEventListener("click", closeSidebar);

  $("#fullscreenButton")?.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      showNotification(
        "Mode layar penuh tidak didukung browser ini.",
        "warning"
      );
    }
  });

  $("#trendPeriod")?.addEventListener("change", async event => {
    try {
      const period = event.target.value;

      const result = await apiRequest(
        `/api/admin/dashboard/trend?months=${encodeURIComponent(period)}`
      );

      renderTransactionChart(
        result.data || result.items || []
      );

    } catch (error) {
      showNotification(error.message, "warning");
    }
  });

  $("#notificationButton")?.addEventListener(
    "click",
    loadNotifications
  );

  $("#helpButton")?.addEventListener("click", () => {
    showNotification(
      "Pusat bantuan sistem belum dikonfigurasi.",
      "info"
    );
  });

  $("#profileButton")?.addEventListener("click", () => {
    navigate("keamanan");
  });

  $("#userMenu")?.addEventListener("click", () => {
    navigate("keamanan");
  });

  $("#logoutButton")?.addEventListener("click", logout);

  window.addEventListener("resize", () => {
    if (window.innerWidth > 950) {
      closeSidebar();
    }
  });

  /* =========================================================
     INISIALISASI DASHBOARD
     ========================================================= */

  async function initializeDashboard() {
    const valid = await verifySession();

    if (!valid) return;

    await Promise.all([
      loadDashboard(),
      loadSystemStatus(),
      loadNotifications()
    ]);
  }

  initializeDashboard();

})();
