/**
 * Hand-built SVG artwork for the guest site: travel scenes for destinations
 * and offers, a hotel illustration for listings without photos, the hero
 * skyline, and empty-state spot illustrations.
 *
 * Scenes use fixed palettes (they're pictures, like a photo) with the sky as
 * a CSS gradient on the wrapper, so no SVG ids are needed and many instances
 * can share a page. Spot illustrations use theme tokens (fill-brand-*,
 * fill-sand-*…) so they follow light/dark mode.
 */

export type SceneTheme = "beach" | "mountains" | "city" | "heritage" | "forest" | "festive";

const SKIES: Record<SceneTheme, string> = {
  beach: "linear-gradient(180deg, #ff8a4c 0%, #ffc26b 60%, #ffd9a0 100%)",
  mountains: "linear-gradient(180deg, #5b7fd6 0%, #9fb4ea 55%, #d6e0f8 100%)",
  city: "linear-gradient(180deg, #1d1446 0%, #4a2a84 55%, #8a4fb0 100%)",
  heritage: "linear-gradient(180deg, #d9662a 0%, #f19a45 50%, #f8cf73 100%)",
  forest: "linear-gradient(180deg, #5cb89a 0%, #a9dcb8 55%, #e4f4d9 100%)",
  festive: "linear-gradient(180deg, #7d1740 0%, #c8345a 50%, #f38a45 100%)",
};

const KEYWORDS: [SceneTheme, string[]][] = [
  ["beach", ["goa", "candolim", "anjuna", "calangute", "baga", "kovalam", "varkala", "pondicherry", "puducherry", "andaman", "gokarna", "beach", "diu", "alibaug"]],
  ["mountains", ["manali", "shimla", "rishikesh", "mussoorie", "nainital", "leh", "ladakh", "darjeeling", "gangtok", "dharamshala", "ooty", "kodaikanal", "munnar", "madikeri", "coorg", "auli", "kasol"]],
  ["heritage", ["udaipur", "jaipur", "jodhpur", "jaisalmer", "agra", "varanasi", "hampi", "mysore", "mysuru", "khajuraho", "amritsar", "pushkar"]],
  ["city", ["mumbai", "bengaluru", "bangalore", "delhi", "gurugram", "gurgaon", "noida", "pune", "hyderabad", "chennai", "kolkata", "ahmedabad"]],
  ["forest", ["kerala", "alleppey", "alappuzha", "kumarakom", "wayanad", "thekkady", "jim corbett", "corbett", "ranthambore", "kabini", "lonavala"]],
];

const ALL: SceneTheme[] = ["beach", "mountains", "city", "heritage", "forest", "festive"];

/** Picks a fitting scene for a place name; unknown places get a stable pseudo-random one. */
export function sceneForPlace(name: string | null | undefined): SceneTheme {
  const n = (name ?? "").toLowerCase();
  for (const [theme, words] of KEYWORDS) if (words.some((w) => n.includes(w))) return theme;
  let h = 0;
  for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ALL[h % 5];
}

export function asSceneTheme(value: string | null | undefined): SceneTheme {
  return ALL.includes(value as SceneTheme) ? (value as SceneTheme) : "beach";
}

function BeachShapes() {
  return (
    <>
      <circle cx="300" cy="92" r="34" fill="#fff4cf" opacity=".95" />
      <path d="M0 132 H400 V182 H0Z" fill="#1e88c7" />
      <path d="M0 150 H400 V182 H0Z" fill="#1776b0" />
      <path d="M40 142h40M140 138h60M250 146h50M320 140h40M90 160h50M220 164h70" stroke="#8fd3f5" strokeWidth="3" strokeLinecap="round" opacity=".7" />
      <path d="M0 176 Q120 160 230 172 T400 168 V220 H0Z" fill="#f3c98b" />
      <path d="M0 196 Q140 184 260 194 T400 190 V220 H0Z" fill="#e8b777" />
      <path d="M78 196 C82 160 92 128 108 96" stroke="#5a3a22" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M108 96 C88 84 66 86 50 98 C70 92 88 94 104 102Z" fill="#1f6f45" />
      <path d="M108 96 C104 74 88 60 70 58 C86 70 96 82 102 100Z" fill="#23804f" />
      <path d="M108 96 C122 76 142 70 160 74 C142 80 126 88 112 102Z" fill="#1f6f45" />
      <path d="M108 96 C132 94 150 104 158 120 C142 108 126 104 110 102Z" fill="#23804f" />
      <path d="M108 96 C100 112 98 128 102 142 C104 126 108 112 114 100Z" fill="#1a6040" />
      <path d="M250 60 q8 -6 16 0 q8 -6 16 0" stroke="#7a3b1a" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".6" />
    </>
  );
}

