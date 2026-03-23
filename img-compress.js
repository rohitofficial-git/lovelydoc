let originalFile = null;
let outputBlob = null;
let originalBitmap = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controlsContainer = document.getElementById('controlsContainer');
const fileName = document.getElementById('fileName');
const fileSizeStr = document.getElementById('fileSize');
const compressBtn = document.getElementById('compressBtn');
const removeFileBtn = document.getElementById('removeFile');
const targetSizeInput = document.getElementById('targetSizeInput');
const targetSizeUnit = document.getElementById('targetSizeUnit');
const loadingOverlay = document.getElementById('loadingOverlay');
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
    fileSizeStr.textContent = (file.size / 1024).toFixed(2) + ' KB';
    
    uploadArea.style.display = 'none';
    controlsContainer.style.display = 'block';
    originalBitmap = await createImageBitmap(file);
}

compressBtn.addEventListener('click', async () => {
    const target = parseFloat(targetSizeInput.value);
    if (!target) return alert('Enter a valid target size.');
    const bytesTarget = targetSizeUnit.value === 'MB' ? target * 1024 * 1024 : target * 1024;
    
    loadingOverlay.style.display = 'flex';
    controlsContainer.style.display = 'none';

    setTimeout(async () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = originalBitmap.width; canvas.height = originalBitmap.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(originalBitmap, 0, 0);

            let low = 0.01, high = 1.0;
            let bestBlob = null;
            let bestDiff = Infinity;
            
            for(let i=0; i<8; i++){
                let mid = (low + high) / 2;
                const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', mid));
                const diff = bytesTarget - blob.size;
                
                if (diff >= 0 && diff < bestDiff) {
                    bestBlob = blob;
                    bestDiff = diff;
                }
                if (blob.size > bytesTarget) high = mid; else low = mid;
            }
            
            if (!bestBlob) {
                bestBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.05));
                if (bestBlob.size > bytesTarget) {
                    alert('Warning: Image could not be compressed entirely down to your requested target size without resizing dimensions, but it is deeply compressed.');
                }
            }

            outputBlob = bestBlob;
            document.getElementById('oldSizeText').textContent = (originalFile.size / 1024).toFixed(2) + ' KB';
            document.getElementById('newSizeText').textContent = (outputBlob.size / 1024).toFixed(2) + ' KB';
            
            loadingOverlay.style.display = 'none';
            resultCard.style.display = 'block';
        } catch(e) {
            console.error(e); alert('Error compressing image.');
            loadingOverlay.style.display = 'none'; controlsContainer.style.display = 'block';
        }
    }, 100);
});

document.getElementById('downloadBtn').addEventListener('click', () => {
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement('a'); a.href = url;
    a.download = `compressed_${originalFile.name.replace(/\.[^/.]+$/, "")}.jpg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
});

document.getElementById('newFileBtn').addEventListener('click', () => {
    originalFile = null; originalBitmap = null; outputBlob = null;
    fileInput.value = ''; resultCard.style.display = 'none'; uploadArea.style.display = 'block';
});
