# Feature Ideas — Lenticular Studio

Ranked by user impact and feasibility.

---

## Tier 1 — High Impact, Reasonable Effort

### 1. Project Save/Load
All work is lost on refresh — this is the #1 pain point.
- Save project as `.tilt.json` file (layout tree, effect settings, print config)
- Store image references as base64 or blob URLs in IndexedDB
- Auto-save to IndexedDB on changes, manual export/import as file
- "Recent Projects" list on the new project screen

### 2. Undo/Redo
No way to recover from mistakes (wrong split, deleted frame, bad transform).
- Command pattern history stack on layout store mutations
- Ctrl+Z / Ctrl+Y (desktop), shake to undo (mobile)
- Track: frame add/remove, transforms, layout splits, effect changes

### 3. Share as GIF/Video
Users want to show off their lenticular creations digitally, not just print.
- Generate animated GIF or MP4 from the frame sequence
- Scrub animation rendered as frames, encode with Web Codecs API or gif.js
- Share button with download or Web Share API (mobile native share sheet)
- Optional: Simulate lenticular tilt motion (ease back and forth)

---

## Tier 2 — Medium Impact, Medium Effort

### 4. AI Depth Map Generation
The 3D Depth effect requires a manual depth map — most users don't have one.
- "Generate Depth Map" button on the depth3d effect panel
- Use a client-side model (e.g., MiDaS via ONNX Runtime Web) or API call
- Auto-assigns generated depth map as the second frame

### 5. Live Camera Capture
Mobile users want to shoot frames directly instead of uploading from gallery.
- Camera button in the Images tab
- Opens `getUserMedia` viewfinder overlay
- Capture multiple frames (tap for each)
- Great for stop-motion animation effect

### 6. Frame Interpolation
Smoother animations with fewer source images.
- User uploads 2-3 keyframes, app generates intermediate frames
- Simple: Cross-fade blending (already have morph engine)
- Advanced: Optical flow interpolation (Web Worker)
- Slider to control generated frame count (e.g., 2 to 8 frames)

---

## Tier 3 — Nice to Have

### 7. Image Adjustments
- Brightness, contrast, saturation sliders per frame
- Apply to all frames in section
- Real-time preview via CSS filters on canvas

### 8. Templates Gallery
- Pre-made lenticular designs (birthday card, before/after, product showcase)
- Placeholder slots where user drops their images
- Shareable template format

### 9. QR Code Preview
- Generate QR code linking to a hosted web preview
- Scan with phone to see gyro-enabled tilt preview
- Uses WebRTC or hosted static page with embedded frames

### 10. Web Worker Processing
- `interlace.worker.ts` already exists but isn't used
- Move heavy processing (interlace, normalize, export) off main thread
- Keeps UI responsive during export of large images

---

## Quick Wins (< 1 hour each)

- **Zoom center picker**: Click on canvas to set zoom effect center point
- **Frame count badge**: Show "3/12 frames" in section selector
- **Keyboard shortcuts**: Space = play animation, arrows = scrub, Delete = remove frame
- **Drag-to-reorder sections**: Reorder sections in the layout, not just frames
- **Copy effect to all sections**: "Apply to all" button in effect picker

---

## Additional Print/Display Types

The interlacing engine is a generic spatial multiplexing system. These technologies reuse the same strip-based approach:

### Scanimation / Moiré Animation
- Same interlaced image, viewed through a striped acetate overlay instead of lenses
- Much cheaper — no lenticular lens sheet needed, just print overlay on transparency film
- Popular in children's books, greeting cards, educational materials
- Implementation: Generate a black/white stripe overlay PNG matching the LPI

### Wiggle Stereogram GIF/Video
- Export frame sequence as animated GIF alternating between 2-3 views
- Creates "wiggle" 3D effect on screen — no print or lenses needed
- Great for social media sharing
- Implementation: Render frames at intervals, encode as animated GIF

### Anaglyph 3D (Red/Cyan)
- Take 2 frames (left/right eye), combine into single red/cyan image
- Viewable with cheap paper 3D glasses
- Implementation: Map left frame to red channel, right frame to cyan channels

### Parallax Barrier
- Identical interlacing to lenticular, but viewing device uses slits instead of lenses
- Same LPI/DPI math applies — already works, just label it as an option
