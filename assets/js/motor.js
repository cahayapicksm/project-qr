import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, BRAND_LINKS } from "./config.js";
import { getMotorById } from "./motor-data.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const motorId = params.get("id");

const motor = getMotorById(motorId);

const unitNameEl = document.getElementById("unitName");
const carouselTrack = document.getElementById("carouselTrack");
const carouselDots = document.getElementById("carouselDots");

const infoTabBtn = document.getElementById("infoTabBtn");
const priceTabBtn = document.getElementById("priceTabBtn");
const infoPanel = document.getElementById("infoPanel");
const pricePanel = document.getElementById("pricePanel");

const specOfficialLink = document.getElementById("specOfficialLink");
const waLink = document.getElementById("waLink");
const igLink = document.getElementById("igLink");
const tiktokLink = document.getElementById("tiktokLink");

const cashPriceText = document.getElementById("cashPriceText");
const dpSelect = document.getElementById("dpSelect");
const tenorSelect = document.getElementById("tenorSelect");
const installmentBox = document.getElementById("installmentBox");
const installmentText = document.getElementById("installmentText");
const creditEmptyText = document.getElementById("creditEmptyText");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const leadForm = document.getElementById("leadForm");
const nameInput = document.getElementById("nameInput");
const phoneInput = document.getElementById("phoneInput");
phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, "");
});

const formMessage = document.getElementById("formMessage");

let currentImageIndex = 0;
let images = [];

const FIXED_TENORS = [11, 17, 23, 29, 35, 47];

let motorPrice = null;
let creditPackages = [];
let selectedPackage = null;

if (!motor) {
  document.title = "Motor Tidak Ditemukan";
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
    images = [createPlaceholderImage(motor.name)];
  }

  currentImageIndex = 0;
  renderCarousel();
  updateCarousel();
  startAutoplay();
  setupSwipe();

  infoTabBtn.classList.add("active");

  specOfficialLink.href = motor.productUrl;

  const waMessage = encodeURIComponent(
    `Halo, saya tertarik dengan ${motor.name}. Mohon info spesifikasi dan harga.`
  );

  waLink.href = `https://wa.me/${BRAND_LINKS.whatsappNumber}?text=${waMessage}`;
  igLink.href = BRAND_LINKS.instagram;
  tiktokLink.href = BRAND_LINKS.tiktok;

  await loadPriceAndCredit();
}

async function loadPriceAndCredit() {
  const priceResult = await supabase
    .from("motor_prices")
    .select("*")
    .eq("unit_slug", motor.slug)
    .maybeSingle();

  if (priceResult.error) {
    console.error("Gagal mengambil harga cash:", priceResult.error);
  }

  motorPrice = priceResult.data || null;

  if (motorPrice && motorPrice.cash_price) {
    cashPriceText.textContent = formatRupiah(motorPrice.cash_price);
  } else {
    cashPriceText.textContent = "Hubungi dealer";
  }

  const creditResult = await supabase
    .from("credit_packages")
    .select("*")
    .eq("unit_slug", motor.slug)
    .eq("is_active", true)
    .order("dp_amount", { ascending: true })
    .order("tenor_months", { ascending: true });

  if (creditResult.error) {
    console.error("Gagal mengambil paket kredit:", creditResult.error);
    creditEmptyText.classList.remove("hidden");
    return;
  }

  creditPackages = creditResult.data || [];

  if (creditPackages.length === 0) {
    creditEmptyText.classList.remove("hidden");
    dpSelect.disabled = true;
    tenorSelect.disabled = true;
    return;
  }

  creditEmptyText.classList.add("hidden");
  dpSelect.disabled = false;
  renderDpOptions();
}

function renderDpOptions() {
  const uniqueDps = [...new Set(creditPackages.map((item) => Number(item.dp_amount)))];

  dpSelect.innerHTML = `<option value="">Pilih DP</option>`;

  uniqueDps.forEach((dp) => {
    const option = document.createElement("option");
    option.value = dp;
    option.textContent = formatRupiah(dp);
    dpSelect.appendChild(option);
  });

  tenorSelect.innerHTML = `<option value="">Pilih Tenor</option>`;
  tenorSelect.disabled = true;
}

function renderTenorOptions(selectedDp) {
  tenorSelect.innerHTML = `<option value="">Pilih Tenor</option>`;

  FIXED_TENORS.forEach((tenor) => {
    const packageItem = creditPackages.find((item) => {
      return (
        Number(item.dp_amount) === Number(selectedDp) &&
        Number(item.tenor_months) === Number(tenor)
      );
    });

    const option = document.createElement("option");
    option.value = tenor;

    if (packageItem) {
      option.textContent = `${tenor} bulan`;
    } else {
      option.textContent = `${tenor} bulan - belum tersedia`;
      option.disabled = true;
    }

    tenorSelect.appendChild(option);
  });

  tenorSelect.disabled = false;
}

prevBtn.addEventListener("click", () => {
  prevSlide();
  resetAutoplay();
});

nextBtn.addEventListener("click", () => {
  nextSlide();
  resetAutoplay();
});

