import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, BRAND_LINKS } from "./config.js";
import { getMotorById } from "./motor-data.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const motorId = params.get("id");

const motor = getMotorById(motorId);

const unitNameEl = document.getElementById("unitName");
const carouselImage = document.getElementById("carouselImage");

const specLink = document.getElementById("specLink");
const priceLink = document.getElementById("priceLink");

const waLink = document.getElementById("waLink");
const igLink = document.getElementById("igLink");
const tiktokLink = document.getElementById("tiktokLink");
const communityLink = document.getElementById("communityLink");
const welovehondaLink = document.getElementById("welovehondaLink");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const leadForm = document.getElementById("leadForm");
const nameInput = document.getElementById("nameInput");
const phoneInput = document.getElementById("phoneInput");
const formMessage = document.getElementById("formMessage");

let currentImageIndex = 0;
let images = [];

if (!motor) {
  document.body.innerHTML = `
    <div style="padding: 30px; text-align: center;">
      <h1>Motor tidak ditemukan</h1>
      <p>Pastikan link QR benar.</p>
    </div>
  `;
} else {
  initPage();
  saveScan();
}

async function initPage() {
  unitNameEl.textContent = motor.name;
  document.title = motor.name;

    images = await loadAvailableImages(motor.slug);

    if (images.length === 0) {
    carouselImage.src = createPlaceholderImage(motor.name);
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    } else {
    currentImageIndex = 0;
    carouselImage.src = images[currentImageIndex];

    if (images.length <= 1) {
        prevBtn.style.display = "none";
        nextBtn.style.display = "none";
    } else {
        prevBtn.style.display = "flex";
        nextBtn.style.display = "flex";
    }
    }

  specLink.textContent = `Spesifikasi ${motor.name}`;
  priceLink.textContent = `Harga ${motor.name}`;

    specLink.href = motor.productUrl;
    priceLink.href = motor.productUrl;

    specLink.target = "_blank";
    priceLink.target = "_blank";

    specLink.rel = "noopener noreferrer";
    priceLink.rel = "noopener noreferrer";

  const waMessage = encodeURIComponent(
    `Halo, saya tertarik dengan ${motor.name}. Mohon info spesifikasi dan harga.`
  );

  waLink.href = `https://wa.me/${BRAND_LINKS.whatsappNumber}?text=${waMessage}`;
  igLink.href = BRAND_LINKS.instagram;
  tiktokLink.href = BRAND_LINKS.tiktok;
  communityLink.href = BRAND_LINKS.hondaCommunity;
  welovehondaLink.href = BRAND_LINKS.weLoveHonda;
}

prevBtn.addEventListener("click", () => {
  currentImageIndex--;

  if (currentImageIndex < 0) {
    currentImageIndex = images.length - 1;
  }

  carouselImage.src = images[currentImageIndex];
});

nextBtn.addEventListener("click", () => {
  currentImageIndex++;

  if (currentImageIndex >= images.length) {
    currentImageIndex = 0;
  }

  carouselImage.src = images[currentImageIndex];
});

setInterval(() => {
  if (!motor) return;

  currentImageIndex++;

  if (currentImageIndex >= images.length) {
    currentImageIndex = 0;
  }

  carouselImage.src = images[currentImageIndex];
}, 4000);

async function saveScan() {
  let visitorId = localStorage.getItem("visitor_id");

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("visitor_id", visitorId);
  }

  await supabase.from("scans").insert({
    unit_slug: motor.slug,
    unit_name: motor.name,
    visitor_id: visitorId,
    user_agent: navigator.userAgent
  });
}

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const phone = normalizePhone(phoneInput.value);

  if (!name || !phone) {
    showMessage("Nama dan nomor HP wajib diisi.", "error");
    return;
  }

  const { error } = await supabase.from("leads").insert({
    unit_slug: motor.slug,
    unit_name: motor.name,
    name: name,
    phone: phone
  });

  if (error) {
    showMessage("Gagal mengirim data. Coba lagi.", "error");
    console.error(error);
    return;
  }

  showMessage("Data berhasil dikirim. Tim kami akan menghubungi Anda.", "success");
  leadForm.reset();
});

function normalizePhone(phone) {
  let result = phone.replace(/\D/g, "");

  if (result.startsWith("0")) {
    result = "62" + result.substring(1);
  }

  if (result.startsWith("8")) {
    result = "62" + result;
  }

  return result;
}

function showMessage(message, type) {
  formMessage.textContent = message;

  if (type === "success") {
    formMessage.style.color = "green";
  } else {
    formMessage.style.color = "red";
  }
}

async function loadAvailableImages(slug) {
  try {
    const response = await fetch("assets/data/motor-images.json");

    if (!response.ok) {
      throw new Error("Manifest gambar tidak ditemukan.");
    }

    const manifest = await response.json();
    const files = manifest[slug] || [];

    return files.map((file) => `images/${slug}/${file}`);
  } catch (error) {
    console.error("Gagal membaca manifest gambar:", error);
    return [];
  }
}

function createPlaceholderImage(motorName) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <text x="50%" y="48%" text-anchor="middle" font-size="24" font-family="Arial" fill="#64748b">
        Gambar belum tersedia
      </text>
      <text x="50%" y="58%" text-anchor="middle" font-size="18" font-family="Arial" fill="#94a3b8">
        ${motorName}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}