export const CATEGORY_COLORS = {
  "ciencias": { color: "var(--accent-green)", bg: "rgba(16, 185, 129, 0.1)" },
  "humanas": { color: "var(--accent-purple)", bg: "rgba(139, 92, 246, 0.1)" },
  "exatas": { color: "var(--accent-blue)", bg: "rgba(79, 172, 254, 0.1)" },
  "linguagens": { color: "var(--accent-pink)", bg: "rgba(236, 72, 153, 0.1)" },
  "tecnologia": { color: "var(--accent-cyan)", bg: "rgba(0, 242, 254, 0.1)" },
  "custom": { color: "var(--accent-orange)", bg: "rgba(245, 158, 11, 0.1)" }
};

export const getCategoryLabel = (cat) => {
  const dict = {
    "ciencias": "Ciências",
    "humanas": "Humanas",
    "exatas": "Exatas",
    "linguagens": "Linguagens",
    "tecnologia": "Tecnologia",
    "custom": "Personalizado"
  };
  return dict[cat] || "Personalizado";
};
