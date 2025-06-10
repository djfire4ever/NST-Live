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


=======
// ✅ Data store
let quoteData = [];
let productData = [];

// ✅ Utility: Get or create reusable counter elements
function getOrCreateCounter(id, classList, parent, insertAfter = null) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("span");
    el.id = id;
    el.classList.add(...classList);
    insertAfter
      ? insertAfter.insertAdjacentElement("afterend", el)
      : parent.appendChild(el);
  }
  return el;
}

// ✅ Utility: Switch to Edit Tab
function showEditTab() {
  const editTab = document.querySelector('[data-bs-target="#edit-quote"]');
  if (editTab) new bootstrap.Tab(editTab).show();
}

// ✅ Load search data from backend
function setQuoteDataForSearch() {
  fetch(scriptURL + "?action=getQuoteDataForSearch")
    .then(res => res.json())
    .then(data => quoteData = data.slice())
    .catch(err => console.error("❌ Failed to load quote data:", err));
}

// ✅ Perform live search
function search() {
  const inputEl = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  if (!inputEl || !resultsBox) return;

  let counterContainer = document.getElementById("counterContainer");
  if (!counterContainer) {
    counterContainer = document.createElement("div");
    counterContainer.id = "counterContainer";
    counterContainer.classList.add("d-inline-flex", "gap-3", "align-items-center", "ms-3");
    inputEl.parentNode.insertBefore(counterContainer, inputEl.nextSibling);
  }

  const searchCounter = getOrCreateCounter("searchCounter", ["px-2", "py-1", "border", "rounded", "fw-bold", "bg-dark", "text-info"], counterContainer);
  const totalCounter = getOrCreateCounter("totalCounter", ["px-2", "py-1", "border", "rounded", "fw-bold", "bg-dark", "text-info"], counterContainer, searchCounter);

  toggleLoader();

  const input = inputEl.value.toLowerCase().trim();
  const words = input.split(/\s+/);
  const cols = [0, 1, 2, 3, 4, 5];

  const results = input === "" ? [] : quoteData.filter(row =>
    words.every(word => cols.some(i => row[i]?.toString().toLowerCase().includes(word)))
  );

  searchCounter.textContent = input === "" ? "🔍" : `${results.length} Quotes Found`;
  totalCounter.textContent = `Total Quotes: ${quoteData.length}`;
  resultsBox.innerHTML = "";

  const template = document.getElementById("rowTemplate").content;
  results.forEach(r => {
    const row = template.cloneNode(true);
    row.querySelector(".qtID").textContent = r[0];
    row.querySelector(".firstName").textContent = r[3];
    row.querySelector(".lastName").textContent = r[4];
    row.querySelector(".eventDate").textContent = formatDateForUser(r[10]);

    const tr = row.querySelector("tr");
    tr.dataset.quoteid = r[0];

    const deleteBtn = row.querySelector(".delete-button");
    const confirmBtn = row.querySelector(".before-delete-button");
    if (deleteBtn) deleteBtn.dataset.quoteid = r[0];
    if (confirmBtn) confirmBtn.dataset.quoteid = r[0];

    resultsBox.appendChild(row);
  });

  toggleLoader();
}

// ✅ Handle search result interactions
document.getElementById("searchResults").addEventListener("click", event => {
  const target = event.target;

  if (target.classList.contains("before-delete-button")) {
    const confirmBtn = target.previousElementSibling;
    const isDelete = target.dataset.buttonState === "delete";
    confirmBtn?.classList.toggle("d-none", !isDelete);
    target.textContent = isDelete ? "Cancel" : "Delete";
    target.dataset.buttonState = isDelete ? "cancel" : "delete";
    return;
  }

  if (target.classList.contains("delete-button")) {
    const qtID = target.dataset.quoteid?.trim();
    if (!qtID) return showToast("⚠️ Quote ID missing", "error");

    toggleLoader();
    fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "quotes", action: "delete", qtID })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          showToast("✅ Quote deleted!");
          document.getElementById("searchInput").value = "";
          document.getElementById("searchResults").innerHTML = "";
          setQuoteDataForSearch();
          document.querySelector('[data-bs-target="#search-quote"]')?.click();
        } else {
          showToast("❌ Error deleting quote!", "error");
          console.error("❌ Backend error:", result.message || "Unknown");
        }
      })
      .catch(() => showToast("⚠️ Delete failed", "error"))
      .finally(toggleLoader);
    return;
  }

  const row = target.closest("tr");
  if (row && row.dataset.quoteid && !target.closest(".btn-group")) {
    const qtID = row.dataset.quoteid;
    console.log("🔍 Selected quote ID:", qtID);
    populateEditForm(qtID);
    showEditTab();
  }
});

