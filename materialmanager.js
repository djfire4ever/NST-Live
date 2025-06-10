<<<<<<< HEAD
const SELECTORS = {
  saveChangesBtn: "save-changes",
  addIngredientForm: "addIngredientForm",
  editFieldsPrefix: "edit-",
  addFieldsPrefix: "add-",
  searchInput: "searchInput",
  searchResults: "searchResults",
  searchIngredientTab: '[data-bs-target="#search-ingredient"]',
  ingredientRowsContainer: "ingredientRows",
  addIngredientRowBtn: "addIngredientRowBtn"
};
const MAX_ROWS = 10;

// 🌐 Global unit conversion map
const unitConversionMap = {
  // Mass
  g: { g: 1, kg: 0.001, lb: 0.00220462, oz: 0.035274 },
  kg: { g: 1000, kg: 1, lb: 2.20462, oz: 35.274 },
  lb: { g: 453.592, kg: 0.453592, lb: 1, oz: 16 },
  oz: { g: 28.3495, kg: 0.0283495, lb: 0.0625, oz: 1 },

  // Volume
  ml: { ml: 1, l: 0.001, gal: 0.000264172 },
  l: { ml: 1000, l: 1, gal: 0.264172 },
  gal: { ml: 3785.41, l: 3.78541, gal: 1 },

  // Each
  each: { each: 1, dozen: 1 / 12 },
  dozen: { each: 12, dozen: 1 }
};

// ✅ DOMContentLoaded Entry Point
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("ingredientRows");
  const searchInput = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  const searchCounter = document.getElementById("searchCounter");
  const saveBtn = document.getElementById("save-inventory-btn");
  const addRowBtn = document.getElementById("addIngredientRowBtn");

  toggleLoader(true);
  await setAllIngredients();
  loadDropdowns();
  toggleLoader(false);

  // 🔍 SEARCH TAB
  const searchTab = document.querySelector('[data-bs-target="#search-ingredient"]');
  if (searchTab) {
    searchTab.addEventListener("shown.bs.tab", () => {
      if (searchInput && resultsBox) {
        searchInput.value = "";
        resultsBox.innerHTML = "";
        if (searchCounter) searchCounter.textContent = "";
        searchInput.focus();
      }
    });

    if (searchInput) searchInput.addEventListener("input", search);
  }

  // ➕ ADD INGREDIENT TAB
  const addTab = document.querySelector('[data-bs-target="#add-ingredient"]');
  if (addTab) {
    addTab.addEventListener("shown.bs.tab", () => {
      const prefix = "add-";
      const fieldsToBind = [
        "packagePrice",
        "packageQtyNum",
        "packageQtyUnit",
        "baseUnit",
        "baseQty",
      ];

      fieldsToBind.forEach(id => {
        const el = document.getElementById(prefix + id);
        if (el && !el.dataset.bound) {
          el.addEventListener("input", () => calculateAllStaticForm(prefix));
          el.dataset.bound = "true";
        }
      });

      // Set lastUpdated date
      const updated = document.getElementById(prefix + "lastUpdated");
      if (updated) updated.value = formatDateForUser(new Date());

      // Initial calculation on tab show
      calculateAllStaticForm(prefix);
    });
  }

  // ✏️ EDIT INGREDIENT TAB
  const editTab = document.querySelector('[data-bs-target="#edit-ingredient"]');
  if (editTab) {
    editTab.addEventListener("shown.bs.tab", () => {
      const prefix = "edit-";
      const fieldsToBind = [
        "packagePrice",
        "packageQtyNum", // fallback to "packageQty" if "packageQtyNum" not found below
        "packageQtyUnit",
        "baseUnit",
        "baseQty",
      ];

      // Special fallback for packageQtyNum/packageQty:
      const packageQtyNumEl = document.getElementById(prefix + "packageQtyNum");
      if (!packageQtyNumEl) {
        const packageQtyEl = document.getElementById(prefix + "packageQty");
        if (packageQtyEl && !packageQtyEl.dataset.bound) {
          packageQtyEl.addEventListener("change", () => calculateAllStaticForm(prefix));
          packageQtyEl.dataset.bound = "true";
        }
      }

      fieldsToBind.forEach(id => {
        // Skip packageQtyNum because we handled fallback above
        if (id === "packageQtyNum") return;

        const el = document.getElementById(prefix + id);
        if (el && !el.dataset.bound) {
          el.addEventListener("change", () => calculateAllStaticForm(prefix));
          el.dataset.bound = "true";
        }
      });

      // Set lastUpdated date
      const updated = document.getElementById(prefix + "lastUpdated");
      if (updated) updated.value = formatDateForUser(new Date());

      // Initial calculation on tab show
      calculateAllStaticForm(prefix);
    });
  }

  // 📦 ADD INVENTORY TAB
  const addInvTab = document.querySelector('[data-bs-target="#add-inventory"]');
  if (addInvTab) {
    addInvTab.addEventListener("shown.bs.tab", () => {
      if (!container) return;

      let firstRow = container.querySelector(".ingredient-row");
      if (!firstRow) {
        addIngredientRow(container);
        firstRow = container.querySelector(".ingredient-row");
      }

      if (firstRow) {
        initializeIngredientRow(firstRow);
      }

      if (addRowBtn && !addRowBtn.dataset.bound) {
        addRowBtn.addEventListener("click", () => addIngredientRow(container));
        addRowBtn.dataset.bound = "true";
      }

      loadDropdowns();
    });
  }

  // 💾 SAVE
  if (saveBtn) {
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      saveInventoryData();
    });
  }

  // 🧠 DELEGATE: inventory container actions
  if (container) {
    container.addEventListener("click", (e) => {
      const target = e.target;
      if (target.classList.contains("add-inventory-btn")) {
        addIngredientRow(container);
      } else if (target.classList.contains("remove-ingredient-row")) {
        removeIngredientRow(target, container);
      }
    });

    container.addEventListener("change", (e) => {
      const target = e.target;
      if (target.classList.contains("inv-ingredient")) {
        const row = target.closest(".ingredient-row");
        const name = target.value.trim();
        const match = ingredientData.find(m => m[1]?.trim() === name);

        if (!row || !match) {
          showToast(`No match for "${name}"`, "warning");
          return;
        }

        populateIngredientData(row, match);
      }
    });
  }
});

