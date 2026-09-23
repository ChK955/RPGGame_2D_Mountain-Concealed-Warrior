/** Original deterministic vector artwork rasterized to replaceable PNG assets.
 * All actor poses share a 128×128 cell, a (64,104) foot anchor and one palette.
 * Run `npm run assets` to rebuild. No network assets or external artwork.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public/assets');
const svg = (w, h, content) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${content}</svg>`;
const png = async (name, w, h, content) => {
  const output = path.join(root, name);
  await mkdir(path.dirname(output), { recursive: true });
  await sharp(Buffer.from(svg(w, h, content))).png().toFile(output);
};
let seed = 1447;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

function actorFrame(kind, row, frame) {
  const player = kind === 'player';
  const elite = kind === 'elite';
  const phase = frame / 8 * Math.PI * 2;
  const running = row === 1;
  const airborne = row === 2 || row === 3;
  const attacking = row === 4 || row === 5;
  const hurt = row === 6;
  const dying = row === 7;
  const bob = running ? -Math.abs(Math.sin(phase)) * 2 : Math.sin(phase) * 0.65;
  const stride = running ? Math.sin(phase) * 11 : airborne ? 5 : 0;
  const cloth = player ? '#71b8ac' : elite ? '#b08d67' : '#927675';
  const dark = player ? '#254f50' : elite ? '#493e40' : '#493b47';
  const mid = player ? '#447d77' : elite ? '#816248' : '#71535b';
  const trim = player ? '#bbded0' : '#c5b99e';
  const scarf = player ? '#b5d3c0' : '#d37761';
  const swing = Math.sin(phase + 0.7) * (running ? 7 : 3);
  const lean = running ? 7 : hurt ? -8 : airborne ? 3 : 0;
  let transform = `translate(${lean} ${bob})`;
  if (dying) transform = `translate(${frame * 0.6} ${Math.min(frame, 5) * 0.4}) rotate(${-Math.min(frame, 5) * 15} 64 98)`;
  let effects = '';
  if (attacking && frame > 1 && frame < 6) {
    const opacity = (frame === 2 || frame === 5) ? 0.45 : 0.9;
    effects = `<path d="M 75 22 Q 131 36 115 80 Q 110 94 88 99 Q 111 76 108 54 Q 107 35 75 22" fill="${player ? '#c2eee0' : '#e6ae89'}" opacity="${opacity}"/><path d="M 82 27 Q 121 46 109 83" fill="none" stroke="#eff8e9" stroke-width="1.4" opacity="${opacity}"/>`;
  }
  const swordAngle = attacking ? [-75, -100, -55, 5, 52, 65, 20, 28][frame] : airborne ? 42 : 28 + Math.sin(phase) * 2;
  const legs = `<path d="M 58 76 L ${56 - stride} 97 L ${51 - stride} 104 L ${63 - stride} 104 L 68 81" fill="#122c34"/><path d="M 67 77 L ${70 + stride} ${airborne ? 94 : 100} L ${65 + stride} ${airborne ? 99 : 104} L ${79 + stride} ${airborne ? 99 : 104} L ${76 + stride} 97 L 75 77" fill="#244249"/><path d="M ${51 - stride} 103 L ${62 - stride} 103 M ${66 + stride} ${airborne ? 98 : 103} L ${78 + stride} ${airborne ? 98 : 103}" stroke="#7a9790" stroke-width="1.4"/>`;
  const cloak = `<path d="M 58 45 Q 43 60 ${39 - swing} 89 L ${48 - swing} 94 L 55 90 L 67 94 L 83 85 Q 78 61 73 47 Z" fill="${dark}" stroke="#152e34" stroke-width="1.5"/><path d="M 58 46 L 71 48 L 73 74 L 66 88 L 55 82 L ${48 - swing * 0.5} 86 Q 49 64 58 46" fill="${cloth}"/><path d="M 62 52 L 58 78 L 64 85 L 71 73 L 70 53" fill="${mid}"/><path d="M 57 48 L 66 62 L 73 49" fill="none" stroke="${trim}" stroke-width="2"/><path d="M 50 81 L 56 75 M 70 72 L 77 86" fill="none" stroke="${trim}" stroke-width="1" opacity=".45"/><path d="M 53 65 L 74 63 L 75 70 L 53 71 Z" fill="#1b363b"/><path d="M 62 66 L 69 66 L 69 70 L 62 70 Z" fill="#bbad7c"/>`;
  const head = player
    ? `<path d="M 60 29 Q 75 27 77 36 L 75 47 L 64 50 L 58 42 Z" fill="#d0d2b3"/><path d="M 62 40 L 77 38 L 75 48 L 65 51 Z" fill="#1e454b"/><path d="M 58 32 L 61 45 L 52 48 L 55 32" fill="#9fc6b5"/><path d="M 44 31 L 64 16 L 84 33 L 68 36 Z" fill="#345e5d" stroke="#acc0a0" stroke-width="1.3"/><path d="M 47 31 L 80 32 L 64 21 Z" fill="#678c78"/><path d="M 59 23 L 55 30 M 65 20 L 67 30 M 70 25 L 74 30" stroke="#8da58a" stroke-width="1"/><path d="M 72 36 L 76 35" stroke="#eef3d6" stroke-width="1.5"/>`
    : `<path d="M 56 28 L 68 23 L 80 31 L 78 47 L 68 51 L 57 44 Z" fill="${dark}" stroke="#152932" stroke-width="1.5"/><path d="M 68 28 L 78 32 L 78 44 L 72 49 L 66 43 Z" fill="${elite ? '#d0c3a2' : '#b5ada3'}"/><path d="M 71 35 L 79 35" stroke="#f59d78" stroke-width="2"/><path d="M 72 41 L 76 42 L 73 45" stroke="#594641" fill="none"/><path d="M 58 31 L 51 42 L 54 57 L 63 44" fill="${mid}"/>${elite ? '<path d="M 57 29 L 53 12 L 63 25 M 74 26 L 82 14 L 81 33" fill="#d5b581"/><path d="M 56 50 L 43 46 L 39 59 L 52 63 M 75 50 L 86 48 L 92 61 L 79 65" fill="#8a7557" stroke="#bd9e74"/>' : ''}`;
  const scarfSvg = `<path d="M 58 44 L 75 47 L 73 52 L 58 50 Q 42 55 ${27 - swing} ${43 + swing * 0.5} L ${37 - swing} ${46 + swing * 0.5} Q 49 46 58 44" fill="${scarf}" opacity=".95"/>`;
  const arm = `<path d="M 73 52 L 79 59 L 81 66 L 73 67 L 67 57 Z" fill="${mid}"/><path d="M 78 63 L 83 63 L 85 69 L 79 71 Z" fill="#ced1b5"/><g transform="rotate(${swordAngle} 82 66)"><path d="M 80 64 L 81 24 L 84 17 L 85 64 Z" fill="${player ? '#d4efe1' : '#c5c5ae'}"/><path d="M 84 23 L 84 60" stroke="#8ab0aa"/><path d="M 76 63 L 89 63 L 89 66 L 76 66 Z" fill="#b89d66"/><path d="M 81 66 L 85 66 L 85 77 L 81 77 Z" fill="#233b3d"/></g>`;
  return `${effects}<g transform="${transform}">${legs}<path d="M 50 54 L 35 97 L 39 99 L 55 55" stroke="#1b282e" stroke-width="4"/>${cloak}${scarfSvg}${head}${arm}</g>`;
}

for (const kind of ['player', 'enemy', 'elite']) {
  let contents = '';
  for (let row = 0; row < 8; row++) {
    for (let frame = 0; frame < 8; frame++) {
      contents += `<svg x="${frame * 128}" y="${row * 128}" width="128" height="128" viewBox="0 0 128 128">${actorFrame(kind, row, frame)}</svg>`;
    }
  }
  await png(`characters/${kind}.png`, 1024, 1024, contents);
}

await png('environment/sky.png', 1280, 720, `
  <defs>
    <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#06171e"/><stop offset=".53" stop-color="#17363c"/><stop offset="1" stop-color="#243f40"/></linearGradient>
    <radialGradient id="halo"><stop stop-color="#a9c9b9" stop-opacity=".11"/><stop offset="1" stop-color="#adcac1" stop-opacity="0"/></radialGradient>
    <linearGradient id="moon" x2=".5" y2="1"><stop stop-color="#d8ddbe"/><stop offset="1" stop-color="#8caa9c"/></linearGradient>
    <linearGradient id="cloud"><stop stop-color="#91ae9e" stop-opacity="0"/><stop offset=".5" stop-color="#8faea2" stop-opacity=".07"/><stop offset="1" stop-color="#91ae9e" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#sky)"/>
  <circle cx="956" cy="182" r="198" fill="url(#halo)"/>
  <circle cx="956" cy="182" r="52" fill="url(#moon)"/>
  <circle cx="934" cy="169" r="16" fill="#aec5ad" opacity=".17"/>
  <circle cx="970" cy="201" r="23" fill="#789c90" opacity=".12"/>
  <path d="M 583 168 Q 820 148 1199 180 L 1260 186 Q 906 173 552 186 Z" fill="url(#cloud)"/>
  <path d="M 140 242 Q 604 216 1120 254 L 1180 266 Q 683 251 70 273 Z" fill="url(#cloud)"/>
  ${Array.from({ length: 50 }, () => `<circle cx="${random() * 1280}" cy="${40 + random() * 235}" r="${random() * .8 + .3}" fill="#b1cbc2" opacity="${random() * .28 + .05}"/>`).join('')}
`);

await png('environment/mountains-far.png', 2560, 720, `
  <defs><linearGradient id="mountain" x2="0" y2="1"><stop stop-color="#294c50"/><stop offset="1" stop-color="#193b40"/></linearGradient></defs>
  <path d="M 0 463 L 103 395 L 150 380 L 259 274 L 282 289 L 343 198 L 371 206 L 421 171 L 438 186 L 488 334 L 550 371 L 612 301 L 640 318 L 713 275 L 760 317 L 786 290 L 866 436 L 913 400 L 1017 332 L 1042 276 L 1100 252 L 1145 305 L 1190 311 L 1279 446 L 1340 410 L 1420 351 L 1487 195 L 1538 246 L 1569 217 L 1652 348 L 1700 375 L 1743 320 L 1779 341 L 1805 278 L 1834 296 L 1870 371 L 1943 437 L 2014 359 L 2058 259 L 2091 292 L 2140 259 L 2199 323 L 2240 375 L 2320 411 L 2400 374 L 2490 442 L 2560 463 L 2560 720 L 0 720 Z" fill="url(#mountain)"/>
  <path d="M 421 171 L 391 294 L 367 326 L 348 382 L 315 424 L 345 345 L 367 293 Z M 1487 195 L 1462 333 L 1424 396 L 1450 293 Z M 2091 292 L 2091 358 L 2139 421 L 2084 382 L 2068 331 Z" fill="#35575a" opacity=".45"/>
  <path d="M 0 530 Q 274 439 490 506 T 1000 503 T 1450 501 T 1960 514 T 2560 530 L 2560 720 L 0 720" fill="#1c3c40" opacity=".5"/>
`);

let pines = '';
for (let i = 0; i < 74; i++) {
  const x = i * 35 + random() * 20;
  const y = 492 + Math.sin(x / 215) * 35;
  const h = 20 + random() * 65;
  pines += `<path d="M ${x} ${y} L ${x} ${y - h} M ${x - h / 5} ${y - h * .3} L ${x} ${y - h * .8} L ${x + h / 4} ${y - h * .3} M ${x - h / 6} ${y - h * .6} L ${x} ${y - h} L ${x + h / 6} ${y - h * .6}" stroke="#112e35" stroke-width="3" fill="#112e35"/>`;
}
await png('environment/mountains-near.png', 2560, 720, `
  <path d="M 0 516 Q 150 378 380 490 Q 602 364 800 511 Q 1020 397 1230 493 Q 1540 404 1700 520 Q 1930 369 2190 490 Q 2430 408 2560 516 L 2560 720 L 0 720 Z" fill="#14353b"/>
  ${pines}
  <path d="M 1560 450 L 1560 354 L 1590 354 L 1590 445 M 1670 445 L 1670 354 L 1700 354 L 1700 450" fill="#102e35"/>
  <path d="M 1519 361 Q 1588 345 1625 319 Q 1660 346 1740 361 L 1727 369 L 1530 369 Z M 1553 322 Q 1605 305 1625 282 Q 1647 307 1697 322 L 1680 329 L 1570 329 Z" fill="#102e35"/>
  <path d="M 0 581 Q 564 550 1170 589 T 2560 581 L 2560 720 L 0 720 Z" fill="#133137"/>
`);

await png('environment/ruin.png', 460, 360, `
  <path d="M 45 360 L 55 199 L 85 174 L 100 184 L 102 360 M 332 360 L 331 154 L 365 146 L 385 181 L 395 360" fill="#17343a" stroke="#305056" stroke-width="2"/>
  <path d="M 24 191 L 45 179 L 62 182 L 70 146 L 109 161 L 124 152 L 151 165 L 174 158 L 211 164 L 231 143 L 269 156 L 299 142 L 348 149 L 383 126 L 389 156 L 434 157 L 416 180 L 370 188 L 296 183 L 256 191 L 181 180 L 123 198 Z" fill="#1b3a3f" stroke="#37575a" stroke-width="2"/>
  <path d="M 53 159 Q 140 126 227 67 Q 319 119 391 126 L 383 148 Q 305 145 227 91 Q 169 145 53 175 Z" fill="#173138"/>
  <path d="M 58 155 Q 162 124 226 70 M 228 73 Q 303 119 389 127" fill="none" stroke="#466363" stroke-width="3"/>
  <path d="M 222 71 L 225 47 L 231 65 L 237 60 L 231 78" fill="#334f50"/>
  <path d="M 73 201 L 67 231 L 78 249 L 71 263 M 368 167 L 348 196 L 359 226 L 350 256 M 187 167 L 194 184 M 285 159 L 276 183" fill="none" stroke="#091f27" stroke-width="3"/>
  <path d="M 60 180 L 62 298 L 74 332 M 386 160 L 380 222 L 394 251" fill="none" stroke="#567064" stroke-width="3" opacity=".7"/>
  <path d="M 62 204 L 51 200 L 57 213 L 69 215 M 62 230 L 77 224 L 71 239 L 63 243 M 382 190 L 369 187 L 375 200 L 381 205" fill="#4c675a"/>
  <path d="M 127 360 L 137 325 L 166 329 L 180 349 L 207 334 L 232 360 M 285 360 L 302 329 L 331 341 L 352 360" fill="#1c3a3e"/>
`);

await png('environment/gate.png', 380, 400, `
  <path d="M 56 400 L 63 123 L 95 120 L 94 400 M 286 400 L 285 119 L 317 122 L 324 400" fill="#254247" stroke="#53706b" stroke-width="2"/>
  <path d="M 47 393 L 107 393 L 107 400 L 47 400 M 274 393 L 335 393 L 335 400 L 274 400" fill="#6f7b66"/>
  <path d="M 40 117 Q 145 97 190 46 Q 239 95 342 117 L 330 140 L 51 140 Z" fill="#1b343a" stroke="#71816c" stroke-width="2"/>
  <path d="M 20 108 Q 118 109 190 49 Q 262 108 360 108 L 345 126 Q 249 122 190 68 Q 129 123 35 126 Z" fill="#395454"/>
  <path d="M 25 108 Q 117 107 190 49 Q 263 107 356 108" fill="none" stroke="#a59870" stroke-width="2"/>
  <path d="M 78 189 L 300 189 M 90 181 L 287 181" stroke="#73806c" stroke-width="5"/>
  <path d="M 88 213 Q 189 227 292 213" fill="none" stroke="#877c57" stroke-width="2"/>
  <path d="M 117 217 L 114 234 L 122 230 L 119 246 M 260 219 L 257 237 L 266 232 L 263 248" stroke="#b6b599" stroke-width="5" fill="none"/>
  <rect x="161" y="126" width="59" height="48" rx="2" fill="#23383b" stroke="#8f8966"/>
  <path d="M 180 138 L 201 138 M 181 146 L 202 146 M 190 133 L 190 162 M 179 156 L 203 156" stroke="#b0a780" stroke-width="2"/>
  <path d="M 71 251 L 80 291 L 75 330 M 309 257 L 299 283 L 306 307" stroke="#102931" fill="none" stroke-width="3"/>
`);

let needles = '';
for (const [x, y, w] of [[95, 143, 99], [190, 85, 115], [324, 100, 125], [352, 185, 95], [114, 224, 102], [255, 184, 100], [277, 43, 90]]) {
  needles += `<path d="M ${x - w} ${y + 14} Q ${x - w * .3} ${y - 3} ${x} ${y - 21} L ${x + w * .18} ${y - 10} L ${x + w * .3} ${y - 15} Q ${x + w * .7} ${y + 7} ${x + w} ${y + 11} L ${x + w * .6} ${y + 20} L ${x + w * .3} ${y + 13} L ${x} ${y + 24} L ${x - w * .4} ${y + 15} Z" fill="#0a2028"/>`;
}
await png('environment/tree.png', 480, 510, `
  <path d="M 194 510 Q 238 387 221 307 Q 217 240 255 172 Q 272 115 267 55 L 278 37 Q 285 120 273 161 Q 251 247 254 315 Q 251 430 249 510 Z" fill="#0a2028"/>
  <path d="M 235 324 Q 162 313 116 238 L 76 220 L 114 224 L 176 282 L 223 283 M 250 224 Q 306 207 361 179 L 403 176 L 360 191 L 303 234 L 249 251 M 253 170 Q 202 180 148 146 L 74 142 L 130 128 L 204 155 L 262 144 M 274 124 L 328 94 L 381 91 L 333 108 L 276 147 M 264 100 L 222 92 L 183 75 L 229 81 L 268 84" fill="#0a2028"/>
  <path d="M 210 496 Q 240 382 236 308 Q 229 246 265 179" stroke="#17343a" stroke-width="3" fill="none"/>
  ${needles}
`);

await png('fx/glow.png', 128, 128, '<defs><radialGradient id="glow"><stop stop-color="#fff4c2" stop-opacity=".65"/><stop offset=".2" stop-color="#f2c279" stop-opacity=".3"/><stop offset=".65" stop-color="#e1a159" stop-opacity=".09"/><stop offset="1" stop-color="#e1a159" stop-opacity="0"/></radialGradient></defs><circle cx="64" cy="64" r="64" fill="url(#glow)"/>');

// A contact sheet is deliberately separate from the runtime texture manifest.
const labels = ['IDLE', 'RUN', 'JUMP', 'FALL', 'ATTACK', 'SKILL', 'HURT', 'DEATH'];
let preview = '<rect width="1064" height="1104" fill="#153036"/>';
for (let row = 0; row < 8; row++) {
  preview += `<text x="16" y="${row * 128 + 29}" font-family="monospace" font-size="10" fill="#b6c5b5">${labels[row]}</text>`;
  for (let col = 0; col < 8; col++) {
    preview += `<rect x="${20 + col * 128}" y="${38 + row * 128}" width="128" height="128" fill="${col % 2 ? '#18363b' : '#1c3c40'}"/><path d="M ${20 + col * 128} ${142 + row * 128} H ${148 + col * 128}" stroke="#477069" stroke-dasharray="2 4"/><svg x="${20 + col * 128}" y="${38 + row * 128}" width="128" height="128" viewBox="0 0 128 128">${actorFrame('player', row, col)}</svg>`;
  }
}
await png('characters/player-preview.png', 1064, 1104, preview);
await writeFile(path.join(root, 'ART_LICENSE.txt'), 'All PNG assets in this folder are original procedural artwork created for Mistbound.\nNo third-party characters, sprites, textures, or reference images are included.\nSource and deterministic rebuild: scripts/generate-assets.mjs.\nActor sheets: 8 columns × 8 rows; cells 128×128; anchor (64,104).\nRows: Idle, Run, Jump, Fall, Attack, Skill, Hurt, Death.\n');
console.log('Generated 3 actor sheets (192 frames), layered world art and sprite contact sheet.');
