# Lenticular Studio — Design System

## Project
- **Stitch Project ID**: `16829974251251854140`
- **Design System Asset**: `assets/14955172374851664040`

## Visual Identity
- **Atmosphere**: Professional, tech-forward — like a photo editing suite
- **Theme**: Dual mode (dark + light), responds to `prefers-color-scheme`

### Color Palette — Dark Mode
| Role | Hex | Usage |
|------|-----|-------|
| Background | `#1a1a2e` | Page canvas, header bar |
| Surface | `#16213e` | Sidebar, cards, panels, status bar |
| Primary Accent | `#e94560` | Buttons, active states, selections |
| Secondary | `#0f3460` | Panel backgrounds, borders, canvas frames |
| Tertiary | `#533483` | Hover states, highlights |
| Text Primary | `#ffffff` | Headings, labels |
| Text Muted | `#8892a4` | Hints, descriptions, secondary info |

### Color Palette — Light Mode
| Role | Hex | Usage |
|------|-----|-------|
| Background | `#ffffff` | Page canvas, header bar |
| Surface | `#f0f2f5` | Sidebar, cards, panels, status bar |
| Primary Accent | `#e94560` | Buttons, active states, selections (shared) |
| Secondary | `#e8edf4` | Panel backgrounds, borders |
| Tertiary | `#ede0f5` | Hover states, highlights |
| Text Primary | `#1a1a2e` | Headings, labels |
| Text Muted | `#5a6275` | Hints, descriptions, secondary info |
| Border | `#e2e5ea` | Dividers, panel borders, canvas frames |

### Typography
| Role | Font | Weight |
|------|------|--------|
| Headlines | Space Grotesk | Bold |
| Body | Inter | Regular |
| Labels | Space Grotesk | Medium |

### Shape & Depth
- **Roundness**: 8px (ROUND_EIGHT)
- **Shadows**: Whisper-soft, diffused for subtle lift
- **Elevation**: Cards slightly above background, modals significantly elevated

### Theme Implementation
- Use CSS custom properties for all color tokens
- Toggle via `prefers-color-scheme` media query (auto) + optional manual toggle
- Store user preference in `localStorage`, fallback to system setting

## Screen Inventory

### Dark Mode — Desktop Workspace
- **Screen ID**: `626fe9610d994f20be33d93acfcf54e4`
- **Device**: Desktop (2560×2048)
- **Local Files**: `.stitch/designs/desktop-workspace.html`, `.stitch/designs/desktop-workspace.png`
- **Layout**: Fixed 320px left sidebar + flexible main workspace + 32px status bar

### Dark Mode — Mobile Layout
- **Screen ID**: `4a182feeb20c4fe394c2a0bdf953e1a2`
- **Device**: Mobile (780×2098)
- **Local Files**: `.stitch/designs/mobile-layout.html`, `.stitch/designs/mobile-layout.png`
- **Layout**: Stacked — preview top, image strip, tabbed controls bottom

### Light Mode — Desktop Workspace
- **Screen ID**: `52e637df8cf84769a5eecf95fabf0c58`
- **Device**: Desktop (2560×2048)
- **Local Files**: `.stitch/designs/desktop-light.html`, `.stitch/designs/desktop-light.png`
- **Layout**: Same sidebar + workspace structure, white/gray palette

### Light Mode — Mobile Layout
- **Screen ID**: `b37fdd15e84548118d05967007b3c141`
- **Device**: Mobile (780×2442)
- **Local Files**: `.stitch/designs/mobile-light.html`, `.stitch/designs/mobile-light.png`
- **Layout**: Same stacked structure, white/gray palette

### Desktop Workspace (variant)
- **Screen ID**: `dac6a742c14741e7a4ac2242fc869e4a`
- **Device**: Desktop (2560×2048)
- **Local Files**: `.stitch/designs/desktop-light-v2.html`, `.stitch/designs/desktop-light-v2.png`
- **Layout**: Top tab navigation variant with image gallery grid

## Component Patterns
- **Image Thumbnails**: 80×80px (desktop), 64×64px (mobile), accent border when selected
- **Effect Selector**: Radio list (desktop), pill chips (mobile)
- **Dropdowns**: Surface color with subtle border, coral accent on focus
- **Sliders**: Track in surface color, thumb in primary accent
- **Buttons**: Primary = coral-red pill, Ghost = transparent with border
- **Status Bar**: Compact config summary, always visible
- **Theme Toggle**: Sun/moon icon in header (optional manual override)
