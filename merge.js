let pdfFiles = [];
let mergedBlob = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileListContainer = document.getElementById('fileListContainer');
const fileList = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const resultCard = document.getElementById('resultCard');
const downloadBtn = document.getElementById('downloadBtn');
const newFileBtn = document.getElementById('newFileBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');
const addMoreBtn = document.getElementById('addMoreBtn');

addMoreBtn.addEventListener('click', () => {
    fileInput.value = ''; // Reset to allow selecting the same file again if needed
    fileInput.click();
});

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
});

fileInput.addEventListener('change', (e) => handleFiles(Array.from(e.target.files)));

function handleFiles(files) {
    const validFiles = files.filter(f => f.type === 'application/pdf');
    if (validFiles.length === 0) return alert('Please upload valid PDF files.');
    
    pdfFiles = [...pdfFiles, ...validFiles];
    renderFileList();
    
    uploadArea.style.display = 'none';
    fileListContainer.style.display = 'block';
    resultCard.style.display = 'none';
}

function removeFile(index) {
    pdfFiles.splice(index, 1);
    if (pdfFiles.length === 0) {
        uploadArea.style.display = 'block';
        fileListContainer.style.display = 'none';
    } else {
        renderFileList();
    }
}

function renderFileList() {
    fileList.innerHTML = '';
    pdfFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-card';
        item.style.marginBottom = '0';
        item.innerHTML = `
            <div class="file-card-header" style="margin-bottom: 0;">
                <div class="file-icon"><i class="fas fa-file-pdf"></i></div>
                <div class="file-info">
                    <h4>${file.name}</h4>
                    <p>${formatFileSize(file.size)}</p>
                </div>
                <button class="remove-file" onclick="removeFile(${index})"><i class="fas fa-times"></i></button>
            </div>
        `;
        fileList.appendChild(item);
    });
}

mergeBtn.addEventListener('click', async () => {
    if (pdfFiles.length < 2) return alert('Please upload at least 2 PDFs to merge.');
    
    loadingOverlay.style.display = 'flex';
    fileListContainer.style.display = 'none';
    
    try {
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        for (let i = 0; i < pdfFiles.length; i++) {
            loadingMessage.textContent = `Merging document ${i + 1} of ${pdfFiles.length}...`;
            const arrayBuffer = await pdfFiles[i].arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        
        loadingMessage.textContent = 'Saving merged document...';
        const mergedPdfBytes = await mergedPdf.save();
        mergedBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        
        loadingOverlay.style.display = 'none';
        resultCard.style.display = 'block';
    } catch (e) {
        console.error(e);
        alert('Error merging PDFs: ' + e.message);
        loadingOverlay.style.display = 'none';
        fileListContainer.style.display = 'block';
    }
});

downloadBtn.addEventListener('click', () => {
    if (!mergedBlob) return;
    const url = URL.createObjectURL(mergedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged_document.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

newFileBtn.addEventListener('click', () => {
    pdfFiles = [];
    mergedBlob = null;
    fileInput.value = '';
    resultCard.style.display = 'none';
    uploadArea.style.display = 'block';
});
