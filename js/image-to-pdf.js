document.addEventListener('DOMContentLoaded', () => {
    let selectedFiles = [];
    
    const settingsPanel = document.getElementById('settings-panel');
    const resultArea = document.getElementById('result-area');
    const fileListEl = document.getElementById('selected-files-list');
    const processBtn = document.getElementById('process-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    // Custom setup for multiple files using main.js logic
    const dropArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');

    const updateFileListUI = () => {
        fileListEl.innerHTML = '';
        if(selectedFiles.length > 0) {
            settingsPanel.style.display = 'block';
            resultArea.style.display = 'none';
            selectedFiles.forEach((file, idx) => {
                const li = document.createElement('li');
                li.style.padding = '5px 0';
                li.style.borderBottom = '1px solid var(--border-color)';
                li.textContent = `${idx + 1}. ${file.name} (${formatBytes(file.size)})`;
                fileListEl.appendChild(li);
            });
            document.querySelector('.upload-label').textContent = `${selectedFiles.length} file(s) selected`;

            // Update UI Icon
            const uploadArea = document.getElementById('upload-area');
            const uploadIcon = uploadArea.querySelector('.upload-icon');
            uploadIcon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);"><path d="M7 8h10M7 12h10M7 16h6"></path><rect x="3" y="4" width="18" height="16" rx="2"></rect></svg>`;
            uploadIcon.style.background = "var(--secondary)";
        }
    };

    dropArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    ['dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropArea.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropArea.classList.remove('dragover');
        });
    });

    dropArea.addEventListener('drop', (e) => {
        handleFiles(e.dataTransfer.files);
    });

    function handleFiles(files) {
        if(files.length === 0) return;
        const validFiles = Array.from(files).filter(f => f.type.match(/image\/(jpeg|png)/));
        if(validFiles.length === 0) {
            alert('Please select valid JPG or PNG images.');
            return;
        }
        
        selectedFiles = [...selectedFiles, ...validFiles];
        updateFileListUI();
    }

    // Process Image to PDF
    if(processBtn) {
        processBtn.addEventListener('click', async () => {
            if(selectedFiles.length === 0) return;
            
            processBtn.classList.add('loading');
            processBtn.disabled = true;

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            try {
                for (let i = 0; i < selectedFiles.length; i++) {
                    const file = selectedFiles[i];
                    
                    const imgData = await getBase64Image(file);
                    
                    const props = pdf.getImageProperties(imgData);
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (props.height * pdfWidth) / props.width;
                    
                    if (i > 0) {
                        pdf.addPage();
                    }
                    
                    pdf.addImage(imgData, file.type === 'image/jpeg' ? 'JPEG' : 'PNG', 0, 0, pdfWidth, pdfHeight);
                }
                
                const pdfBlob = pdf.output('blob');
                const pdfUrl = URL.createObjectURL(pdfBlob);
                
                resultArea.style.display = 'block';
                downloadBtn.href = pdfUrl;
                downloadBtn.download = 'converted_document.pdf';
                
                processBtn.classList.remove('loading');
                processBtn.disabled = false;
                
            } catch(e) {
                console.error(e);
                alert("An error occurred during conversion.");
                processBtn.textContent = 'Convert to PDF';
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

    function getBase64Image(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
});