// ✅ Handle Edit & Delete buttons from Search Results Table
document.getElementById("searchResults")?.addEventListener("click", (event) => {
  const row = event.target.closest(".search-result-row");

  if (row) {
    const ingredientID = row.dataset.ingredientid;
    if (!ingredientID) return showToast("❌ Ingredient ID missing", "error");

    populateEditForm(ingredientID);
    bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#edit-ingredient"]')).show();
    return;
  }

  const btn = event.target;
  const ingredientID = btn.dataset.ingredientid?.trim();

  if (btn.classList.contains("before-delete-button")) {
    const isDelete = btn.dataset.buttonState === "delete";
    btn.previousElementSibling.classList.toggle("d-none", !isDelete);
    btn.textContent = isDelete ? "Cancel" : "Delete";
    btn.dataset.buttonState = isDelete ? "cancel" : "delete";
  }

  if (btn.classList.contains("delete-button") && ingredientID) {
    toggleLoader(true);
    fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "ingredients", action: "delete", ingredientID })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          showToast("✅ Ingredient deleted!", "success");
          document.getElementById("searchInput").value = "";
          document.getElementById("searchResults").innerHTML = "";
          setAllIngredients();
        } else {
          showToast("⚠️ Could not delete ingredient.", "error");
        }
      })
      .catch(() => showToast("⚠️ Error occurred while deleting ingredient.", "error"))
      .finally(() => toggleLoader(false));
  }
});

// ✅ Search Function
function search() {
  const inputEl = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  const query = inputEl.value.toLowerCase().trim();

  // Ensure counter container exists next to input
  let counterContainer = document.getElementById("counterContainer");
  if (!counterContainer) {
    counterContainer = document.createElement("div");
    counterContainer.id = "counterContainer";
    counterContainer.className = "d-inline-flex gap-3 align-items-center ms-3";
    inputEl.insertAdjacentElement("afterend", counterContainer);
  }

  // Helper to get or create individual counters
  const getOrCreateCounter = (id, text = "") => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("span");
      el.id = id;
      el.className = "px-2 py-1 border rounded fw-bold bg-dark text-info";
      el.textContent = text;
      counterContainer.appendChild(el);
    }
    return el;
  };

  const searchCounter = getOrCreateCounter("searchCounter");
  const totalCounter = getOrCreateCounter("totalCounter");

  toggleLoader(true);

  const words = query.split(/\s+/);
  const columns = [0, 1, 2, 3, 4, 5, 6]; // Columns to search in your ingredientData rows

  // Filter ingredientData based on all words matching at least one of the specified columns
  const keysToSearch = ["ingredientID", "ingredientName", "packagePrice", "supplier", "onHand"];

  const results = query === "" ? [] : ingredientData.filter(row =>
    words.every(word =>
      keysToSearch.some(key =>
        row[key]?.toString().toLowerCase().includes(word)
      )
    )
  );

  // Update counters
  searchCounter.textContent = query === "" ? "🔍" : `${results.length} Ingredients Found`;
  totalCounter.textContent = `Total Ingredients: ${ingredientData.length}`;

  // Render search results
  resultsBox.innerHTML = "";
  const template = document.getElementById("rowTemplate").content;

  results.forEach(r => {
    const row = template.cloneNode(true);
    const tr = row.querySelector("tr");

    tr.classList.add("search-result-row");
    tr.dataset.ingredientid = r.ingredientID;
    tr.querySelector(".ingredientID").textContent = r.ingredientID;
    tr.querySelector(".ingredientName").textContent = r.ingredientName;
    tr.querySelector(".supplier").textContent = r.supplier;
    tr.querySelector(".packagePrice").textContent = r.packagePrice;
    tr.querySelector(".onHand").textContent = r.onHand;

    resultsBox.appendChild(row);
  });

  toggleLoader(false);
}

// ✅ Fetch and Store Ingredient Data
async function setAllIngredients() {
  try {
    const res = await fetch(`${scriptURL}?action=getAllIngredients`);
    const data = await res.json();

    if (Array.isArray(data)) {
      ingredientData = data.slice(); // ✅ update global cache
    } else {
      console.warn("⚠️ Expected an array but got:", data);
      ingredientData = []; // Fallback to avoid errors downstream
    }
  } catch (err) {
    console.error("❌ Error loading ingredient data:", err);
  }
}

// Auto-calculate unit price for any form
function calculateAllStaticForm(prefix) { 
  const get = id => {
    const raw = document.getElementById(`${prefix}${id}`)?.value || "";
    return parseFloat(raw.replace(/[^0-9.-]+/g, "")) || 0;
  };

  const price = get("packagePrice");
  const qtyNum = get("packageQtyNum");
  const baseQty = get("baseQty");

  const unit = document.getElementById(`${prefix}packageQtyUnit`)?.value;
  const baseUnit = document.getElementById(`${prefix}baseUnit`)?.value;
  const unitPriceEl = document.getElementById(`${prefix}unitPrice`);

  if (!unit || !baseUnit || !unitConversionMap[unit] || !unitConversionMap[unit][baseUnit]) {
    if (unitPriceEl) unitPriceEl.value = "";
    return;
  }

  // Convert package quantity to base unit count
  const convertedQtyNum = qtyNum * unitConversionMap[unit][baseUnit];
  
  // Use either converted quantity OR baseQty for total base units, depending on your data meaning:
  // Option A: total base units = qtyNum * baseQty (if baseQty is units per package)
  const totalBaseQty = qtyNum * baseQty;

  // Option B (if you want to use conversion only)
  // const totalBaseQty = convertedQtyNum;

  const unitPrice = totalBaseQty ? price / totalBaseQty : 0;

  if (unitPriceEl) unitPriceEl.value = unitPrice.toFixed(4);
}

