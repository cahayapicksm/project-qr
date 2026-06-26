import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, BRAND_LINKS } from "./config.js";
import { MOTORS } from "./motor-data.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginMessage = document.getElementById("loginMessage");

const refreshBtn = document.getElementById("refreshBtn");
const copyLeadBtn = document.getElementById("copyLeadBtn");
const sendWaBtn = document.getElementById("sendWaBtn");
const logoutBtn = document.getElementById("logoutBtn");
const togglePriceAdminBtn = document.getElementById("togglePriceAdminBtn");
const priceAdminSection = document.getElementById("priceAdminSection");
const priceExcelInput = document.getElementById("priceExcelInput");
const importExcelBtn = document.getElementById("importExcelBtn");

const totalScan = document.getElementById("totalScan");
const totalLead = document.getElementById("totalLead");
const topMotor = document.getElementById("topMotor");

const leadsTable = document.getElementById("leadsTable");
const scansTable = document.getElementById("scansTable");

const priceMotorSelect = document.getElementById("priceMotorSelect");
const cashPriceInput = document.getElementById("cashPriceInput");
const installmentScalingInput = document.getElementById("installmentScalingInput");
const saveCashPriceBtn = document.getElementById("saveCashPriceBtn");
const creditMatrixTable = document.getElementById("creditMatrixTable");
const addDpRowBtn = document.getElementById("addDpRowBtn");
const saveCreditMatrixBtn = document.getElementById("saveCreditMatrixBtn");
const priceAdminMessage = document.getElementById("priceAdminMessage");

const FIXED_TENORS = [11, 17, 23, 29, 35, 47];

let creditMatrixRows = [];

let leadsData = [];
let scansData = [];

initPriceAdmin();
checkSession();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginMessage.textContent = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  const { error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    loginMessage.textContent = "Login gagal. Periksa email dan password.";
    return;
  }

  showDashboard();
  loadData();
});

refreshBtn.addEventListener("click", loadData);
togglePriceAdminBtn.addEventListener("click", () => {
  priceAdminSection.classList.toggle("hidden");

  const isOpen = !priceAdminSection.classList.contains("hidden");

  togglePriceAdminBtn.textContent = isOpen ? "Tutup Atur Harga" : "Atur Harga";

  if (isOpen) {
    loadMotorPriceSetting();
    loadCreditMatrix();
  }
});
saveCashPriceBtn.addEventListener("click", saveCashPrice);

addDpRowBtn.addEventListener("click", () => {
  creditMatrixRows.push({
    dp_amount: "",
    installments: {}
  });

  renderCreditMatrix();
});

saveCreditMatrixBtn.addEventListener("click", saveCreditMatrix);

importExcelBtn.addEventListener("click", importPriceExcel);

priceMotorSelect.addEventListener("change", async () => {
  await loadMotorPriceSetting();
  await loadCreditMatrix();
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
});

copyLeadBtn.addEventListener("click", async () => {
  const text = buildLeadText();

  if (!text) {
    alert("Belum ada data lead.");
    return;
  }

  await navigator.clipboard.writeText(text);
  alert("List nomor berhasil dicopy.");
});

