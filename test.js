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


