// ToolzNest Main Script
// All logic is wrapped in DOMContentLoaded to ensure elements are available

document.addEventListener('DOMContentLoaded', () => {
    console.log("ToolzNest Initialized");

    // --- Navigation & Mobile Menu ---
    const navbar = document.getElementById('navbar');
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 10) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('active');
            menuToggle.textContent = navLinks.classList.contains('active') ? '✕' : '☰';
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                navLinks.classList.remove('active');
                menuToggle.textContent = '☰';
            }
        });
    }

    // --- Dark Mode Logic ---
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleMobile = document.querySelector('.theme-toggle-mobile');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    function updateThemeUI(theme) {
        const isDark = theme === 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        if (themeToggle) themeToggle.textContent = isDark ? '☀️' : '🌙';
        if (themeToggleMobile) themeToggleMobile.textContent = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }

    // Apply saved theme immediately
    updateThemeUI(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', targetTheme);
            updateThemeUI(targetTheme);
        });
    }

    if (themeToggleMobile) {
        themeToggleMobile.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', targetTheme);
            updateThemeUI(targetTheme);
        });
    }

    // --- Search & Filtering ---
    const searchInput = document.getElementById('tool-search');
    const categoryTabs = document.querySelectorAll('.category-tab');
    const toolCards = document.querySelectorAll('.tool-card');

    function filterTools() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const activeTab = document.querySelector('.category-tab.active');
        const filterCat = activeTab ? activeTab.getAttribute('data-filter') : 'all';

        toolCards.forEach(card => {
            const categories = (card.getAttribute('data-category') || '').split(' ');
            const name = card.getAttribute('data-name') || '';
            const title = card.querySelector('h3') ? card.querySelector('h3').textContent.toLowerCase() : '';
            const desc = card.querySelector('p') ? card.querySelector('p').textContent.toLowerCase() : '';
            
            const searchText = `${name} ${title} ${desc}`.toLowerCase();
            const matchQuery = query === '' || searchText.includes(query);
            const matchCat = filterCat === 'all' || categories.includes(filterCat);

            if (matchQuery && matchCat) {
                card.style.display = 'flex'; // tool cards are flex by default
                card.classList.remove('hidden-card');
            } else {
                card.style.display = 'none';
                card.classList.add('hidden-card');
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterTools);
    }

    if (categoryTabs.length > 0) {
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                categoryTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                filterTools();
            });
        });
    }

    // --- Bookmarking Logic ---
    const bookmarkBtns = document.querySelectorAll('.bookmark-btn');
    let bookmarks = JSON.parse(localStorage.getItem('toolzBookmarks') || '[]');

    bookmarkBtns.forEach(btn => {
        const card = btn.closest('.tool-card');
        if (!card) return;
        const toolUrl = card.getAttribute('href');

        // Initial state
        if (bookmarks.includes(toolUrl)) {
            btn.classList.add('active');
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                bookmarks = bookmarks.filter(url => url !== toolUrl);
            } else {
                btn.classList.add('active');
                if (!bookmarks.includes(toolUrl)) bookmarks.push(toolUrl);
            }
            localStorage.setItem('toolzBookmarks', JSON.stringify(bookmarks));
        });
    });

});

// --- Utility Functions ---
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Global UI Helper for Tools
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
        overlay.style.display = 'none';
        overlay.innerHTML = `
            <div class="processing-spinner"></div>
            <div class="processing-text">Processing...</div>
            <div class="progress-container"><div class="progress-bar"></div></div>
        `;
        return overlay;
    }

    show(text = 'Processing...', subtext = '') {
        if (!this.overlay) return;
        this.overlay.querySelector('.processing-text').textContent = text;
        this.overlay.style.display = 'flex';
        this.setProgress(0);
    }

    hide() {
        if (this.overlay) this.overlay.style.display = 'none';
    }

    setProgress(percent) {
        if (!this.overlay) return;
        const bar = this.overlay.querySelector('.progress-bar');
        bar.style.width = `${percent}%`;
    }
}

// Global File Helper Initialization
window.setupDragAndDrop = (dropAreaId, fileInputId, onFileSelect) => {
    const dropArea = document.getElementById(dropAreaId);
    const fileInput = document.getElementById(fileInputId);
    if (!dropArea || !fileInput) return;

    dropArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) onFileSelect(e.target.files[0]);
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        dropArea.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(evt => {
        dropArea.addEventListener(evt, () => dropArea.classList.add('dragover'));
    });

    ['dragleave', 'drop'].forEach(evt => {
        dropArea.addEventListener(evt, () => dropArea.classList.remove('dragover'));
    });

    dropArea.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file) onFileSelect(file);
    });
};
