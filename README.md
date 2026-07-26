# DocScan — Free Online Document Scanner

> Upload an image, crop it, enhance it with OpenCV, and download a scanned PDF — all inside your browser. No server. No sign-up. No data leaves your device.

---

## Live Demo
🔗 [https://manojchrsya.github.io/docscaner/](https://manojchrsya.github.io/docscaner/)

---

## Features

- **Drag & drop upload** — supports JPG, PNG, and WEBP; drop multiple files at once
- **Precision crop tool** — resizable selection with 8 drag handles, rule-of-thirds grid, and a live pixel readout
- **Aspect ratio lock** — Free, 1:1, 4:3, 16:9, 3:4, A4, and Letter presets
- **Straighten slider** — rotate the image ±10° before cropping
- **OpenCV.js enhancement** — bilateral filter → unsharp mask → adaptive threshold for clean, high-contrast B&W output
- **Full-screen preview** — Panzoom-powered zoom (scroll wheel + pinch) and pan before downloading
- **Before / after comparison** — toggle original vs scanned in the preview modal
- **Multi-page PDF export** — queue multiple images and export them as a single PDF via jsPDF
- **PNG & JPEG download** — save individual scanned pages at full resolution
- **Scan gallery** — thumbnail grid of all processed pages with per-page preview, download, and delete
- **100% client-side** — OpenCV.js runs as WebAssembly; no file is ever sent to a server

---

## How it works

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐    ┌──────────────┐
│  Upload img │ →  │  Crop modal  │ →  │  OpenCV processing  │ →  │  Download    │
│  JPG/PNG    │    │  Straighten  │    │  Bilateral filter   │    │  PNG / PDF   │
│  drag&drop  │    │  Ratio lock  │    │  Unsharp mask       │    │  Multi-page  │
└─────────────┘    └──────────────┘    │  Adaptive threshold │    └──────────────┘
                                       └─────────────────────┘
```

**OpenCV pipeline (per image):**

1. `cv.cvtColor` — convert RGBA → grayscale
2. `cv.bilateralFilter` — denoise while preserving edges
3. `cv.filter2D` with sharpening kernel `[0,-1,0,-1,5,-1,0,-1,0]` — enhance text edges
4. `cv.adaptiveThreshold` (Gaussian, block 21, C 8) — binarise to clean B&W

---

## Tech stack

| Library | Version | Purpose |
|---|---|---|
| [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html) | 4.x | Image processing (WebAssembly) |
| [Cropper.js](https://fengyuanchen.github.io/cropperjs/) | 1.6.2 | Interactive crop tool |
| [Panzoom](https://github.com/timmywil/panzoom) | latest | Zoom & pan in preview modal |
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.1 | Client-side PDF generation |
| [jQuery](https://jquery.com/) | 3.7.1 | DOM & event handling |
| [Tailwind CSS](https://tailwindcss.com/) | CDN | Utility-first styling |

---

## Getting started

### Run locally

No build step required. Just open the HTML file in a browser:

```bash
git clone https://github.com/manojchrsya/docscaner.git
cd docscan
open index.html          # macOS
# or
start index.html         # Windows
# or serve with any static server:
npx serve .
```

> **Note:** OpenCV.js is loaded via `<script async>` from the CDN. On first load it may take a few seconds. A local scan attempt before it finishes will show an alert — wait and retry.

### File structure

```
docscan/
├── index.html          # Main application (single file)
├── assets/
│   ├── css/
│   │   └── app.css     # Custom styles (scan gallery, upload zone, modals)
│   └── js/
│       └── app.js      # Application logic (crop, scan, PDF, gallery)
├── docs/               # Screenshots for README
└── README.md
```

---

## Usage

### Scanning a single document

1. Open the app and drag an image onto the upload zone (or click **Browse file**)
2. The crop modal opens automatically — drag handles to select the document area
3. Optionally pick an aspect ratio (A4, Letter, etc.) or use the straighten slider
4. Click **✓ Apply crop**
5. The image is processed through the OpenCV pipeline and appears in the scan gallery
6. Click **🔍** to preview full-screen with zoom, or **⬇** to download as PNG
7. Click **Download PDF** in the gallery header to export all pages as one PDF

### Scanning multiple pages

1. Upload the first image and crop it as above
2. Click **+ Add more** in the scan gallery or drop more files onto the upload zone
3. Each image opens in the crop modal in sequence
4. Once all pages are processed, click **Download PDF** — all pages are merged in order


## Browser support

| Browser | Support |
|---|---|
| Chrome 90+ | ✅ Full |
| Firefox 88+ | ✅ Full |
| Safari 15+ | ✅ Full |
| Edge 90+ | ✅ Full |
| Mobile Chrome / Safari | ✅ Full (touch & pinch-zoom) |

> WebAssembly and the Canvas API are required. Both are supported in all modern browsers.

---

## Privacy

- **No server.** The app is a static HTML file. There is no backend.
- **No uploads.** Images are read via `FileReader` and stay in browser memory.
- **No tracking.** No analytics, no cookies, no third-party data collection.
- **No storage.** Nothing is written to `localStorage` or `IndexedDB`.

All processing happens in-process via OpenCV.js (WebAssembly). Close the tab and the data is gone.

---

## Contributing

Contributions are welcome. Please open an issue before submitting a large PR.

```bash
# Fork the repo, then:
git checkout -b feature/your-feature
# make changes to index.html / assets/
git commit -m "feat: describe your change"
git push origin feature/your-feature
# open a Pull Request
```

### Ideas for contribution

- [ ] Perspective crop (4-corner drag to correct a tilted photo)
- [ ] Colour scan mode (not just B&W)
- [ ] Drag-to-reorder pages in the gallery before PDF export
- [ ] PWA / offline support
- [ ] OCR (Tesseract.js) to make PDFs text-searchable

---

## License

MIT © 2025 — see [LICENSE](LICENSE) for details.

---

## Acknowledgements

- [OpenCV](https://opencv.org/) — the image processing backbone
- [Cropper.js](https://fengyuanchen.github.io/cropperjs/) by Fengyuan Chen
- [jsPDF](https://github.com/parallax/jsPDF) by the parallax team
- [Panzoom](https://github.com/timmywil/panzoom) by Timmy Willison