// ✅ DOM Ready Initialization
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchTabButton = document.querySelector('button[data-bs-target="#search-quote"]');
  const searchResultsBox = document.getElementById("searchResults");
  const searchCounter = document.getElementById("searchCounter");

  if (searchInput) {
    searchInput.addEventListener("input", search);
  } else {
    console.error("❌ Search input not found!");
  }

  if (searchTabButton) {
    searchTabButton.addEventListener("shown.bs.tab", () => {
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
      if (searchResultsBox) searchResultsBox.innerHTML = "";
      if (searchCounter) {
        searchCounter.textContent = "";
        searchCounter.classList.add("text-success", "text-dark", "fw-bold");
      }
    });
  }

  if (searchResultsBox) searchResultsBox.innerHTML = "";

  toggleLoader();
  setQuoteDataForSearch();
  setTimeout(toggleLoader, 500);

  document.getElementById("edit-discount")?.addEventListener("change", () => calculateAllTotals("edit"));
});

// ✅ Form field listeners (Edit/Add)
document.addEventListener("DOMContentLoaded", () => {
  const fieldsToWatch = [
    "edit-deliveryFee", "add-deliveryFee", "edit-setupFee", "add-setupFee", 
    "edit-otherFee", "add-otherFee", "edit-discount", "add-discount", 
    "edit-deposit", "add-deposit", "edit-amountPaid",
    "add-phone", "edit-phone", "add-eventDate", "edit-eventDate"
  ];

  fieldsToWatch.forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => {
      const mode = id.startsWith("add") ? "add" : "edit";
      calculateAllTotals(mode);
    });
  });

  document.querySelectorAll(".product-row").forEach(row => {
    const mode = row.closest("#add-product-rows-container") ? "add" : "edit";
    attachRowEvents(row, mode);
  });

  const addBtn = document.getElementById("add-product-btn");
  if (addBtn) {
    addBtn.removeEventListener("click", handleAddProductClick);
    addBtn.addEventListener("click", handleAddProductClick);
  }

  const editBtn = document.getElementById("edit-product-btn");
  if (editBtn) {
    editBtn.removeEventListener("click", handleEditProductClick);
    editBtn.addEventListener("click", handleEditProductClick);
  }
});

// 🔄 Populates the Edit Form when a quote is selected
document.addEventListener("DOMContentLoaded", () => {

  // Watch fields and recalculate totals
  const fieldsToWatch = [
    "edit-deliveryFee", "add-deliveryFee", "edit-setupFee", "add-setupFee", 
    "edit-otherFee", "add-otherFee", "edit-discount", "add-discount", 
    "edit-deposit", "add-deposit", "edit-amountPaid", "add-amountPaid",
    "add-phone", "edit-phone", "add-eventDate", "edit-eventDate"
  ];

  fieldsToWatch.forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => {
      const mode = id.startsWith("add") ? "add" : "edit";
      calculateAllTotals(mode);
    });
  });

  // Attach events to each product row
  document.querySelectorAll(".product-row").forEach(row => {
    const mode = row.closest("#add-product-rows-container") ? "add" : "edit";
    attachRowEvents(row, mode);
  });

  // Bind product row buttons
  const addProductBtn = document.getElementById("add-product-btn");
  if (addProductBtn) {
    addProductBtn.removeEventListener("click", handleAddProductClick); // in case reloaded
    addProductBtn.addEventListener("click", handleAddProductClick);
  }

  const editProductBtn = document.getElementById("edit-product-btn");
  if (editProductBtn) {
    editProductBtn.removeEventListener("click", handleEditProductClick);
    editProductBtn.addEventListener("click", handleEditProductClick);
  }

  // Bind save buttons
  const addQuoteBtn = document.querySelector("#add-quote-btn");
  const editQuoteBtn = document.querySelector("#edit-quote-btn");

  if (addQuoteBtn) {
    addQuoteBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("🟢 Add Quote button clicked");
      await handleSave(e, "add");
    });
  }

  if (editQuoteBtn) {
    editQuoteBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("🟢 Edit Quote button clicked");
      await handleSave(e, "edit");
    });
  }

  // Bootstrap tab shown event
  const addTabButton = document.querySelector('button[data-bs-target="#add-quote"]');
  if (addTabButton) {
    addTabButton.addEventListener("shown.bs.tab", () => {
    console.log("🟢 [Add Tab] Shown");

    // Confirm DOM elements after switching
    console.log("🟢 [Add Tab] add-quote-btn:", document.getElementById("add-quote-btn"));
    console.log("🟢 [Add Tab] add-previewQuoteBtn:", document.getElementById("add-previewQuoteBtn"));
    console.log("🟢 [Add Tab] add-finalizeInvoiceBtn:", document.getElementById("add-finalizeInvoiceBtn"));

      if (typeof productData === "undefined") {
        console.warn("⏳ Skipping form init — productData not ready");
      } else {
        initializeAddForm();
      }

      const previewBtn = document.getElementById("add-previewQuoteBtn");
      if (previewBtn && !previewBtn.dataset.bound) {
        previewBtn.addEventListener("click", previewQuoteBtnHandler);
        previewBtn.dataset.bound = "true";
      }

      const finalizeBtn = document.getElementById("add-finalizeInvoiceBtn");
      if (finalizeBtn && !finalizeBtn.dataset.bound) {
        finalizeBtn.addEventListener("click", finalizeInvoiceBtnHandler);
        finalizeBtn.dataset.bound = "true";
      }
    });
  } else {
    console.warn("❌ Add tab button not found in DOM");
  }
});

