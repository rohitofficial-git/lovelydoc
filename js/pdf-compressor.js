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

    const labels = { 1: 'Low (Smallest)', 2: 'Medium', 3: 'High (Best Quality)' };

    if (qualitySlider && qualityVal) {
        qualitySlider.addEventListener('input', (e) => {
            qualityVal.textContent = labels[e.target.value] || 'Medium';
        });
    }

    // Handle File Selection
    window.setupDragAndDrop('upload-area', 'file-input', (file) => {
        if (file.type !== 'application/pdf') {
            alert('Please select a PDF file.');
            return;
        }
        currentFile = file;
        document.querySelector('.upload-label').textContent = file.name;
        origSizeEl.textContent = formatBytes(file.size);
        settingsPanel.style.display = 'block';
        resultArea.style.display = 'none';
    });

    // Process PDF
    if (processBtn) {
        processBtn.addEventListener('click', async () => {
            if (!currentFile) return;

            processingUI.show('Processing your file…', 'Compressing PDF – please wait');
            processBtn.disabled = true;

            try {
                const arrayBuffer = await currentFile.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

                processingUI.setProgress(30);

                const pages = pdfDoc.getPages();
                const newPdf = await PDFLib.PDFDocument.create();

                for (let i = 0; i < pages.length; i++) {
                    const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
                    newPdf.addPage(copiedPage);
                    processingUI.setProgress(30 + (i / pages.length) * 50);
                }

                const compressedBytes = await newPdf.save({
                    useObjectStreams: true,
                    addDefaultPage: false,
                });

                const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });
                const compressedUrl = URL.createObjectURL(compressedBlob);

                // Update UI
                newSizeEl.textContent = formatBytes(compressedBlob.size);
                downloadBtn.href = compressedUrl;
                downloadBtn.download = 'compressed_' + currentFile.name;

                processingUI.setProgress(100);
                setTimeout(() => {
                    processingUI.hide();
                    resultArea.style.display = 'block';
                }, 400);

                processBtn.disabled = false;

            } catch (e) {
                console.error(e);
                processingUI.hide();
                alert('An error occurred during PDF compression. The PDF may be encrypted or malformed.');
                processBtn.disabled = false;
            }
        });
    }
});
