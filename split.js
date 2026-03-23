let currentPdfFile = null;
let currentPdfDoc = null;
let zipBlob = null;
let totalPages = 0;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controlsContainer = document.getElementById('controlsContainer');
const fileName = document.getElementById('fileName');
const filePages = document.getElementById('filePages');
const rangesContainer = document.getElementById('rangesContainer');
const addRangeBtn = document.getElementById('addRangeBtn');
const splitBtn = document.getElementById('splitBtn');
const resultCard = document.getElementById('resultCard');
const downloadBtn = document.getElementById('downloadBtn');
const newFileBtn = document.getElementById('newFileBtn');
const removeFileBtn = document.getElementById('removeFile');
const loadingOverlay = document.getElementById('loadingOverlay');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

async function handleFile(file) {
    if (file.type !== 'application/pdf') return alert('Please select a valid PDF file.');
    
    currentPdfFile = file;
    fileName.textContent = file.name;
    
    loadingOverlay.style.display = 'flex';
    document.getElementById('loadingMessage').textContent = 'Loading document...';
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        currentPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        totalPages = currentPdfDoc.getPageCount();
        filePages.textContent = `Total Pages: ${totalPages}`;
        
        loadingOverlay.style.display = 'none';
        uploadArea.style.display = 'none';
        controlsContainer.style.display = 'block';
    } catch (e) {
        console.error(e);
        alert('Could not read PDF file.');
        loadingOverlay.style.display = 'none';
    }
}

removeFileBtn.addEventListener('click', () => {
    currentPdfFile = null;
    currentPdfDoc = null;
    controlsContainer.style.display = 'none';
    uploadArea.style.display = 'block';
    fileInput.value = '';
    rangesContainer.innerHTML = `
        <div class="range-row" style="display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center;">
            <span style="font-weight: 500; min-width: 70px;">Range 1:</span>
            <input type="number" class="range-start" placeholder="From" min="1" style="width: 80px; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); outline: none;">
            <span>to</span>
            <input type="number" class="range-end" placeholder="To" min="1" style="width: 80px; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); outline: none;">
        </div>
    `;
    rangeCount = 1;
});

// Dynamic Range UI
let rangeCount = 1;

addRangeBtn.addEventListener('click', () => {
    rangeCount++;
    const row = document.createElement('div');
    row.className = 'range-row';
    row.style = 'display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center;';
    row.innerHTML = `
        <span style="font-weight: 500; min-width: 70px;">Range ${rangeCount}:</span>
        <input type="number" class="range-start" placeholder="From" min="1" style="width: 80px; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); outline: none;">
        <span>to</span>
        <input type="number" class="range-end" placeholder="To" min="1" style="width: 80px; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); outline: none;">
        <button class="remove-range" style="background: none; border: none; color: var(--error); cursor: pointer; margin-left: auto; font-size: 1.25rem;"><i class="fas fa-times"></i></button>
    `;
    
    row.querySelector('.remove-range').addEventListener('click', () => {
        row.remove();
        updateRangeLabels();
    });
    
    rangesContainer.appendChild(row);
});

function updateRangeLabels() {
    const rows = rangesContainer.querySelectorAll('.range-row');
    rows.forEach((row, index) => {
        row.querySelector('span').textContent = `Range ${index + 1}:`;
        rangeCount = index + 1;
    });
}

splitBtn.addEventListener('click', async () => {
    const rows = rangesContainer.querySelectorAll('.range-row');
    const validRanges = [];
    
    rows.forEach(row => {
        const start = parseInt(row.querySelector('.range-start').value);
        const end = parseInt(row.querySelector('.range-end').value);
        if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= totalPages) {
            validRanges.push({ start, end });
        }
    });

    if (validRanges.length === 0) {
        return alert(`Please enter at least one valid page range (between 1 and ${totalPages}).`);
    }
    
    loadingOverlay.style.display = 'flex';
    document.getElementById('loadingMessage').textContent = 'Creating PDFs and combining into ZIP...';
    
    try {
        const zip = new JSZip();
        
        for (let i = 0; i < validRanges.length; i++) {
            const range = validRanges[i];
            const pageIndices = [];
            for (let p = range.start; p <= range.end; p++) pageIndices.push(p - 1);
            
            const splitPdf = await PDFLib.PDFDocument.create();
            const extractedPages = await splitPdf.copyPages(currentPdfDoc, pageIndices);
            extractedPages.forEach(page => splitPdf.addPage(page));
            
            const bytes = await splitPdf.save();
            const filename = `split_${range.start}-${range.end}_${currentPdfFile.name}`;
            
            zip.file(filename, bytes);
        }
        
        const zipContent = await zip.generateAsync({ type: 'blob' });
        zipBlob = zipContent;
        
        loadingOverlay.style.display = 'none';
        controlsContainer.style.display = 'none';
        resultCard.style.display = 'block';
    } catch (e) {
        console.error(e);
        alert('Error preparing ZIP file: ' + e.message);
        loadingOverlay.style.display = 'none';
    }
});

downloadBtn.addEventListener('click', () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = currentPdfFile.name.replace('.pdf', '');
    a.download = `${baseName}_splits.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});

newFileBtn.addEventListener('click', () => {
    currentPdfFile = null;
    currentPdfDoc = null;
    zipBlob = null;
    
    // Reset range UI
    rangesContainer.innerHTML = `
        <div class="range-row" style="display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center;">
            <span style="font-weight: 500; min-width: 70px;">Range 1:</span>
            <input type="number" class="range-start" placeholder="From" min="1" style="width: 80px; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); outline: none;">
            <span>to</span>
            <input type="number" class="range-end" placeholder="To" min="1" style="width: 80px; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); outline: none;">
        </div>
    `;
    rangeCount = 1;
    
    fileInput.value = '';
    resultCard.style.display = 'none';
    uploadArea.style.display = 'block';
});