async function populateEditForm(qtID) {
  try {
    toggleLoader(true);
    console.log("🔄 Loading quote data for qtID:", qtID);

    await getProdDataForSearch();
    setField("edit-qtID", qtID);
    document.querySelector("#edit-qtID")?.setAttribute("readonly", true);

    const response = await fetch(`${scriptURL}?action=getQuoteById&qtID=${qtID}`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();
    if (!data || data.error) throw new Error(data.error || "No data returned");

    // ✅ Fill form fields — grouped by card

    // Card 1: Client Info
    ["phone", "firstName", "lastName", "street", "email", "city", "state", "zip"]
      .forEach(id => setField(`edit-${id}`, data[id] || ""));

    // Card 2: Event Info
    setField("edit-eventDate", formatDateForUser(data.eventDate));
    setField("edit-eventLocation", data.eventLocation || "");
    setField("edit-eventNotes", data.eventNotes || "");

    // Card 4: Add-On Fees
    ["deliveryFee", "setupFee", "otherFee", "addonsTotal"]
      .forEach(id => setField(`edit-${id}`, data[id] || 0));

    // Card 5: Balance & Payment
    setField("edit-deposit", data.deposit || "");
    setField("edit-amountPaid", data.amountPaid || "");
    setField("edit-balanceDue", data.balanceDue || "");
    setField("edit-paymentMethod", data.paymentMethod || "");

    setField("edit-depositDate", formatDateForUser(data.depositDate));
    setField("edit-balanceDueDate", formatDateForUser(data.balanceDueDate));
    setField("edit-dueDate", formatDateForUser(data.dueDate));

    // Card 6: Totals
    ["discount", "subTotal1", "subTotal2", "subTotal3", "discountedTotal", "grandTotal"]
      .forEach(id => setField(`edit-${id}`, data[id] || 0));

    // Products
    const container = document.querySelector("#edit-product-rows-container");
    if (container) container.innerHTML = "";

    if (Array.isArray(data.products)) {
      data.products.forEach(product => {
        addProductRow(
          product.name || "",
          product.quantity || "",
          "edit-product-rows-container",
          "edit",
          product.unitPrice || "",
          product.totalRowRetail || ""
        );
      });
    }

    // Hidden/Meta Fields
    [ "totalProductCost",
      "totalProductRetail",
      "productCount",
      "quoteDate",
      "quoteNotes",
      "invoiceID",
      "invoiceDate",
      "invoiceUrl"
    ].forEach(id => {
      let val = data[id] || "";
      if (id === "quoteDate" || id === "invoiceDate") {
        val = formatDateForUser(val);
      }
      setField(`edit-${id}`, val);
    });

    // 🔢 Totals and Header Updates
    calculateAllTotals("edit");
    updateCardHeaders("edit");

    // 👁️ Ensure Edit Tab is visible and focused
    const tabPane = document.querySelector("#edit-quote");
    if (tabPane) {
      tabPane.classList.remove("d-none");
      tabPane.scrollIntoView({ behavior: "smooth" });
    }

    // 🧷 Bind buttons safely (only once)
    const previewBtn = document.getElementById("edit-previewQuoteBtn");
    const finalizeBtn = document.getElementById("edit-finalizeInvoiceBtn");

    if (previewBtn && !previewBtn.dataset.bound) {
      previewBtn.addEventListener("click", previewQuoteBtnHandler);
      previewBtn.dataset.bound = "true";
    }

    if (finalizeBtn && !finalizeBtn.dataset.bound) {
      finalizeBtn.addEventListener("click", finalizeInvoiceBtnHandler);
      finalizeBtn.dataset.bound = "true";
    }

    console.log("✅ Edit form populated and buttons bound");

  } catch (error) {
    console.error("❌ Failed to populate edit form:", error);
    showToast("❌ Error loading quote data!", "error");
  } finally {
    toggleLoader(false);
  }
}

async function handleSave(event, mode) {
  try {
    if (!event || !mode) throw new Error("Missing event or mode");

    const btnID = event.target?.id;
    const expectedID = mode === "add" ? "add-quote-btn" : "edit-quote-btn";
    if (btnID !== expectedID) {
      console.warn(`⚠️ Ignoring save triggered by unexpected element: ${btnID}`);
      return;
    }

    toggleLoader(true);
    console.log(`📤 Saving quote in mode: ${mode}`);

    calculateAllTotals(mode);
    const quoteData = collectQuoteFormData(mode);
    console.log("📦 Data sent to backend:", quoteData);

    const response = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "quotes",
        action: mode,
        qtID: mode === "edit" ? getField("edit-qtID") : null,
        quoteInfo: quoteData
      })
    });

    const result = await response.json();
    if (result.success) {
      showToast("✅ Quote saved successfully!");
      document.querySelector("#searchInput").value = "";
      document.querySelector("#searchResults").innerHTML = "";
      setQuoteDataForSearch();
      document.querySelector('[data-bs-target="#search-quote"]')?.click();
    } else {
      throw new Error(result.message || "Unknown backend error");
    }
  } catch (error) {
    console.error("❌ Error saving quote:", error);
    showToast("❌ Failed to save quote!", "error");
  } finally {
    toggleLoader(false);
  }
}

