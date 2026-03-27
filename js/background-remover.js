document.addEventListener('DOMContentLoaded', () => {
    let currentFile = null;
    const processingUI = new ProcessingUI('.tool-workspace');

    const settingsPanel = document.getElementById('settings-panel');
    const resultArea = document.getElementById('result-area');
    const processBtn = document.getElementById('process-btn');
    const downloadBtn = document.getElementById('download-btn');
    const thresholdSlider = document.getElementById('threshold');
    const thresholdVal = document.getElementById('threshold-val');

    const previewOriginal = document.getElementById('preview-original');
    const previewResult = document.getElementById('preview-result');

    // Background color options
    let bgMode = 'transparent';
    const bgTransparentBtn = document.getElementById('bg-transparent');
    const bgWhiteBtn = document.getElementById('bg-white');
    const bgCustomBtn = document.getElementById('bg-custom');
    const customColorInput = document.getElementById('custom-color');

    const bgBtns = [bgTransparentBtn, bgWhiteBtn, bgCustomBtn];

    bgBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                bgBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                bgMode = btn.getAttribute('data-bg');
                if (bgMode === 'custom') {
                    customColorInput.style.display = 'block';
                } else {
                    customColorInput.style.display = 'none';
                }
            });
        }
    });

    const sensitivityLabels = { 1: 'Aggressive', 2: 'Medium', 3: 'Conservative' };

    if (thresholdSlider && thresholdVal) {
        thresholdSlider.addEventListener('input', (e) => {
            thresholdVal.textContent = sensitivityLabels[e.target.value] || 'Medium';
        });
    }

    // Handle File Selection
    window.setupDragAndDrop('upload-area', 'file-input', (file) => {
        if (!file.type.match(/image\/(jpeg|png|webp)/)) {
            alert('Please select a JPG, PNG, or WEBP image.');
            return;
        }
        currentFile = file;
        document.querySelector('.upload-label').textContent = file.name;
        settingsPanel.style.display = 'block';
        resultArea.style.display = 'none';

        // Show original preview
        const reader = new FileReader();
        reader.onload = (e) => {
            previewOriginal.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Background removal using color-based edge detection
    function removeBackground(imageData, sensitivity) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Threshold mapping: aggressive=more removal, conservative=less
        const thresholdMap = { 1: 40, 2: 25, 3: 15 };
        const colorThreshold = thresholdMap[sensitivity] || 25;

        // Sample corner pixels to determine background color
        const corners = [
            getPixel(data, 0, 0, width),                           // top-left
            getPixel(data, width - 1, 0, width),                   // top-right
            getPixel(data, 0, height - 1, width),                  // bottom-left
            getPixel(data, width - 1, height - 1, width),          // bottom-right
            getPixel(data, Math.floor(width/2), 0, width),         // top-center
            getPixel(data, Math.floor(width/2), height - 1, width) // bottom-center
        ];

        // Average background color from corners
        const bgColor = {
            r: Math.round(corners.reduce((s, c) => s + c.r, 0) / corners.length),
            g: Math.round(corners.reduce((s, c) => s + c.g, 0) / corners.length),
            b: Math.round(corners.reduce((s, c) => s + c.b, 0) / corners.length)
        };

        // Flood fill from edges
        const visited = new Uint8Array(width * height);
        const stack = [];

        // Add all edge pixels to stack
        for (let x = 0; x < width; x++) {
            stack.push(x); // top row (y=0)
            stack.push(x + (height - 1) * width); // bottom row
        }
        for (let y = 0; y < height; y++) {
            stack.push(y * width); // left column
            stack.push((width - 1) + y * width); // right column
        }

        // Process stack
        while (stack.length > 0) {
            const idx = stack.pop();
            if (idx < 0 || idx >= width * height || visited[idx]) continue;

            const px = idx % width;
            const py = Math.floor(idx / width);
            const pixel = getPixel(data, px, py, width);

            const dist = colorDistance(pixel, bgColor);
            if (dist > colorThreshold) continue;

            visited[idx] = 1;
            data[idx * 4 + 3] = 0; // Set alpha to 0

            // Add neighbors (4-connected)
            if (px > 0) stack.push(idx - 1);
            if (px < width - 1) stack.push(idx + 1);
            if (py > 0) stack.push(idx - width);
            if (py < height - 1) stack.push(idx + width);
        }

        // Apply edge smoothing (anti-alias)
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                if (data[idx + 3] > 0) {
                    // Check if it's an edge pixel
                    const neighbors = [
                        data[((y - 1) * width + x) * 4 + 3],
                        data[((y + 1) * width + x) * 4 + 3],
                        data[(y * width + x - 1) * 4 + 3],
                        data[(y * width + x + 1) * 4 + 3]
                    ];
                    const transparentCount = neighbors.filter(a => a === 0).length;
                    if (transparentCount > 0 && transparentCount < 4) {
                        // Edge pixel - apply semi-transparency
                        data[idx + 3] = Math.round(255 * (1 - transparentCount / 6));
                    }
                }
            }
        }

        return imageData;
    }

    function getPixel(data, x, y, width) {
        const idx = (y * width + x) * 4;
        return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
    }

    function colorDistance(c1, c2) {
        return Math.sqrt(
            Math.pow(c1.r - c2.r, 2) +
            Math.pow(c1.g - c2.g, 2) +
            Math.pow(c1.b - c2.b, 2)
        );
    }

    // Process Image
    if (processBtn) {
        processBtn.addEventListener('click', async () => {
            if (!currentFile) return;

            processingUI.show('Processing your file…', 'Removing background – analyzing pixels');
            processBtn.disabled = true;

            try {
                const reader = new FileReader();
                reader.readAsDataURL(currentFile);

                reader.onload = (e) => {
                    const img = new Image();
                    img.src = e.target.result;

                    img.onload = () => {
                        processingUI.setProgress(20);

                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);

                        processingUI.setProgress(40);

                        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const sensitivity = parseInt(thresholdSlider.value);

                        // Remove background
                        imageData = removeBackground(imageData, sensitivity);

                        processingUI.setProgress(80);

                        // Apply background color if requested
                        if (bgMode === 'white' || bgMode === 'custom') {
                            const bgCanvas = document.createElement('canvas');
                            bgCanvas.width = canvas.width;
                            bgCanvas.height = canvas.height;
                            const bgCtx = bgCanvas.getContext('2d');

                            if (bgMode === 'white') {
                                bgCtx.fillStyle = '#ffffff';
                            } else {
                                bgCtx.fillStyle = customColorInput.value;
                            }
                            bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

                            // Put processed image data on temp canvas
                            const tmpCanvas = document.createElement('canvas');
                            tmpCanvas.width = canvas.width;
                            tmpCanvas.height = canvas.height;
                            const tmpCtx = tmpCanvas.getContext('2d');
                            tmpCtx.putImageData(imageData, 0, 0);

                            // Draw on colored background
                            bgCtx.drawImage(tmpCanvas, 0, 0);

                            // Use the colored canvas
                            const resultUrl = bgCanvas.toDataURL('image/png');
                            previewResult.src = resultUrl;
                            downloadBtn.href = resultUrl;
                            downloadBtn.download = 'bg_removed_' + currentFile.name.replace(/\.[^.]+$/, '.png');
                        } else {
                            // Transparent background
                            ctx.putImageData(imageData, 0, 0);
                            const resultUrl = canvas.toDataURL('image/png');
                            previewResult.src = resultUrl;
                            downloadBtn.href = resultUrl;
                            downloadBtn.download = 'bg_removed_' + currentFile.name.replace(/\.[^.]+$/, '.png');
                        }

                        processingUI.setProgress(100);
                        setTimeout(() => {
                            processingUI.hide();
                            resultArea.style.display = 'block';
                        }, 400);

                        processBtn.disabled = false;
                    };
                };
            } catch (e) {
                console.error(e);
                processingUI.hide();
                alert('An error occurred during background removal.');
                processBtn.disabled = false;
            }
        });
    }
});
