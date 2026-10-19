// A small, scroll-driven 3D scene. Native canvas, no runtime/CDN dependency.
// World coordinates are projected and faces depth-sorted on every changed frame.
type Point = [number, number, number];
type Face = { points: Point[]; color: string; depth: number };
type Block = {
  p: Point;
  size: Point;
  color: string;
  at: number;
  glass?: boolean;
};
export function createHouseScene(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const context = ctx;
  canvas.parentElement?.classList.add("sx-canvas-ready");
  const blocks: Block[] = [];
  const box = (
    p: Point,
    size: Point,
    color: string,
    at: number,
    glass = false,
  ) => blocks.push({ p, size, color, at, glass });
  box([0, -0.12, 0], [10, 0.24, 8], "#aaa58b", 0);
  box([0, 0.05, 0], [6.8, 0.18, 4.1], "#d2c8b4", 0.04);
  box([-2.3, 1.1, 0], [2.1, 2.1, 3.8], "#b3a087", 0.15);
  box([0.9, 1.1, -1.65], [4.3, 2.1, 0.25], "#e1d5be", 0.23);
  box([3, 1.1, 0], [0.22, 2.1, 3.8], "#d2c5ad", 0.28);
  box([0.9, 1.05, 1.78], [4.15, 1.9, 0.06], "#526b65", 0.43, true);
  for (let x = -1.1; x <= 3; x += 1.03)
    box([x, 1.05, 1.84], [0.045, 1.96, 0.06], "#c9baa1", 0.5);
  for (let z = -1.6; z < 1.7; z += 0.23)
    box([-3.37, 1.1, z], [0.06, 2.05, 0.075], "#776450", 0.36);
  box([0, 2.25, 0], [7.2, 0.19, 4.5], "#e8ddc8", 0.57);
  box([0, 2.36, 0], [6.9, 0.04, 4.2], "#9e9c87", 0.6);
  box([0.6, 0.02, 2.8], [5.6, 0.1, 1.65], "#c4b79b", 0.68);
  for (let i = 0; i < 5; i++)
    box(
      [0.6, -0.01, 4 + i * 0.42],
      [1, 0.1, 0.26],
      "#e1d6be",
      0.74 + i * 0.025,
    );
  box([-3.8, 0.18, 2.6], [1.4, 0.5, 0.5], "#697958", 0.76);
  box([3.8, 0.22, -1.8], [0.65, 0.6, 2.6], "#748065", 0.8);
  box([0.85, 2.09, 1.85], [4.1, 0.025, 0.025], "#f4c780", 0.91);
  let previous = -1,
    width = 0,
    height = 0;
  function render(progress: number) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const p = Math.min(1, Math.max(0, progress));
    const w = Math.round(rect.width),
      h = Math.round(rect.height);
    if (Math.abs(p - previous) < 0.0005 && w === width && h === height) return;
    previous = p;
    width = w;
    height = h;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const sky = context.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#a5b6ad");
    sky.addColorStop(1, "#e5dfcb");
    context.fillStyle = sky;
    context.fillRect(0, 0, w, h);
    context.fillStyle = "#f1e6c4";
    context.beginPath();
    context.arc(w * 0.8, h * 0.19, h * 0.085, 0, Math.PI * 2);
    context.fill();
    const angle = -0.62 + p * 0.26,
      tilt = 0.37,
      scale = Math.min(w / 11.5, h / 6.4);
    const project = ([x, y, z]: Point): Point => {
      const a = x * Math.cos(angle) - z * Math.sin(angle),
        b = x * Math.sin(angle) + z * Math.cos(angle);
      return [
        w * 0.49 + a * scale,
        h * 0.61 + (b * Math.sin(tilt) - y * Math.cos(tilt)) * scale,
        b * Math.cos(tilt) + y * Math.sin(tilt),
      ];
    };
    const faces: Face[] = [];
    const shade = (hex: string, k: number) => {
      const n = parseInt(hex.slice(1), 16);
      return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k)).join(",")})`;
    };
    const face = (ps: Point[], color: string) => {
      const points = ps.map(project);
      faces.push({
        points,
        color,
        depth: points.reduce((s, v) => s + v[2], 0) / points.length,
      });
    };
    for (const b of blocks) {
      let t = Math.min(1, Math.max(0, (p - b.at) / 0.12));
      t = t * t * (3 - 2 * t);
      if (t <= 0) continue;
      const [x, y, z] = b.p,
        [sx, sy, sz] = b.size,
        lo = y - sy / 2,
        hi = lo + sy * t;
      const x0 = x - sx / 2,
        x1 = x + sx / 2,
        z0 = z - sz / 2,
        z1 = z + sz / 2;
      face(
        [
          [x0, hi, z0],
          [x1, hi, z0],
          [x1, hi, z1],
          [x0, hi, z1],
        ],
        b.color,
      );
      face(
        [
          [x0, lo, z1],
          [x1, lo, z1],
          [x1, hi, z1],
          [x0, hi, z1],
        ],
        shade(b.color, b.glass ? 0.86 : 0.9),
      );
      face(
        [
          [x0, lo, z0],
          [x0, lo, z1],
          [x0, hi, z1],
          [x0, hi, z0],
        ],
        shade(b.color, 0.72),
      );
      face(
        [
          [x1, lo, z1],
          [x1, lo, z0],
          [x1, hi, z0],
          [x1, hi, z1],
        ],
        shade(b.color, 0.8),
      );
    }
    // A soft contact shadow anchors the architectural model to the landscape.
    context.save();
    context.translate(w * 0.5, h * 0.73);
    context.scale(1, 0.25);
    context.fillStyle = "#293b3024";
    context.filter = "blur(12px)";
    context.beginPath();
    context.ellipse(0, 0, scale * 4.5, scale * 3, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
    faces
      .sort((a, b) => a.depth - b.depth)
      .forEach((f) => {
        context.beginPath();
        f.points.forEach((v, i) =>
          i ? context.lineTo(v[0], v[1]) : context.moveTo(v[0], v[1]),
        );
        context.closePath();
        context.fillStyle = f.color;
        context.fill();
      });
    if (p < 0.48) {
      context.strokeStyle = `rgba(73,91,74,${0.5 * (1 - p / 0.48)})`;
      context.lineWidth = 1;
      context.setLineDash([4, 5]);
      const outline: Point[] = [
        [-3.4, 0, 2.1],
        [3.4, 0, 2.1],
        [3.4, 2.3, 2.1],
        [-3.4, 2.3, 2.1],
        [-3.4, 0, 2.1],
      ];
      context.beginPath();
      outline
        .map(project)
        .forEach((v, i) =>
          i ? context.lineTo(v[0], v[1]) : context.moveTo(v[0], v[1]),
        );
      context.stroke();
      context.setLineDash([]);
    }
  }
  return render;
}
