# Ridgeline Moto

An open-world 3D dirt bike game that runs in the browser. Built with three.js; no build step.

Ride across endless procedurally generated terrain (grassland, pine forest, desert dunes, rocky ridges, lakes), launch off ramps, land flips and 360s, and hunt down the glowing gold flags.

Dirt trails wind endlessly across the map. Each one is a contour line of domain-warped Perlin noise, graded smooth into the terrain. Packed dirt rolls faster and grips better than grass.

Pick from four bikes in the garage: Trail 250, Pit 125, Enduro 450 and Rally 500.

## Play

Open `index.html` in a browser, or serve the folder with any static server (e.g. `python3 -m http.server`). It also works on GitHub Pages.

## Controls

| Key | On the ground | In the air |
| --- | --- | --- |
| W / ↑ | Throttle | Lean forward (front flip) |
| S / ↓ | Brake, reverse | Lean back (backflip) |
| A D / ← → | Steer | Spin |
| Space | Wheelie | Lean back |
| Shift | Nitro | |
| R / C / M / Esc | Reset bike / camera / sound / pause | |

Touch devices get on-screen pads. Best score, flags found and distance are saved in your browser's localStorage.