infoTabBtn.addEventListener("click", () => {
  infoPanel.classList.remove("hidden");
  pricePanel.classList.add("hidden");

  infoTabBtn.classList.add("active");
  priceTabBtn.classList.remove("active");
});

priceTabBtn.addEventListener("click", () => {
  pricePanel.classList.remove("hidden");
  infoPanel.classList.add("hidden");

  priceTabBtn.classList.add("active");
  infoTabBtn.classList.remove("active");
});


let autoplayInterval = null;

function startAutoplay() {
  stopAutoplay();

  if (images.length <= 1) return;

  autoplayInterval = setInterval(() => {
    nextSlide();
  }, 3500);
}

function stopAutoplay() {
  if (autoplayInterval) {
    clearInterval(autoplayInterval);
    autoplayInterval = null;
  }
}

function resetAutoplay() {
  startAutoplay();
}

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

dpSelect.addEventListener("change", () => {
  const selectedDp = dpSelect.value;

  selectedPackage = null;
  installmentBox.classList.add("hidden");
  installmentText.textContent = "Rp 0 / bulan";

  if (!selectedDp) {
    tenorSelect.innerHTML = `<option value="">Pilih Tenor</option>`;
    tenorSelect.disabled = true;
    return;
  }

  renderTenorOptions(selectedDp);
});

tenorSelect.addEventListener("change", () => {
  const selectedDp = dpSelect.value;
  const selectedTenor = tenorSelect.value;

  selectedPackage = creditPackages.find((item) => {
    return (
      Number(item.dp_amount) === Number(selectedDp) &&
      Number(item.tenor_months) === Number(selectedTenor)
    );
  });

  if (!selectedPackage) {
    installmentBox.classList.add("hidden");
    return;
  }

  const finalInstallment = getFinalInstallment(selectedPackage.installment_amount);

  installmentText.textContent = `${formatRupiah(finalInstallment)} / bulan`;
  installmentBox.classList.remove("hidden");
});

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

  showMessage("Terima kasih. Tim kami akan segera menghubungi Anda melalui WhatsApp untuk penawaran terbaik.", "success");
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

function formatRupiah(value) {
  if (!value) return "Rp 0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function getInstallmentScaling() {
  return Number(motorPrice?.installment_scaling || 0);
}

function getFinalInstallment(baseInstallment) {
  return Number(baseInstallment || 0) + getInstallmentScaling();
}

function showMessage(message, type) {
  const isSuccess = type === "success";

  formMessage.className = `form-message ${type}`;

  formMessage.innerHTML = `
    <span class="message-icon">
      <i class="fa-solid ${isSuccess ? "fa-circle-check" : "fa-circle-exclamation"}"></i>
    </span>

    <span class="message-text">
      <strong>${isSuccess ? "Data berhasil dikirim!" : "Periksa kembali data Anda"}</strong>
      <small>${message}</small>
    </span>
  `;
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

function renderCarousel() {
  carouselTrack.innerHTML = "";
  carouselDots.innerHTML = "";

  images.forEach((imageSrc, index) => {
    const slide = document.createElement("div");
    slide.className = "carousel-slide";

    const img = document.createElement("img");
    img.src = imageSrc;
    img.alt = `${motor.name} ${index + 1}`;

    slide.appendChild(img);
    carouselTrack.appendChild(slide);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "carousel-dot";
    dot.setAttribute("aria-label", `Slide ${index + 1}`);
    dot.addEventListener("click", () => {
      currentImageIndex = index;
      updateCarousel();
      resetAutoplay();
    });

    carouselDots.appendChild(dot);
  });

  const shouldHideControls = images.length <= 1;

  prevBtn.classList.toggle("hidden", shouldHideControls);
  nextBtn.classList.toggle("hidden", shouldHideControls);
  carouselDots.style.display = shouldHideControls ? "none" : "flex";
}

function updateCarousel() {
  const offset = -currentImageIndex * 100;
  carouselTrack.style.transform = `translateX(${offset}%)`;

  const dots = carouselDots.querySelectorAll(".carousel-dot");
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentImageIndex);
  });
}

function nextSlide() {
  if (images.length <= 1) return;

  currentImageIndex++;
  if (currentImageIndex >= images.length) {
    currentImageIndex = 0;
  }

  updateCarousel();
}

function prevSlide() {
  if (images.length <= 1) return;

  currentImageIndex--;
  if (currentImageIndex < 0) {
    currentImageIndex = images.length - 1;
  }

  updateCarousel();
}

let touchStartX = 0;
let touchEndX = 0;

function setupSwipe() {
  carouselTrack.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].screenX;
  });

  carouselTrack.addEventListener("touchend", (event) => {
    touchEndX = event.changedTouches[0].screenX;
    handleSwipe();
  });
}

function handleSwipe() {
  const diff = touchEndX - touchStartX;

  if (Math.abs(diff) < 40) return;

  if (diff < 0) {
    nextSlide();
  } else {
    prevSlide();
  }

  resetAutoplay();
}