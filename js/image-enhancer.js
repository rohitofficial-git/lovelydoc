document.addEventListener('DOMContentLoaded', () => {
    let currentFile = null;
    let currentObjectUrl = null;
    let mode = 'auto'; // 'auto', 'sharpen', 'upscale'
    
    const processingUI = new ProcessingUI('.tool-workspace');
    const settingsPanel = document.getElementById('settings-panel');
    const resultArea = document.getElementById('result-area');
    const processBtn = document.getElementById('process-btn');
    const downloadBtn = document.getElementById('download-btn');
    const previewOriginal = document.getElementById('preview-original');
    const previewResult = document.getElementById('preview-result');

    const modeBtns = document.querySelectorAll('.kb-preset-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mode = btn.getAttribute('data-mode');
        });
    });

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

        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
        }
        
        currentObjectUrl = URL.createObjectURL(file);
        previewOriginal.src = currentObjectUrl;
    });

    // Image processing kernels
    function applyConvolution(ctx, width, height, kernel) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const outData = new Uint8ClampedArray(data.length);
        const side = Math.round(Math.sqrt(kernel.length));
        const halfSide = Math.floor(side / 2);
        
        let kernelSum = kernel.reduce((a, b) => a + b, 0);
        if (kernelSum === 0) kernelSum = 1;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dstOff = (y * width + x) * 4;
                let r = 0, g = 0, b = 0;

                for (let cy = 0; cy < side; cy++) {
                    for (let cx = 0; cx < side; cx++) {
                        const scy = y + cy - halfSide;
                        const scx = x + cx - halfSide;
                        
                        if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
                            const srcOff = (scy * width + scx) * 4;
                            const wt = kernel[cy * side + cx];
                            r += data[srcOff] * wt;
                            g += data[srcOff + 1] * wt;
                            b += data[srcOff + 2] * wt;
                        }
                    }
                }
                outData[dstOff] = r / kernelSum;
                outData[dstOff + 1] = g / kernelSum;
                outData[dstOff + 2] = b / kernelSum;
                outData[dstOff + 3] = data[dstOff + 3];
            }
        }
        
        for (let i = 0; i < data.length; i++) {
            data[i] = outData[i];
        }
        ctx.putImageData(imageData, 0, 0);
    }

    // Process Image
    if (processBtn) {
        processBtn.addEventListener('click', async () => {
            if (!currentFile) return;

            processingUI.show('Processing your file…', 'Enhancing image quality');
            processBtn.disabled = true;

            try {
                const img = new Image();
                img.src = currentObjectUrl;

                img.onload = () => {
                    setTimeout(() => {
                        processingUI.setProgress(20);
                        
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // Set dimensions based on mode
                        if (mode === 'upscale') {
                            // Max safe resolution mapping
                            let scale = 2;
                            // Enforce safe memory limits (max roughly 4000x4000)
                            if (img.width * scale > 4000 || img.height * scale > 4000) {
                                scale = Math.min(4000 / img.width, 4000 / img.height);
                            }
                            canvas.width = Math.round(img.width * scale);
                            canvas.height = Math.round(img.height * scale);
                            
                            // High quality upscaling config
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                        } else {
                            canvas.width = img.width;
                            canvas.height = img.height;
                        }

                        // Base drawing
                        // We use global filters for basic enhancements before drawing
                        if (mode === 'auto') {
                            ctx.filter = `contrast(1.05) saturate(1.1) brightness(1.02)`;
                        }

                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        ctx.filter = 'none';

                        processingUI.setProgress(50);

                        // Apply advanced kernels
                        if (mode === 'auto' || mode === 'sharpen') {
                            // Light sharpen kernel for auto, stronger for sharpen mode
                            const kernel = mode === 'sharpen' ? 
                                [  0, -1,  0,
                                  -1,  5, -1,
                                   0, -1,  0 ] : 
                                [  0, -0.5,  0,
                                 -0.5, 3, -0.5,
                                   0, -0.5,  0 ];
                                   
                            applyConvolution(ctx, canvas.width, canvas.height, kernel);
                        }
                        
                        processingUI.setProgress(85);

                        const resultUrl = canvas.toDataURL(currentFile.type || 'image/jpeg', 0.95);
                        
                        previewResult.src = resultUrl;
                        downloadBtn.href = resultUrl;
                        downloadBtn.download = 'enhanced_' + currentFile.name;

                        processingUI.setProgress(100);
                        setTimeout(() => {
                            processingUI.hide();
                            resultArea.style.display = 'block';
                        }, 400);

                        processBtn.disabled = false;
                    }, 50); // small delay to allow UI to update
                };
            } catch (e) {
                console.error(e);
                processingUI.hide();
                alert('An error occurred during enhancement.');
                processBtn.disabled = false;
            }
        });
    }
});
