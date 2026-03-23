let originalFile = null;
let outputBlob = null;
let originalBitmap = null;
let originalRatio = 1;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controlsContainer = document.getElementById('controlsContainer');
const fileName = document.getElementById('fileName');
const fileResolution = document.getElementById('fileResolution');
const removeFileBtn = document.getElementById('removeFile');
const resizeBtn = document.getElementById('resizeBtn');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const scaleCheck = document.getElementById('aspectRatioCheck');
const resultCard = document.getElementById('resultCard');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault(); uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });
removeFileBtn.addEventListener('click', () => {
    originalFile = null; originalBitmap = null; fileInput.value = '';
    controlsContainer.style.display = 'none'; uploadArea.style.display = 'block';
});

async function handleFile(file) {
    if (!file.type.startsWith('image/')) return alert('Please upload a valid image.');
    originalFile = file;
    fileName.textContent = file.name;
    
    uploadArea.style.display = 'none';
    originalBitmap = await createImageBitmap(file);
    originalRatio = originalBitmap.width / originalBitmap.height;
    
    fileResolution.textContent = `${originalBitmap.width} x ${originalBitmap.height} px`;
    widthInput.value = originalBitmap.width;
    heightInput.value = originalBitmap.height;
    
    controlsContainer.style.display = 'block';
}

widthInput.addEventListener('input', () => {
    if (scaleCheck.checked && widthInput.value) {
        heightInput.value = Math.round(parseInt(widthInput.value) / originalRatio);
    }
});
heightInput.addEventListener('input', () => {
    if (scaleCheck.checked && heightInput.value) {
        widthInput.value = Math.round(parseInt(heightInput.value) * originalRatio);
    }
});

resizeBtn.addEventListener('click', async () => {
    const w = parseInt(widthInput.value);
    const h = parseInt(heightInput.value);
    if (!w || !h) return alert('Enter valid dimensions.');
    
    controlsContainer.style.display = 'none';
    
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(originalBitmap, 0, 0, w, h);
    
    const mime = originalFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
    outputBlob = await new Promise(r => canvas.toBlob(r, mime, 0.95));
    
    resultCard.style.display = 'block';
});

document.getElementById('downloadBtn').addEventListener('click', () => {
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement('a'); a.href = url;
    a.download = `resized_${originalFile.name}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
});

document.getElementById('newFileBtn').addEventListener('click', () => {
    originalFile = null; originalBitmap = null; outputBlob = null;
    fileInput.value = ''; resultCard.style.display = 'none'; uploadArea.style.display = 'block';
});
