window._errorLog = [];
window.addEventListener("error", (e) => {
  const msg = `[${new Date().toLocaleTimeString()}] ${e.message} at ${e.filename}:${e.lineno}`;
  window._errorLog.push(msg);
  if (window._errorLog.length > 10) window._errorLog.shift(); // Keep only last 10
});

// const scriptURL = "https://script.google.com/macros/s/AKfycbwzH6dLYQ2sWGcIcahLpQJ4qSekwSM8MEAO2XJDxPiPutzkhyxovc9tHczaRmxtK84GSQ/exec";

const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const scriptURL = isLocal
  ? "https://script.google.com/macros/s/AKfycbwzH6dLYQ2sWGcIcahLpQJ4qSekwSM8MEAO2XJDxPiPutzkhyxovc9tHczaRmxtK84GSQ/exec"
  : "/.netlify/functions/leadProxy";

  // Dynamically load Courgette font from Google Fonts
  (function loadCourgetteFont() {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Courgette&family=Shadows+Into+Light&display=swap';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    document.head.appendChild(link);
  })();


// Show Toast Notification with different styles for Lead Form and Admin
function showToast(message, type = "success", forLeadForm = false) {
  const toastContainer = document.getElementById("toastContainer");

  // Define background color for different types
  let bgColor;
  let headerText;
    
  if (forLeadForm) {
    // For the lead form, use different colors for different types
    if (type === "success") {
      bgColor = "bg-primary"; // Lead form success message
      headerText = "Thank You!";
      message = "We will contact you shortly."; // Default message for success
    } else if (type === "warning") {
      bgColor = "bg-warning"; // Lead form warning (e.g., missing phone/email)
      headerText = "Attention!";
    } else if (type === "error") {
      bgColor = "bg-danger"; // Lead form error message
      headerText = "❌ Error!";
    }
  } else {
    // Admin side (success or error)
    bgColor = type === "success" ? "bg-black" : "bg-danger";
    headerText = type === "success" ? "✅ Success" : "❌ Error";
  }

  const toast = document.createElement("div");
  toast.classList.add("toast", "show", bgColor, "text-info", "fade");
  toast.setAttribute("role", "alert");
  
  toast.innerHTML = `
    <div class="toast-header">
        <strong class="me-auto">${headerText}</strong>
        <button type="button" class="btn-close btn-close-info" data-bs-dismiss="toast"></button>
    </div>
    <div class="toast-body">${message}</div>
  `;
    
  toastContainer.appendChild(toast);

  // Auto-remove the toast after 5 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 5000);
  }, 5000);
}

function toggleLoader() {
  const loader = document.getElementById("loadingOverlay");

  if (loader) {
    loader.classList.toggle("show");

    // Also toggle d-none to remove from layout
    if (loader.classList.contains("show")) {
      loader.classList.remove("d-none");
    } else {
      loader.classList.add("d-none");
    }
  }
}

function loadStylesheets() {
  const head = document.head;

  // Bootstrap 5.3.6 CSS
  const bootstrapCSS = document.createElement('link');
  bootstrapCSS.rel = 'stylesheet';
  bootstrapCSS.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.6/dist/css/bootstrap.min.css';
  head.appendChild(bootstrapCSS);

  // Bootstrap Icons
  const bootstrapIcons = document.createElement('link');
  bootstrapIcons.rel = 'stylesheet';
  bootstrapIcons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css';
  head.appendChild(bootstrapIcons);

  // Font Awesome 6.7.2
  const fontAwesome = document.createElement('link');
  fontAwesome.rel = 'stylesheet';
  fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css';
  head.appendChild(fontAwesome);

  // Base Custom Styles
  const customCSS = document.createElement('link');
  customCSS.rel = 'stylesheet';
  customCSS.href = 'style.css';
  head.appendChild(customCSS);
}

function loadScripts() {
  const body = document.body;

  if (window.scriptsAlreadyLoaded) return;
  window.scriptsAlreadyLoaded = true;

  // ✅ Load Bootstrap
  const bootstrapScript = document.createElement('script');
  bootstrapScript.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.6/dist/js/bootstrap.bundle.min.js';
  // for future use: <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js" integrity="sha384-I7E8VVD/ismYTF4hNIPjVp/Zjvgyol6VFvRkX/vR+Vc4jQkC+hVqc2pM8ODewa9r" crossorigin="anonymous"></script>
  bootstrapScript.defer = true;
  bootstrapScript.onload = () => console.log('✅ Bootstrap loaded');
  body.appendChild(bootstrapScript);

  // ✅ Only load FullCalendar on specific pages
  if (["/calendar.html"].includes(window.location.pathname)) {
    // Load core first, then load plugins sequentially
    const fullCalendarCore = document.createElement('script');
    fullCalendarCore.src = 'https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.17/index.global.min.js';
    fullCalendarCore.onload = () => {
      console.log('✅ FullCalendar core loaded');

      const pluginScripts = [
        'https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.17/index.global.min.js',
        'https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.17/index.global.min.js',
        'https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.17/index.global.min.js',
        'https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.17/index.global.min.js',
        'https://cdn.jsdelivr.net/npm/@fullcalendar/google-calendar@6.1.17/index.global.min.js'
      ];

      let loadedCount = 0;

      pluginScripts.forEach((src, i) => {
        const script = document.createElement('script');
        script.src = src;
        script.defer = true;
        script.onload = () => {
          loadedCount++;
          if (loadedCount === pluginScripts.length) {
            console.log('✅ FullCalendar plugins loaded');
            window.dispatchEvent(new Event('FullCalendarLoaded'));
          }
        };
        body.appendChild(script);
      });
    };

    body.appendChild(fullCalendarCore);
  }
}

