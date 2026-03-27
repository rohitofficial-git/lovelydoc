// Format bytes as human-readable text
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Processing Overlay Manager
class ProcessingUI {
    constructor(workspaceSelector) {
        this.workspace = document.querySelector(workspaceSelector || '.tool-workspace');
        if (!this.workspace) return;
        this.overlay = this.createOverlay();
        this.workspace.appendChild(this.overlay);
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'processing-overlay';
        overlay.id = 'processing-overlay';
        overlay.innerHTML = `
            <div class="processing-spinner"></div>
            <div class="processing-text" id="processing-text">Processing your file…</div>
            <div class="processing-subtext" id="processing-subtext">This may take a few moments</div>
            <div class="progress-container">
                <div class="progress-bar" id="progress-bar"></div>
            </div>
            <div class="progress-percent" id="progress-percent">0%</div>
        `;
        return overlay;
    }

    show(text, subtext) {
        if (!this.overlay) return;
        if (text) this.overlay.querySelector('#processing-text').textContent = text;
        if (subtext) this.overlay.querySelector('#processing-subtext').textContent = subtext;
        this.overlay.classList.add('active');
        this.setProgress(0);
    }

    hide() {
        if (!this.overlay) return;
        this.overlay.classList.remove('active');
    }

    setProgress(percent) {
        if (!this.overlay) return;
        const bar = this.overlay.querySelector('#progress-bar');
        const text = this.overlay.querySelector('#progress-percent');
        bar.style.width = Math.min(percent, 100) + '%';
        text.textContent = Math.round(percent) + '%';
    }

    // Simulate progress for tasks that don't have real progress
    simulateProgress(durationMs, onComplete) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            this.setProgress(progress);
        }, durationMs / 10);

        return {
            complete: () => {
                clearInterval(interval);
                this.setProgress(100);
                setTimeout(() => {
                    this.hide();
                    if (onComplete) onComplete();
                }, 400);
            },
            cancel: () => {
                clearInterval(interval);
                this.hide();
            }
        };
    }
}

// Simple Rating UI
document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('.star');
    const msg = document.getElementById('rating-msg');
    
    if(stars.length > 0) {
        stars.forEach(star => {
            star.addEventListener('click', (e) => {
                const value = parseInt(e.target.getAttribute('data-value'));
                
                // Color the stars
                stars.forEach((s, idx) => {
                    if(idx < value) {
                        s.style.color = '#F59E0B'; // Gold
                    } else {
                        s.style.color = '#D1D5DB'; // Gray
                    }
                });
                
                // Show message
                if(msg) {
                    msg.innerHTML = `Thank you for rating us ${value} out of 5 stars!`;
                    msg.style.color = 'var(--primary)';
                    msg.style.fontWeight = '500';
                }
            });
            
            // Hover effects
            star.addEventListener('mouseover', (e) => {
                const value = parseInt(e.target.getAttribute('data-value'));
                stars.forEach((s, idx) => {
                    if(idx < value) {
                        s.innerHTML = '★';
                        s.style.textShadow = '0 0 5px rgba(245, 158, 11, 0.5)';
                    }
                });
            });
            
            star.addEventListener('mouseout', (e) => {
                stars.forEach(s => {
                    s.style.textShadow = 'none';
                });
            });
        });
    }

    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 10) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Common Drag and Drop UI setup function
    window.setupDragAndDrop = (dropAreaId, fileInputId, onFileSelect) => {
        const dropArea = document.getElementById(dropAreaId);
        const fileInput = document.getElementById(fileInputId);
        
        if(!dropArea || !fileInput) return;

        // Click to open file dialog
        dropArea.addEventListener('click', () => fileInput.click());

        // Handle file selection from dialog
        fileInput.addEventListener('change', (e) => {
            if(e.target.files.length > 0) {
                onFileSelect(e.target.files[0]);
            }
        });

        // Drag events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

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
            const dt = e.dataTransfer;
            const files = dt.files;
            if(files.length > 0) {
                onFileSelect(files[0]);
            }
        }, false);
    };

    // Multi-file drag and drop setup
    window.setupMultiDragAndDrop = (dropAreaId, fileInputId, onFilesSelect) => {
        const dropArea = document.getElementById(dropAreaId);
        const fileInput = document.getElementById(fileInputId);
        
        if(!dropArea || !fileInput) return;

        dropArea.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if(e.target.files.length > 0) {
                onFilesSelect(Array.from(e.target.files));
            }
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
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
            const dt = e.dataTransfer;
            const files = dt.files;
            if(files.length > 0) {
                onFilesSelect(Array.from(files));
            }
        }, false);
    };
});
