document.addEventListener('DOMContentLoaded', () => {
    let currentImage = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let fileType = 'image/jpeg';
    let fileName = 'image.jpg';
    
    const settingsPanel = document.getElementById('settings-panel');
    const resultArea = document.getElementById('result-area');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const maintainAspectCb = document.getElementById('maintain-aspect');
    const processBtn = document.getElementById('process-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    const origSizeEl = document.getElementById('original-size');
    const newSizeEl = document.getElementById('new-size');

    // Handle File Selection
    window.setupDragAndDrop('upload-area', 'file-input', (file) => {
        if (!file.type.match(/image\/(jpeg|png|webp)/)) {
            alert('Please select a JPG, PNG, or WEBP image.');
            return;
        }
        
        fileName = file.name;
        fileType = file.type;
        document.querySelector('.upload-label').textContent = file.name;
        
        // Load image to get dimensions and preview
        const reader = new FileReader();
        reader.onload = (e) => {
            // Update Preview Icon
            const uploadArea = document.getElementById('upload-area');
            const uploadIcon = uploadArea.querySelector('.upload-icon');
            uploadIcon.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            uploadIcon.style.border = "none";

            const img = new Image();
            img.onload = () => {
                currentImage = img;
                originalWidth = img.width;
                originalHeight = img.height;
                
                widthInput.value = originalWidth;
                heightInput.value = originalHeight;
                origSizeEl.textContent = `${originalWidth}x${originalHeight} px`;
                
                settingsPanel.style.display = 'block';
                resultArea.style.display = 'none';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Handle Input changes
    const aspectCorrection = (changedDim) => {
        if(!maintainAspectCb.checked || !currentImage) return;
        const ratio = originalWidth / originalHeight;
        
        if(changedDim === 'width') {
            const w = parseInt(widthInput.value) || 0;
            heightInput.value = Math.round(w / ratio);
        } else {
            const h = parseInt(heightInput.value) || 0;
            widthInput.value = Math.round(h * ratio);
        }
    };

    if(widthInput) widthInput.addEventListener('input', () => aspectCorrection('width'));
    if(heightInput) heightInput.addEventListener('input', () => aspectCorrection('height'));

    // Process Image
    if(processBtn) {
        processBtn.addEventListener('click', () => {
            if(!currentImage) return;
            
            const w = parseInt(widthInput.value) || originalWidth;
            const h = parseInt(heightInput.value) || originalHeight;
            
            if(w <= 0 || h <= 0) {
                alert("Please enter valid width and height greater than 0.");
                return;
            }

            processBtn.classList.add('loading');
            processBtn.disabled = true;

            setTimeout(() => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(currentImage, 0, 0, w, h);
                    
                    const dataUrl = canvas.toDataURL(fileType, 0.9);
                    
                    // Update UI
                    newSizeEl.textContent = `${w}x${h} px`;
                    resultArea.style.display = 'block';
                    
                    // Setup download link
                    downloadBtn.href = dataUrl;
                    downloadBtn.download = 'resized_' + fileName;
                    
                    processBtn.classList.remove('loading');
                    processBtn.disabled = false;
                } catch(e) {
                    console.error(e);
                    alert("An error occurred during resizing.");
                    processBtn.textContent = 'Resize Image';
                    processBtn.disabled = false;
                }
            }, 100);
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
});