// Populate Edit Form
async function populateEditForm(ingredientID) {
  const idField = document.getElementById(`${SELECTORS.editFieldsPrefix}ingredientID`);
  if (!idField) {
    console.warn("Edit ingredientID field missing");
    return;
  }

  // Set ID fields
  idField.value = ingredientID;
  idField.removeAttribute("readonly");
  const hiddenId = document.getElementById("edit-ingredient-id");
  if (hiddenId) hiddenId.value = ingredientID;

  loadDropdowns(); // populate unit dropdowns
  toggleLoader(true);

  try {
    const response = await fetch(`${scriptURL}?system=ingredients&action=getIngredientById&ingredientID=${encodeURIComponent(ingredientID)}`);
    console.log("↩️ Raw response text:", await response.clone().text());

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Invalid JSON in response");
    }

    if (!data || typeof data !== "object") throw new Error("No data returned from server");
    if (data.error) throw new Error(data.error);

    // Fields to populate (excluding dropdowns for now)
    const fields = [
      "ingredientName", "packagePrice", "baseUnit", "packageQtyNum",
      "supplier", "supplierUrl", "unitPrice", "onHand",
      "incoming", "lastUpdated", "reorderLevel", "baseQty"
    ];

    fields.forEach(field => {
      const el = document.getElementById(`${SELECTORS.editFieldsPrefix}${field}`);
      if (!el) return;
      el.value = (field === "lastUpdated")
        ? formatDateForUser(data[field])
        : (data[field] != null ? String(data[field]).trim() : "");
    });

    // ✅ Set dropdown values *after* options are populated
    const unitDropdown = document.getElementById(`${SELECTORS.editFieldsPrefix}packageQtyUnit`);
    if (unitDropdown && data.packageQtyUnit) {
      unitDropdown.value = data.packageQtyUnit;
      if (!Array.from(unitDropdown.options).some(opt => opt.value === data.packageQtyUnit)) {
        unitDropdown.value = ""; // fallback if invalid
      }
    }

    calculateAllStaticForm(SELECTORS.editFieldsPrefix);

    // One-time bindings
    const bindableIds = ["packagePrice", "packageQtyNum", "packageQtyUnit", "baseUnit", "baseQty"];
    bindableIds.forEach(id => {
      const el = document.getElementById(`${SELECTORS.editFieldsPrefix}${id}`);
      if (el && !el.dataset.bound) {
        el.addEventListener("change", () => calculateAllStaticForm(SELECTORS.editFieldsPrefix));
        el.dataset.bound = "true";
      }
    });

  } catch (err) {
    console.error("❌ Error fetching ingredient:", err);
    showToast("❌ Error loading ingredient data!", "error");
  } finally {
    toggleLoader(false);
  }
}

// Save changes from Edit Form
document.getElementById(SELECTORS.saveChangesBtn)?.addEventListener("click", async (e) => {
  e.preventDefault();

  const ingredientID = document.getElementById(`${SELECTORS.editFieldsPrefix}ingredientID`)?.value.trim();
  if (!ingredientID) {
    showToast("❌ Ingredient ID is missing.", "error");
    return;
  }

  const now = new Date();
  const lastUpdatedEl = document.getElementById(`${SELECTORS.editFieldsPrefix}lastUpdated`);
  if (lastUpdatedEl) lastUpdatedEl.value = formatDateForUser(now); // UI only

  const fields = [
    "ingredientName", "packagePrice", "baseUnit", "packageQtyNum", "packageQtyUnit",
    "supplier", "supplierUrl", "baseQty", "unitPrice", "onHand",
    "incoming", "lastUpdated", "reorderLevel"
  ];

  const ingredientInfo = {};
  for (const field of fields) {
    const el = document.getElementById(`${SELECTORS.editFieldsPrefix}${field}`);
    ingredientInfo[field] = field === "lastUpdated" ? now : (el?.value.trim() || "");
  }

  toggleLoader(true);
  console.log("Saving ingredientInfo:", ingredientInfo);
  try {
    const response = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "ingredients", action: "update", ingredientID, updates: ingredientInfo })
    });

    const result = await response.json();

    if (result.success) {
      showToast("✅ Ingredient updated successfully!", "success");

      // Clear search input/results
      const searchInput = document.getElementById(SELECTORS.searchInput);
      const searchResults = document.getElementById(SELECTORS.searchResults);
      if (searchInput) searchInput.value = "";
      if (searchResults) searchResults.innerHTML = "";

      // Refresh ingredient data
      await setAllIngredients();

      // Switch to search tab
      const searchTabEl = document.querySelector(SELECTORS.searchIngredientTab);
      if (searchTabEl) {
        bootstrap.Tab.getOrCreateInstance(searchTabEl).show();
      }
    } else {
      showToast("❌ Error updating ingredient data!", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("❌ Error updating ingredient data!", "error");
  } finally {
    toggleLoader(false);
  }
});

