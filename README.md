# ⚡ NEON FURY — Cyberpunk Arena Fighter

A futuristic 2D browser-based fighting game set on an alien planet. Battle waves of alien creatures with punches, kicks, and energy blasts in a neon-soaked cyberpunk arena.

![Genre](https://img.shields.io/badge/Genre-2D%20Fighting-blueviolet)
![Platform](https://img.shields.io/badge/Platform-Browser-00f0ff)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🛠️ Technologies Used

### Core Stack

| Technology | Version | Purpose |
|---|---|---|
| **HTML5** | 5 | Page structure, semantic markup, and Canvas element for game rendering |
| **CSS3** | 3 | Styling, animations, keyframes, and responsive design |
| **JavaScript (ES6+)** | ES2015+ | Game logic, OOP class architecture, physics engine, and AI |

---

### Frontend Framework & Utilities

| Technology | Purpose |
|---|---|
| **Tailwind CSS** (CDN) | Utility-first CSS framework for rapid UI layout — used for HUD, menus, and responsive design |
| **Google Fonts** | Custom typography with **Orbitron** (headings) and **Share Tech Mono** (monospace UI text) |

---

### Browser APIs

| API | Purpose |
|---|---|
| **Canvas 2D API** | Core game rendering — all characters, enemies, backgrounds, particles, and projectiles are drawn on a `<canvas>` element |
| **Web Audio API** | Procedurally generated sound effects (punches, kicks, blasts, explosions) and background music — no external audio files needed |
| **requestAnimationFrame** | Smooth 60fps game loop with delta-time calculations |
| **Keyboard Events** | Player input handling for movement (`WASD` / Arrow keys) and combat (`J`, `K`, `L`) |
| **Touch Events** | Mobile virtual D-pad and action buttons for touchscreen gameplay |

---

### Game Architecture (JavaScript)

The game is built with **Object-Oriented Programming** using ES6 classes:

| Class | Description |
|---|---|
| `SoundManager` | Manages all audio via the Web Audio API with procedural sound synthesis |
| `Particle` / `ParticleSystem` | Handles hit effects, explosions, and visual feedback particles |
| `Camera` | Dynamic camera that follows the player with screen-shake effects |
| `Platform` | Neon-styled platforms with grid-line rendering |
| `Projectile` | Energy blast projectiles with trail effects |
| `PowerUp` | Collectible items (health, speed boost, shield) with bobbing animation |
| `Player` | Full player character with movement, physics, combat, combos, and pixel-art rendering |
| `Enemy` | Base enemy class with AI chasing, attacking, and physics |
| `FastAlien` | Quick, low-health enemy with 3 eyes |
| `TankAlien` | Slow, heavily-armored enemy with horns |
| `FlyingAlien` | Aerial enemy with wings and tentacles |
| `BossAlien` | Large boss enemy with projectile attacks and glowing aura |
| `Game` | Main game controller — manages game loop, wave spawning, collisions, and state |

---

### Visual Effects & Design Techniques

- **Pixel-Art Style Rendering** — Characters and enemies are drawn procedurally using canvas rectangles and arcs
- **Neon Glow Effects** — CSS `text-shadow` and canvas `shadowBlur` for cyberpunk neon aesthetics
- **Particle Systems** — Hit sparks, explosions, and energy effects using a custom particle engine
- **Glitch Text Animation** — CSS `clip-path` and keyframe animations for the title screen
- **Parallax Scrolling Background** — Multi-layer star fields and alien landscape for depth
- **Screen Shake** — Camera shake on heavy impacts for visceral feedback
- **Glassmorphism UI** — `backdrop-blur` and semi-transparent panels for a modern HUD

---

### CSS Techniques

- **CSS Custom Properties** — Design tokens for the neon color palette
- **CSS Keyframe Animations** — Glitch effects, health bar glow, wave announcements, combo pop-ups
- **`clip-path`** — Cyberpunk-style angled button shapes
- **Media Queries** — Responsive layout for mobile, tablet, and desktop
- **`image-rendering: pixelated`** — Crisp pixel-art scaling on the game canvas

---

## 🎮 How to Play

### Controls

| Key | Action |
|---|---|
| `W` / `↑` / `Space` | Jump |
| `A` / `←` | Move Left |
| `D` / `→` | Move Right |
| `J` | Punch |
| `K` | Kick |
| `L` | Energy Blast |
| `Esc` | Pause |

### Gameplay

- Defeat waves of alien enemies to earn points
- Build combos by chaining attacks for bonus score
- Collect power-ups: ❤ Health, ⚡ Speed Boost, 🛡 Shield
- Survive boss encounters every 5 waves
- Enemies get stronger with each wave

---

## 🚀 Getting Started

No build tools or dependencies required! Simply:

1. Clone or download this repository
2. Open `index.html` in any modern web browser
3. Click **START GAME** and fight!

> **Note:** An internet connection is needed on first load for Tailwind CSS (CDN) and Google Fonts.

---

## 📁 Project Structure

```
neon-fury/
├── index.html    # Game page — HTML structure, HUD, menus, and canvas
├── style.css     # All custom styles, animations, and responsive design
├── script.js     # Complete game logic — classes, physics, AI, and rendering
└── README.md     # This file
```

---

## 🌐 Browser Compatibility

| Browser | Supported |
|---|---|
| Chrome 80+ | ✅ |
| Firefox 80+ | ✅ |
| Edge 80+ | ✅ |
| Safari 14+ | ✅ |
| Mobile Chrome/Safari | ✅ (touch controls) |

---

*Built with ❤️ using pure HTML, CSS, and JavaScript — no frameworks, no bundlers, just code.*