function MountainShapes() {
  return (
    <>
      <circle cx="310" cy="70" r="26" fill="#fff8e1" opacity=".9" />
      <path d="M0 150 L70 80 L120 120 L190 50 L260 118 L320 70 L400 140 V220 H0Z" fill="#8fa6de" />
      <path d="M190 50 L172 68 L184 66 L192 76 L200 64 L210 70Z" fill="#fff" opacity=".95" />
      <path d="M320 70 L306 84 L318 82 L326 90 L334 80Z" fill="#fff" opacity=".9" />
      <path d="M0 170 L60 120 L130 160 L200 105 L280 158 L340 120 L400 160 V220 H0Z" fill="#5d77b8" />
      <path d="M0 196 Q100 170 200 188 T400 182 V220 H0Z" fill="#34497f" />
      {[[30, 196], [52, 200], [300, 190], [326, 196], [352, 192], [372, 198]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} l10 -34 l10 34Z`} fill="#22365f" />
      ))}
      <path d="M150 220 C160 200 190 196 205 186" stroke="#bcd3f5" strokeWidth="5" fill="none" opacity=".7" />
    </>
  );
}

function CityShapes() {
  const windows: [number, number][] = [];
  for (let x = 28; x < 390; x += 14) for (let y = 120; y < 196; y += 14) if ((x * 7 + y * 3) % 5 < 2) windows.push([x, y]);
  return (
    <>
      <circle cx="320" cy="52" r="18" fill="#fdf1c7" />
      <circle cx="328" cy="46" r="16" fill="#3a2270" opacity=".6" />
      {[[40, 30], [90, 55], [150, 22], [210, 48], [260, 20], [370, 70], [120, 80]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="#fff" opacity=".8" />
      ))}
      <path d="M0 220 V150 h30 v-30 h26 v40 h22 v-70 h34 v60 h20 v-40 h28 v80 h24 v-100 h8 v-14 h8 v14 h8 v100 h24 v-60 h30 v30 h22 v-50 h36 v70 h26 v-30 h24 V220Z" fill="#2a1f55" />
      {windows.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="4" height="5" fill="#ffd66b" opacity=".85" />
      ))}
      <path d="M0 220 V190 h50 v-16 h40 v26 h60 v-12 h50 v18 h70 v-22 h60 v14 h70 V220Z" fill="#120c2c" />
    </>
  );
}

function HeritageShapes() {
  return (
    <>
      <circle cx="200" cy="96" r="46" fill="#ffe7a3" opacity=".75" />
      <path d="M40 150 V112 h20 v-12 a14 14 0 0 1 28 0 v12 h24 v-22 a30 30 0 0 1 60 0 v22 h16 v-40 a34 34 0 0 1 68 0 v40 h16 v-22 a30 30 0 0 1 60 0 v22 h24 v-12 a14 14 0 0 1 28 0 v12 h20 V150Z" fill="#7a3417" />
      <path d="M202 36 v-14 M254 58 v-12 M142 58 v-12" stroke="#7a3417" strokeWidth="3" />
      {[70, 110, 150, 190, 230, 270, 310].map((x) => (
        <path key={x} d={`M${x} 150 v-16 a8 8 0 0 1 16 0 v16Z`} fill="#f5bd55" opacity=".85" />
      ))}
      <path d="M0 150 H400 V220 H0Z" fill="#b8572a" />
      <path d="M40 150 V176 h20 v8 a14 14 0 0 0 28 0 v-8 h24 v14 a30 30 0 0 0 60 0 v-14 h16 v26 a34 34 0 0 0 68 0 v-26 h16 v14 a30 30 0 0 0 60 0 v-14 h24 v8 a14 14 0 0 0 28 0 v-8 h20 V150Z" fill="#8f4020" opacity=".55" />
      <path d="M30 196h70M150 204h90M280 198h80" stroke="#f8cf73" strokeWidth="2.5" strokeLinecap="round" opacity=".5" />
    </>
  );
}

function ForestShapes() {
  const trees: [number, number, number][] = [[20, 178, 40], [48, 184, 50], [80, 176, 36], [300, 180, 44], [330, 186, 54], [364, 178, 40], [390, 184, 48]];
  return (
    <>
      <circle cx="90" cy="64" r="24" fill="#fffbe6" opacity=".9" />
      <path d="M0 140 Q80 96 170 130 T400 118 V220 H0Z" fill="#6fbf8f" />
      <path d="M0 164 Q110 128 220 158 T400 150 V220 H0Z" fill="#3f9a6e" />
      <path d="M150 220 C170 196 230 190 250 172 C262 162 300 160 320 150 L330 156 C308 168 276 172 262 182 C240 198 196 204 184 220Z" fill="#7fd0e8" opacity=".9" />
      <path d="M0 200 Q120 184 240 198 T400 194 V220 H0Z" fill="#1f6f55" />
      {trees.map(([x, y, h], i) => (
        <g key={i}>
          <path d={`M${x} ${y} l14 ${-h} l14 ${h}Z`} fill="#0e3a2c" />
          <rect x={x + 12} y={y} width="4" height="8" fill="#3b2a1a" />
        </g>
      ))}
    </>
  );
}

function FestiveShapes() {
  const flags = Array.from({ length: 11 }, (_, i) => 12 + i * 36);
  const colors = ["#ffd166", "#06d6a0", "#ef476f", "#118ab2", "#ffffff"];
  return (
    <>
      <path d="M0 28 Q200 70 400 28" stroke="#ffe3b3" strokeWidth="1.5" fill="none" />
      {flags.map((x, i) => {
        const y = 28 + Math.sin((x / 400) * Math.PI) * 30;
        return <path key={x} d={`M${x} ${y} l14 2 l-6 18Z`} fill={colors[i % colors.length]} opacity=".9" />;
      })}
      {[[60, 120, 14], [140, 96, 10], [250, 110, 16], [330, 90, 12]].map(([x, y, r], i) => (
        <g key={i}>
          <path d={`M${x} ${y - r - 14} v14`} stroke="#ffe3b3" strokeWidth="1.2" />
          <ellipse cx={x} cy={y} rx={r} ry={r * 1.25} fill={i % 2 ? "#ffb347" : "#ff6b6b"} opacity=".92" />
          <ellipse cx={x} cy={y} rx={r * 0.45} ry={r * 1.25} fill="#fff" opacity=".2" />
        </g>
      ))}
      <path d="M0 190 Q200 172 400 190 V220 H0Z" fill="#4c0d27" />
      {[80, 160, 240, 320].map((x) => (
        <g key={x}>
          <path d={`M${x - 12} 186 q12 14 24 0Z`} fill="#f6a93b" />
          <path d={`M${x} 184 q-5 -8 0 -16 q5 8 0 16Z`} fill="#ffe066" />
        </g>
      ))}
      {Array.from({ length: 18 }, (_, i) => (
        <circle key={i} cx={(i * 53) % 400} cy={60 + ((i * 37) % 100)} r={1.8} fill={colors[i % colors.length]} opacity=".8" />
      ))}
    </>
  );
}

const SHAPES: Record<SceneTheme, () => React.ReactElement> = {
  beach: BeachShapes,
  mountains: MountainShapes,
  city: CityShapes,
  heritage: HeritageShapes,
  forest: ForestShapes,
  festive: FestiveShapes,
};

/** A full-bleed travel scene; fills its (positioned) parent. */
export function Scene({ theme, className = "" }: { theme: SceneTheme; className?: string }) {
  const Shapes = SHAPES[theme];
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} style={{ background: SKIES[theme] }} aria-hidden>
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <Shapes />
      </svg>
    </div>
  );
}

/** Hotel facade used when a property or room has no photos yet. Follows the theme. */
export function HotelIllustration({ label = "Photos coming soon", compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-sand-100 to-accent-50" aria-hidden>
      <svg viewBox="0 0 200 130" className={compact ? "h-3/5 w-auto" : "h-2/3 w-auto max-w-[85%]"}>
        <ellipse cx="100" cy="124" rx="90" ry="6" className="fill-slate-300" opacity=".5" />
        <circle cx="160" cy="26" r="12" className="fill-accent-500" opacity=".35" />
        <path d="M22 122 c-2 -18 4 -30 10 -36 c6 6 12 18 10 36Z" className="fill-success-600" opacity=".75" />
        <path d="M160 122 c-2 -22 4 -36 12 -44 c8 8 14 22 12 44Z" className="fill-success-600" opacity=".75" />
        <rect x="52" y="28" width="96" height="94" rx="3" className="fill-brand-200" />
        <rect x="46" y="22" width="108" height="10" rx="2" className="fill-brand-500" />
        <rect x="80" y="12" width="40" height="12" rx="2" className="fill-accent-500" />
        <text x="100" y="21" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">HOTEL</text>
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <rect key={`${row}-${col}`} x={62 + col * 20} y={40 + row * 16} width="12" height="9" rx="1.5" className={(row + col) % 3 === 0 ? "fill-amber-200" : "fill-surface"} />
          ))
        )}
        <path d="M78 104 h44 l-4 -6 h-36Z" className="fill-accent-500" />
        <rect x="88" y="104" width="24" height="18" rx="1.5" className="fill-brand-700" opacity=".85" />
      </svg>
      {!compact && label && (
        <span className="mt-1 rounded-full bg-surface/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      )}
    </div>
  );
}

/** Soft skyline/landscape silhouette for the bottom edge of the navy hero. */
export function HeroArt() {
  return (
    <svg viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full sm:h-56" aria-hidden>
      <path d="M0 150 L120 90 L210 130 L330 60 L450 128 L560 84 L680 140 L800 100 L920 150 L1040 80 L1170 132 L1290 92 L1440 140 V220 H0Z" fill="#fff" opacity=".05" />
      <g fill="#fff" opacity=".08">
        <path d="M60 220 V170 h30 v-24 h24 v44 h20 v-60 h30 v60 h18 v-30 h22 v50Z" />
        <path d="M520 220 v-40 h16 v-10 a12 12 0 0 1 24 0 v10 h20 v-20 a26 26 0 0 1 52 0 v20 h14 v-34 a30 30 0 0 1 60 0 v34 h14 v-20 a26 26 0 0 1 52 0 v20 h20 v-10 a12 12 0 0 1 24 0 v10 h16 v40Z" />
        <path d="M1180 220 V160 h26 v-40 h30 v60 h22 v-80 h8 v-12 h8 v12 h8 v80 h24 v-50 h28 v70Z" />
      </g>
      <g fill="#fff" opacity=".1">
        <path d="M330 220 C334 190 342 170 356 150" stroke="#fff" strokeWidth="6" fill="none" />
        <path d="M356 150 c-16 -10 -34 -8 -46 2 c16 -4 30 -2 42 6Z M356 150 c-2 -18 -14 -30 -30 -32 c12 10 20 20 24 34Z M356 150 c12 -16 28 -20 44 -16 c-14 4 -28 10 -40 20Z M356 150 c20 0 34 8 40 22 c-12 -10 -26 -14 -38 -14Z" />
        <path d="M1000 220 C1003 196 1010 180 1022 164" stroke="#fff" strokeWidth="5" fill="none" />
        <path d="M1022 164 c-14 -8 -28 -6 -38 2 c14 -4 24 -2 34 4Z M1022 164 c10 -14 24 -16 36 -12 c-12 4 -24 8 -32 16Z M1022 164 c16 0 28 6 32 18 c-10 -8 -22 -12 -30 -12Z" />
      </g>
      <path d="M0 200 Q360 176 720 196 T1440 190 V220 H0Z" fill="#fff" opacity=".06" />
    </svg>
  );
}

/** Small spot illustrations for empty and error states. */
export function EmptyArt({ kind, className = "h-28 w-auto" }: { kind: "search" | "trips" | "offers" | "error"; className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden>
      <ellipse cx="80" cy="110" rx="60" ry="6" className="fill-slate-200" />
      {kind === "search" && (
        <>
          <path d="M22 30 l36 -10 l40 10 l40 -10 v70 l-40 10 l-40 -10 l-36 10Z" className="fill-brand-100" />
          <path d="M58 20 v70 M98 30 v70" className="stroke-brand-200" strokeWidth="2" />
          <path d="M34 70 q20 -30 44 -6 t48 -20" className="stroke-accent-500" strokeWidth="2.5" strokeDasharray="4 4" fill="none" />
          <circle cx="104" cy="58" r="20" className="fill-surface stroke-brand-500" strokeWidth="5" />
          <path d="M118 72 l16 16" className="stroke-brand-500" strokeWidth="7" strokeLinecap="round" />
        </>
      )}
      {kind === "trips" && (
        <>
          <rect x="42" y="40" width="76" height="60" rx="8" className="fill-accent-500" />
          <path d="M64 40 v-10 a6 6 0 0 1 6 -6 h20 a6 6 0 0 1 6 6 v10" className="stroke-brand-700" strokeWidth="5" fill="none" />
          <rect x="42" y="60" width="76" height="6" className="fill-accent-600" />
          <circle cx="56" cy="102" r="4" className="fill-slate-500" />
          <circle cx="104" cy="102" r="4" className="fill-slate-500" />
          <rect x="54" y="48" width="18" height="8" rx="2" className="fill-surface" opacity=".7" />
          <path d="M128 30 l4 8 l8 2 l-8 3 l-4 8 l-3 -8 l-8 -3 l8 -2Z" className="fill-amber-400" />
        </>
      )}
      {kind === "offers" && (
        <>
          <rect x="44" y="50" width="72" height="50" rx="6" className="fill-brand-500" />
          <rect x="38" y="38" width="84" height="16" rx="4" className="fill-brand-600" />
          <rect x="74" y="38" width="12" height="62" className="fill-accent-500" />
          <path d="M80 38 c-10 -18 -30 -16 -26 -4 c2 6 16 6 26 4Z M80 38 c10 -18 30 -16 26 -4 c-2 6 -16 6 -26 4Z" className="fill-accent-500" />
        </>
      )}
      {kind === "error" && (
        <>
          <path d="M80 18 L140 100 H20Z" className="fill-amber-200" />
          <rect x="76" y="46" width="8" height="30" rx="4" className="fill-amber-800" />
          <circle cx="80" cy="88" r="5" className="fill-amber-800" />
        </>
      )}
    </svg>
  );
}