// Add Ingredient Form submission handler
document.getElementById(SELECTORS.addIngredientForm)?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fields = [
    "ingredientName", "packagePrice", "baseUnit", "packageQtyNum", "packageQtyUnit",
    "supplier", "supplierUrl", "baseQty", "unitPrice", "onHand",
    "incoming", "lastUpdated", "reorderLevel"
  ];

  const ingredientInfo = {};
  for (const field of fields) {
    const el = document.getElementById(`${SELECTORS.addFieldsPrefix}${field}`);
    ingredientInfo[field] = el?.value.trim() || "";
  }

  toggleLoader(true);
  console.log("Saving ingredientInfo:", ingredientInfo);

  try {
    const response = await fetch(`${scriptURL}?action=add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "ingredients", action: "add", ingredientInfo })
    });

    const result = await response.json();

    if (result.success) {
      showToast("✅ Ingredient added successfully!", "success");

      // Reset form
      document.getElementById(SELECTORS.addIngredientForm).reset();

      // Refresh search data
      await setAllIngredients();

      // Switch to search tab
      const searchTabEl = document.querySelector(SELECTORS.searchIngredientTab);
      if (searchTabEl) bootstrap.Tab.getOrCreateInstance(searchTabEl).show();

    } else {
      showToast("❌ Error adding ingredient.", "error");
      console.error(result);
    }
  } catch (error) {
    console.error("Fetch error:", error);
    showToast("❌ Error adding ingredient.", "error");
  } finally {
    toggleLoader(false);
  }
});

const unitOptions = ["g", "kg", "lb", "oz", "ml", "l", "gal", "each", "dozen"];

function loadDropdowns() {
  [
    "add-packageQtyUnit",
    "add-baseUnit",
    "edit-packageQtyUnit",
    "edit-baseUnit",
  ].forEach(id => {
    const select = document.getElementById(id);
    if (select && select.children.length === 0) {
      unitOptions.forEach(unit => {
        const opt = document.createElement("option");
        opt.value = unit;
        opt.textContent = unit;
        select.appendChild(opt);
      });
    }
  });
}


// Functions that may be needed in the future
function checkLowStock(prefix = "edit-") {
  const total = parseFloat(document.getElementById(`${prefix}totalStock`)?.value) || 0;
  const reorder = parseFloat(document.getElementById(`${prefix}reorderLevel`)?.value) || 0;
  const alert = document.getElementById("reorderAlert");
  if (alert) alert.classList.toggle("d-none", total >= reorder);
}

// 🔄 Add Inventory Part Row Logic
function initializeIngredientRow(row) {
  const nameInput = row.querySelector(".inv-ingredient");
  const priceInput = row.querySelector(".inv-packagePrice");
  const qtyInput = row.querySelector(".inv-packageQty");
  const unitPriceOutput = row.querySelector(".inv-unitPrice");
  const onHandInput = row.querySelector(".inv-onHand");
  const removeBtn = row.querySelector(".remove-ingredient-row");

  if (!nameInput || !priceInput || !qtyInput || !unitPriceOutput || !onHandInput || !removeBtn) {
    console.warn("⚠️ Missing expected elements in ingredient row.");
    return;
  }

  const recalculate = () => {
    const rawPrice = priceInput.value.replace(/[^0-9.-]+/g, "");
    const rawQty = qtyInput.value.replace(/[^0-9.-]+/g, "");
    const price = parseFloat(rawPrice) || 0;
    const qty = parseFloat(rawQty) || 0;
    const unitPrice = qty ? price / qty : 0;
    unitPriceOutput.value = formatCurrency(unitPrice);

    // Update onHand: originalOnHand + packageQty
    const originalOnHand = parseFloat(onHandInput.dataset.original || "0");
    const newOnHand = originalOnHand + qty;
    onHandInput.value = newOnHand;
  };

  nameInput.addEventListener("change", () => {
    const name = nameInput.value.trim();
    const match = ingredientData.find(m => m[1].trim() === name);
    if (!match) {
      showToast(`No match found for "${name}"`, "warning");
      return;
    }
    populateIngredientData(row, match);
    recalculate();
  });

  priceInput.addEventListener("change", recalculate);
  qtyInput.addEventListener("change", recalculate);

  removeBtn.addEventListener("click", () => {
    const container = row.parentElement;
    if (!container) return;
    const allRows = container.querySelectorAll(".ingredient-row");
    if (allRows.length <= 1) {
      showToast("⚠️ At least one row must remain.", "info");
      return;
    }
    row.remove();
  });
}

// ➕ Add new ingredient row
function addIngredientRow(container) {
  if (!container) {
    console.warn("⚠️ addIngredientRow: Missing container.");
    return;
  }

  const rows = container.querySelectorAll(".ingredient-row");
  if (typeof MAX_ROWS !== "undefined" && rows.length >= MAX_ROWS) {
    showToast(`🚫 Max ${MAX_ROWS} ingredients allowed.`, "warning");
    return;
  }

  const template = rows[0];
  if (!template) {
    console.warn("⚠️ addIngredientRow: No template row found.");
    return;
  }

  const newRow = template.cloneNode(true);
  newRow.querySelectorAll("change").forEach(input => (input.value = ""));

  const lastUpdatedInput = newRow.querySelector(".inv-lastUpdated");
  if (lastUpdatedInput) {
    lastUpdatedInput.value = formatDateForUser(new Date());
  }

  container.appendChild(newRow);
  initializeIngredientRow(newRow);
}

// 📥 Populate a row with matched ingredient data
function populateIngredientData(row, data) {
  if (!row || !Array.isArray(data)) return;

  const map = {
    "inv-ingredientID": 0,
    "inv-ingredientName": 1,
    "inv-supplier": 2,
    "inv-supplierUrl": 3,
    "inv-packagePrice": 4,
    "inv-packageQty": 5,
    "inv-baseUnit": 6,
    "inv-baseQty": 7,
    "inv-unitPrice": 8,
    "inv-reorderLevelonHand": 9,
    "inv-incoming": 10,
    // Index 11 = "outgoing" (skipped)
    "inv-lastUpdated": 12
  };

  Object.entries(map).forEach(([className, index]) => {
    const el = row.querySelector(`.${className}`);
    if (!el) return;

    let value = data[index];

    // Set raw value first (for input fields or calculations)
    el.value = value ?? "";

    // Format currency fields visually after raw set
    if (["inv-packagePrice", "inv-unitPrice"].includes(className)) {
      const numeric = parseFloat(value?.replace(/[^0-9.-]+/g, "")) || 0;
      el.value = formatCurrency(numeric);
    }

    // Format lastUpdated date; fallback to today if empty or invalid
    if (className === "inv-lastUpdated") {
      if (value && !isNaN(new Date(value).getTime())) {
        el.value = formatDateForUser(value);
      } else {
        el.value = formatDateForUser(new Date());
      }
    }
  });

  // Store original onHand value for calculations later
  const onHand = row.querySelector(".inv-onHand");
  if (onHand) {
    onHand.dataset.original = data[8] ?? "0";
  }
}

// Global ingredient dataset (cached)
let ingredientData = [];

// Load dropdowns for both add/edit forms
async function loadIngredientDropdowns(prefix) {
  const dropdowns = await fetchDropdownLists();
  const units = dropdowns.units || [];

  populateSelect(document.getElementById(`${prefix}packageQtyUnit`), units);
  populateSelect(document.getElementById(`${prefix}baseUnit`), units);
}

// Save All Inventory Rows function
async function saveInventoryData() {
  console.log("📝 Saving inventory data...");

  const rows = document.querySelectorAll(".ingredient-row");
  console.log(`Found ${rows.length} rows.`);

  if (rows.length === 0) {
    showToast("⚠️ No inventory rows to save.", "warning");
    return;
  }

  toggleLoader(true);

  for (const row of rows) {
    const ingredientID = row.querySelector(".inv-ingredientID")?.value.trim();
    if (!ingredientID) {
      console.warn("⏭️ Skipping row without ingredientID.");
      continue;
    }

    const ingredientName = row.querySelector(".inv-ingredientName")?.value.trim() || ingredientID;
    const packageQty = parseFloat(row.querySelector(".inv-packageQty")?.value.trim() || "0");
    const rawPrice = row.querySelector(".inv-packagePrice")?.value.trim() || "0";
    const packagePrice = parseFloat(rawPrice.replace(/[^\d.]/g, ""));

    const onHandField = row.querySelector(".inv-onHand");
    const originalOnHand = parseFloat(onHandField?.dataset.original || "0");
    const newOnHand = originalOnHand + packageQty;
    if (onHandField) onHandField.value = newOnHand;

    const incomingInput = row.querySelector(".inv-incoming");
    if (incomingInput) incomingInput.value = packageQty;

    const ingredientInfo = {
      ingredientName,
      packagePrice,
      baseUnit: row.querySelector(".inv-baseUnit")?.value.trim() || "",
      packageQty,
      supplier: row.querySelector(".inv-supplier")?.value.trim() || "",
      supplierUrl: row.querySelector(".inv-supplierUrl")?.value.trim() || "",
      unitPrice: row.querySelector(".inv-unitPrice")?.value.trim() || "",
      incoming: packageQty,
      onHand: newOnHand,
      reorderLevel: row.querySelector(".inv-reorderLevel")?.value.trim() || "",
      lastUpdated: new Date()
    };

    try {
      const res = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "ingredients",
          action: "edit",
          ingredientID,
          ingredientInfo
        })
      });

      const result = await res.json();
      console.log(`✅ Result for ${ingredientName}:`, result);

      if (result.success) {
        showToast(`✅ Saved ${ingredientName}`, "success");
      } else {
        showToast(`❌ Failed to save ${ingredientName}`, "error");
      }
    } catch (err) {
      console.error(`❌ Error saving ${ingredientName}:`, err);
      showToast(`❌ Error saving ${ingredientName}`, "error");
    }
  }

  toggleLoader(false);

  // ✅ Reset the form and clear all inventory rows
  const form = document.getElementById(SELECTORS.addIngredientForm);
  if (form) form.reset();

  const container = document.getElementById("ingredientRows");
  if (container) container.innerHTML = ""; // Clear all ingredient rows from inventory

  // ✅ Switch to the Search tab via Bootstrap 5 API
  const searchTabBtn = document.querySelector('[data-bs-target="#search-ingredient"]');
  if (searchTabBtn) {
    const tabInstance = bootstrap.Tab.getInstance(searchTabBtn) || new bootstrap.Tab(searchTabBtn);
    tabInstance.show();
  }
}


=======
const SELECTORS = {
  saveChangesBtn: "save-changes",
  addMaterialForm: "addMaterialForm",
  editFieldsPrefix: "edit-",
  addFieldsPrefix: "add-",
  searchInput: "searchInput",
  searchResults: "searchResults",
  searchMaterialTab: '[data-bs-target="#search-material"]',
  materialRowsContainer: "materialRowsContainer",
  addMaterialRowBtn: "addMaterialRowBtn"
};
const MAX_ROWS = 10;

// ✅ DOMContentLoaded Entry Point
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("materialRows");
  const searchInput = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  const searchCounter = document.getElementById("searchCounter");
  const saveBtn = document.getElementById("save-inventory-btn");
  const addRowBtn = document.getElementById("addMaterialRowBtn");

  // 🔄 Load material data and dropdowns
  toggleLoader(true);
  await setMatDataForSearch();
  loadDropdowns();
  toggleLoader(false);

  // 🔍 SEARCH TAB: Reset input/results when tab shown
  const searchTab = document.querySelector('[data-bs-target="#search-material"]');
  if (searchTab) {
    searchTab.addEventListener("shown.bs.tab", () => {
      if (searchInput && resultsBox) {
        searchInput.value = "";
        resultsBox.innerHTML = "";
        if (searchCounter) searchCounter.textContent = "";
        searchInput.focus();
      }
    });

    if (searchInput) {
      searchInput.addEventListener("input", search);
    }
  }

  // ➕ ADD MATERIAL TAB: Auto-calculate unit price
  const addMatTab = document.querySelector('[data-bs-target="#add-material"]');
  if (addMatTab) {
    addMatTab.addEventListener("shown.bs.tab", () => {
      const priceInput = document.querySelector("#add-matPrice");
      const qtyInput = document.querySelector("#add-unitQty");
      const unitInput = document.querySelector("#add-unitPrice");
      const lastUpdated = document.getElementById("add-lastUpdated");

      if (lastUpdated) {
        lastUpdated.value = formatDateForUser(new Date());
      }

      if (priceInput && qtyInput && unitInput) {
        const recalculate = () => {
        const price = parseFloat(priceInput.value.replace(/[^0-9.-]+/g, "")) || 0;
        const qty = parseFloat(qtyInput.value.replace(/[^0-9.-]+/g, "")) || 0;
        const unit = qty ? price / qty : 0;
        unitInput.value = formatCurrency(unit);
        };

        priceInput.addEventListener("change", recalculate);
        qtyInput.addEventListener("change", recalculate);
      }
    });
  }

  // 📦 ADD INVENTORY TAB: Initialize first row and bind add button
  const addInvTab = document.querySelector('[data-bs-target="#add-inventory"]');
  if (addInvTab) {
    addInvTab.addEventListener("shown.bs.tab", () => {
      if (!container) return;

      let firstRow = container.querySelector(".material-row");
      if (!firstRow) {
        addMaterialRow(container);
        firstRow = container.querySelector(".material-row");
      }

      if (firstRow) {
        initializeMaterialRow(firstRow);
      }

      if (addRowBtn && !addRowBtn.dataset.bound) {
        addRowBtn.addEventListener("click", () => addMaterialRow(container));
        addRowBtn.dataset.bound = "true";
      }

      loadDropdowns();
    });
  }

  // 💾 SAVE: Trigger inventory save
  if (saveBtn) {
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      saveInventoryData();
    });
  }

  // 🧠 DELEGATE: Handle clicks and changes inside inventory container
  if (container) {
    container.addEventListener("click", (e) => {
      const target = e.target;
      if (target.classList.contains("add-inventory-btn")) {
        addMaterialRow(container);
      } else if (target.classList.contains("remove-material-row")) {
        removeMaterialRow(target, container);
      }
    });

    container.addEventListener("change", (e) => {
      const target = e.target;
      if (target.classList.contains("inv-material")) {
        const row = target.closest(".material-row");
        const name = target.value.trim();
        const match = materialData.find(m => m[1]?.trim() === name);

        if (!row || !match) {
          showToast(`No match for "${name}"`, "warning");
          return;
        }

        populateMaterialData(row, match);
      }
    });
  }

  // ✏️ EDIT MATERIAL FORM: Recalculate on input
  const editPrice = document.getElementById("edit-matPrice");
  const editQty = document.getElementById("edit-unitQty");

  if (editPrice && editQty) {
    [editPrice, editQty].forEach(input =>
      input.addEventListener("change", () => calculateAllStaticForm("edit-"))
    );
  }
});

// ✅ Handle Edit & Delete buttons from Search Results Table
document.getElementById("searchResults")?.addEventListener("click", (event) => {
  const row = event.target.closest(".search-result-row");

  if (row) {
    const matID = row.dataset.materialid;
    if (!matID) return showToast("❌ Material ID missing", "error");

    populateEditForm(matID);
    bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#edit-material"]')).show();
    return;
  }

  const btn = event.target;
  const matID = btn.dataset.materialid?.trim();

  if (btn.classList.contains("before-delete-button")) {
    const isDelete = btn.dataset.buttonState === "delete";
    btn.previousElementSibling.classList.toggle("d-none", !isDelete);
    btn.textContent = isDelete ? "Cancel" : "Delete";
    btn.dataset.buttonState = isDelete ? "cancel" : "delete";
  }

  if (btn.classList.contains("delete-button") && matID) {
    toggleLoader(true);
    fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "materials", action: "delete", matID })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          showToast("✅ Material deleted!", "success");
          document.getElementById("searchInput").value = "";
          document.getElementById("searchResults").innerHTML = "";
          setMatDataForSearch();
        } else {
          showToast("⚠️ Could not delete material.", "error");
        }
      })
      .catch(() => showToast("⚠️ Error occurred while deleting material.", "error"))
      .finally(() => toggleLoader(false));
  }
});

// ✅ Search Function
function search() {
  const inputEl = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  const query = inputEl.value.toLowerCase().trim();

  // Ensure counter container exists next to input
  let counterContainer = document.getElementById("counterContainer");
  if (!counterContainer) {
    counterContainer = document.createElement("div");
    counterContainer.id = "counterContainer";
    counterContainer.className = "d-inline-flex gap-3 align-items-center ms-3";
    inputEl.insertAdjacentElement("afterend", counterContainer);
  }

  // Helper to get or create individual counters
  const getOrCreateCounter = (id, text = "") => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("span");
      el.id = id;
      el.className = "px-2 py-1 border rounded fw-bold bg-dark text-info";
      el.textContent = text;
      counterContainer.appendChild(el);
    }
    return el;
  };

  const searchCounter = getOrCreateCounter("searchCounter");
  const totalCounter = getOrCreateCounter("totalCounter");

  toggleLoader(true);

  const words = query.split(/\s+/);
  const columns = [0, 1, 2, 3, 4, 5, 6]; // Columns to search in your materialData rows

  // Filter materialData based on all words matching at least one of the specified columns
  const results = query === "" ? [] : materialData.filter(row =>
    words.every(word =>
      columns.some(i => row[i]?.toString().toLowerCase().includes(word))
    )
  );

  // Update counters
  searchCounter.textContent = query === "" ? "🔍" : `${results.length} Materials Found`;
  totalCounter.textContent = `Total Materials: ${materialData.length}`;

  // Render search results
  resultsBox.innerHTML = "";
  const template = document.getElementById("rowTemplate").content;

  results.forEach(r => {
    const row = template.cloneNode(true);
    const tr = row.querySelector("tr");

    tr.classList.add("search-result-row");
    tr.dataset.materialid = r[0];
    tr.querySelector(".matID").textContent = r[0];
    tr.querySelector(".matName").textContent = r[1];
    tr.querySelector(".matPrice").textContent = r[2];
    tr.querySelector(".supplier").textContent = r[5];

    resultsBox.appendChild(row);
  });

  toggleLoader(false);
}

// Global material dataset (cached)
let materialData = [];

// ✅ Fetch and Store Material Data
async function setMatDataForSearch() {
  try {
    const res = await fetch(`${scriptURL}?action=getMatDataForSearch`);
    const data = await res.json();

    if (Array.isArray(data)) {
      materialData = data.slice(); // ✅ update global cache
    } else {
      console.warn("⚠️ Expected an array but got:", data);
      materialData = []; // Fallback to avoid errors downstream
    }
  } catch (err) {
    console.error("❌ Error loading material data:", err);
  }
}

// Populate Edit Form
async function populateEditForm(matID) {
  const matIDField = document.getElementById(`${SELECTORS.editFieldsPrefix}matID`);
  if (!matIDField) {
    console.warn("Edit matID field missing");
    return;
  }

  matIDField.value = matID;
  matIDField.removeAttribute("readonly");

  const editMaterialId = document.getElementById("edit-material-id");
  if (editMaterialId) editMaterialId.value = matID;

  loadDropdowns(); // keep if dropdowns need refreshing
  toggleLoader(true);

  try {
    const res = await fetch(`${scriptURL}?action=getMaterialById&matID=${encodeURIComponent(matID)}`);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    const fields = [
      "matName", "matPrice", "unitType", "unitQty",
      "supplier", "supplierUrl", "unitPrice", "onHand",
      "incoming", "lastUpdated", "reorderLevel" // add if needed - "outgoing",
    ];

    fields.forEach(field => {
      const el = document.getElementById(`${SELECTORS.editFieldsPrefix}${field}`);
      if (!el) return;

      if (field === "lastUpdated") {
        el.value = formatDateForUser(data[field]);
      } else {
        el.value = data[field] != null ? String(data[field]).trim() : "";
      }
    });

    // Add input listeners for live calculation
    ["matPrice", "unitQty"].forEach(id => {
      const input = document.getElementById(`${SELECTORS.editFieldsPrefix}${id}`);
      if (input) {
        input.removeEventListener("input", calculateAllStaticForm);
        input.addEventListener("input", calculateAllStaticForm);
      }
    });

    calculateAllStaticForm();

  } catch (err) {
    console.error("❌ Error fetching material:", err);
    showToast("❌ Error loading material data!", "error");
  } finally {
    toggleLoader(false);
  }
}

// Save changes from Edit Form
document.getElementById(SELECTORS.saveChangesBtn)?.addEventListener("click", async (e) => {
  e.preventDefault();

  const matID = document.getElementById(`${SELECTORS.editFieldsPrefix}matID`)?.value.trim();
  if (!matID) {
    showToast("❌ Material ID is missing.", "error");
    return;
  }

  const now = new Date();
  const lastUpdatedEl = document.getElementById(`${SELECTORS.editFieldsPrefix}lastUpdated`);
  if (lastUpdatedEl) lastUpdatedEl.value = formatDateForUser(now); // UI only

  const fields = [
    "matName", "matPrice", "unitType", "unitQty", "supplier", "supplierUrl",
    "onHand", "unitPrice", "incoming", "lastUpdated", "reorderLevel"  // add if needed - "outgoing",
  ];

  const materialInfo = {};
  for (const field of fields) {
    const el = document.getElementById(`${SELECTORS.editFieldsPrefix}${field}`);
    materialInfo[field] = field === "lastUpdated" ? now : (el?.value.trim() || "");
  }

  toggleLoader(true);

  try {
    const response = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "materials", action: "edit", matID, materialInfo })
    });

    const result = await response.json();

    if (result.success) {
      showToast("✅ Material updated successfully!", "success");

      // Clear search input/results
      const searchInput = document.getElementById(SELECTORS.searchInput);
      const searchResults = document.getElementById(SELECTORS.searchResults);
      if (searchInput) searchInput.value = "";
      if (searchResults) searchResults.innerHTML = "";

      // Refresh material data
      await setMatDataForSearch();

      // Switch to search tab
      const searchTabEl = document.querySelector(SELECTORS.searchMaterialTab);
      if (searchTabEl) {
        bootstrap.Tab.getOrCreateInstance(searchTabEl).show();
      }
    } else {
      showToast("❌ Error updating material data!", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("❌ Error updating material data!", "error");
  } finally {
    toggleLoader(false);
  }
});

// Add Material Form submission handler
document.getElementById(SELECTORS.addMaterialForm)?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fields = [
    "matName", "matPrice", "unitType", "unitQty", "supplier",
    "lastUpdated", "supplierUrl", "unitPrice", "onHand", "reorderLevel"
  ];

  const materialInfo = {};
  for (const field of fields) {
    const el = document.getElementById(`${SELECTORS.addFieldsPrefix}${field}`);
    materialInfo[field] = el?.value.trim() || "";
  }

  toggleLoader(true);

  try {
    const response = await fetch(`${scriptURL}?action=add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "materials", action: "add", materialInfo })
    });

    const result = await response.json();

    if (result.success) {
      showToast("✅ Material added successfully!", "success");

      // Reset form
      document.getElementById(SELECTORS.addMaterialForm).reset();

      // Refresh search data
      await setMatDataForSearch();

      // Switch to search tab
      const searchTabEl = document.querySelector(SELECTORS.searchMaterialTab);
      if (searchTabEl) bootstrap.Tab.getOrCreateInstance(searchTabEl).show();

    } else {
      showToast("❌ Error adding material.", "error");
      console.error(result);
    }
  } catch (error) {
    console.error("Fetch error:", error);
    showToast("❌ Error adding material.", "error");
  } finally {
    toggleLoader(false);
  }
});

