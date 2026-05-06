const SIM = {
  dt: 0.016,
  extent: 7.5,
  softening: 0.35,
  maxAccel: 24,
  gravity: 6.2,
  trapRadiusScale: 0.92,
  gateTolerance: 0.38,
};

const BASE_LEVELS = [
  {
    id: 1,
    name: "Level 1 - Tutorial Bend",
    launch: { x: -5.9, y: -2.9 },
    target: { x: 5.55, y: -4.3, radius: 0.82 },
    speed: { min: 0.6, max: 3.4, initial: 1.6 },
    maxTime: 18,
    gateCount: 2,
    gateHalfLength: 1.2,
    gateSeed: 101,
    masses: [{ x: -0.5, y: 0.2, mass: 4.6, radius: 0.34, color: 0xff6b6b }],
    shot: { angleDeg: 50, speed: 2.2 },
  },
  {
    id: 2,
    name: "Level 2 - Thread The Wells",
    launch: { x: -6.0, y: -0.8 },
    target: { x: 6.0, y: 1.3, radius: 0.72 },
    speed: { min: 0.7, max: 3.8, initial: 2.2 },
    maxTime: 18,
    gateCount: 3,
    gateHalfLength: 1.1,
    gateSeed: 202,
    masses: [
      { x: -1.2, y: 1.8, mass: 3.9, radius: 0.31, color: 0xff8a5b },
      { x: 1.4, y: -1.7, mass: 3.8, radius: 0.31, color: 0xffcf69 },
    ],
    shot: { angleDeg: -8.5, speed: 2.2 },
  },
  {
    id: 3,
    name: "Level 3 - Deep Trap",
    launch: { x: -6.2, y: 2.8 },
    target: { x: 6.1, y: -2.7, radius: 0.75 },
    speed: { min: 0.7, max: 4.1, initial: 2.4 },
    maxTime: 20,
    gateCount: 4,
    gateHalfLength: 0.88,
    gateSeed: 303,
    masses: [
      { x: -2.0, y: 0.8, mass: 4.2, radius: 0.32, color: 0xff7d7d },
      { x: 0.6, y: -0.4, mass: 7.8, radius: 0.42, color: 0xff4747 },
      { x: 2.6, y: 2.1, mass: 2.8, radius: 0.29, color: 0xffc95e },
    ],
    shot: { angleDeg: -40, speed: 3.0 },
  },
  {
    id: 4,
    name: "Level 4 - Narrow Sequencer",
    launch: { x: -6.0, y: -3.1 },
    target: { x: 5.8, y: 3.4, radius: 0.66 },
    speed: { min: 0.9, max: 4.2, initial: 2.65 },
    maxTime: 22,
    gateCount: 5,
    gateHalfLength: 0.84,
    gateSeed: 404,
    masses: [
      { x: -1.5, y: -0.2, mass: 5.1, radius: 0.36, color: 0xff7f66 },
      { x: 1.8, y: 1.0, mass: 4.8, radius: 0.35, color: 0xffc067 },
    ],
    shot: { angleDeg: 51, speed: 2.2 },
  },
  {
    id: 5,
    name: "Level 5 - Lens Maze",
    launch: { x: -6.1, y: 0.6 },
    target: { x: 6.2, y: -0.3, radius: 0.74 },
    speed: { min: 0.9, max: 4.5, initial: 2.8 },
    maxTime: 24,
    gateCount: 5,
    gateHalfLength: 0.96,
    gateSeed: 505,
    masses: [
      { x: -3.0, y: 2.0, mass: 3.5, radius: 0.31, color: 0xff8470 },
      { x: -0.8, y: -1.5, mass: 5.2, radius: 0.38, color: 0xff615d },
      { x: 1.5, y: 1.8, mass: 4.7, radius: 0.35, color: 0xffba63 },
      { x: 3.5, y: -1.4, mass: 3.7, radius: 0.3, color: 0xffdc84 },
    ],
    shot: { angleDeg: -45.25, speed: 2.8 },
  },
  {
    id: 6,
    name: "Level 6 - Event Horizon Gauntlet",
    launch: { x: -0.6, y: -6.1 },
    target: { x: 0.3, y: 6.2, radius: 0.72 },
    speed: { min: 1.0, max: 4.6, initial: 3.0 },
    maxTime: 26,
    gateCount: 6,
    gateHalfLength: 0.78,
    gateSeed: 606,
    masses: [
      { x: -2.0, y: -3.0, mass: 3.5, radius: 0.31, color: 0xff8470 },
      { x: 1.5, y: -0.8, mass: 5.2, radius: 0.38, color: 0xff615d },
      { x: -1.8, y: 1.5, mass: 4.7, radius: 0.35, color: 0xffba63 },
      { x: 1.4, y: 3.5, mass: 3.7, radius: 0.3, color: 0xffdc84 },
    ],
    shot: { angleDeg: 44.75, speed: 2.8 },
  },
];

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function normalize2(x, y) {
  const n = Math.hypot(x, y) || 1;
  return { x: x / n, y: y / n };
}

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function particleAccel(level, x, y) {
  let ax = 0;
  let ay = 0;
  for (const mass of level.masses) {
    const rx = x - mass.x;
    const ry = y - mass.y;
    const rsq = rx * rx + ry * ry + SIM.softening ** 2;
    const amp = (-SIM.gravity * mass.mass) / (rsq ** 1.5);
    ax += amp * rx;
    ay += amp * ry;
  }
  const n = Math.hypot(ax, ay);
  if (n > SIM.maxAccel) {
    const s = SIM.maxAccel / n;
    ax *= s;
    ay *= s;
  }
  return { ax, ay };
}

