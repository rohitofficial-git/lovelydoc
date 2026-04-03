document.addEventListener('DOMContentLoaded', () => {
    let currentFile = null;
    const processingUI = new ProcessingUI('.tool-workspace');

    const settingsPanel = document.getElementById('settings-panel');
    const resultArea = document.getElementById('result-area');
    const processBtn = document.getElementById('process-btn');
    const downloadBtn = document.getElementById('download-btn');
    const origSizeEl = document.getElementById('original-size');
    const newSizeEl = document.getElementById('new-size');
    const savedPercentEl = document.getElementById('saved-percent');

    const compressionOptions = document.querySelectorAll('.compression-option');
    let selectedQuality = 2; // Default to medium

    compressionOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            compressionOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedQuality = parseInt(opt.getAttribute('data-value'));
        });
    });



    // Handle File Selection
    window.setupDragAndDrop('upload-area', 'file-input', (file) => {
        if (file.type !== 'application/pdf') {
            alert('Please select a PDF file.');
            return;
        }
        currentFile = file;

        // Update UI Visibility
        const uploadArea = document.getElementById('upload-area');
        const uploadIcon = uploadArea.querySelector('.upload-icon');
        uploadIcon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><text x="6" y="19" font-size="5" font-family="Inter" font-weight="900" fill="currentColor">PDF</text></svg>`;
        uploadIcon.style.background = "#fee2e2";

        document.querySelector('.upload-label').textContent = file.name;
        settingsPanel.style.display = 'block';
        resultArea.style.display = 'none';
        
        // Show original size
        origSizeEl.textContent = formatBytes(file.size);
    });

    // Process PDF
    if (processBtn) {
        processBtn.addEventListener('click', async () => {
            if (!currentFile) return;

            processingUI.show('Processing your file…', 'Compressing PDF – this may take a moment');
            const progress = processingUI.simulateProgress(3000);

            processBtn.classList.add('loading');
            processBtn.disabled = true;

            try {
                const arrayBuffer = await currentFile.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

                const qualityLevel = selectedQuality;
                const pages = pdfDoc.getPages();

                // Create new optimized PDF
                const newPdf = await PDFLib.PDFDocument.create();

                for (let i = 0; i < pages.length; i++) {
                    const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
                    newPdf.addPage(copiedPage);
                    // Update progress based on pages
                    processingUI.setProgress((i / pages.length) * 80);
                }

                // Save with optimization flags
                const compressedBytes = await newPdf.save({
                    useObjectStreams: true,
                    addDefaultPage: false,
                });

                const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });
                const compressedUrl = URL.createObjectURL(compressedBlob);

                // Calculate saved percentage
                const savedPercent = Math.max(0, ((currentFile.size - compressedBlob.size) / currentFile.size * 100)).toFixed(1);

                // Update UI
                newSizeEl.textContent = formatBytes(compressedBlob.size);
                if (savedPercentEl) savedPercentEl.textContent = savedPercent + '%';
                downloadBtn.href = compressedUrl;
                downloadBtn.download = 'compressed_' + currentFile.name;

                progress.complete();
                setTimeout(() => {
                    resultArea.style.display = 'block';
                }, 500);

                processBtn.classList.remove('loading');
                processBtn.disabled = false;

            } catch (e) {
                console.error(e);
                progress.cancel();
                alert('An error occurred during PDF compression. The PDF may be encrypted or malformed.');
                processBtn.disabled = false;
            }
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
            // Simulate preparation/download start
            setTimeout(() => {
                downloadBtn.classList.remove('loading');
            }, 2000);
        });
    }
});
