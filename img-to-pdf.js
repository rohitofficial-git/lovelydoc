let imgFiles = [];
let outputBlob = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileListContainer = document.getElementById('fileListContainer');
const fileList = document.getElementById('fileList');
const convertBtn = document.getElementById('convertBtn');
const resultCard = document.getElementById('resultCard');
const downloadBtn = document.getElementById('downloadBtn');
const newFileBtn = document.getElementById('newFileBtn');
const addMoreBtn = document.getElementById('addMoreBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault(); uploadArea.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
});

fileInput.addEventListener('change', (e) => handleFiles(Array.from(e.target.files)));
addMoreBtn.addEventListener('click', () => { fileInput.value = ''; fileInput.click(); });

function handleFiles(files) {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return alert('Please upload valid image files.');
    imgFiles = [...imgFiles, ...validFiles];
    renderFileList();
    uploadArea.style.display = 'none';
    fileListContainer.style.display = 'block';
    resultCard.style.display = 'none';
}

function renderFileList() {
    fileList.innerHTML = '';
    imgFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-card'; item.style.marginBottom = '0';
        item.innerHTML = `
            <div class="file-card-header" style="margin-bottom: 0;">
                <div class="file-icon"><i class="fas fa-image"></i></div>
                <div class="file-info">
                    <h4>${file.name}</h4>
                    <p>${(file.size / 1024).toFixed(2)} KB</p>
                </div>
                <button class="remove-file" onclick="removeImgFile(${index})" style="background: none; border: none; color: var(--error);"><i class="fas fa-times"></i></button>
            </div>
        `;
        fileList.appendChild(item);
    });
}

window.removeImgFile = (index) => {
    imgFiles.splice(index, 1);
    if (imgFiles.length === 0) {
        uploadArea.style.display = 'block'; fileListContainer.style.display = 'none';
    } else { renderFileList(); }
};

convertBtn.addEventListener('click', async () => {
    if (imgFiles.length === 0) return;
    loadingOverlay.style.display = 'flex';
    fileListContainer.style.display = 'none';
    
    try {
        const pdfDoc = await PDFLib.PDFDocument.create();
        for (let file of imgFiles) {
            let buffer = await file.arrayBuffer();
            let imgData;
            if (file.type === 'image/jpeg') {
                imgData = await pdfDoc.embedJpg(buffer);
            } else if (file.type === 'image/png') {
                try { imgData = await pdfDoc.embedPng(buffer); } catch(e) {
                    imgData = await convertAndEmbed(file, pdfDoc);
                }
            } else {
                imgData = await convertAndEmbed(file, pdfDoc);
            }
            const page = pdfDoc.addPage([imgData.width, imgData.height]);
            page.drawImage(imgData, {x: 0, y: 0, width: imgData.width, height: imgData.height});
        }
        
        const bytes = await pdfDoc.save();
        outputBlob = new Blob([bytes], { type: 'application/pdf' });
        
        loadingOverlay.style.display = 'none';
        resultCard.style.display = 'block';
    } catch (e) {
        console.error(e); alert('Error converting images.');
        loadingOverlay.style.display = 'none'; fileListContainer.style.display = 'block';
    }
});

async function convertAndEmbed(file, pdfDoc) {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width; canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 1.0));
    const buf = await blob.arrayBuffer();
    return await pdfDoc.embedJpg(buf);
}

downloadBtn.addEventListener('click', () => {
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement('a');
    a.href = url; a.download = 'converted_images.pdf';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
});
newFileBtn.addEventListener('click', () => {
    imgFiles = []; outputBlob = null; fileInput.value = '';
    resultCard.style.display = 'none'; uploadArea.style.display = 'block';
});
