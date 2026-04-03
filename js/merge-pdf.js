document.addEventListener('DOMContentLoaded', () => {
    let pdfFiles = [];
    const processingUI = new ProcessingUI('.tool-workspace');

    const settingsPanel = document.getElementById('settings-panel');
    const resultArea = document.getElementById('result-area');
    const processBtn = document.getElementById('process-btn');
    const downloadBtn = document.getElementById('download-btn');
    const fileList = document.getElementById('file-list');
    const fileCountBadge = document.getElementById('file-count');
    const addMoreBtn = document.getElementById('add-more-btn');
    const filesMergedEl = document.getElementById('files-merged');
    const totalPagesEl = document.getElementById('total-pages');
    const outputSizeEl = document.getElementById('output-size');

    // Use multi-file drag and drop
    const dropArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');

    if (dropArea && fileInput) {
        dropArea.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                addFiles(Array.from(e.target.files));
            }
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('dragover');
            }, false);
        });

        dropArea.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            addFiles(files);
        }, false);
    }

    // Add more button
    if (addMoreBtn) {
        addMoreBtn.addEventListener('click', () => {
            fileInput.value = '';
            fileInput.click();
        });
    }

    function addFiles(files) {
        const validFiles = files.filter(f => f.type === 'application/pdf');
        if (validFiles.length === 0) {
            alert('Please select PDF files only.');
            return;
        }
        pdfFiles = pdfFiles.concat(validFiles);
        updateFileList();
        settingsPanel.style.display = 'block';
        resultArea.style.display = 'none';
    }

    function updateFileList() {
        fileList.innerHTML = '';
        fileCountBadge.textContent = pdfFiles.length;

        pdfFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-list-item';
            li.innerHTML = `
                <div class="file-info">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>${file.name} <small style="color: var(--text-muted);">(${formatBytes(file.size)})</small></span>
                </div>
                <button class="file-remove" data-index="${index}" title="Remove">✕</button>
            `;
            fileList.appendChild(li);
        });

        // Attach remove handlers
        document.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-index'));
                pdfFiles.splice(idx, 1);
                updateFileList();
                if (pdfFiles.length === 0) {
                    settingsPanel.style.display = 'none';
                    document.querySelector('.upload-label').textContent = 'Click or drag & drop multiple PDFs here';
                }
            });
        });

        // Update upload label and icon
        document.querySelector('.upload-label').textContent = `${pdfFiles.length} PDF file(s) selected`;
        
        const uploadArea = document.getElementById('upload-area');
        const uploadIcon = uploadArea.querySelector('.upload-icon');
        uploadIcon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444;"><path d="M7 8h10M7 12h10M7 16h6"></path><rect x="3" y="4" width="18" height="16" rx="2"></rect></svg>`;
        uploadIcon.style.background = "#fee2e2";
    }

    // Merge PDFs
    if (processBtn) {
        processBtn.addEventListener('click', async () => {
            if (pdfFiles.length < 2) {
                alert('Please select at least 2 PDF files to merge.');
                return;
            }

            processingUI.show('Processing your file...', 'Merging PDFs – this may take a moment');
            processBtn.classList.add('loading');
            processBtn.disabled = true;

            try {
                const mergedPdf = await PDFLib.PDFDocument.create();
                let totalPageCount = 0;

                for (let i = 0; i < pdfFiles.length; i++) {
                    const arrayBuffer = await pdfFiles[i].arrayBuffer();
                    const pdf = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                    
                    pages.forEach(page => {
                        mergedPdf.addPage(page);
                        totalPageCount++;
                    });

                    processingUI.setProgress(((i + 1) / pdfFiles.length) * 90);
                }

                const mergedBytes = await mergedPdf.save({ useObjectStreams: true });
                const mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' });
                const mergedUrl = URL.createObjectURL(mergedBlob);

                // Update UI
                filesMergedEl.textContent = pdfFiles.length;
                totalPagesEl.textContent = totalPageCount;
                outputSizeEl.textContent = formatBytes(mergedBlob.size);

                downloadBtn.href = mergedUrl;
                downloadBtn.download = 'merged_document.pdf';

                processingUI.setProgress(100);
                setTimeout(() => {
                    processingUI.hide();
                    resultArea.style.display = 'block';
                }, 500);

                processBtn.classList.remove('loading');
                processBtn.disabled = false;

            } catch (e) {
                console.error(e);
                processingUI.hide();
                alert('An error occurred while merging PDFs. Some files may be encrypted or malformed.');
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
            setTimeout(() => {
                downloadBtn.classList.remove('loading');
            }, 2000);
        });
    }
});