function simulateShot(level, shot) {
  const angle = (shot.angleDeg * Math.PI) / 180;
  const p = {
    x: level.launch.x,
    y: level.launch.y,
    vx: Math.cos(angle) * shot.speed,
    vy: Math.sin(angle) * shot.speed,
    t: 0,
  };
  const points = [{ ...p }];

  while (p.t < level.maxTime) {
    const { ax, ay } = particleAccel(level, p.x, p.y);
    p.vx += ax * SIM.dt;
    p.vy += ay * SIM.dt;
    p.x += p.vx * SIM.dt;
    p.y += p.vy * SIM.dt;
    p.t += SIM.dt;
    points.push({ ...p });

    if (Math.abs(p.x) > SIM.extent || Math.abs(p.y) > SIM.extent) {
      throw new Error(`Reference shot exits boundary for ${level.name}`);
    }
    for (const mass of level.masses) {
      if (Math.hypot(p.x - mass.x, p.y - mass.y) < mass.radius * SIM.trapRadiusScale) {
        throw new Error(`Reference shot falls into mass for ${level.name}`);
      }
    }
    if (Math.hypot(p.x - level.target.x, p.y - level.target.y) <= level.target.radius) {
      return points;
    }
  }

  throw new Error(`Reference shot times out for ${level.name}`);
}

function buildArcLength(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    lengths.push(lengths[i - 1] + Math.hypot(dx, dy));
  }
  return lengths;
}