// Save All Inventory Rows function
async function saveInventoryData() {
  console.log("📝 Saving inventory data...");

  const rows = document.querySelectorAll(".material-row");
  console.log(`Found ${rows.length} rows.`);

  if (rows.length === 0) {
    showToast("⚠️ No inventory rows to save.", "warning");
    return;
  }

  toggleLoader(true);

  for (const row of rows) {
    const matID = row.querySelector(".inv-matID")?.value.trim();
    if (!matID) {
      console.warn("⏭️ Skipping row without matID.");
      continue;
    }

    const matName = row.querySelector(".inv-matName")?.value.trim() || matID;
    const unitQty = parseFloat(row.querySelector(".inv-unitQty")?.value.trim() || "0");
    const rawPrice = row.querySelector(".inv-matPrice")?.value.trim() || "0";
    const matPrice = parseFloat(rawPrice.replace(/[^\d.]/g, ""));

    const onHandField = row.querySelector(".inv-onHand");
    const originalOnHand = parseFloat(onHandField?.dataset.original || "0");
    const newOnHand = originalOnHand + unitQty;
    if (onHandField) onHandField.value = newOnHand;

    const incomingInput = row.querySelector(".inv-incoming");
    if (incomingInput) incomingInput.value = unitQty;

    const materialInfo = {
      matName,
      matPrice,
      unitType: row.querySelector(".inv-unitType")?.value.trim() || "",
      unitQty,
      supplier: row.querySelector(".inv-supplier")?.value.trim() || "",
      supplierUrl: row.querySelector(".inv-supplierUrl")?.value.trim() || "",
      unitPrice: row.querySelector(".inv-unitPrice")?.value.trim() || "",
      incoming: unitQty,
      onHand: newOnHand,
      reorderLevel: row.querySelector(".inv-reorderLevel")?.value.trim() || "",
      lastUpdated: new Date()
    };

    try {
      const res = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "materials",
          action: "edit",
          matID,
          materialInfo
        })
      });

      const result = await res.json();
      console.log(`✅ Result for ${matName}:`, result);

      if (result.success) {
        showToast(`✅ Saved ${matName}`, "success");
      } else {
        showToast(`❌ Failed to save ${matName}`, "error");
      }
    } catch (err) {
      console.error(`❌ Error saving ${matName}:`, err);
      showToast(`❌ Error saving ${matName}`, "error");
    }
  }

  toggleLoader(false);

  // ✅ Reset the form and clear all inventory rows
  const form = document.getElementById(SELECTORS.addMaterialForm);
  if (form) form.reset();

  const container = document.getElementById("materialRows");
  if (container) container.innerHTML = ""; // Clear all material rows from inventory

  // ✅ Switch to the Search tab via Bootstrap 5 API
  const searchTabBtn = document.querySelector('[data-bs-target="#search-material"]');
  if (searchTabBtn) {
    const tabInstance = bootstrap.Tab.getInstance(searchTabBtn) || new bootstrap.Tab(searchTabBtn);
    tabInstance.show();
  }
}

