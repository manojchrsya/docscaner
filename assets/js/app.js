function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.body.classList.add('modal-open');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    document.body.classList.remove('modal-open');
}
// Close on backdrop click
['cropModal', 'previewModal'].forEach(function(id) {
    document.getElementById(id).addEventListener('click', function(e) {
        if (e.target === this) closeModal(id);
    });
});
// ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal('cropModal');
        closeModal('previewModal');
    }
});

document.getElementById('cropModalClose').addEventListener('click', function() { closeModal('cropModal'); });
document.getElementById('cropCancel').addEventListener('click',     function() { closeModal('cropModal'); });
document.getElementById('previewModalClose').addEventListener('click', function() { closeModal('previewModal'); });


$(function () {

    let cropper = null;

    /* ── Drop zone ── */
    $("#dropZone").on("dragover", function(e){
        e.preventDefault();
        $(this).addClass("dragover");
    }).on("dragleave", function(){
        $(this).removeClass("dragover");
    }).on("drop", function(e){
        e.preventDefault();
        $(this).removeClass("dragover");
        const files = e.originalEvent.dataTransfer.files;
        handleFiles(files);
    });

    /* ── Upload image ── */
    $('#imageInput').on('change', function () {
        const file = this.files[0];
        if (!file) return;
        window.currentFileName = file.name;
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.getElementById('cropImage');
            // Set crossOrigin BEFORE src to avoid canvas taint
            img.crossOrigin = 'anonymous';
            img.src = e.target.result;
            openModal('cropModal');
        };
        reader.readAsDataURL(file);
    });

    /* ── Initialize Cropper when modal opens ── */
    // Watch for cropModal becoming visible using MutationObserver
    // (replaces Bootstrap's shown.bs.modal event)
    const cropModalEl = document.getElementById('cropModal');
    const cropObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            if (m.type === 'attributes' && m.attributeName === 'class') {
                const isOpen = cropModalEl.classList.contains('open');
                if (isOpen && !cropper) {
                    const img = document.getElementById('cropImage');
                    function initCropper() {
                        if (cropper) { cropper.destroy(); cropper = null; }
                        cropper = new Cropper(img, {
                            viewMode: 1,
                            responsive: true,
                            restore: false,
                            autoCropArea: 0.9,
                            checkOrientation: false,
                            checkCrossOrigin: false,
                            background: false,
                        });
                    }
                    // If image already loaded (cached), init immediately
                    if (img.complete && img.naturalWidth > 0) {
                        initCropper();
                    } else {
                        img.onload = initCropper;
                    }
                }
                if (!isOpen && cropper) {
                    cropper.destroy();
                    cropper = null;
                }
            }
        });
    });
    cropObserver.observe(cropModalEl, { attributes: true });

    /* ── Crop image ── */
    $('#btnCrop').click(function () {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas({
            maxWidth:  4096,
            maxHeight: 4096,
            minWidth:  100,
            minHeight: 100,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
        if (!canvas) { showToastMsg('Crop failed — please try again.'); return; }

        const currentThumnail = addThumbnail(canvas, window.currentFileName);
        processScan(canvas, currentThumnail);

        $("#scanResultCard").removeClass("hidden");
        closeModal('cropModal');
    });

    /* ── Per-thumb download ── */
    $(document).on("click", ".btn-download", function () {
        const $thumb = $(this).closest(".scan-thumb");
        const canvas = $thumb.find(".thumb-canvas")[0];
        const fileName = $thumb.data("file").replace(/\.[^/.]+$/, "");
        downloadPdf([canvas], fileName);
    });

    /* ── Panzoom preview ── */
    let panzoom = null;

    $(document).on("click", ".btn-preview", function () {
        const sourceCanvas = $(this).closest(".scan-thumb").find(".thumb-canvas")[0];
        const targetCanvas = $("#previewModalCanvas")[0];
        targetCanvas.width  = sourceCanvas.width;
        targetCanvas.height = sourceCanvas.height;
        targetCanvas.getContext("2d").drawImage(sourceCanvas, 0, 0);
        openModal('previewModal');

        // Init Panzoom after modal is visible and layout is settled
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (panzoom) { panzoom.destroy(); panzoom = null; }
                const container = document.getElementById('canvasContainer');
                panzoom = Panzoom(container, {
                    maxScale: 6,
                    minScale: 1,
                    contain: 'outside',
                    cursor: 'grab',
                    step: 0.2,
                });
                // Wheel zoom — native listener with passive:false required
                container.removeEventListener('wheel', onWheel);
                container.addEventListener('wheel', onWheel, { passive: false });
            });
        });
    });

    function onWheel(e) {
        e.preventDefault();
        if (panzoom) panzoom.zoomWithWheel(e); // native WheelEvent, not jQuery wrapper
    }

    // Reset panzoom when preview modal closes
    const previewObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            if (m.type === 'attributes' && m.attributeName === 'class') {
                const isOpen = document.getElementById('previewModal').classList.contains('open');
                if (!isOpen && panzoom) {
                    panzoom.reset({ animate: false });
                }
            }
        });
    });
    previewObserver.observe(document.getElementById('previewModal'), { attributes: true });

    /* ── Delete thumb ── */
    $(document).on("click", ".btn-delete", function () {
        $(this).closest(".scan-thumb").remove();
        if ($("#scanGallery .scan-thumb").length === 0) {
            $("#scanResultCard").addClass("hidden");
            showToastMsg("Scanned file has been deleted.");
        }
    });

    /* ── Browse / Camera buttons ── */
    $("#btnBrowse").click(function () { $("#imageInput").click(); });
    $("#btnCamera").click(function () { $("#cameraInput").click(); });

    /* ── OpenCV scan processing ── */
    function processScan(inputCanvas, thumbCanvas) {
        if (typeof cv === "undefined") {
            showToastMsg("OpenCV is still loading. Please wait a moment and try again.");
            return;
        }
        let src     = cv.imread(inputCanvas);
        let gray    = new cv.Mat();
        let blur    = new cv.Mat();
        let sharpen = new cv.Mat();
        let thresh  = new cv.Mat();

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.bilateralFilter(gray, blur, 9, 75, 75, cv.BORDER_DEFAULT);

        let kernel = cv.matFromArray(3, 3, cv.CV_32F, [0,-1,0, -1,5,-1, 0,-1,0]);
        cv.filter2D(blur, sharpen, cv.CV_8U, kernel);
        cv.adaptiveThreshold(sharpen, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 8);
        cv.imshow(thumbCanvas, thresh);

        src.delete(); gray.delete(); blur.delete(); sharpen.delete(); thresh.delete(); kernel.delete();
    }

    /* ── Handle multiple file inputs ── */
    $("#imageInput").on("change", function(){
        handleFiles(this.files);
    });
    $("#cameraInput").on("change", function(){
        handleFiles(this.files);
    });

    /* ── Download all as PDF ── */
    $("#btnDownloadPdf").on("click", function () {
        const canvases = $("#scanGallery .thumb-canvas").get();
        downloadPdf(canvases);
    });

    function downloadPdf(canvases, fileName = "scanned-document") {
        if (!canvases.length) return;
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        canvases.forEach(function(canvas, index) {
            addCanvasToPdf(pdf, canvas, index > 0);
        });
        pdf.save(`${fileName}-${Date.now()}.pdf`);
    }

    function handleFiles(files) {
        Array.from(files).forEach(function(file) {
            if (!file.type.startsWith("image/")) return;
            window.currentFileName = file.name;
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.getElementById('cropImage');
                img.crossOrigin = 'anonymous';
                img.src = e.target.result;
                openModal('cropModal');
            };
            reader.readAsDataURL(file);
        });
    }

    function addCanvasToPdf(pdf, canvas, addNewPage = false) {
        const pageWidth  = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio  = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
        const width  = canvas.width  * ratio;
        const height = canvas.height * ratio;
        const x = (pageWidth  - width)  / 2;
        const y = (pageHeight - height) / 2;
        if (addNewPage) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/png", 1.0), "PNG", x, y, width, height, undefined, "FAST");
    }

    function addThumbnail(sourceCanvas, fileName) {
        const $thumb = $(`
            <div class="scan-thumb position-relative">
                <button class="btn-delete bg-red-500 hover:bg-red-600 text-white" title="Delete">
                    <i class="bi bi-x-lg" style="font-size:12px"></i>
                </button>
                <canvas class="thumb-canvas"></canvas>
                <div class="preview-actions">
                    <button class="btn-preview inline-flex items-center justify-center w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition" title="Preview">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn-download inline-flex items-center justify-center w-9 h-9 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition" title="Download">
                        <i class="bi bi-download"></i>
                    </button>
                </div>
            </div>
        `);

        const canvas = $thumb.find(".thumb-canvas")[0];
        canvas.width  = sourceCanvas.width;
        canvas.height = sourceCanvas.height;
        canvas.getContext("2d").drawImage(sourceCanvas, 0, 0);
        $thumb.data("file", fileName);
        $("#scanGallery").append($thumb);
        return canvas;
    }

    function showToastMsg(msg) {
      // Reuse existing toast if available, otherwise console
      let t = document.getElementById('queueToast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'queueToast';
        t.className = 'fixed bottom-5 right-5 z-50 bg-gray-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg transition-all duration-300 translate-y-10 opacity-0';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.classList.remove('translate-y-10', 'opacity-0');
      clearTimeout(t._tid);
      t._tid = setTimeout(() => t.classList.add('translate-y-10', 'opacity-0'), 2800);
    }

});