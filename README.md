# Ridgeline Moto

An open-world 3D dirt bike game that runs in the browser. Built with three.js; no build step.

Ride across endless procedurally generated terrain (grassland, pine forest, desert dunes, rocky ridges, lakes), launch off ramps, land flips and 360s, and hunt down the glowing gold flags.

Dirt trails wind endlessly across the map. Each one is a contour line of domain-warped Perlin noise, graded smooth into the terrain. Packed dirt rolls faster and grips better than grass.

Pick a map on the title screen: Open Country, Deep Forest, Red Desert, Alpine Ridge, Autumn Woods, Canyonlands, Frozen Tundra (ride across frozen lakes) or Misty Wetlands. Each reshapes the world, ground colours, trees, water, sky and fog and has its own flags.

Pick from thirteen bikes in the garage: Trail 250, Pit 125, Enduro 450, Rally 500, Supermoto 690, Scrambler 74, Trials 300, Factory 450R and Desert Hog 990, plus four electrics with an electric-motor sound: Volt E-MX, Spark Mini-E, Surge SX-E and Stealth E-Trail.

## Races

Every map has races built from its own trail: Trail Sprint, Trail Marathon, Backtrail and the two-lap Meadow Loop. Ride through the checkpoint gates against the clock for gold, silver or bronze. Your best run on each event is saved and races alongside you as a ghost.

## Coins and unlocks

Earn coins from tricks, flags, races and distance. Spend them in the garage to unlock bikes, maps and paint jobs. The Trail 250, Pit 125 and Open Country are free.

## Project layout

No build step. `index.html` loads the stylesheet, three.js from a CDN, then the game scripts in order. The scripts are plain (non-module) files that share one global scope, so the game also runs straight from disk by double-clicking `index.html`.

```
index.html          markup: HUD, touch controls, title screen and garage
css/style.css       all styling, including the responsive and touch layouts
js/core.js          math helpers and seeded Perlin noise (with derivatives)
js/world.js         terrain height, Perlin noise trails, ramps, chunk contents
js/renderer.js      renderer, sky, lighting, water, terrain material and meshes
js/scenery.js       trees, rocks, grass, chunk streaming, distant terrain, clouds
js/bikes.js         bike specs, bike and rider model, garage picker
js/effects.js       tyre tracks and dust particles
js/audio.js         engine sound and effects
js/progress.js      coins, unlockable bikes and maps, paint jobs
js/controls.js      save data, game state, keyboard and touch input
js/physics.js       riding, jumps, tricks, landings, crashes, flags
js/view.js          bike model sync and chase camera
js/minimap.js       heading-up minimap
js/hud.js           speedometer, gears, surface and score readouts
js/race.js          races: trail routes, gates, timer, medals, ghosts
js/post.js          bloom, colour grade, vignette (desktop only)
js/main.js          resize, adaptive quality, frame loop and start-up
```

Load order matters: each file may use anything declared in the files before it.

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
