let originalPdfFile = null;
let compressedPdfBlob = null;
let pdfDoc = null;

// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileCard = document.getElementById('fileCard');
const controlsCard = document.getElementById('controlsCard');
const resultCard = document.getElementById('resultCard');
const loadingOverlay = document.getElementById('loadingOverlay');
const compressBtn = document.getElementById('compressBtn');
const downloadBtn = document.getElementById('downloadBtn');
const newFileBtn = document.getElementById('newFileBtn');
const removeFileBtn = document.getElementById('removeFile');
const fileNameSpan = document.getElementById('fileName');
const fileSizeSpan = document.querySelector('#fileSize');
const originalSizeSpan = document.getElementById('originalSize');
const compressedSizeSpan = document.getElementById('compressedSize');
const savedPercentSpan = document.getElementById('savedPercent');
const compressionStats = document.getElementById('compressionStats');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.querySelector('.progress-text');
const loadingMessage = document.getElementById('loadingMessage');

// Target Size Elements
const targetSizeInput = document.getElementById('targetSize');
const targetSizeUnit = document.getElementById('targetSizeUnit');
const targetSizeSection = document.getElementById('targetSizeSection');

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Convert to bytes
function convertToBytes(value, unit) {
    if (unit === 'KB') return value * 1024;
    if (unit === 'MB') return value * 1024 * 1024;
    return value; // Bytes
}