// 🔁 1. Collect Quote Form Data (for saving)
function collectQuoteFormData(mode) {
  const get = (id) => getField(`${mode}-${id}`);
  const rawPhone = get("phone").replace(/\D/g, "");

  const formData = {
    phone: rawPhone,
    firstName: get("firstName"),
    lastName: get("lastName"),
    email: get("email"),
    street: get("street"),
    city: get("city"),
    state: get("state"),
    zip: get("zip"),
    eventDate: get("eventDate"),
    eventLocation: get("eventLocation"),
    eventNotes: get("eventNotes"),
    deliveryFee: parseCurrency(get("deliveryFee")),
    setupFee: parseCurrency(get("setupFee")),
    otherFee: parseCurrency(get("otherFee")),
    addonsTotal: parseCurrency(get("addonsTotal")),
    deposit: parseCurrency(get("deposit")),
    amountPaid: parseCurrency(get("amountPaid")),
    depositDate: get("depositDate"),
    balanceDue: parseCurrency(get("balanceDue")),
    balanceDueDate: get("balanceDueDate"),
    paymentMethod: get("paymentMethod"),
    dueDate: get("dueDate"),
    discount: parseCurrency(get("discount")),
    subTotal1: parseCurrency(get("subTotal1")),
    subTotal2: parseCurrency(get("subTotal2")),
    subTotal3: parseCurrency(get("subTotal3")),
    discountedTotal: parseCurrency(get("discountedTotal")),
    grandTotal: parseCurrency(get("grandTotal")),
    totalProductCost: parseCurrency(get("totalProductCost")),
    totalProductRetail: parseCurrency(get("totalProductRetail")),
    quoteNotes: get("quoteNotes"),
    invoiceID: "",
    invoiceDate: "",
    invoiceUrl: ""
  };

  const rows = document.querySelectorAll(`#${mode}-product-rows-container .product-row`);
  const products = [];

  rows.forEach(row => {
    const name = row.querySelector(".product-name")?.value.trim();
    const qty = parseFloat(row.querySelector(".product-quantity")?.value.trim() || 0);
    const unitPrice = parseCurrency(row.querySelector(".totalRowCost")?.value || 0);
    const totalRowRetail = parseCurrency(row.querySelector(".totalRowRetail")?.value || 0);

    if (name && qty > 0) {
      products.push({ name, quantity: qty, unitPrice, totalRowRetail });
    }
  });

  formData.productCount = products.length;

  for (let i = 1; i <= 15; i++) {
    const p = products[i - 1] || {};
    formData[`part${i}`] = p.name || "";
    formData[`qty${i}`] = p.quantity || "";
    formData[`unitPrice${i}`] = p.unitPrice || "";
    formData[`totalRowRetail${i}`] = p.totalRowRetail || "";
  }

  return formData;
}

async function initializeAddForm() {
  try {
    toggleLoader(true);
    console.log("📋 Initializing Add Quote form");

    // ✅ Make sure product data is available first
    if (typeof productData === "undefined" || !Array.isArray(productData) || productData.length === 0) {
      console.warn("⚠️ productData not ready, fetching...");
      await getProdDataForSearch(); // <-- load or reload it if needed
    }

    // 🧼 Clear fields
    const fieldsToClear = [
      "phone", "firstName", "lastName", "email", "street", "city", "state", "zip",
      "eventDate", "eventLocation", "eventNotes",
      "deliveryFee", "setupFee", "otherFee", "addonsTotal",
      "deposit", "depositDate", "balanceDue", "balanceDueDate",
      "paymentMethod", "quoteNotes", "discount",
      "grandTotal", "totalProductCost", "totalProductRetail"
    ];

    fieldsToClear.forEach(id => setField(`add-${id}`, ""));

    resetProductRows("add-product-rows-container");

    // 📦 Ensure everything else is loaded
    await Promise.all([
      setQuoteDataForSearch(),
      loadDropdowns()
    ]);

    calculateAllTotals("add");
    updateCardHeaders("add");

    console.log("✅ Add Quote form initialized");

    // 🧩 Bind buttons only once
    const previewBtn = document.getElementById("add-previewQuoteBtn");
    const finalizeBtn = document.getElementById("add-finalizeInvoiceBtn");

    if (previewBtn && !previewBtn.dataset.bound) {
      previewBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("👁️ Preview button clicked (add)");
        await previewQuote("add");
      });
      previewBtn.dataset.bound = "true";
      console.log("🔗 Bound add-previewQuoteBtn");
    }

    if (finalizeBtn && !finalizeBtn.dataset.bound) {
      finalizeBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("✅ Finalize button clicked (add)");
        await finalizeInvoice("add");
      });
      finalizeBtn.dataset.bound = "true";
      console.log("🔗 Bound add-finalizeInvoiceBtn");
    }

  } catch (err) {
    console.error("❌ Error initializing Add Quote form:", err);
    showToast("❌ Could not initialize form", "error");
  } finally {
    toggleLoader(false);
  }
}

