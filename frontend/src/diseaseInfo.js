// Plant Disease Diagnostic Encyclopedia & Advisory
export const DISEASE_ADVISORY = {
  "healthy": {
    type: "healthy",
    status: "Healthy Crop",
    severity: "None",
    description: "The plant exhibits vibrant foliage, standard coloration, and no signs of bacterial or fungal infection.",
    action: "Maintain routine irrigation schedule, balanced N-P-K fertilization, and inspect weekly for early signs of pests.",
    organic: "Apply compost tea monthly to strengthen soil microbiome and plant immune resistance.",
    chemical: "No chemical fungicides or bactericides required."
  },
  "blight": {
    type: "fungal",
    status: "Blight Disease",
    severity: "High",
    description: "Blight causes rapid browning, dark water-soaked concentric lesions, and tissue collapse on leaves and stems.",
    action: "Prune infected leaves immediately. Avoid overhead sprinkler irrigation to keep foliage dry.",
    organic: "Spray copper fungicide or neem oil solution every 7 to 10 days during humid weather.",
    chemical: "Apply chlorothalonil or mancozeb preventative sprays at the onset of symptoms."
  },
  "scab": {
    type: "fungal",
    status: "Scab Infection",
    severity: "Moderate",
    description: "Causes dark olive, velvety spots on leaf surfaces that turn corky, puckered, and cause premature leaf drop.",
    action: "Rake and destroy fallen leaves in autumn to eliminate overwintering fungal spores.",
    organic: "Apply sulfur or lime-sulfur sprays before bud break and after rain events.",
    chemical: "Use captan, myclobutanil, or strobilurin-class fungicides."
  },
  "rust": {
    type: "fungal",
    status: "Rust Fungus",
    severity: "Moderate",
    description: "Characterized by orange, reddish-brown, or yellow powdery pustules primarily on lower leaf undersides.",
    action: "Ensure adequate plant spacing to maximize air circulation. Avoid high nitrogen fertilizers.",
    organic: "Dust with wettable sulfur powder or biofungicides containing Bacillus subtilis.",
    chemical: "Treat with propiconazole, tebuconazole, or azoxystrobin."
  },
  "spot": {
    type: "bacterial_fungal",
    status: "Leaf Spot Infection",
    severity: "Moderate",
    description: "Small brown or dark circular spots with distinct yellow halos developing across foliage.",
    action: "Remove spotted foliage; sterilize pruning shears between cuts using 70% isopropyl alcohol.",
    organic: "Copper octanoate (copper soap) or baking soda spray (1 tbsp/gallon water + horticultural oil).",
    chemical: "Apply copper hydroxide or broad-spectrum protectant fungicides."
  },
  "powdery mildew": {
    type: "fungal",
    status: "Powdery Mildew",
    severity: "Moderate",
    description: "White talcum powder-like fungal patches on leaf surfaces, causing leaf curling and reduced photosynthesis.",
    action: "Position plants in full sun and reduce relative humidity around plant canopy.",
    organic: "Spray potassium bicarbonate solution or diluted milk spray (40% milk, 60% water) in sunlight.",
    chemical: "Use sulfur, trifloxystrobin, or penconazole."
  },
  "mold": {
    type: "fungal",
    status: "Leaf Mold",
    severity: "Moderate",
    description: "Pale green to yellow spots on leaf tops with olive-brown velvety mold growth underneath.",
    action: "Increase greenhouse ventilation, keep nighttime temperatures warm, and lower relative humidity below 85%.",
    organic: "Bio-fungicides like Trichoderma harzianum or copper soaps.",
    chemical: "Difenoconazole, mandipropamid, or cyazofamid."
  },
  "mosaic": {
    type: "viral",
    status: "Mosaic Virus",
    severity: "Critical",
    description: "Mottled dark and light green patterns, distorted blistered leaf blades, and severe plant stunting.",
    action: "Viral infections cannot be cured. Carefully rogue (uproot) and destroy infected plants to prevent vector spread.",
    organic: "Control aphid and thrips vectors using insecticidal soap and reflective silver mulch.",
    chemical: "No direct chemical viricides; manage insect vectors with systemic insecticides if necessary."
  },
  "default": {
    type: "advisory",
    status: "Identified Plant Condition",
    severity: "Moderate",
    description: "Abnormal leaf pigmentation or structural changes detected by deep neural network inference.",
    action: "Isolate affected specimens, inspect underside of leaves for insect pests, and sanitize farm tools.",
    organic: "Apply cold-pressed organic neem oil spray during evening hours.",
    chemical: "Consult local agricultural extension service for targeted region-specific treatment."
  }
};

export function getAdvisoryForClass(className) {
  const lower = className.toLowerCase();
  if (lower.includes("healthy")) {
    return DISEASE_ADVISORY["healthy"];
  }
  for (const key of Object.keys(DISEASE_ADVISORY)) {
    if (key !== "healthy" && key !== "default" && lower.includes(key)) {
      return DISEASE_ADVISORY[key];
    }
  }
  return DISEASE_ADVISORY["default"];
}