// To be called on DOMContentLoaded:
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM Ready: loading styles and scripts...');
  loadStylesheets();
  loadScripts();
});

// ✅ Load Dropdowns
document.addEventListener("DOMContentLoaded", () => {
  if (
    document.getElementById("product-type-options") ||
    document.getElementById("parts-options") ||
    document.getElementById("phone-options") ||
    document.getElementById("unit-type-options") ||
    document.getElementById("payment-method-options") ||
    document.getElementById("product-options")
  ) {
    loadDropdowns();
  }
});

// Global function to load dropdowns from Google Sheets
async function loadDropdowns() {
  try {
    const res = await fetch(`${scriptURL}?action=getDropdownLists`);
    const data = await res.json();
    console.log('✅ Dropdowns loaded:', data);
    window.allDropdownData = data;

    const dropdownMap = {
      productTypes: 'productType',
      paymentMethods: 'paymentMethod',
      unitTypes: 'unitType',
      fractions: 'fraction'
    };

    for (const [key, elementId] of Object.entries(dropdownMap)) {
      const select = document.getElementById(elementId);
      if (select && data[key]) {
        select.innerHTML = data[key]
          .map(item => `<option value="${item.value}">${item.label}</option>`)
          .join('');
      }
    }

    const unitTypeSelect = document.getElementById('unitType');
    const unitSelect = document.getElementById('unit');

    function filterUnitsByType(unitType) {
      if (!unitSelect || !data.units) return;
      unitSelect.innerHTML = data.units
        .filter(unit => unit.unitType === unitType)
        .map(unit => `<option value="${unit.value}">${unit.label}</option>`)
        .join('');
    }

    if (unitTypeSelect && unitSelect && data.units) {
      filterUnitsByType(unitTypeSelect.value);
      unitTypeSelect.addEventListener('change', () => {
        filterUnitsByType(unitTypeSelect.value);
      });
    }

  } catch (err) {
    console.error('❌ Error loading dropdowns:', err);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('searchInput');
  if (input && document.activeElement !== input) {
    input.focus();
  }
});

document.addEventListener("keydown", function (e) {
  const isEnter = e.key === "Enter";
  const target = e.target;

  const isTextInput = ["INPUT", "SELECT"].includes(target.tagName);
  const isTextArea = target.tagName === "TEXTAREA";
  const isSubmitTrigger = isEnter && isTextInput && !isTextArea;

  if (isSubmitTrigger) {
    e.preventDefault();
  }
});

function formatDateForUser(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US");
}