function calculateAllStaticForm(prefix) {
  // Helper to get and clean numeric input
  const get = id => {
    const raw = document.getElementById(`${prefix}${id}`)?.value || "";
    return parseFloat(raw.replace(/[^0-9.-]+/g, "")) || 0;
  };

  // Helper to set a formatted currency value visually
  const set = (id, val) => {
    const el = document.getElementById(`${prefix}${id}`);
    if (el) el.value = formatCurrency(val);
  };

  const matPrice = get("matPrice");
  const unitQty = get("unitQty");
  const onHand = get("onHand");
  const incoming = get("incoming");

  const unitPrice = unitQty !== 0 ? matPrice / unitQty : 0;
  const totalStock = onHand + incoming;

  set("unitPrice", unitPrice);
  set("totalStock", totalStock);

  if (prefix === "edit-") {
    checkLowStock(prefix);
  }
}

function checkLowStock(prefix = "edit-") {
  const total = parseFloat(document.getElementById(`${prefix}totalStock`)?.value) || 0;
  const reorder = parseFloat(document.getElementById(`${prefix}reorderLevel`)?.value) || 0;
  const alert = document.getElementById("reorderAlert");
  if (alert) alert.classList.toggle("d-none", total >= reorder);
}

// 🔄 Add Inventory Part Row Logic
function initializeMaterialRow(row) {
  const nameInput = row.querySelector(".inv-material");
  const priceInput = row.querySelector(".inv-matPrice");
  const qtyInput = row.querySelector(".inv-unitQty");
  const unitPriceOutput = row.querySelector(".inv-unitPrice");
  const onHandInput = row.querySelector(".inv-onHand");
  const removeBtn = row.querySelector(".remove-material-row");

  if (!nameInput || !priceInput || !qtyInput || !unitPriceOutput || !onHandInput || !removeBtn) {
    console.warn("⚠️ Missing expected elements in material row.");
    return;
  }

  const recalculate = () => {
    const rawPrice = priceInput.value.replace(/[^0-9.-]+/g, "");
    const rawQty = qtyInput.value.replace(/[^0-9.-]+/g, "");
    const price = parseFloat(rawPrice) || 0;
    const qty = parseFloat(rawQty) || 0;
    const unitPrice = qty ? price / qty : 0;
    unitPriceOutput.value = formatCurrency(unitPrice);

    // Update onHand: originalOnHand + unitQty
    const originalOnHand = parseFloat(onHandInput.dataset.original || "0");
    const newOnHand = originalOnHand + qty;
    onHandInput.value = newOnHand;
  };

  nameInput.addEventListener("change", () => {
    const name = nameInput.value.trim();
    const match = materialData.find(m => m[1].trim() === name);
    if (!match) {
      showToast(`No match found for "${name}"`, "warning");
      return;
    }
    populateMaterialData(row, match);
    recalculate();
  });

  priceInput.addEventListener("change", recalculate);
  qtyInput.addEventListener("change", recalculate);

  removeBtn.addEventListener("click", () => {
    const container = row.parentElement;
    if (!container) return;
    const allRows = container.querySelectorAll(".material-row");
    if (allRows.length <= 1) {
      showToast("⚠️ At least one row must remain.", "info");
      return;
    }
    row.remove();
  });
}

