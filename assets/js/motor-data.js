export const MOTORS = [
  { id: "001", slug: "revo-fit", name: "Revo Fit" },
  { id: "002", slug: "revo-x", name: "Revo X" },
  { id: "003", slug: "supra-x-125-d", name: "Supra X 125 D" },
  { id: "004", slug: "supra-x-125-cw", name: "Supra X 125 CW" },

  { id: "005", slug: "verza-cw", name: "Verza CW" },
  { id: "006", slug: "verza-spoke", name: "Verza Spoke" },

  { id: "007", slug: "beat-esp-cbs", name: "Beat EsP CBS" },
  { id: "008", slug: "beat-esp-deluxe", name: "Beat EsP Deluxe" },
  { id: "009", slug: "beat-keyless", name: "Beat Keyless" },
  { id: "010", slug: "beat-street", name: "Beat Street" },

  { id: "011", slug: "genio-cbs", name: "Genio CBS" },
  { id: "012", slug: "genio-cbs-iss", name: "Genio CBS ISS" },

  { id: "013", slug: "scoopy-std", name: "Scoopy STD" },
  { id: "014", slug: "scoopy-smart-key", name: "Scoopy Smart Key" },

  { id: "015", slug: "vario-125-cbs", name: "Vario 125 CBS" },
  { id: "016", slug: "vario-125-cbs-iss", name: "Vario 125 CBS ISS" },
  { id: "017", slug: "vario-125-street", name: "Vario 125 Street" },

  { id: "018", slug: "vario-160-cbs", name: "Vario 160 CBS" },
  { id: "019", slug: "vario-160-bs", name: "Vario 160 BS" },

  { id: "020", slug: "stylo-cbs", name: "Stylo CBS" },
  { id: "021", slug: "stylo-abs", name: "Stylo ABS" },
  { id: "022", slug: "stylo-abs-se", name: "Stylo ABS SE" },

  { id: "023", slug: "pcx-160-cbs", name: "PCX 160 CBS" },
  { id: "024", slug: "pcx-160-abs", name: "PCX 160 ABS" },
  { id: "025", slug: "pcx-160-abs-roadsync", name: "PCX 160 ABS Roadsync" }
];

export function getMotorById(id) {
  return MOTORS.find((motor) => motor.id === id);
}

export function getMotorBySlug(slug) {
  return MOTORS.find((motor) => motor.slug === slug);
}