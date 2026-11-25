export type CatalogItem = {
  sku: string; name: string; unit: string;
  reorder: number; cost: number; price: number;
};

export const ESSENTIAL_CATALOG: CatalogItem[] = [
  // Pharmaceuticals & IV fluids
  { sku: "PHAR-NS-1000", name: "Normal Saline 0.9% (1000ml)", unit: "bag", reorder: 20, cost: 3500, price: 5000 },
  { sku: "PHAR-RL-500", name: "Ringer's Lactate (500ml)", unit: "bag", reorder: 15, cost: 3000, price: 4500 },
  { sku: "PHAR-PARA-500", name: "Paracetamol 500mg tablets", unit: "strip", reorder: 30, cost: 500, price: 1000 },
  { sku: "PHAR-PARA-IV", name: "Paracetamol IV infusion", unit: "vial", reorder: 10, cost: 8000, price: 12000 },
  { sku: "PHAR-IBU-400", name: "Ibuprofen 400mg tablets", unit: "strip", reorder: 20, cost: 700, price: 1500 },
  { sku: "PHAR-CTX-1G", name: "Ceftriaxone 1g injection", unit: "vial", reorder: 10, cost: 5000, price: 8000 },
  { sku: "PHAR-AMC-625", name: "Amoxicillin/Clavulanate 625mg", unit: "strip", reorder: 20, cost: 4000, price: 6500 },
  { sku: "PHAR-OME-20", name: "Omeprazole 20mg capsules", unit: "strip", reorder: 20, cost: 1500, price: 3000 },
  { sku: "PHAR-ORS", name: "Oral Rehydration Salts (ORS)", unit: "sachet", reorder: 30, cost: 300, price: 700 },
  { sku: "PHAR-ADR-1ML", name: "Adrenaline/Epinephrine 1mg/ml ampoule", unit: "ampoule", reorder: 10, cost: 2500, price: 4000 },
  // Wound care & surgical consumables
  { sku: "WOUND-GAUZE", name: "Sterile gauze swabs", unit: "pack", reorder: 20, cost: 1500, price: 3000 },
  { sku: "WOUND-GLOVES-S", name: "Nitrile examination gloves (Small)", unit: "box", reorder: 10, cost: 12000, price: 18000 },
  { sku: "WOUND-GLOVES-M", name: "Nitrile examination gloves (Medium)", unit: "box", reorder: 10, cost: 12000, price: 18000 },
  { sku: "WOUND-GLOVES-L", name: "Nitrile examination gloves (Large)", unit: "box", reorder: 10, cost: 12000, price: 18000 },
  { sku: "WOUND-SYR-2", name: "Sterile syringe 2ml", unit: "piece", reorder: 50, cost: 300, price: 600 },
  { sku: "WOUND-SYR-5", name: "Sterile syringe 5ml", unit: "piece", reorder: 50, cost: 300, price: 600 },
  { sku: "WOUND-SYR-10", name: "Sterile syringe 10ml", unit: "piece", reorder: 50, cost: 400, price: 800 },
  { sku: "WOUND-NEEDLE", name: "Sterile needles 21G", unit: "piece", reorder: 50, cost: 150, price: 300 },
  { sku: "WOUND-CANN-18", name: "IV cannula 18G", unit: "piece", reorder: 20, cost: 800, price: 1500 },
  { sku: "WOUND-CANN-20", name: "IV cannula 20G", unit: "piece", reorder: 20, cost: 800, price: 1500 },
  { sku: "WOUND-CANN-22", name: "IV cannula 22G", unit: "piece", reorder: 20, cost: 800, price: 1500 },
  { sku: "WOUND-SUTURE", name: "Surgical sutures (pack)", unit: "pack", reorder: 10, cost: 5000, price: 8000 },
  { sku: "WOUND-CHLOR", name: "Chlorhexidine antiseptic solution", unit: "bottle", reorder: 10, cost: 6000, price: 10000 },
  { sku: "WOUND-POVI", name: "Povidone-iodine solution", unit: "bottle", reorder: 10, cost: 4000, price: 7000 },
  { sku: "WOUND-TAPE", name: "Medical adhesive tape", unit: "roll", reorder: 15, cost: 2000, price: 3500 },
  { sku: "WOUND-BANDAGE", name: "Elastic bandages", unit: "piece", reorder: 20, cost: 2500, price: 4500 },
  { sku: "WOUND-ALC-PAD", name: "Alcohol prep pads", unit: "pack", reorder: 30, cost: 1500, price: 3000 },
  // Diagnostics & lab supplies
  { sku: "DIAG-EDTA", name: "Blood collection tubes (EDTA)", unit: "piece", reorder: 50, cost: 400, price: 800 },
  { sku: "DIAG-SERUM", name: "Blood collection tubes (serum)", unit: "piece", reorder: 50, cost: 400, price: 800 },
  { sku: "DIAG-GLUCO-STRIP", name: "Glucometer test strips", unit: "pack", reorder: 20, cost: 8000, price: 12000 },
  { sku: "DIAG-LANCET", name: "Lancing devices", unit: "piece", reorder: 30, cost: 500, price: 1000 },
  { sku: "DIAG-RDT-MAL", name: "Malaria RDT kit", unit: "kit", reorder: 30, cost: 2500, price: 5000 },
  { sku: "DIAG-RDT-PREG", name: "Pregnancy test kit", unit: "kit", reorder: 20, cost: 1500, price: 3000 },
  { sku: "DIAG-ECG-ELEC", name: "ECG electrodes", unit: "pack", reorder: 20, cost: 3000, price: 5000 },
  { sku: "DIAG-ECG-PAPER", name: "ECG/thermal paper roll", unit: "roll", reorder: 10, cost: 8000, price: 15000 },
  // Equipment & devices
  { sku: "EQ-THERM-DIG", name: "Digital thermometer", unit: "unit", reorder: 5, cost: 15000, price: 25000 },
  { sku: "EQ-PULSOX", name: "Pulse oximeter (fingertip)", unit: "unit", reorder: 3, cost: 45000, price: 75000 },
  { sku: "EQ-BP-MON", name: "Blood pressure monitor", unit: "unit", reorder: 3, cost: 35000, price: 60000 },
  { sku: "EQ-STETH", name: "Stethoscope", unit: "unit", reorder: 3, cost: 15000, price: 28000 },
  { sku: "EQ-NEB-MASK", name: "Nebulizer mask & tubing", unit: "set", reorder: 10, cost: 3000, price: 6000 },
  { sku: "EQ-O2-CANN", name: "Oxygen nasal cannula", unit: "piece", reorder: 20, cost: 1500, price: 3000 },
  { sku: "EQ-O2-NRB", name: "Non-rebreather mask", unit: "piece", reorder: 10, cost: 4000, price: 7000 },
  { sku: "EQ-SUCT-CATH", name: "Suction catheters", unit: "piece", reorder: 30, cost: 300, price: 600 },
  { sku: "EQ-SHARPS", name: "Sharps disposal container", unit: "unit", reorder: 5, cost: 5000, price: 8000 },
];