// ➕ Add new material row
function addMaterialRow(container) {
  if (!container) {
    console.warn("⚠️ addMaterialRow: Missing container.");
    return;
  }

  const rows = container.querySelectorAll(".material-row");
  if (typeof MAX_ROWS !== "undefined" && rows.length >= MAX_ROWS) {
    showToast(`🚫 Max ${MAX_ROWS} materials allowed.`, "warning");
    return;
  }

  const template = rows[0];
  if (!template) {
    console.warn("⚠️ addMaterialRow: No template row found.");
    return;
  }

  const newRow = template.cloneNode(true);
  newRow.querySelectorAll("input").forEach(input => (input.value = ""));

  const lastUpdatedInput = newRow.querySelector(".inv-lastUpdated");
  if (lastUpdatedInput) {
    lastUpdatedInput.value = formatDateForUser(new Date());
  }

  container.appendChild(newRow);
  initializeMaterialRow(newRow);
}

// 📥 Populate a row with matched material data
function populateMaterialData(row, data) {
  if (!row || !Array.isArray(data)) return;

  const map = {
    "inv-matID": 0,
    "inv-material": 1,
    "inv-matPrice": 2,
    "inv-unitType": 3,
    "inv-unitQty": 4,
    "inv-supplier": 5,
    "inv-supplierUrl": 6,
    "inv-unitPrice": 7,
    "inv-onHand": 8,
    "inv-incoming": 9,
    "inv-lastUpdated": 10,
    // Index 11 = "outgoing" (skipped)
    "inv-reorderLevel": 12
  };

  Object.entries(map).forEach(([className, index]) => {
    const el = row.querySelector(`.${className}`);
    if (!el) return;

    let value = data[index];

    // Set raw value first (for input fields or calculations)
    el.value = value ?? "";

    // Format currency fields visually after raw set
    if (["inv-matPrice", "inv-unitPrice"].includes(className)) {
      const numeric = parseFloat(value?.replace(/[^0-9.-]+/g, "")) || 0;
      el.value = formatCurrency(numeric);
    }

    // Format lastUpdated date; fallback to today if empty or invalid
    if (className === "inv-lastUpdated") {
      if (value && !isNaN(new Date(value).getTime())) {
        el.value = formatDateForUser(value);
      } else {
        el.value = formatDateForUser(new Date());
      }
    }
  });

  // Store original onHand value for calculations later
  const onHand = row.querySelector(".inv-onHand");
  if (onHand) {
    onHand.dataset.original = data[8] ?? "0";
  }
}

>>>>>>> fc285467c489024ad79f8916ecca9eda90cfaf68