// 🔁 4. Client autofill on phone change
document.querySelector("#add-phone")?.addEventListener("change", async (e) => {
  e.stopPropagation();
  const clientID = getField("add-phone");

  if (!clientID) return;

  try {
    const res = await fetch(`${scriptURL}?action=getClientById&clientID=${encodeURIComponent(clientID)}`);
    const client = await res.json();

    if (!client.error) {
      setField("add-firstName", client.firstName);
      setField("add-lastName", client.lastName);
      setField("add-email", client.email);
      setField("add-street", client.street);
      setField("add-city", client.city);
      setField("add-state", client.state);
      setField("add-zip", client.zip);
    } else {
      ["firstName", "lastName", "email", "street", "city", "state", "zip"]
        .forEach(field => setField(`add-${field}`, ""));
      showToast(client.error, "warning");
    }

    updateCardHeaders("add");

  } catch (err) {
    console.error("❌ Error fetching client data:", err);
    showToast("❌ Failed to load client info", "error");
  }
});

// 🔁 5. Load product data from backend (used globally)
async function getProdDataForSearch() {
  try {
    // Check localStorage first
    const cached = localStorage.getItem("productData");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          productData = parsed.slice();  // Create a copy
          console.log("💾 Loaded productData from localStorage");
          return;
        }
      } catch (e) {
        console.warn("⚠️ Failed to parse productData from localStorage:", e);
      }
    }

    // Otherwise, fetch from server
    const response = await fetch(`${scriptURL}?action=getProdDataForSearch`);
    if (!response.ok) throw new Error(`Status: ${response.status}`);

    const rawData = await response.json();
    productData = [];

    rawData.forEach(row => {
      const id = String(row[0] || "").trim();
      const name = String(row[1] || "").trim();
      const cost = parseFloat(row[46]?.toString().replace(/[^\d.]/g, "")) || 0;
      const retail = parseFloat(row[45]?.toString().replace(/[^\d.]/g, "")) || 0;

      if (id && name) {
        productData.push({
          prodID: id,
          name,
          cost,
          retail
        });
      }
    });

    localStorage.setItem("productData", JSON.stringify(productData));
    console.log("✅ Product data loaded and cached");

  } catch (err) {
    console.error("❌ Failed to load product data:", err);
    throw err;
  }
}

// 🔁 6. Add Product Row Handler
function handleAddProductClick() {
  console.log("➕ Add Product clicked");
  addProductRow("", 1, "add-product-rows-container", "add");
}

// 🔁 7. Prevent propagation from dropdown/collapse elements
document.querySelectorAll(".product-name")?.forEach((el) =>
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    console.log("🟢 Product dropdown clicked");
  })
);

