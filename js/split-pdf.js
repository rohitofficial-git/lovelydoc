document.addEventListener('DOMContentLoaded', () => {
    let currentFile = null;
    let pdfDocBytes = null;
    let totalPages = 0;
    
    const processingUI = new ProcessingUI('.tool-workspace');
    const settingsPanel = document.getElementById('settings-panel');
    const resultArea = document.getElementById('result-area');
    const processBtn = document.getElementById('process-btn');
    const downloadBtn = document.getElementById('download-btn');
    const rangeInput = document.getElementById('page-range');

    window.setupDragAndDrop('upload-area', 'file-input', async (file) => {
        if (file.type !== 'application/pdf') {
            alert('Please select a PDF file.');
            return;
        }
        currentFile = file;
        
        // Update UI Icon
        const uploadArea = document.getElementById('upload-area');
        const uploadIcon = uploadArea.querySelector('.upload-icon');
        uploadIcon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><text x="6" y="19" font-size="5" font-family="Inter" font-weight="900" fill="currentColor">PDF</text></svg>`;
        uploadIcon.style.background = "#fee2e2";

        document.querySelector('.upload-label').textContent = file.name;
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            pdfDocBytes = arrayBuffer;
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            totalPages = pdfDoc.getPageCount();
            
            rangeInput.placeholder = `e.g. 1-${totalPages > 3 ? 3 : totalPages}`;
            settingsPanel.style.display = 'block';
            resultArea.style.display = 'none';
        } catch (e) {
            alert('Could not read this PDF file.');
        }
    });

    processBtn.addEventListener('click', async () => {
        if (!currentFile || !pdfDocBytes) return;

        const rangeText = rangeInput.value.trim();
        if(!rangeText) {
            alert('Please enter a page range.');
            return;
        }

        processingUI.show('Splitting PDF...', 'Extracting requested pages');
        processBtn.classList.add('loading');
        processBtn.disabled = true;

        try {
            const parts = rangeText.split(',').map(s => s.trim());
            const pagesToExtract = new Set();
            
            for(const part of parts) {
                if(part.includes('-')) {
                    const [start, end] = part.split('-').map(Number);
                    if(start > 0 && end >= start) {
                        for(let i = start; i <= end; i++) {
                            if(i <= totalPages) pagesToExtract.add(i - 1);
                        }
                    }
                } else {
                    const page = parseInt(part);
                    if(page > 0 && page <= totalPages) {
                        pagesToExtract.add(page - 1);
                    }
                }
            }

            const pageIndicies = Array.from(pagesToExtract).sort((a,b) => a-b);
            if(pageIndicies.length === 0) {
                alert('Invalid page range!');
                processingUI.hide();
                processBtn.disabled = false;
                return;
            }

            processingUI.setProgress(40);
            
            const originalPdf = await PDFLib.PDFDocument.load(pdfDocBytes);
            const newPdf = await PDFLib.PDFDocument.create();
            
            processingUI.setProgress(60);
            
            const copiedPages = await newPdf.copyPages(originalPdf, pageIndicies);
            copiedPages.forEach(page => newPdf.addPage(page));
            
            processingUI.setProgress(85);

            const modifiedPdfBytes = await newPdf.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            downloadBtn.href = url;
            downloadBtn.download = `split_${currentFile.name}`;

            setTimeout(() => {
                processingUI.hide();
                processBtn.classList.remove('loading');
                processBtn.disabled = false;
                resultArea.style.display = 'block';
                settingsPanel.style.display = 'none';
            }, 400);

        } catch (e) {
            console.error(e);
            alert('An error occurred splitting the PDF.');
            processingUI.hide();
        } finally {
            processBtn.classList.remove('loading');
            processBtn.disabled = false;
        }
    });

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