function formatCurrency(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

function formatPhoneNumber(number) {
  const digits = number.replace(/\D/g, "");
  if (digits.length !== 10) return number;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

// ✅ Global version/debug check
function getResourceStatus() {
  return [
    {
      name: "Bootstrap CSS",
      loaded: !!document.querySelector('link[href*="bootstrap.min.css"]')
    },
    {
      name: "Bootstrap Icons",
      loaded: !!document.querySelector('link[href*="bootstrap-icons"]')
    },
    {
      name: "Font Awesome",
      loaded: !!document.querySelector('link[href*="font-awesome"], link[href*="fontawesome"]')
    },
    {
      name: "Custom CSS",
      loaded: !!document.querySelector('link[href*="style.css"]')
    },
    {
      name: "Bootstrap JS",
      loaded: typeof bootstrap !== "undefined"
    },
    {
      name: "FullCalendar",
      loaded: typeof window.FullCalendar !== "undefined",
      location: typeof window.FullCalendar !== "undefined" ? "✅ Global" : "❌ Not Found"
    }
  ];
}

function checkBackendVersion() {
  const versionCheckURL = `${scriptURL}?action=versionCheck`;
  const resources = [
    { name: "Bootstrap CSS", check: () => !!document.querySelector('link[href*="bootstrap.min.css"]') },
    { name: "Bootstrap Icons", check: () => !!document.querySelector('link[href*="bootstrap-icons"]') },
    { name: "Font Awesome", check: () => !!document.querySelector('link[href*="font-awesome"]') },
    { name: "Custom CSS", check: () => !!document.querySelector('link[href*="style.css"]') },
    { name: "Bootstrap JS", check: () => !!window.bootstrap },
    { name: "FullCalendar",
      status: window.FullCalendar ? "✅" : "⚠️ Not Loaded",
      location: typeof window.FullCalendar !== "undefined" ? "Global" : "Unavailable"
    }
  ];

  const updateBadge = (statusEmoji, statusText, bgClass) => {
    const badgeBtn = document.querySelector("#debugBadge button");
    if (badgeBtn) {
      badgeBtn.innerHTML = `${statusEmoji} ${statusText}`;
      badgeBtn.classList.remove("btn-outline-secondary", "btn-outline-success", "btn-outline-danger");
      badgeBtn.classList.add(bgClass);
    }
  };

  updateBadge("⏳", "Connecting", "btn-outline-secondary");

  fetch(versionCheckURL)
    .then(res => res.json())
    .then(data => {
      const resources = getResourceStatus();

      window.backendMeta = {
        status: "✅ Connected",
        scriptURL,
        isLocal,
        deployedVersion: data.deployedVersion || "N/A",
        timestamp: new Date().toISOString(),
        resources
      };

      console.log("✅ Backend Connected:", window.backendMeta);
      updateBadge("✅", "Connected", "btn-outline-black");
    })
    .catch(err => {
      window.backendMeta = {
        status: "❌ Connection failed",
        scriptURL,
        isLocal,
        error: err.message,
        timestamp: new Date().toISOString(),
        resources: resources.map(r => ({ name: r.name, loaded: r.check() }))
      };
      console.error("❌ Backend version check failed:", err);
      updateBadge("❌", "Disconnected", "btn-outline-danger");
    });
}

// 🔎 Show debug modal with version info
async function showDebugInfo() {
  const debugOutput = {
    status: "⏳ Gathering info...",
    scriptURL: window.scriptURL || "⚠️ Not set",
    deployedVersion: "Loading...",
    timestamp: new Date().toISOString(),
    currentPage: window.location.href,
    iframeSrc: document.querySelector("iframe")?.src || "N/A",
    theme: getComputedStyle(document.documentElement).getPropertyValue('--bs-body-bg')?.trim() || "Not set",
    recentErrors: window._errorLog?.slice(-5) || [],
    ...window.backendMeta // 🧠 Merge all backendMeta values (status, scriptURL, isLocal, environment, resources, etc.)
  };

  try {
    const res = await fetch(`${scriptURL}?action=versionCheck`);
    const data = await res.json();
    debugOutput.status = "✅ Connected";
    debugOutput.deployedVersion = data.deployedVersion;
    debugOutput.scriptURL = data.scriptURL || debugOutput.scriptURL;
    debugOutput.timestamp = data.timestamp;
    debugOutput.environment = data.environment;
  } catch (e) {
    debugOutput.status = "❌ Failed to connect";
    debugOutput.error = e.message;
  }

  // 🧩 Build UI content
  const statusBadge = debugOutput.status.includes("✅")
    ? `<span class="badge bg-black">${debugOutput.status}</span>`
    : `<span class="badge bg-danger">${debugOutput.status}</span>`;

  const errors = debugOutput.recentErrors.length
    ? debugOutput.recentErrors.map(e => `<li>${e}</li>`).join("")
    : "<li>None</li>";

  const resources = (debugOutput.resources || [])
    .map(r => `<tr><td>${r.name}</td><td>${r.loaded ? "✅" : "❌"}${r.location ? ` <span class="text-muted small">(${r.location})</span>` : ""}</td></tr>`)
    .join("");

  const contentHTML = `
    <div class="mb-3">
      <h6>Status ${statusBadge}</h6>
    </div>
    <div class="mb-3">
      <h6>📄 Page Info</h6>
      <ul class="list-group list-group-flush small">
        <li class="list-group-item"><strong>Current Page:</strong> ${window.location.href}</li>
        <li class="list-group-item"><strong>iFrame Src:</strong> ${debugOutput.iframeSrc}</li>
        <li class="list-group-item"><strong>Theme Color:</strong> ${debugOutput.theme}</li>
      </ul>
    </div>
    <div class="mb-3">
      <h6>🧠 Backend Info</h6>
      <ul class="list-group list-group-flush small">
        <li class="list-group-item"><strong>Script URL:</strong> ${debugOutput.scriptURL}</li>
        <li class="list-group-item"><strong>Deployed Version:</strong> ${debugOutput.deployedVersion}</li>
        <li class="list-group-item"><strong>Environment:</strong> ${debugOutput.environment}</li>
        <li class="list-group-item"><strong>isLocal:</strong> ${debugOutput.isLocal}</li>
        <li class="list-group-item"><strong>Timestamp:</strong> ${debugOutput.timestamp}</li>
      </ul>
    </div>
    <div class="mb-3">
      <h6>📦 Resources Loaded</h6>
      <table class="table table-sm table-bordered small">
        <thead class="table-black text-info">
          <tr><th>Resource</th><th>Status</th></tr>
        </thead>
        <tbody>${resources}</tbody>
      </table>
    </div>
    <div>
      <h6>⚠️ Recent Errors</h6>
      <ul class="small">${errors}</ul>
    </div>
  `;

  document.getElementById("debugData").innerHTML = contentHTML;

  const modal = new bootstrap.Modal(document.getElementById("debugModal"));
  modal.show();
}

// Automatically check version on load
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(checkBackendVersion, 3000); // delay 3 second
});