// File upload handling
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        handleFile(files[0]);
    } else {
        alert('Please upload a valid PDF file');
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Handle selected file
function handleFile(file) {
    if (file.size > 100 * 1024 * 1024) {
        alert('File size exceeds 100MB limit');
        return;
    }
    
    originalPdfFile = file;
    fileNameSpan.textContent = file.name;
    fileSizeSpan.textContent = formatFileSize(file.size);
    
    // Show file card, hide upload area
    uploadArea.style.display = 'none';
    fileCard.style.display = 'block';
    controlsCard.style.display = 'block';
    resultCard.style.display = 'none';
    
    // Generate preview
    generatePreview(file);
}

// Generate PDF preview
async function generatePreview(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        
        const canvas = document.getElementById('previewCanvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
    } catch (error) {
        console.error('Preview error:', error);
    }
}

// Remove file
removeFileBtn.addEventListener('click', () => {
    originalPdfFile = null;
    uploadArea.style.display = 'block';
    fileCard.style.display = 'none';
    controlsCard.style.display = 'none';
    resultCard.style.display = 'none';
    fileInput.value = '';
});



// Update loading message
function updateLoadingMessage(message, progress = null) {
    if (loadingMessage) loadingMessage.textContent = message;
    if (progress !== null && progressFill) {
        progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${Math.round(progress)}%`;
    }
}

// Compress to target size
async function compressToTargetSize(file, targetBytes) {
    let low = 1;
    let high = 100;
    let bestBlob = null;
    let bestSize = Infinity;
    
    // Binary search for optimal compression level
    for (let i = 0; i < 7; i++) {
        const mid = Math.floor((low + high) / 2);
        updateLoadingMessage(`Trying compression level ${mid}%...`, (i + 1) * 14);
        
        const compressed = await compressPDFWithQuality(file, mid);
        const compressedSize = compressed.size;
        
        if (Math.abs(compressedSize - targetBytes) < Math.abs(bestSize - targetBytes)) {
            bestBlob = compressed;
            bestSize = compressedSize;
        }
        
        if (compressedSize > targetBytes) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
        
        if (low > high) break;
    }
    
    if (bestSize > targetBytes * 1.15) {
        updateLoadingMessage("Standard compression insufficient. Switching to deep rasterization...");
        const rasterBlob = await rasterizeToTargetSize(file, targetBytes);
        if (rasterBlob && rasterBlob.size < bestSize) {
            bestBlob = rasterBlob;
            bestSize = rasterBlob.size;
        }
    }
    
    if (bestSize >= file.size) {
        throw new Error("This PDF mostly contains text/vectors and lacks compressible images. Browser-based compression cannot reduce its size further.");
    }
    
    return bestBlob;
}

// Compress using deep rasterization
async function compressViaRasterization(file, quality) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const newPdf = await PDFLib.PDFDocument.create();
    
    const imageQuality = Math.max(0.1, Math.min(0.9, quality / 100));
    let scaleFactor = quality < 30 ? 0.8 : (quality < 60 ? 1.2 : 1.5);
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: scaleFactor });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        
        const imgData = canvas.toDataURL('image/jpeg', imageQuality);
        const base64Data = imgData.split(',')[1];
        
        const byteString = atob(base64Data);
        const ia = new Uint8Array(byteString.length);
        for (let j = 0; j < byteString.length; j++) {
            ia[j] = byteString.charCodeAt(j);
        }
        
        const embeddedImage = await newPdf.embedJpg(ia);
        const originalViewport = page.getViewport({ scale: 1.0 });
        const newPage = newPdf.addPage([originalViewport.width, originalViewport.height]);
        
        newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: originalViewport.width,
            height: originalViewport.height
        });
    }
    
    const compressedBytes = await newPdf.save({ useObjectStreams: true });
    pdf.destroy();
    return new Blob([compressedBytes], { type: 'application/pdf' });
}

async function rasterizeToTargetSize(file, targetBytes) {
    let low = 1;
    let high = 100;
    let bestBlob = null;
    let bestSize = Infinity;
    
    for (let i = 0; i < 7; i++) {
        const mid = Math.floor((low + high) / 2);
        updateLoadingMessage(`Deep Rasterization ${mid}%...`, (i + 1) * 14);
        
        const compressed = await compressViaRasterization(file, mid);
        const compressedSize = compressed.size;
        
        if (Math.abs(compressedSize - targetBytes) < Math.abs(bestSize - targetBytes)) {
            bestBlob = compressed;
            bestSize = compressedSize;
        }
        
        if (compressedSize > targetBytes) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
        
        if (low > high) break;
    }
    return bestBlob;
}

// Compress PDF with specific quality
async function compressPDFWithQuality(file, quality) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    
    const imageQuality = Math.max(0.1, Math.min(0.95, quality / 100));
    let scaleFactor = quality < 30 ? 0.5 : (quality < 60 ? 0.7 : (quality < 80 ? 0.85 : 0.95));
    
    // Process each page
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        // Update progress
        updateLoadingMessage(`Processing page ${i + 1} of ${pages.length}...`, (i / pages.length) * 100);
        
        // Process images
        const resources = page.node.Resources();
        if (resources) {
            const xObjects = resources.lookup(PDFLib.PDFName.of('XObject'));
            if (xObjects instanceof PDFLib.PDFDict) {
                const xObjectKeys = xObjects.keys();
                
                for (const key of xObjectKeys) {
                    const xObject = xObjects.lookup(key);
                    
                    if (xObject instanceof PDFLib.PDFStream && 
                        xObject.dict.lookup(PDFLib.PDFName.of('Subtype')) === PDFLib.PDFName.of('Image')) {
                        
                        try {
                            const imageBytes = xObject.getContents();
                            const imgBlob = new Blob([imageBytes], { type: 'image/jpeg' });
                            const imgBitmap = await createImageBitmap(imgBlob);
                            
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            let newWidth = Math.max(100, Math.floor(imgBitmap.width * scaleFactor));
                            let newHeight = Math.max(100, Math.floor(imgBitmap.height * scaleFactor));
                            
                            canvas.width = newWidth;
                            canvas.height = newHeight;
                            ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);
                            
                            const compressedImageData = canvas.toDataURL('image/jpeg', imageQuality);
                            const base64Data = compressedImageData.split(',')[1];
                            const compressedBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                            
                            const compressedImage = await pdfDoc.embedJpg(compressedBytes);
                            xObjects.set(key, compressedImage.ref);
                            
                            imgBitmap.close();
                        } catch (err) {
                            console.warn('Image compression error:', err);
                        }
                    }
                }
            }
        }
    }
    
    // Metadata removal has been disabled to prevent pdf-lib 't.replace is not a function' errors
    
    const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 100,
        updateFieldAppearances: false
    });
    
    return new Blob([compressedBytes], { type: 'application/pdf' });
}

// Main compress function
async function compressPDF(file) {
    // Target size mode
    const targetValue = parseFloat(targetSizeInput.value);
    const targetUnit = targetSizeUnit.value;
    const targetBytes = convertToBytes(targetValue, targetUnit);
    
    if (targetBytes >= file.size) {
        throw new Error('Target size must be smaller than original file');
    }
    
    updateLoadingMessage(`Targeting ${targetValue} ${targetUnit}...`);
    return await compressToTargetSize(file, targetBytes);
}

// Compression button handler
if (compressBtn) {
    compressBtn.addEventListener('click', async () => {
        if (!originalPdfFile) {
            alert('Please select a PDF file first');
            return;
        }
        
        // Hide controls, show loader
        controlsCard.style.display = 'none';
        loadingOverlay.style.display = 'flex';
        
        try {
            updateLoadingMessage('Analyzing PDF structure...', 0);
            
            const compressedPdf = await compressPDF(originalPdfFile);
            compressedPdfBlob = compressedPdf;
            
            // Hide loader, show result
            loadingOverlay.style.display = 'none';
            resultCard.style.display = 'block';
            controlsCard.style.display = 'none';
            
            // Display sizes
            const originalSize = originalPdfFile.size;
            const compressedSize = compressedPdf.size;
            const savedPercentage = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
            const savedMB = ((originalSize - compressedSize) / (1024 * 1024)).toFixed(2);
            
            originalSizeSpan.textContent = formatFileSize(originalSize);
            compressedSizeSpan.textContent = formatFileSize(compressedSize);
            savedPercentSpan.innerHTML = `<i class="fas fa-chart-line"></i> Saved ${savedPercentage}% (${savedMB} MB)`;
            
            // Add compression stats
            compressionStats.innerHTML = `
                <strong>Compression Details:</strong><br>
                Mode: Target Size<br>
                Original: ${formatFileSize(originalSize)}<br>
                Compressed: ${formatFileSize(compressedSize)}<br>
                Ratio: ${((compressedSize / originalSize) * 100).toFixed(1)}%
            `;
            
            // Color coding based on success
            if (savedPercentage > 50) {
                savedPercentSpan.style.background = '#10b981';
            } else if (savedPercentage > 20) {
                savedPercentSpan.style.background = '#f59e0b';
            } else {
                savedPercentSpan.style.background = '#ef4444';
            }
            
        } catch (error) {
            console.error('Compression error:', error);
            loadingOverlay.style.display = 'none';
            controlsCard.style.display = 'block';
            alert('Error compressing PDF: ' + error.message);
        }
    });
}

// Download handler
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        if (compressedPdfBlob) {
            const url = URL.createObjectURL(compressedPdfBlob);
            const a = document.createElement('a');
            const originalName = originalPdfFile.name.replace('.pdf', '');
            a.download = `${originalName}_compressed_target.pdf`;
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });
}

// New file handler
if (newFileBtn) {
    newFileBtn.addEventListener('click', () => {
        originalPdfFile = null;
        compressedPdfBlob = null;
        uploadArea.style.display = 'block';
        fileCard.style.display = 'none';
        controlsCard.style.display = 'none';
        resultCard.style.display = 'none';
        fileInput.value = '';
    });
}

// Initialize
console.log('PDF Compressor Ready!');

// Quick Presets
document.querySelectorAll('.quick-preset').forEach(preset => {
    preset.addEventListener('click', (e) => {
        const card = e.target.closest('.quick-preset');
        if (!card) return;
        
        const size = card.dataset.size;
        const unit = card.dataset.unit;
        
        targetSizeInput.value = size;
        targetSizeUnit.value = unit;

        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (!originalPdfFile) {
            fileInput.click();
        } else {
            // Already have a file, trigger compression
            controlsCard.style.display = 'block';
            resultCard.style.display = 'none';
            compressBtn.click();
        }
    });
});