function addProductRow(
  name = "",
  qty = 1,
  containerId = "add-product-rows-container",
  mode = "add",
  unitRetail = 0,
  totalRetail = 0
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const row = document.createElement("div");
  row.classList.add("row", "g-2", "align-items-center", "mb-1", "product-row");

  const optionsHTML = Object.values(productData || {}).map(p => {
    const selected = p.name === name ? " selected" : "";
    return `<option value="${p.name.replace(/"/g, '&quot;')}"${selected}>${p.name}</option>`;
  }).join("");

  const formattedUnitRetail = `$${parseFloat(unitRetail || 0).toFixed(2)}`;
  const formattedTotalRetail = `$${parseFloat(totalRetail || 0).toFixed(2)}`;

  row.innerHTML = `
    <div class="col-md-6">
      <select class="form-select product-name">
        <option value="">Choose a product...</option>
        ${optionsHTML}
      </select>
    </div>
    <div class="col-md-1">
      <input type="number" class="form-control text-center product-quantity" value="${qty}">
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control text-end totalRowCost" value="${formattedUnitRetail}" readonly>
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control text-end totalRowRetail" value="${formattedTotalRetail}" readonly>
    </div>
    <div class="col-md-1">
      <button type="button" class="btn btn-danger btn-sm remove-part">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;

  container.appendChild(row);
  attachRowEvents(row, mode);
  calculateAllTotals(mode);
}

function handleEditProductClick() {
  addProductRow("", 1, "edit-product-rows-container", "edit");
}

function attachRowEvents(row, mode = "edit") {
  const nameInput = row.querySelector(".product-name");
  const qtyInput = row.querySelector(".product-quantity");
  const costOutput = row.querySelector(".totalRowCost");
  const retailOutput = row.querySelector(".totalRowRetail");
  const deleteBtn = row.querySelector(".remove-part");

  function updateTotals() {
    const name = nameInput.value.trim();
    const qty = parseInt(qtyInput.value) || 0;
    const prod = productData?.[name] || Object.values(productData).find(p => p.name === name);

    if (prod && qty > 0) {
      costOutput.value = `$${(prod.cost * qty).toFixed(2)}`;
      retailOutput.value = `$${(prod.retail * qty).toFixed(2)}`;
    } else {
      costOutput.value = "$0.00";
      retailOutput.value = "$0.00";
    }

    calculateAllTotals(mode);
  }

  nameInput.addEventListener("change", updateTotals);
  qtyInput.addEventListener("change", updateTotals);
  deleteBtn.addEventListener("click", () => {
    row.remove();
    calculateAllTotals(mode);
  });

  updateTotals();
}

function resetProductRows(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  const mode = containerId.startsWith("add") ? "add" : "edit";
  addProductRow("", 1, containerId, mode);
}

function calculateAllTotals(mode = "edit") {
  const prefix = mode === "add" ? "add-" : "edit-";

  let totalProductCost = 0;
  let totalProductRetail = 0;

  const parseCurrency = val => parseFloat(String(val || "0").replace(/[^0-9.-]+/g, "")) || 0;

  document.querySelectorAll(`#${prefix}product-rows-container .product-row`).forEach(row => {
    const name = row.querySelector(".product-name")?.value.trim() || "";
    const qty = parseFloat(row.querySelector(".product-quantity")?.value) || 0;
    const prod = productData?.[name] || Object.values(productData).find(p => p.name === name);
    if (prod && qty > 0) {
      totalProductCost += prod.cost * qty;
      totalProductRetail += prod.retail * qty;
    }
  });

  const productCount = document.querySelectorAll(`#${prefix}product-rows-container .product-row`).length;
  const countEl = document.getElementById(`${prefix}productCount`);
  if (countEl) countEl.value = productCount;

  const deliveryFee = parseCurrency(document.getElementById(`${prefix}deliveryFee`)?.value);
  const setupFee = parseCurrency(document.getElementById(`${prefix}setupFee`)?.value);
  const otherFee = parseCurrency(document.getElementById(`${prefix}otherFee`)?.value);
  const discount = parseCurrency(document.getElementById(`${prefix}discount`)?.value);
  const deposit = parseCurrency(document.getElementById(`${prefix}deposit`)?.value);
  const amountPaidEl = document.getElementById(`${prefix}amountPaid`);
  const amountPaid = parseCurrency(amountPaidEl?.value);

  const hasAmountPaid = amountPaidEl && amountPaid > 0;

  const addonsTotal = deliveryFee + setupFee + otherFee;
  const subTotal1 = totalProductRetail * 0.08875; // tax
  const subTotal2 = totalProductRetail + subTotal1;
  const subTotal3 = totalProductRetail * (discount / 100);
  const discountedTotal = subTotal2 - subTotal3;
  const grandTotal = discountedTotal + addonsTotal;
  const balanceDue = grandTotal - (hasAmountPaid ? amountPaid : deposit);

  const updateField = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
    if (el.tagName === "INPUT") {
      el.value = formatter.format(value);
    } else {
      el.textContent = formatter.format(value);
    }
  };

  // Update totals in DOM
  updateField(`${prefix}addonsTotal`, addonsTotal);
  updateField(`${prefix}addonsTotal-totals`, addonsTotal);
  updateField(`${prefix}grandTotal`, grandTotal);
  updateField(`${prefix}grandTotal-Addons`, grandTotal);
  updateField(`${prefix}grandTotal-Summary`, grandTotal);
  updateField(`${prefix}balanceDue`, balanceDue);
  updateField(`${prefix}totalProductCost`, totalProductCost);
  updateField(`${prefix}totalProductRetail`, totalProductRetail);
  updateField(`${prefix}subTotal1`, subTotal1);
  updateField(`${prefix}subTotal2`, subTotal2);
  updateField(`${prefix}subTotal3`, subTotal3);
  updateField(`${prefix}discountedTotal`, discountedTotal);
  // updateField(`${prefix}amountPaid`, amountPaid); // ✅ Format & show amountPaid

  // Update Card 7 header
  const card7Header = document.getElementById(`${prefix}card7-header-display`);
  if (card7Header) {
    const retailFormatted = totalProductRetail.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
    card7Header.textContent = `Products - ${productCount} • ${retailFormatted}`;
  }

  updateCardHeaders(mode);
}

