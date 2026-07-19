$(function () {

    let cropper = null;
    function showCropModal() {
        $("#cropModal").removeClass("hidden").addClass("flex");
    }
    function hideCropModal() {
        $("#cropModal").removeClass("flex").addClass("hidden");
    }

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

    // Upload image
    $('#imageInput').on('change', function () {
        const file = this.files[0];
        if (!file) return;

        window.currentFileName = file.name;
        const reader = new FileReader();
        reader.onload = function (e) {
            $('#cropImage').attr('src', e.target.result);
            showCropModal();
        };
        reader.readAsDataURL(file);
    });

    // Initialize Cropper
    $('#cropModal').on('shown.bs.modal', function () {
        // $("#btnBrowse").trigger("focus");

        cropper = new Cropper($('#cropImage')[0], {
            viewMode: 1,
            responsive: true,
            restore: false,
            autoCropArea: 0.9,
            checkOrientation: false,
            background: false
        });
    });

    // Destroy Cropper
    $('#cropModal').on('hidden.bs.modal', function () {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    });

    // Crop image
    $('#btnCrop').click(function () {
        const canvas = cropper.getCroppedCanvas({ width: 1800, height: 1800, imageSmoothingEnabled: true, imageSmoothingQuality: "high" });
        const currentThumnail = addThumbnail(canvas, window.currentFileName);
        processScan(canvas, currentThumnail);

        $("#scanResultCard").removeClass("d-none");
        if ($("#scanGallery .scan-thumb").length === 0) {
            $("#scanResultCard").addClass("d-none");
        }
        hideCropModal()
    });

    $(document).on("click", ".btn-download", function () {
        const $thumb = $(this).closest(".scan-thumb");
        const canvas = $thumb.find(".thumb-canvas")[0];
        const fileName = $thumb.data("file").replace(/\.[^/.]+$/, "");
        downloadPdf([canvas], fileName);
    });

    let panzoom = null;
    let wheelHandler = null;
    const previewModal=new bootstrap.Modal($('#previewModal')[0]);

    $(document).on("click", ".btn-preview", function () {
        const sourceCanvas = $(this).closest(".scan-thumb").find(".thumb-canvas")[0];
        const targetCanvas = $("#previewModalCanvas")[0];

        targetCanvas.width = sourceCanvas.width;
        targetCanvas.height = sourceCanvas.height;

        targetCanvas.getContext("2d").drawImage(sourceCanvas, 0, 0);
        previewModal.show();
    });

    $(document).on("click", ".btn-delete", function () {
        // Remove the thumbnail
        $(this).closest(".scan-thumb").remove();
        // Hide the scanned documents card if no thumbnails remain
        if ($("#scanGallery .scan-thumb").length === 0) {
            $("#scanResultCard").addClass("d-none");
        }
    });

    $('#previewModal').on('shown.bs.modal', function () {
        if (panzoom) { panzoom.destroy(); }
        if (wheelHandler) {
            container.removeEventListener('wheel', wheelHandler);
        }

        requestAnimationFrame(function () {
            const container = document.getElementById('canvasContainer');
            panzoom = Panzoom(container, {
                maxScale: 6,
                minScale: 1,
                cursor: 'grab',
                step: 0.2
            });

            container.addEventListener('wheel', function (e) {
                e.preventDefault();
                panzoom.zoomWithWheel(e);  // pass the native event directly, not jQuery's wrapper
            }, { passive: false });
        })
    });

    $("#previewModal").on("hidden.bs.modal", function () {
        if (panzoom) {
            panzoom.reset({ animate: false });
        }
    });

    $("#btnBrowse").click(function () {
        $("#imageInput").click();
    });

    $("#btnCamera").click(function () {
        $("#cameraInput").click();
    });

    function processScan(inputCanvas, thumbCanvas) {
      if (typeof cv === "undefined") {
          alert("OpenCV is still loading.");
          return;
      }
      let src = cv.imread(inputCanvas);

      let gray = new cv.Mat();
      let blur = new cv.Mat();
      let sharpen = new cv.Mat();
      let thresh = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.bilateralFilter(gray, blur, 9, 75, 75, cv.BORDER_DEFAULT);

      let kernel = cv.matFromArray(3, 3, cv.CV_32F, [0,-1,0, -1,5,-1, 0,-1,0]);

      cv.filter2D(blur, sharpen, cv.CV_8U, kernel);

      cv.adaptiveThreshold(sharpen, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 8);
      // cv.imshow("previewCanvas", thresh);
      cv.imshow(thumbCanvas, thresh);

      src.delete();
      gray.delete();
      blur.delete();
      sharpen.delete();
      thresh.delete();
      kernel.delete();
    }

    $("#imageInput").on("change", function(){
        handleFiles(this.files);
    });

    $("#cameraInput").on("change", function(){
        handleFiles(this.files);
    });

    $("#btnDownloadPdf").on("click", function () {
        const canvases = $("#scanGallery .thumb-canvas").map(function () {
            return this;
        }).get();
        downloadPdf(canvases);
    });

    function downloadPdf(canvases, fileName = "scanned-document") {

        if (!canvases.length) {
            return;
        }
        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({orientation: "portrait", unit: "mm", format: "a4" });

        canvases.forEach((canvas, index) => {
            addCanvasToPdf(pdf, canvas, index > 0);
        });

        pdf.save(`${fileName}-${Date.now()}.pdf`);
    }

    function handleFiles(files){
        Array.from(files).forEach(function(file){
            if(!file.type.startsWith("image/")){
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e){
                $("#cropImage").attr("src", e.target.result);
                currentFile = file;
                $('#cropModal').show();
            };
            reader.readAsDataURL(file);
        });
    }

    function addCanvasToPdf(pdf, canvas, addNewPage = false) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
        const width = canvas.width * ratio;
        const height = canvas.height * ratio;
        const x = (pageWidth - width) / 2;
        const y = (pageHeight - height) / 2;

        if (addNewPage) {
            pdf.addPage();
        }
        pdf.addImage(canvas.toDataURL("image/png", 1.0), "PNG", x, y, width, height, undefined, "FAST");
    }

    function addThumbnail(sourceCanvas, fileName) {
        const $thumb = $(`
            <div class="scan-thumb position-relative d-inline-block">
                <button class="btn btn-danger btn-sm btn-delete" title="Delete">
                    <i class="bi bi-x-lg"></i>
                </button>    
                <canvas class="thumb-canvas"></canvas>
                <div class="preview-actions">
                    <button class="btn btn-primary btn-sm btn-preview">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-success btn-sm btn-download">
                        <i class="bi bi-download"></i>
                    </button>
                </div>
            </div>
        `);

        const canvas = $thumb.find(".thumb-canvas")[0];
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;
        canvas.getContext("2d").drawImage(sourceCanvas, 0, 0);
        
        $thumb.data("file", fileName);
            
        $("#scanGallery").append($thumb);
        return canvas;
    }

});