// Generates lightweight placeholder craft SVGs for the seed/demo. Not part of the
// app — real photos come from artisan uploads. Run: node scripts/make-samples.mjs
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const dir = join(process.cwd(), "public", "samples");
mkdirSync(dir, { recursive: true });

const palettes = {
  silk: ["#C1440E", "#E9A319", "#2E3192", "#F26B21"],
  dokra: ["#6B4226", "#B87333", "#E9A319", "#3D2210"],
  terracotta: ["#A8431E", "#C1440E", "#E9A319", "#7A4E2D"],
  raw: ["#8F7A5E", "#C9B89A", "#6B5546", "#E9A319"],
};

function craftSvg({ w = 800, h = 600, colors, label, motif = "weave" }) {
  const [a, b, c, d] = colors;
  let pattern = "";
  if (motif === "weave") {
    for (let y = 0; y < h; y += 24) {
      pattern += `<rect x="0" y="${y}" width="${w}" height="12" fill="${y % 48 === 0 ? a : b}" opacity="0.85"/>`;
    }
    for (let x = 0; x < w; x += 24) {
      pattern += `<rect x="${x}" y="0" width="12" height="${h}" fill="${x % 48 === 0 ? c : d}" opacity="0.35"/>`;
    }
  } else {
    for (let i = 0; i < 40; i++) {
      const cx = Math.round(((i * 137) % w));
      const cy = Math.round(((i * 211) % h));
      const r = 8 + ((i * 13) % 40);
      pattern += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${[a, b, c, d][i % 4]}" opacity="0.5"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
  <rect width="${w}" height="${h}" fill="${d}"/>
  ${pattern}
  <rect x="24" y="${h - 72}" width="${label.length * 13 + 40}" height="44" rx="10" fill="#2B1D14" opacity="0.72"/>
  <text x="44" y="${h - 42}" font-family="Noto Sans, sans-serif" font-size="24" fill="#FDF8F0">${label}</text>
</svg>`;
}

const files = {
  "silk-raw.svg": { colors: palettes.raw, label: "Mulberry silk & natural dyes", motif: "weave" },
  "silk-crafting.svg": { colors: palettes.silk, label: "Weaving on the pit loom", motif: "weave" },
  "silk-finishing.svg": { colors: palettes.silk, label: "Zari border & finishing", motif: "weave" },
  "silk-completed.svg": { colors: palettes.silk, label: "Completed Kanchipuram saree", motif: "weave" },
  "dokra.svg": { colors: palettes.dokra, label: "Dokra metal art", motif: "dots" },
  "terracotta.svg": { colors: palettes.terracotta, label: "Molela terracotta", motif: "dots" },
  "artisan-lakshmi.svg": { colors: palettes.silk, label: "Lakshmi Devi", motif: "weave", w: 480, h: 480 },
  "artisan-rama.svg": { colors: palettes.dokra, label: "Rama Rao", motif: "dots", w: 480, h: 480 },
  "artisan-meena.svg": { colors: palettes.terracotta, label: "Meena Kumari", motif: "dots", w: 480, h: 480 },
  "hero.svg": { colors: palettes.silk, label: "Handcrafted in India", motif: "weave", w: 1200, h: 800 },
};

for (const [name, opts] of Object.entries(files)) {
  writeFileSync(join(dir, name), craftSvg(opts));
}
console.log(`Wrote ${Object.keys(files).length} sample SVGs to public/samples`);