function updateCardHeaders(mode = "edit") {
  const prefix = mode === "add" ? "add-" : "edit-";

  const formatCurrency = val => {
    const parsed = parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0;
    return parsed.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  updateDisplayText(`${prefix}card1-header-display`, `${getField(`${prefix}firstName`)} ${getField(`${prefix}lastName`)}`.trim(), "Client Info");
  updateDisplayText(`${prefix}card2-header-display`, getField(`${prefix}eventDate`) || "Event Info");
  updateDisplayText(`${prefix}card3-header-display`, formatCurrency(getField(`${prefix}grandTotal`)));
  updateDisplayText(`${prefix}card4-header-display`, formatCurrency(getField(`${prefix}addonsTotal`)));
  updateDisplayText(`${prefix}card5-header-display`, formatCurrency(getField(`${prefix}balanceDue`)));
  updateDisplayText(`${prefix}card6-header-display`, formatCurrency(getField(`${prefix}grandTotal`)));

  updateDisplayText(`${prefix}totalProductCost`, formatCurrency(getField(`${prefix}totalProductCost`)));
  updateDisplayText(`${prefix}totalProductRetail`, formatCurrency(getField(`${prefix}totalProductRetail`)));
}

function updateDisplayText(id, value, fallback = "") {
  const el = document.getElementById(id);
  if (el) el.textContent = value || fallback;
}

function getField(id) {
  const el = document.getElementById(id);
  if (!el) return "0";
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" ? el.value : el.textContent;
}

function setField(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  // Handle input or textarea fields
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    el.value = value;
  } else {
    // Fallback for <span>, <div>, etc.
    el.textContent = value;
  }
}

function recalculateAndUpdateHeaders(mode = "edit") {
  calculateAllTotals(mode);
  updateCardHeaders(mode);
}

function formatPhoneNumber(number) { // This function is in
  const digits = number.replace(/\D/g, "");
  if (digits.length !== 10) return number;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

function parseCurrency(val) {
  return parseFloat(String(val || "0").replace(/[^0-9.-]+/g, "")) || 0;
}

// === Preview Quote Handler ===
function previewQuoteBtnHandler(e) {
  e.preventDefault();
  e.stopPropagation();

  const btnID = e.target.id;
  const mode = btnID.startsWith("edit") ? "edit" : "add";
  console.log("🔍 previewQuoteBtnHandler triggered for mode:", mode);

  toggleLoader(true);
  const newTab = window.open("", "_blank");

  try {
    calculateAllTotals(mode);
    const quoteInfo = collectQuoteFormData(mode);
    console.log("📦 Preview data being sent to backend:", quoteInfo);

    fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "invoice",
        action: "preview",
        qtID: mode === "edit" ? getField("edit-qtID") : null,
        quoteInfo
      })
    })
    .then(response => response.json())
    .then(result => {
      console.log("✅ Backend preview response:", result);

      if (result.success && result.data?.url) {
        newTab.location.href = result.data.url;
      } else {
        newTab.document.write("<p>❌ Failed to generate preview.</p>");
        showToast("❌ Preview failed: " + (result.data?.message || "No URL returned"), "error");
        setTimeout(() => newTab.close(), 5000);
      }
    })
    .catch(err => {
      newTab.document.write("<p>❌ Error generating preview.</p>");
      console.error("❌ Fetch error:", err);
      showToast("❌ Error during preview request. Check console.", "error");
    })
    .finally(() => toggleLoader(false));
  } catch (err) {
    newTab.document.write("<p>❌ Error generating preview.</p>");
    console.error("❌ Unexpected error:", err);
    showToast("❌ Unexpected error. Check console.", "error");
    toggleLoader(false);
  }
}

// === Finalize Quote Handler ===
document.body.addEventListener("click", (e) => {
  if (e.target.matches("#add-finalizeInvoiceBtn, #edit-finalizeInvoiceBtn")) {
    e.preventDefault();
    finalizeInvoiceBtnHandler(e);
  }
});

