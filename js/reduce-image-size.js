document.addEventListener('DOMContentLoaded', () => {
    let currentFile = null;
    let targetKB = 100;
    const processingUI = new ProcessingUI('.tool-workspace');

    const settingsPanel = document.getElementById('settings-panel');
    const resultArea = document.getElementById('result-area');
    const processBtn = document.getElementById('process-btn');
    const downloadBtn = document.getElementById('download-btn');
    const customKBInput = document.getElementById('custom-kb');

    const origSizeEl = document.getElementById('original-size');
    const newSizeEl = document.getElementById('new-size');
    const targetSizeEl = document.getElementById('target-size');

    // KB Preset buttons
    const presetBtns = document.querySelectorAll('.kb-preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            targetKB = parseInt(btn.getAttribute('data-kb'));
            customKBInput.value = targetKB;
        });
    });

    // Custom KB input
    if (customKBInput) {
        customKBInput.addEventListener('input', (e) => {
            targetKB = parseInt(e.target.value) || 100;
            presetBtns.forEach(b => {
                if (parseInt(b.getAttribute('data-kb')) === targetKB) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
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
        origSizeEl.textContent = formatBytes(file.size);
        settingsPanel.style.display = 'block';
        resultArea.style.display = 'none';
    });

    // Binary search compression to target KB
    async function compressToTargetKB(img, targetBytes, maxIterations = 15) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        let lo = 0.01;
        let hi = 1.0;
        let bestBlob = null;
        let bestQuality = 0.5;

        for (let i = 0; i < maxIterations; i++) {
            const mid = (lo + hi) / 2;
            
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', mid);
            });

            processingUI.setProgress(20 + (i / maxIterations) * 60);

            if (blob.size <= targetBytes) {
                bestBlob = blob;
                bestQuality = mid;
                lo = mid;
            } else {
                hi = mid;
            }

            // Close enough - within 5% of target
            if (bestBlob && Math.abs(bestBlob.size - targetBytes) / targetBytes < 0.05) {
                break;
            }
        }

        // If still too large, try with dimension reduction
        if (!bestBlob || bestBlob.size > targetBytes) {
            let scale = 0.9;
            for (let attempt = 0; attempt < 10; attempt++) {
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);

                const blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, 'image/jpeg', bestQuality);
                });

                processingUI.setProgress(80 + (attempt / 10) * 15);

                if (blob.size <= targetBytes) {
                    bestBlob = blob;
                    break;
                }
                scale *= 0.85;
            }
        }

        // Final fallback: minimum quality + small size
        if (!bestBlob || bestBlob.size > targetBytes) {
            canvas.width = Math.round(img.width * 0.3);
            canvas.height = Math.round(img.height * 0.3);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            bestBlob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', 0.1);
            });
        }

        return bestBlob;
    }

    // Process Image
    if (processBtn) {
        processBtn.addEventListener('click', async () => {
            if (!currentFile) return;

            const targetBytes = targetKB * 1024;

            // If already smaller than target
            if (currentFile.size <= targetBytes) {
                alert(`Your image is already ${formatBytes(currentFile.size)}, which is smaller than the target ${targetKB}KB.`);
                return;
            }

            processingUI.show('Processing your file…', `Reducing image to ${targetKB}KB`);
            processBtn.disabled = true;

            try {
                const reader = new FileReader();
                reader.readAsDataURL(currentFile);

                reader.onload = async (e) => {
                    const img = new Image();
                    img.src = e.target.result;

                    img.onload = async () => {
                        processingUI.setProgress(10);

                        const compressedBlob = await compressToTargetKB(img, targetBytes);

                        if (!compressedBlob) {
                            processingUI.hide();
                            alert('Could not compress to the target size. Try a larger target.');
                            processBtn.disabled = false;
                            return;
                        }

                        const compressedUrl = URL.createObjectURL(compressedBlob);

                        // Update UI
                        newSizeEl.textContent = formatBytes(compressedBlob.size);
                        targetSizeEl.textContent = targetKB + ' KB';

                        downloadBtn.href = compressedUrl;
                        const ext = currentFile.name.split('.').pop();
                        downloadBtn.download = currentFile.name.replace(`.${ext}`, `_${targetKB}kb.jpg`);

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
                alert('An error occurred during compression.');
                processBtn.disabled = false;
            }
        });
    }
});