function indexAtFraction(lengths, f) {
  const target = lengths[lengths.length - 1] * clamp(f, 0, 1);
  let lo = 0;
  let hi = lengths.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (lengths[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function isGoodGatePoint(level, point) {
  const margin = 0.9;
  if (
    Math.abs(point.x) > SIM.extent - margin ||
    Math.abs(point.y) > SIM.extent - margin ||
    Math.hypot(point.x - level.launch.x, point.y - level.launch.y) < 1.2 ||
    Math.hypot(point.x - level.target.x, point.y - level.target.y) < 1.2
  ) {
    return false;
  }
  for (const mass of level.masses) {
    if (Math.hypot(point.x - mass.x, point.y - mass.y) < mass.radius * 2.2) {
      return false;
    }
  }
  return true;
}

function findNearbyValidIndex(level, points, targetIndex, minIndex = 2) {
  const span = 90;
  for (let d = 0; d <= span; d += 1) {
    const a = targetIndex + d;
    if (a >= minIndex && a < points.length - 2 && isGoodGatePoint(level, points[a])) return a;
    const b = targetIndex - d;
    if (b >= minIndex && b > 1 && isGoodGatePoint(level, points[b])) return b;
  }
  throw new Error(`Unable to place gate near sampled trajectory point for ${level.name}`);
}

function orient2D(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function onSegment2D(ax, ay, bx, by, px, py, eps = 1e-9) {
  return (
    Math.min(ax, bx) - eps <= px &&
    px <= Math.max(ax, bx) + eps &&
    Math.min(ay, by) - eps <= py &&
    py <= Math.max(ay, by) + eps
  );
}

function segmentsIntersect2D(a0x, a0y, a1x, a1y, b0x, b0y, b1x, b1y) {
  const o1 = orient2D(a0x, a0y, a1x, a1y, b0x, b0y);
  const o2 = orient2D(a0x, a0y, a1x, a1y, b1x, b1y);
  const o3 = orient2D(b0x, b0y, b1x, b1y, a0x, a0y);
  const o4 = orient2D(b0x, b0y, b1x, b1y, a1x, a1y);
  const eps = 1e-9;

  if ((o1 > eps && o2 < -eps) || (o1 < -eps && o2 > eps)) {
    if ((o3 > eps && o4 < -eps) || (o3 < -eps && o4 > eps)) return true;
  }
  if (Math.abs(o1) <= eps && onSegment2D(a0x, a0y, a1x, a1y, b0x, b0y, eps)) return true;
  if (Math.abs(o2) <= eps && onSegment2D(a0x, a0y, a1x, a1y, b1x, b1y, eps)) return true;
  if (Math.abs(o3) <= eps && onSegment2D(b0x, b0y, b1x, b1y, a0x, a0y, eps)) return true;
  if (Math.abs(o4) <= eps && onSegment2D(b0x, b0y, b1x, b1y, a1x, a1y, eps)) return true;
  return false;
}

function crossesGateSegment(gate, x0, y0, x1, y1) {
  const tx = -gate.ny;
  const ty = gate.nx;
  const tn = Math.hypot(tx, ty) || 1;
  const ux = tx / tn;
  const uy = ty / tn;
  const h = gate.halfLength + SIM.gateTolerance;
  const gx0 = gate.x - ux * h;
  const gy0 = gate.y - uy * h;
  const gx1 = gate.x + ux * h;
  const gy1 = gate.y + uy * h;
  return segmentsIntersect2D(x0, y0, x1, y1, gx0, gy0, gx1, gy1);
}

function referenceShotPassesGates(level, points, gates) {
  let gateIndex = 0;
  for (let i = 1; i < points.length; i += 1) {
    if (gateIndex >= gates.length) break;
    const prev = points[i - 1];
    const curr = points[i];
    if (crossesGateSegment(gates[gateIndex], prev.x, prev.y, curr.x, curr.y)) {
      gateIndex += 1;
    }
  }
  return gateIndex === gates.length;
}

function generateGates(level, points, seedOffset = 0, sizeScale = 1) {
  const rng = makeRng((level.gateSeed ?? level.id * 1009) + seedOffset);
  const lengths = buildArcLength(points);
  const gates = [];
  const startFrac = 0.14;
  const endFrac = 0.86;
  const baseStep = (endFrac - startFrac) / (level.gateCount + 1);
  let minIndex = 4;

  for (let i = 0; i < level.gateCount; i += 1) {
    const ideal = startFrac + baseStep * (i + 1);
    const jitter = (rng() - 0.5) * 0.07;
    const frac = clamp(ideal + jitter, startFrac, endFrac);
    const rawIndex = indexAtFraction(lengths, frac);
    const idx = findNearbyValidIndex(level, points, rawIndex, minIndex);
    minIndex = idx + 8;
    const curr = points[idx];
    const prev = points[idx - 1] ?? curr;
    const next = points[idx + 1] ?? curr;
    const tangent = normalize2(next.x - prev.x, next.y - prev.y);
    const normal = tangent;
    const halfLength = clamp((level.gateHalfLength + (rng() - 0.5) * 0.08) * sizeScale, 0.55, 1.25);
    gates.push({
      x: Number(curr.x.toFixed(3)),
      y: Number(curr.y.toFixed(3)),
      nx: Number(normal.x.toFixed(4)),
      ny: Number(normal.y.toFixed(4)),
      halfLength: Number(halfLength.toFixed(3)),
    });
  }

  return gates;
}

function generateFallbackGates(level, points) {
  const gates = [];
  const start = Math.floor(points.length * 0.2);
  const end = Math.floor(points.length * 0.82);
  for (let i = 0; i < level.gateCount; i += 1) {
    const u = (i + 1) / (level.gateCount + 1);
    const idx = Math.floor(start + (end - start) * u);
    const curr = points[idx];
    const prev = points[Math.max(0, idx - 1)];
    const next = points[Math.min(points.length - 1, idx + 1)];
    const tangent = normalize2(next.x - prev.x, next.y - prev.y);
    const normal = tangent;
    const halfLength = clamp(level.gateHalfLength * 0.82, 0.58, 0.96);
    gates.push({
      x: Number(curr.x.toFixed(3)),
      y: Number(curr.y.toFixed(3)),
      nx: Number(normal.x.toFixed(4)),
      ny: Number(normal.y.toFixed(4)),
      halfLength: Number(halfLength.toFixed(3)),
    });
  }
  return gates;
}

function buildLevel(level) {
  const points = simulateShot(level, level.shot);
  let gates = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const sizeScale = clamp(1 - attempt * 0.01, 0.72, 1.0);
    const candidate = generateGates(level, points, attempt * 97, sizeScale);
    if (referenceShotPassesGates(level, points, candidate)) {
      gates = candidate;
      break;
    }
  }
  if (!gates) {
    const fallback = generateFallbackGates(level, points);
    if (referenceShotPassesGates(level, points, fallback)) {
      gates = fallback;
    } else {
      throw new Error(`Failed to generate gate layout for ${level.name}`);
    }
  }
  return {
    id: level.id,
    name: level.name,
    launch: level.launch,
    target: level.target,
    speed: level.speed,
    maxTime: level.maxTime,
    masses: level.masses,
    gates,
    hint: {
      angleDeg: Number(level.shot.angleDeg.toFixed(2)),
      speed: Number(level.shot.speed.toFixed(2)),
    },
  };
}

export const LEVELS = BASE_LEVELS.map(buildLevel);
