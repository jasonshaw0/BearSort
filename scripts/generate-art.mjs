import { mkdirSync, writeFileSync } from "node:fs";
const root = "public/assets";
for (const path of ["items", "bears", "producers"])
  mkdirSync(`${root}/${path}`, { recursive: true });
const wrap = (body, bg = "#fff7e5") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="51" r="43" fill="${bg}" opacity=".8"/><ellipse cx="50" cy="84" rx="25" ry="5" fill="#543c29" opacity=".1"/>${body}</svg>`;
const berry = (x, y, s = 1) =>
  `<path d="M${x} ${y - 9 * s}q0 -7 ${6 * s} -8" stroke="#527b44" stroke-width="${3 * s}" fill="none"/><circle cx="${x}" cy="${y}" r="${9 * s}" fill="#b84d68" stroke="#763d4c" stroke-width="2"/><circle cx="${x - 3 * s}" cy="${y - 3 * s}" r="${2 * s}" fill="#f6c1bb"/>`;
const fish = (x, y, s = 1) =>
  `<path d="M${x - 19 * s} ${y}l-${11 * s} -${9 * s}v${18 * s}z" fill="#5f9cac" stroke="#416d78" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="${20 * s}" ry="${11 * s}" fill="#7eb7c0" stroke="#416d78" stroke-width="2"/><circle cx="${x + 10 * s}" cy="${y - 2 * s}" r="2" fill="#344b4d"/><path d="M${x - 8 * s} ${y - 8 * s}l${7 * s} -${9 * s}l${5 * s} ${8 * s}" fill="#5f9cac"/>`;
const honey = (x, y, s = 1) =>
  `<path d="M${x - 12 * s} ${y - 13 * s}l${24 * s} 0l${10 * s} ${14 * s}l-${10 * s} ${15 * s}h-${24 * s}l-${10 * s} -${15 * s}z" fill="#f1bd50" stroke="#b77f32" stroke-width="2"/><path d="M${x - 10 * s} ${y}h${20 * s}M${x} ${y - 12 * s}v${26 * s}" stroke="#ffe2a0" stroke-width="2"/>`;
const pillow = (x, y, s = 1) =>
  `<path d="M${x - 20 * s} ${y - 14 * s}q${20 * s} -${7 * s} ${40 * s} 0q${-5 * s} ${14 * s} 0 ${28 * s}q-${20 * s} ${7 * s} -${40 * s} 0q${5 * s} -${14 * s} 0 -${28 * s}z" fill="#c0a8ce" stroke="#8b70a1" stroke-width="2.5"/><path d="M${x} ${y - 8 * s}v${16 * s}m-${8 * s} -${8 * s}h${16 * s}" stroke="#eee3f0" stroke-width="2"/>`;
const twig = (x, y, s = 1) =>
  `<path d="M${x - 20 * s} ${y + 13 * s}l${40 * s} -${26 * s}M${x - 17 * s} ${y - 10 * s}l${35 * s} ${22 * s}M${x - 9 * s} ${y + 17 * s}l${14 * s} -${31 * s}" stroke="#8d6445" stroke-width="${5 * s}" stroke-linecap="round"/><path d="M${x + 9 * s} ${y - 10 * s}q${15 * s} -${16 * s} ${15 * s} -${4 * s}q-${6 * s} ${6 * s} -${15 * s} ${4 * s}z" fill="#7eaa68"/>`;
const jar = (fill) =>
  `<rect x="28" y="33" width="44" height="45" rx="10" fill="${fill}" stroke="#8b6850" stroke-width="3"/><path d="M28 40q22 8 44 0" stroke="#fff8df" stroke-width="5" fill="none"/><rect x="30" y="26" width="40" height="9" rx="3" fill="#bd9262"/><rect x="37" y="48" width="26" height="17" rx="6" fill="#fff5df" opacity=".85"/>`;
const plate = `<ellipse cx="50" cy="70" rx="32" ry="13" fill="#fffdf4" stroke="#baa88c" stroke-width="3"/>`;
const bow = `<path d="M37 23q-13 -13 -11 1q4 11 15 6q11 7 18 0q13 5 15 -6q1 -13 -14 -2" fill="#d99075" stroke="#9b6559" stroke-width="2"/><circle cx="50" cy="27" r="6" fill="#e9aa8e"/>`;
function itemArt(chain, tier) {
  let body = "";
  if (chain === "forest")
    body = [
      berry(50, 54, 1.5),
      `<path d="M22 63q28 17 56 0l-6 15H28z" fill="#b58c5d" stroke="#856440" stroke-width="3"/>${berry(38, 48, 0.9)}${berry(55, 46, 0.9)}${berry(69, 51, 0.8)}`,
      jar("#b95868"),
      `${plate}<path d="M27 63l10 -28h27l10 28z" fill="#d9a879" stroke="#a87552" stroke-width="3"/>${berry(50, 53, 0.85)}`,
      `${plate}<path d="M25 66q1 -27 25 -29q24 2 25 29z" fill="#dbad71" stroke="#a8784f" stroke-width="3"/>${berry(41, 48, 0.7)}${berry(59, 48, 0.7)}${berry(50, 58, 0.7)}`,
      `${plate}<path d="M23 61q3 -27 27 -28q24 1 27 28z" fill="#e6b578" stroke="#a8794d" stroke-width="3"/>${[32, 44, 56, 68].map((x) => berry(x, 51, 0.62)).join("")}${bow}`,
    ][tier - 1];
  if (chain === "honey")
    body = [
      honey(50, 52, 1.4),
      jar("#e7b74f"),
      `<path d="M28 36h44l-5 39H33z" fill="#edbd53" stroke="#ac7939" stroke-width="3"/><path d="M25 34h50" stroke="#c7934e" stroke-width="8" stroke-linecap="round"/>`,
      `${plate}<path d="M28 63l11 -25h24l11 25z" fill="#dbab70" stroke="#a47753" stroke-width="3"/><path d="M37 47q13 11 26 0" stroke="#eebc45" stroke-width="7" fill="none"/>`,
      `${plate}<path d="M28 64v-24q22 -15 44 0v24z" fill="#eabf77" stroke="#a8794d" stroke-width="3"/><path d="M29 47q20 14 42 0" stroke="#f2ce63" stroke-width="8" fill="none"/>${honey(50, 30, 0.45)}`,
      `${plate}<path d="M23 64v-24q27 -17 54 0v24z" fill="#e7b96e" stroke="#ab7948" stroke-width="3"/><path d="M24 48q25 15 52 0" stroke="#f6d574" stroke-width="9" fill="none"/>${honey(50, 29, 0.55)}${bow}`,
    ][tier - 1];
  if (chain === "fish")
    body = [
      fish(55, 52, 1),
      `${fish(47, 42, 0.75)}${fish(59, 61, 0.7)}`,
      `<path d="M21 52q29 40 58 0l-6 20H27z" fill="#b58a5b" stroke="#816141" stroke-width="3"/>${fish(46, 47, 0.65)}${fish(63, 54, 0.55)}`,
      `${plate}${fish(54, 52, 0.9)}<path d="M31 72q18 -18 37 0" stroke="#7ca66a" stroke-width="4" fill="none"/>`,
      `${plate}${fish(52, 52, 1.1)}<path d="M30 74q20 -15 39 0" stroke="#7ca66a" stroke-width="5" fill="none"/>`,
      `${plate}${fish(52, 49, 1.1)}${fish(45, 63, 0.55)}<path d="M25 75q23 -15 50 0" stroke="#7ca66a" stroke-width="6" fill="none"/>${bow}`,
    ][tier - 1];
  if (chain === "comfort")
    body = [
      `<circle cx="50" cy="52" r="23" fill="#bd9dcc" stroke="#846a9b" stroke-width="3"/><path d="M31 45q24 -17 39 10q-15 27 -36 9" stroke="#e5d4e9" stroke-width="3" fill="none"/>`,
      pillow(50, 52, 1),
      `${pillow(50, 53, 1.25)}<circle cx="50" cy="52" r="5" fill="#e9d9ed"/>`,
      `<path d="M22 37q28 -11 56 0v36q-29 12 -56 0z" fill="#b99ecd" stroke="#81699b" stroke-width="3"/><path d="M27 45q23 -9 46 0M27 56q23 -9 46 0" stroke="#e7d9ed" stroke-width="3" fill="none"/>`,
      `<path d="M22 55q0 -25 28 -25t28 25v23H22z" fill="#ae8bbd" stroke="#735a87" stroke-width="3"/>${pillow(50, 51, 0.75)}<path d="M27 74h46" stroke="#755b6d" stroke-width="6"/>`,
      `<path d="M16 57q0 -25 34 -27q34 2 34 27v21H16z" fill="#ad8bbd" stroke="#735a87" stroke-width="3"/>${pillow(50, 49, 0.8)}<path d="M22 74h56" stroke="#755b6d" stroke-width="6"/>${bow}`,
    ][tier - 1];
  if (chain === "camp")
    body = [
      twig(50, 52, 1),
      `${twig(44, 50, 1)}<path d="M25 70h50" stroke="#8d6445" stroke-width="9"/>`,
      `<path d="M37 42h26l-4 34H41z" fill="#f4d27c" stroke="#745d46" stroke-width="3"/><path d="M39 42l11 -14l11 14" fill="none" stroke="#745d46" stroke-width="3"/><path d="M31 76h38" stroke="#745d46" stroke-width="5"/>`,
      `<path d="M22 56q28 20 56 0l-7 19H29z" fill="#b88b57" stroke="#795c3b" stroke-width="3"/><path d="M23 52h54" stroke="#795c3b" stroke-width="5"/>${berry(42, 47, 0.6)}${honey(60, 48, 0.45)}`,
      `<path d="M16 73L49 28l35 45z" fill="#8aa78c" stroke="#56765d" stroke-width="3"/><path d="M49 28v45M38 73l11 -27l12 27" stroke="#d5dfbe" stroke-width="3" fill="none"/>`,
      `<path d="M13 74L46 29l35 45z" fill="#7e9f83" stroke="#527457" stroke-width="3"/><path d="M46 29v45M35 74l11 -27l12 27" stroke="#d5dfbe" stroke-width="3" fill="none"/><path d="M73 48l11 -19l8 19z" fill="#6c956c"/>${bow}`,
    ][tier - 1];
  return wrap(
    body,
    {
      forest: "#f9e5e7",
      honey: "#fff0ce",
      fish: "#e2f2f0",
      comfort: "#f0e8f5",
      camp: "#eaf2df",
    }[chain],
  );
}
for (const chain of ["forest", "honey", "fish", "comfort", "camp"])
  for (let tier = 1; tier <= 6; tier++)
    writeFileSync(`${root}/items/${chain}-${tier}.svg`, itemArt(chain, tier));
const producerBodies = {
  basket: `<path d="M23 53q27 27 54 0l-6 25H29z" fill="#ae8257" stroke="#705339" stroke-width="3"/><path d="M24 54q0 -36 26 -36t26 36" fill="none" stroke="#8a6541" stroke-width="6"/>${berry(37, 49, 0.7)}${berry(52, 45, 0.85)}${berry(65, 49, 0.7)}`,
  beehive: `<path d="M26 73q-1 -42 24 -45q25 3 24 45z" fill="#edbf60" stroke="#9c733b" stroke-width="3"/><path d="M28 46h44M26 59h48" stroke="#ce9a43" stroke-width="4"/><ellipse cx="50" cy="66" rx="8" ry="6" fill="#775539"/>`,
  fishing: `<path d="M17 73q35 -15 66 0" stroke="#5d9fae" stroke-width="12" fill="none"/><path d="M29 71l21 -43l24 43" stroke="#8c6b4b" stroke-width="5" fill="none"/>${fish(49, 60, 0.65)}`,
  crate: `<path d="M20 40h60v35H20z" fill="#bc9267" stroke="#7b5c41" stroke-width="3"/><path d="M20 40l11 -12h49l-1 12" fill="#d6b087" stroke="#7b5c41" stroke-width="3"/>${pillow(49, 44, 0.6)}`,
  pack: `<rect x="27" y="30" width="46" height="48" rx="12" fill="#79976d" stroke="#516e51" stroke-width="3"/><rect x="34" y="46" width="32" height="23" rx="5" fill="#9ab286" stroke="#516e51" stroke-width="2"/><path d="M36 30v-8h28v8M26 39h48" stroke="#725c43" stroke-width="5" fill="none"/>`,
};
for (const [id, body] of Object.entries(producerBodies))
  writeFileSync(`${root}/producers/${id}.svg`, wrap(body, "#f5edcf"));
const bearColors = {
  bruno: ["#a47a59", "#76543c", "#e9bf9a"],
  maple: ["#3e3b39", "#262729", "#b49377"],
  pippa: ["#f8f6eb", "#d5d9d3", "#e7cfbe"],
  bao: ["#f2eee4", "#333333", "#e9cfb9"],
  sunny: ["#c68d49", "#765034", "#e6b882"],
  tilly: ["#8b715d", "#654e43", "#dec1a4"],
};
for (const [id, [fur, shade, muzzle]] of Object.entries(bearColors)) {
  const markings =
    id === "pippa"
      ? `<path d="M25 52q25 -18 50 0" fill="none" stroke="#d9dfd8" stroke-width="4"/>`
      : id === "bao"
        ? `<ellipse cx="36" cy="51" rx="12" ry="16" fill="#343333"/><ellipse cx="64" cy="51" rx="12" ry="16" fill="#343333"/>`
        : id === "sunny"
          ? `<path d="M31 34q19 18 38 0" fill="none" stroke="#edc58e" stroke-width="8"/>`
          : id === "tilly"
            ? `<path d="M27 49q8 -19 19 -1M54 48q11 -18 20 1" fill="none" stroke="#ecd6b7" stroke-width="8"/>`
            : "";
  const accessory =
    id === "bruno"
      ? `<path d="M21 75q29 18 58 0" fill="none" stroke="#6b8d71" stroke-width="8"/>`
      : id === "maple"
        ? `<path d="M17 73q33 14 66 0" fill="none" stroke="#b85f58" stroke-width="8"/>`
        : id === "pippa"
          ? `<path d="M23 76q26 17 54 0" fill="none" stroke="#81aab6" stroke-width="8"/>`
          : id === "bao"
            ? `<path d="M25 78q26 15 50 0" fill="none" stroke="#9aaa6b" stroke-width="8"/>`
            : id === "sunny"
              ? `<path d="M28 79q22 11 44 0" fill="none" stroke="#dca746" stroke-width="8"/>`
              : `<circle cx="36" cy="52" r="12" fill="none" stroke="#725d55" stroke-width="2"/><circle cx="64" cy="52" r="12" fill="none" stroke="#725d55" stroke-width="2"/><path d="M48 52h4" stroke="#725d55" stroke-width="2"/>`;
  const body = `<circle cx="22" cy="25" r="14" fill="${shade}"/><circle cx="78" cy="25" r="14" fill="${shade}"/><circle cx="22" cy="25" r="8" fill="${muzzle}"/><circle cx="78" cy="25" r="8" fill="${muzzle}"/><ellipse cx="50" cy="55" rx="38" ry="40" fill="${fur}" stroke="${shade}" stroke-width="2"/>${markings}<ellipse cx="50" cy="65" rx="22" ry="16" fill="${muzzle}"/><circle cx="37" cy="51" r="3.5" fill="#332c2a"/><circle cx="63" cy="51" r="3.5" fill="#332c2a"/><path d="M44 61q6 -5 12 0q-1 7 -6 7q-5 0 -6 -7z" fill="#513b37"/><path d="M45 72q5 5 10 0" stroke="#684841" stroke-width="2" fill="none"/>${accessory}`;
  writeFileSync(
    `${root}/bears/${id}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`,
  );
}