async function finalizeInvoiceBtnHandler(e) {
  e.preventDefault();
  e.stopPropagation();

  const btnID = e.target.id;
  const mode = btnID.startsWith("edit") ? "edit" : "add";
  const qtID = mode === "edit" ? getField("edit-qtID") : null;

  console.log("🧾 Finalizing invoice, mode:", mode);
  toggleLoader(true);

  try {
    // Step 1: Gather quote data
    calculateAllTotals(mode);
    const quoteInfo = collectQuoteFormData(mode);

    if (!quoteInfo || typeof quoteInfo !== "object") {
      throw new Error("❌ Invalid quote data.");
    }

    // Step 2: Save the quote
    const quoteSaveRes = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "quotes",
        action: mode,
        qtID,
        quoteInfo
      })
    });

    const quoteSaveRaw = await quoteSaveRes.json();
    const quoteSaveData = quoteSaveRaw?.data?.data || quoteSaveRaw?.data || {};
    const savedQtID = quoteSaveData.qtID;

    if (!savedQtID) {
      throw new Error("❌ No qtID returned after saving.");
    }

    console.log("✅ Quote saved:", quoteSaveRaw);

    // Step 3: Finalize the invoice
    const finalizeRes = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "invoice",
        action: "finalize",
        qtID: savedQtID,
        quoteInfo
      })
    });

    const finalizeRaw = await finalizeRes.json();
    const invoiceData = finalizeRaw?.data?.data || finalizeRaw?.data || {};
    const invoiceURL = invoiceData.url;

    if (!invoiceURL) {
      throw new Error("❌ Invoice URL not returned.");
    }

    console.log("🧪 Invoice finalized:", invoiceData);

    // Step 4: Auto-create calendar event
    const eventInfo = {
      title: `Event: ${quoteInfo.firstName || ""} ${quoteInfo.lastName || ""}`.trim(),
      start: quoteInfo.eventDate,
      end: quoteInfo.eventDate,
      allDay: true,
      status: quoteInfo.deposit > 0 ? "confirmed" : "scheduled",
      category: "Quote",
      description: quoteInfo.eventNotes || "",
      color: "" // Optional: use default or add a color key
    };

    const calRes = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "calendar",
        action: "addEvent",
        eventInfo
      })
    });

    const calData = await calRes.json();
    console.log("📅 Calendar event created:", calData);

    // Step 5: Prepare invoice email modal
    const displayName = `${quoteInfo.firstName || ""} ${quoteInfo.lastName || ""}`.trim();
    const emailHtml = generateInvoiceEmailHtml(displayName, invoiceURL, quoteInfo);

    document.getElementById("invoice-email-to").value = quoteInfo.email || "";
    document.getElementById("invoice-email-subject").value = "Your Final Invoice from Your Company";
    document.getElementById("invoice-email-body").innerHTML = emailHtml;

    // Step 6: Show modal
    const modalEl = document.getElementById("finalInvoiceModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();

    showToast("📄 Invoice finalized and calendar event created.", "success");

  } catch (err) {
    console.error("❌ Finalization failed:", err);
    showToast("❌ Error finalizing invoice. See console.", "error");
  } finally {
    toggleLoader(false);
  }
}

function generateInvoiceEmailHtml(displayName, pdfUrl, quoteData) {
  return `
    <p>Hi ${quoteData.firstName},</p>
    <p>Your invoice has been finalized. Please review it below:</p>
    <p><strong>${displayName}</strong></p>
    <p><a href="${pdfUrl}" target="_blank">📄 View Invoice PDF</a></p>
    <p>Let us know if you have any questions.</p>
    <p>Best regards,<br>Your Company Team</p>
  `;
}

document.getElementById("send-invoice-email").addEventListener("click", async function (e) {
  e.preventDefault();

  const to = document.getElementById("invoice-email-to")?.value?.trim();
  const body = document.getElementById("invoice-email-body")?.innerHTML?.trim();
  const qtID = document.getElementById("edit-qtID")?.value?.trim();

  if (!to || !body) {
    showToast("⚠️ Please complete the email fields before sending.", "warning");
    return;
  }

  toggleLoader(true);

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "invoice",
        action: "sendInvoiceEmail",
        to,
        body,
        qtID
      })
    });

    const result = await res.json();
    console.log("📬 Email send response:", result);

    if (result.success) {
      showToast("✅ Email sent successfully");
      bootstrap.Modal.getInstance(document.getElementById("finalInvoiceModal"))?.hide();
    } else {
      showToast(`❌ ${result.data?.error || "Email failed to send."}`, "error");
    }

  } catch (err) {
    console.error("❌ Send email request failed:", err);
    showToast("❌ Failed to send email. Check console.", "error");
  } finally {
    toggleLoader(false);
  }
});

// Shopping list
document.getElementById("btn-show-shopping-list").addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  const qtID = document.querySelector("#edit-qtID")?.value;
  if (!qtID) {
    showToast("❌ Missing quote ID — cannot generate shopping list.", "error");
    return;
  }

  toggleLoader(true);

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "quotes",
        action: "getShoppingList",
        qtID: qtID
      })
    });

    if (!res.ok) throw new Error(`Server responded with status ${res.status}`);

    const data = await res.json();
    console.log("✅ Shopping list data:", data);

    if (!data.success) {
      showToast("❌ " + (data.message || "Failed to generate shopping list"), "error");
      return;
    }

    renderShoppingListModal(data.materials);

  } catch (err) {
    console.error("❌ Error generating shopping list:", err);
    showToast("❌ Failed to load shopping list", "error");
  } finally {
    toggleLoader(false);
  }
});

function renderShoppingListModal(materials) {
  const tbody = document.getElementById("shopping-list-body");
  tbody.innerHTML = "";

  materials.forEach(mat => {
    const shortfall = mat.totalNeeded > mat.onHand;
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${mat.matName}</td>
      <td>${mat.totalNeeded}</td>
      <td>${mat.onHand}</td>
      <td>${shortfall ? `<span class="text-danger">Shortfall</span>` : `<span class="text-success">OK</span>`}</td>
      <td>${mat.supplier || ""}</td>
    `;

    tbody.appendChild(row);
  });

  new bootstrap.Modal(document.getElementById("shoppingListModal")).show();
}

>>>>>>> fc285467c489024ad79f8916ecca9eda90cfaf68
