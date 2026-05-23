/**
 * Temperature-reactive atmospheric effects engine.
 * CSS-first with optional lightweight canvas particles.
 */

const COLD_C = 8;
const HOT_C = 28;

let engine = null;

export function initEffects() {
  if (engine) return engine;
  engine = new AtmosEffects();
  return engine;
}

export function applyEffects(weather, units = "metric") {
  initEffects().apply(weather, units);
}

export function destroyEffects() {
  engine?.destroy();
  engine = null;
}

class AtmosEffects {
  constructor() {
    this.root = document.getElementById("atmos-effects");
    this.canvas = document.getElementById("atmos-particles");
    this.ctx = this.canvas?.getContext("2d", { alpha: true });
    this.particles = [];
    this.rafId = null;
    this.profileKey = "";
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.lowEnd = detectLowEnd();
    this.maxParticles = this.lowEnd ? 12 : this.reducedMotion ? 0 : 28;

    window.addEventListener("resize", this.onResize);
    this.onResize();
  }

  onResize = () => {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  apply(weather, units) {
    if (!weather || !this.root) return;

    const tempC = toCelsius(weather.current?.feels_like ?? weather.current?.temp, units);
    const condition = weather.theme?.condition || "cloudy";
    const timeOfDay = weather.theme?.time_of_day || "day";
    const profile = buildProfile(tempC, condition, timeOfDay);
    const key = JSON.stringify(profile);

    if (key === this.profileKey) return;
    this.profileKey = key;

    this.stopParticles();
    this.clearDataAttrs();

    const html = document.documentElement;
    html.dataset.tempBand = profile.tempBand;
    html.dataset.effects = profile.layers.join(" ");

    profile.layers.forEach((layer) => {
      this.root.dataset[layer] = "true";
    });

    if (profile.particleType && this.maxParticles > 0) {
      this.startParticles(profile.particleType, profile.tempBand, condition);
    }
  }

  clearDataAttrs() {
    const html = document.documentElement;
    delete html.dataset.tempBand;
    delete html.dataset.effects;
    Array.from(this.root.attributes).forEach((attr) => {
      if (attr.name.startsWith("data-") && attr.name !== "id") {
        this.root.removeAttribute(attr.name);
      }
    });
  }

  startParticles(type, tempBand, condition) {
    if (!this.canvas || !this.ctx || this.reducedMotion) return;

    const count = type === "snow" ? Math.min(this.maxParticles, 20) : this.maxParticles;
    this.particles = Array.from({ length: count }, () => createParticle(type, window.innerWidth, window.innerHeight));

    const tick = () => {
      this.drawParticles(type);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  drawParticles(type) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.clearRect(0, 0, w, h);

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life += 0.016;

      if (type === "frost") {
        p.x += Math.sin(p.life * p.wobble) * 0.15;
        p.y += Math.cos(p.life * p.wobble * 0.7) * 0.08;
      }

      if (p.y > h + 8 || p.x < -8 || p.x > w + 8) {
        Object.assign(p, createParticle(type, w, h, true));
      }

      this.ctx.globalAlpha = p.alpha;
      if (type === "rain") {
        this.ctx.strokeStyle = "rgba(180, 210, 255, 0.35)";
        this.ctx.lineWidth = p.size;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(p.x + p.drift, p.y + p.len);
        this.ctx.stroke();
      } else if (type === "snow") {
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = "rgba(220, 240, 255, 0.45)";
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rot);
        this.ctx.fillRect(-p.size, -p.size * 0.3, p.size * 2, p.size * 0.6);
        this.ctx.restore();
      }
    }
    this.ctx.globalAlpha = 1;
  }

  stopParticles() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.particles = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  destroy() {
    this.stopParticles();
    this.clearDataAttrs();
    window.removeEventListener("resize", this.onResize);
    this.profileKey = "";
  }
}

function buildProfile(tempC, condition, timeOfDay) {
  const layers = [];
  let particleType = null;
  let tempBand = "mild";

  if (tempC != null && tempC <= COLD_C) tempBand = "cold";
  else if (tempC != null && tempC >= HOT_C) tempBand = "hot";

  if (condition === "rain" || condition === "drizzle") {
    layers.push("rain", "rain-glass");
    particleType = "rain";
  } else if (condition === "snow") {
    layers.push("snow-grade");
    particleType = "snow";
  } else if (condition === "fog") {
    layers.push("fog-haze");
  } else if (condition === "thunderstorm") {
    layers.push("storm-flash", "rain-glass");
    particleType = "rain";
  } else if (condition === "clear" && timeOfDay === "day") {
    layers.push("clear-glow");
  }

  if (tempBand === "cold") {
    layers.push("cold-grade", "frost-edge", "fog-breathe");
    if (condition !== "snow" && !particleType) particleType = "frost";
  }

  if (tempBand === "hot") {
    layers.push("hot-grade", "heat-shimmer", "heat-gloss");
  }

  return { tempBand, layers: [...new Set(layers)], particleType };
}

function createParticle(type, w, h, respawn = false) {
  if (type === "rain") {
    return {
      x: Math.random() * w,
      y: respawn ? -20 : Math.random() * h,
      vx: -0.6,
      vy: 4 + Math.random() * 3,
      drift: -2 - Math.random() * 2,
      len: 8 + Math.random() * 14,
      size: 0.6 + Math.random() * 0.4,
      alpha: 0.15 + Math.random() * 0.2,
      life: Math.random() * Math.PI * 2,
      wobble: 1,
      rot: 0,
    };
  }
  if (type === "snow") {
    return {
      x: Math.random() * w,
      y: respawn ? -10 : Math.random() * h,
      vx: -0.3 + Math.random() * 0.6,
      vy: 0.6 + Math.random() * 1.2,
      size: 1 + Math.random() * 2.5,
      alpha: 0.35 + Math.random() * 0.35,
      life: Math.random() * Math.PI * 2,
      wobble: 0.8 + Math.random(),
      rot: 0,
      drift: 0,
      len: 0,
    };
  }
  return {
    x: Math.random() * w,
    y: respawn ? -10 : Math.random() * h,
    vx: -0.2 + Math.random() * 0.4,
    vy: 0.25 + Math.random() * 0.45,
    size: 1 + Math.random() * 2,
    alpha: 0.12 + Math.random() * 0.18,
    life: Math.random() * Math.PI * 2,
    wobble: 1 + Math.random() * 2,
    rot: Math.random() * Math.PI,
    drift: 0,
    len: 0,
  };
}

function toCelsius(temp, units) {
  if (temp == null || Number.isNaN(temp)) return null;
  return units === "imperial" ? (temp - 32) * (5 / 9) : temp;
}

function detectLowEnd() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const saveData = navigator.connection?.saveData;
  return cores <= 4 || memory <= 2 || saveData;
}
