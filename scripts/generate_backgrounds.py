"""Generate atmospheric 2K WebP background images for each weather theme."""

from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    raise SystemExit("Install Pillow first: pip install pillow")

WIDTH, HEIGHT = 2560, 1440
OUT_DIR = Path(__file__).resolve().parent.parent / "frontend" / "assets" / "backgrounds"

THEMES = {
    "clear-day": [(255, 200, 80), (70, 140, 220), (25, 40, 90)],
    "clear-night": [(20, 35, 90), (10, 18, 45), (4, 8, 22)],
    "partly-cloudy-day": [(160, 200, 240), (100, 130, 170), (30, 45, 70)],
    "partly-cloudy-night": [(45, 55, 85), (25, 32, 55), (8, 12, 28)],
    "cloudy-day": [(140, 150, 165), (90, 100, 115), (40, 48, 60)],
    "cloudy-night": [(70, 78, 92), (35, 42, 58), (12, 16, 28)],
    "rain-day": [(90, 110, 140), (45, 70, 110), (15, 28, 55)],
    "rain-night": [(35, 55, 90), (15, 28, 55), (5, 10, 25)],
    "storm-day": [(90, 50, 140), (45, 30, 90), (15, 10, 35)],
    "storm-night": [(55, 35, 110), (25, 18, 55), (5, 5, 18)],
    "snow-day": [(220, 230, 240), (170, 185, 205), (100, 120, 145)],
    "snow-night": [(170, 185, 205), (80, 95, 120), (20, 28, 45)],
    "fog-day": [(190, 195, 200), (140, 145, 155), (80, 85, 95)],
    "fog-night": [(100, 105, 115), (55, 58, 65), (18, 20, 28)],
}


def gradient_image(colors: list[tuple[int, int, int]]) -> Image.Image:
    img = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(img)
    steps = len(colors) - 1
    band = HEIGHT // steps
    for i in range(steps):
        c1, c2 = colors[i], colors[i + 1]
        for y in range(band):
            t = y / band
            r = int(c1[0] + (c2[0] - c1[0]) * t)
            g = int(c1[1] + (c2[1] - c1[1]) * t)
            b = int(c1[2] + (c2[2] - c1[2]) * t)
            draw.line([(0, i * band + y), (WIDTH, i * band + y)], fill=(r, g, b))

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.ellipse([WIDTH * 0.1, -HEIGHT * 0.2, WIDTH * 0.9, HEIGHT * 0.7], fill=(255, 255, 255, 35))
    odraw.ellipse([WIDTH * 0.55, HEIGHT * 0.45, WIDTH * 1.1, HEIGHT * 1.1], fill=(0, 0, 0, 60))
    img = Image.alpha_composite(img.convert("RGBA"), overlay)
    return img.filter(ImageFilter.GaussianBlur(radius=2))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, colors in THEMES.items():
        img = gradient_image(colors)
        path = OUT_DIR / f"{name}.webp"
        img.save(path, "WEBP", quality=82)
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
