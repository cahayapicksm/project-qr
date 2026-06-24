import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, BRAND_LINKS } from "./config.js";

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

const totalScan = document.getElementById("totalScan");
const totalLead = document.getElementById("totalLead");
const topMotor = document.getElementById("topMotor");

const leadsTable = document.getElementById("leadsTable");
const scansTable = document.getElementById("scansTable");

let leadsData = [];
let scansData = [];

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
    const waMessage = encodeURIComponent(
      `Halo ${lead.name}, saya dari Honda. Kami ingin memberikan penawaran khusus untuk ${lead.unit_name}.`
    );

    const waUrl = `https://wa.me/${lead.phone}?text=${waMessage}`;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="p-2 border">${formatDate(lead.created_at)}</td>
      <td class="p-2 border">${lead.unit_name}</td>
      <td class="p-2 border">${lead.name}</td>
      <td class="p-2 border">${lead.phone}</td>
      <td class="p-2 border">
        <a href="${waUrl}" target="_blank" class="text-green-600 font-bold">
          Chat WA
        </a>
      </td>
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
    text += `${index + 1}. ${lead.name} - ${lead.phone} - ${lead.unit_name}%0A`;
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