sendWaBtn.addEventListener("click", () => {
  const text = buildLeadText();

  if (!text) {
    alert("Belum ada data lead.");
    return;
  }

  const url = `https://wa.me/${BRAND_LINKS.adminWhatsappNumber}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
});

async function checkSession() {
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    showDashboard();
    loadData();
  }
}

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  priceAdminSection.classList.add("hidden");
  togglePriceAdminBtn.textContent = "Atur Harga";
}

function initPriceAdmin() {
  priceMotorSelect.innerHTML = "";

  MOTORS.forEach((motor) => {
    const option = document.createElement("option");
    option.value = motor.slug;
    option.textContent = motor.name;
    priceMotorSelect.appendChild(option);
  });
}

async function loadMotorPriceSetting() {
  const selectedMotor = getSelectedMotor();

  if (!selectedMotor) return;

  cashPriceInput.value = "";
  installmentScalingInput.value = "";
  priceAdminMessage.textContent = "";

  const { data, error } = await supabase
    .from("motor_prices")
    .select("cash_price, installment_scaling")
    .eq("unit_slug", selectedMotor.slug)
    .maybeSingle();

  if (error) {
    console.error(error);
    priceAdminMessage.textContent = "Gagal mengambil harga dan tambahan angsuran.";
    return;
  }

  if (!data) {
    return;
  }

  cashPriceInput.value = data.cash_price ? Number(data.cash_price) : "";
  installmentScalingInput.value = data.installment_scaling ? Number(data.installment_scaling) : "";
}

async function saveCashPrice() {
  const selectedMotor = getSelectedMotor();

  if (!selectedMotor) return;

  const cashPrice = onlyNumber(cashPriceInput.value);
  const installmentScaling = onlyNumber(installmentScalingInput.value) || 0;

  const payload = {
    unit_slug: selectedMotor.slug,
    unit_name: selectedMotor.name,
    installment_scaling: Number(installmentScaling),
    updated_at: new Date().toISOString()
  };

  // Harga cash hanya dikirim kalau inputnya diisi.
  // Jadi kalau kamu hanya ubah tambahan angsuran, harga cash lama tidak tertimpa kosong.
  if (cashPrice) {
    payload.cash_price = Number(cashPrice);
  }

  const { error } = await supabase
    .from("motor_prices")
    .upsert(payload, {
      onConflict: "unit_slug"
    });

  if (error) {
    console.error(error);
    priceAdminMessage.textContent = "Gagal menyimpan tambahan angsuran.";
    return;
  }

  priceAdminMessage.textContent = "Tambahan angsuran berhasil disimpan.";

  await loadMotorPriceSetting();
}

async function loadCreditMatrix() {
  const selectedMotor = getSelectedMotor();

  if (!selectedMotor) return;

  creditMatrixRows = [];

  const { data, error } = await supabase
    .from("credit_packages")
    .select("*")
    .eq("unit_slug", selectedMotor.slug)
    .eq("is_active", true)
    .order("dp_amount", { ascending: true })
    .order("tenor_months", { ascending: true });

  if (error) {
    console.error(error);
    priceAdminMessage.textContent = "Gagal mengambil simulasi kredit.";
    return;
  }

  const grouped = {};

  (data || []).forEach((item) => {
    const dp = Number(item.dp_amount);

    if (!grouped[dp]) {
      grouped[dp] = {
        dp_amount: dp,
        installments: {}
      };
    }

    grouped[dp].installments[item.tenor_months] = Number(item.installment_amount);
  });

  creditMatrixRows = Object.values(grouped);

  if (creditMatrixRows.length === 0) {
    creditMatrixRows.push({
      dp_amount: "",
      installments: {}
    });
  }

  renderCreditMatrix();
}

function renderCreditMatrix() {
  creditMatrixTable.innerHTML = "";

  creditMatrixRows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");

    const tenorInputs = FIXED_TENORS.map((tenor) => {
      const value = row.installments[tenor] || "";

      return `
        <td class="p-2 border">
          <input
            type="text"
            inputmode="numeric"
            class="form-input matrix-installment"
            data-row="${rowIndex}"
            data-tenor="${tenor}"
            value="${value}"
            placeholder="Angsuran"
          />
        </td>
      `;
    }).join("");

    tr.innerHTML = `
      <td class="p-2 border">
        <input
          type="text"
          inputmode="numeric"
          class="form-input matrix-dp"
          data-row="${rowIndex}"
          value="${row.dp_amount || ""}"
          placeholder="DP"
        />
      </td>

      ${tenorInputs}

      <td class="p-2 border">
        <button
          type="button"
          class="remove-dp-row bg-red-600 text-white px-3 py-2 rounded-lg font-bold"
          data-row="${rowIndex}"
        >
          Hapus
        </button>
      </td>
    `;

    creditMatrixTable.appendChild(tr);
  });

  document.querySelectorAll(".matrix-dp").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = onlyNumber(input.value);

      const rowIndex = Number(input.dataset.row);
      creditMatrixRows[rowIndex].dp_amount = input.value;
    });
  });

  document.querySelectorAll(".matrix-installment").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = onlyNumber(input.value);

      const rowIndex = Number(input.dataset.row);
      const tenor = Number(input.dataset.tenor);

      creditMatrixRows[rowIndex].installments[tenor] = input.value;
    });
  });

  document.querySelectorAll(".remove-dp-row").forEach((button) => {
    button.addEventListener("click", () => {
      const rowIndex = Number(button.dataset.row);
      creditMatrixRows.splice(rowIndex, 1);

      if (creditMatrixRows.length === 0) {
        creditMatrixRows.push({
          dp_amount: "",
          installments: {}
        });
      }

      renderCreditMatrix();
    });
  });
}

async function saveCreditMatrix() {
  const selectedMotor = getSelectedMotor();

  if (!selectedMotor) return;

  const rowsToSave = [];

  creditMatrixRows.forEach((row) => {
    const dpAmount = Number(row.dp_amount);

    if (!dpAmount) return;

    FIXED_TENORS.forEach((tenor) => {
      const installment = Number(row.installments[tenor]);

      if (!installment) return;

      rowsToSave.push({
        unit_slug: selectedMotor.slug,
        unit_name: selectedMotor.name,
        dp_amount: dpAmount,
        tenor_months: tenor,
        installment_amount: installment,
        is_active: true,
        sort_order: tenor,
        updated_at: new Date().toISOString()
      });
    });
  });

  if (rowsToSave.length === 0) {
    alert("Isi minimal 1 DP dan 1 angsuran.");
    return;
  }

  const { error: deleteError } = await supabase
    .from("credit_packages")
    .delete()
    .eq("unit_slug", selectedMotor.slug);

  if (deleteError) {
    console.error(deleteError);
    priceAdminMessage.textContent = "Gagal menghapus simulasi lama.";
    return;
  }

  const { error: insertError } = await supabase
    .from("credit_packages")
    .insert(rowsToSave);

  if (insertError) {
    console.error(insertError);
    priceAdminMessage.textContent = "Gagal menyimpan simulasi kredit.";
    return;
  }

  priceAdminMessage.textContent = "Simulasi kredit berhasil disimpan.";
  await loadCreditMatrix();
}

async function importPriceExcel() {
  const file = priceExcelInput.files[0];

  if (!file) {
    alert("Pilih file Excel terlebih dahulu.");
    return;
  }

  if (typeof XLSX === "undefined") {
    alert("Library Excel belum terbaca. Cek script xlsx di admin.html.");
    return;
  }

  priceAdminMessage.textContent = "Membaca file Excel...";

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  let successCount = 0;
  let totalCreditRows = 0;
  let skippedSheets = [];
  let emptySheets = [];
  let firstImportedMotor = null;

  for (const sheetName of workbook.SheetNames) {
    const motor = findMotorBySheetName(sheetName);

    if (!motor) {
      skippedSheets.push(sheetName);
      continue;
    }

    if (!firstImportedMotor) {
      firstImportedMotor = motor;
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: ""
    });

    const cashPrice = extractCashPrice(rows);
    const creditRows = extractCreditPackagesFromRows(rows, motor);

    if (!cashPrice && creditRows.length === 0) {
      emptySheets.push(sheetName);
      continue;
    }

    const { data: oldPriceData } = await supabase
      .from("motor_prices")
      .select("installment_scaling")
      .eq("unit_slug", motor.slug)
      .maybeSingle();

    const oldScaling = oldPriceData?.installment_scaling || 0;

    if (cashPrice) {
      const { error: priceError } = await supabase
        .from("motor_prices")
        .upsert({
          unit_slug: motor.slug,
          unit_name: motor.name,
          cash_price: Number(cashPrice),
          installment_scaling: Number(oldScaling),
          updated_at: new Date().toISOString()
        }, {
          onConflict: "unit_slug"
        });

      if (priceError) {
        console.error(priceError);
        priceAdminMessage.textContent = `Gagal menyimpan harga cash untuk ${motor.name}.`;
        return;
      }
    }

    // INI YANG MEMBUAT EXCEL MENIMPA DATA LAMA
    // Semua simulasi kredit lama untuk motor ini dihapus dulu
    const { error: deleteError } = await supabase
      .from("credit_packages")
      .delete()
      .eq("unit_slug", motor.slug);

    if (deleteError) {
      console.error(deleteError);
      priceAdminMessage.textContent = `Gagal menghapus simulasi lama untuk ${motor.name}.`;
      return;
    }

    // Setelah kosong, baru insert data baru dari Excel
    // Jadi kalau ada row DP yang dihapus di Excel, row itu tidak akan muncul lagi
    if (creditRows.length > 0) {
      const { error: insertError } = await supabase
        .from("credit_packages")
        .insert(creditRows);

      if (insertError) {
        console.error(insertError);
        priceAdminMessage.textContent = `Gagal menyimpan simulasi kredit untuk ${motor.name}.`;
        return;
      }

      totalCreditRows += creditRows.length;
    }

    successCount++;
  }

  if (firstImportedMotor) {
    priceMotorSelect.value = firstImportedMotor.slug;
  }

  await loadMotorPriceSetting();
  await loadCreditMatrix();
  await loadData();

  priceAdminMessage.textContent =
    `Import selesai. ${successCount} sheet berhasil diproses, ${totalCreditRows} data angsuran masuk.` +
    (skippedSheets.length ? ` Sheet dilewati: ${skippedSheets.join(", ")}.` : "") +
    (emptySheets.length ? ` Sheet kosong / format tidak terbaca: ${emptySheets.join(", ")}.` : "");
}

function findMotorBySheetName(sheetName) {
  const normalizedSheetName = normalizeText(sheetName);

  return MOTORS.find((motor) => {
    return (
      normalizeText(motor.name) === normalizedSheetName ||
      normalizeText(motor.slug) === normalizedSheetName
    );
  });
}

function extractCashPrice(rows) {
  for (const row of rows) {
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = normalizeText(row[colIndex]);

      if (cellValue === "hargacash" || cellValue === "cashprice") {
        const nextCell = row[colIndex + 1];
        return onlyNumber(nextCell);
      }
    }
  }

  return "";
}

function extractCreditPackagesFromRows(rows, motor) {
  const headerInfo = findCreditHeaderRow(rows);

  if (!headerInfo) {
    return [];
  }

  const { headerRowIndex, tenorColumns } = headerInfo;
  const packages = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const dpAmount = onlyNumber(row[0]);

    if (!dpAmount) continue;

    tenorColumns.forEach((item) => {
      const installmentAmount = onlyNumber(row[item.colIndex]);

      if (!installmentAmount) return;

      packages.push({
        unit_slug: motor.slug,
        unit_name: motor.name,
        dp_amount: Number(dpAmount),
        tenor_months: item.tenor,
        installment_amount: Number(installmentAmount),
        is_active: true,
        sort_order: item.tenor,
        updated_at: new Date().toISOString()
      });
    });
  }

  return packages;
}

function findCreditHeaderRow(rows) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    if (!row || row.length === 0) continue;

    const firstCell = normalizeText(row[0]);

    if (firstCell !== "dp") continue;

    const tenorColumns = [];

    row.forEach((cell, colIndex) => {
      const tenor = Number(onlyNumber(cell));

      if (FIXED_TENORS.includes(tenor)) {
        tenorColumns.push({
          tenor,
          colIndex
        });
      }
    });

    if (tenorColumns.length > 0) {
      return {
        headerRowIndex: rowIndex,
        tenorColumns
      };
    }
  }

  return null;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function loadData() {
  const leadsResult = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  const scansResult = await supabase
    .from("scans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (leadsResult.error) {
    alert("Gagal mengambil data leads.");
    console.error(leadsResult.error);
    return;
  }

  if (scansResult.error) {
    alert("Gagal mengambil data scans.");
    console.error(scansResult.error);
    return;
  }

  leadsData = leadsResult.data || [];
  scansData = scansResult.data || [];

  renderSummary();
  renderLeads();
  renderScans();
}

function renderSummary() {
  totalLead.textContent = leadsData.length;
  totalScan.textContent = scansData.length;

  const counter = {};

  scansData.forEach((scan) => {
    counter[scan.unit_name] = (counter[scan.unit_name] || 0) + 1;
  });

  let highestMotor = "-";
  let highestCount = 0;

  Object.keys(counter).forEach((motorName) => {
    if (counter[motorName] > highestCount) {
      highestMotor = motorName;
      highestCount = counter[motorName];
    }
  });

  topMotor.textContent = highestMotor;
}

function renderLeads() {
  leadsTable.innerHTML = "";

  leadsData.forEach((lead) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="p-2 border">${lead.name || "-"}</td>
      <td class="p-2 border">${lead.phone || "-"}</td>
    `;

    leadsTable.appendChild(tr);
  });
}

function renderScans() {
  scansTable.innerHTML = "";

  scansData.forEach((scan) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="p-2 border">${formatDate(scan.created_at)}</td>
      <td class="p-2 border">${scan.unit_name}</td>
      <td class="p-2 border">${scan.visitor_id || "-"}</td>
    `;

    scansTable.appendChild(tr);
  });
}

function buildLeadText() {
  if (leadsData.length === 0) return "";

  let text = "List Lead Honda:%0A%0A";

  leadsData.forEach((lead, index) => {
    text += `${index + 1}. ${lead.name} - ${lead.phone}%0A`;
  });

  return decodeURIComponent(text);
}

function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function getSelectedMotor() {
  const slug = priceMotorSelect.value;
  return MOTORS.find((motor) => motor.slug === slug);
}

function onlyNumber(value) {
  return String(value || "").replace(/\D/g, "");
}