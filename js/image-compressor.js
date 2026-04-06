document.addEventListener('DOMContentLoaded', () => {
    let currentFile = null;
    const processingUI = new ProcessingUI('.tool-workspace');
    const settingsPanel = document.getElementById('settings-panel');
    const resultArea = document.getElementById('result-area');
    const qualitySlider = document.getElementById('quality');
    const qualityVal = document.getElementById('quality-val');
    const processBtn = document.getElementById('process-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    const origSizeEl = document.getElementById('original-size');
    const newSizeEl = document.getElementById('new-size');

    // Update slider value text
    if(qualitySlider && qualityVal) {
        qualitySlider.addEventListener('input', (e) => {
            qualityVal.textContent = e.target.value;
        });
    }

    // Add loader to download button
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            if (downloadBtn.classList.contains('loading')) {
                e.preventDefault();
                return;
            }
            
            downloadBtn.classList.add('loading');
            setTimeout(() => {
                downloadBtn.classList.remove('loading');
            }, 2000);
        });
    }

    // Handle File Selection
    window.setupDragAndDrop('upload-area', 'file-input', (file) => {
        if (!file.type.match(/image\/(jpeg|png|webp)/)) {
            alert('Please select a JPG, PNG, or WEBP image.');
            return;
        }
        currentFile = file;
        
        // Update UI
        const uploadArea = document.getElementById('upload-area');
        const uploadIcon = uploadArea.querySelector('.upload-icon');
        const uploadLabel = uploadArea.querySelector('.upload-label');
        
        // Show Image Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadIcon.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            uploadIcon.style.border = "none";
        };
        reader.readAsDataURL(file);

        uploadLabel.textContent = file.name;
        settingsPanel.style.display = 'block';
        resultArea.style.display = 'none';
        
        // Show original size
        origSizeEl.textContent = formatBytes(file.size);
    });

    // Process Image
    if(processBtn) {
        processBtn.addEventListener('click', async () => {
            if(!currentFile) return;
            
            processingUI.show('Processing your file...', 'Compressing your image');
            processBtn.classList.add('loading');
            processBtn.disabled = true;

            const quality = parseInt(qualitySlider.value) / 100;
            
            try {
                const reader = new FileReader();
                reader.readAsDataURL(currentFile);
                
                reader.onload = (e) => {
                    const img = new Image();
                    img.src = e.target.result;
                    
                    img.onload = () => {
                        processingUI.setProgress(40);

                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        
                        processingUI.setProgress(70);

                        // Compress
                        const targetType = currentFile.type === 'image/png' ? 'image/jpeg' : currentFile.type;
                        const dataUrl = canvas.toDataURL(targetType, quality);
                        
                        // Convert DataURL to Blob to get size
                        const base64str = dataUrl.split(',')[1];
                        const decoded = atob(base64str);
                        const sizeInBytes = decoded.length;
                        
                        // Update UI
                        newSizeEl.textContent = formatBytes(sizeInBytes);
                        
                        // Setup download link
                        downloadBtn.href = dataUrl;
                        downloadBtn.download = 'compressed_' + currentFile.name;
                        
                        processingUI.setProgress(100);
                        setTimeout(() => {
                            processingUI.hide();
                            resultArea.style.display = 'block';
                        }, 400);

                        processBtn.classList.remove('loading');
                        processBtn.disabled = false;
                    };
                };
            } catch(e) {
                console.error(e);
                processingUI.hide();
                alert("An error occurred during compression.");
                processBtn.disabled = false;
            }
        });
    }
});
