let images = [];
let selectedImages = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    await loadImages();
    setupEventListeners();
});

async function loadImages() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractImages' });
        
        if (response && response.images) {
            images = response.images;
            renderImages();
        } else {
            showStatus('No images found on this page', 'error');
        }
    } catch (error) {
        console.error('Error loading images:', error);
        showStatus('Error loading images from page', 'error');
    }
}

function renderImages() {
    const container = document.getElementById('imagesContainer');
    
    if (images.length === 0) {
        container.innerHTML = '<p>No images found on this page</p>';
        return;
    }
    
    container.innerHTML = images.map(image => `
        <div class="image-item" data-id="${image.id}">
            <img src="${image.src}" alt="${image.alt}" class="image-preview" onerror="this.style.display='none'">
            <div class="image-info">
                <div class="image-url">${image.src.substring(0, 60)}${image.src.length > 60 ? '...' : ''}</div>
                <div style="font-size: 12px; color: #888;">${image.alt || 'No alt text'}</div>
            </div>
            <input type="checkbox" class="checkbox" data-id="${image.id}">
        </div>
    `).join('');
    
    container.querySelectorAll('.image-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const checkbox = item.querySelector('.checkbox');
                checkbox.checked = !checkbox.checked;
                toggleImageSelection(parseInt(item.dataset.id), checkbox.checked);
            }
        });
    });
    
    container.querySelectorAll('.checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            toggleImageSelection(parseInt(e.target.dataset.id), e.target.checked);
        });
    });
}

function toggleImageSelection(imageId, selected) {
    const item = document.querySelector(`[data-id="${imageId}"]`);
    
    if (selected) {
        selectedImages.add(imageId);
        item.classList.add('selected');
    } else {
        selectedImages.delete(imageId);
        item.classList.remove('selected');
    }
    
    updateGenerateButton();
}

function updateGenerateButton() {
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = selectedImages.size === 0;
}

function setupEventListeners() {
    document.getElementById('selectAllBtn').addEventListener('click', () => {
        const allSelected = selectedImages.size === images.length;
        
        if (allSelected) {
            selectedImages.clear();
            document.querySelectorAll('.image-item').forEach(item => {
                item.classList.remove('selected');
                item.querySelector('.checkbox').checked = false;
            });
        } else {
            images.forEach(image => selectedImages.add(image.id));
            document.querySelectorAll('.image-item').forEach(item => {
                item.classList.add('selected');
                item.querySelector('.checkbox').checked = true;
            });
        }
        
        updateGenerateButton();
        document.getElementById('selectAllBtn').textContent = allSelected ? 'Select All' : 'Deselect All';
    });
    
    document.getElementById('generateBtn').addEventListener('click', generateImages);
}

async function generateImages() {
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    
    showStatus(`Generating ${selectedImages.size} images in parallel...`, 'loading');
    
    try {
        const selectedImageData = images.filter(img => selectedImages.has(img.id));
        const imageUrls = selectedImageData.map(img => img.src);
        
        showStatus(`Processing ${selectedImageData.length} images simultaneously...`, 'loading');
        
        // Use the new batch endpoint for parallel processing
        const response = await fetch('http://localhost:3000/generate-batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageUrls: imageUrls
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const batchResult = await response.json();
        
        if (batchResult.success && batchResult.results) {
            showStatus(`Processing results: ${batchResult.summary.successful} successful, ${batchResult.summary.failed} failed...`, 'loading');
            
            // Process results and update images on the page
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            for (const result of batchResult.results) {
                if (result.success && result.imagePath) {
                    const originalImageData = selectedImageData.find(img => img.src === result.originalUrl);
                    if (originalImageData) {
                        await chrome.tabs.sendMessage(tab.id, {
                            action: 'replaceImage',
                            imageId: originalImageData.id,
                            newImageSrc: `http://localhost:3000/image/${result.imagePath}`
                        });
                    }
                } else {
                    console.warn(`Failed to generate image for ${result.originalUrl}:`, result.error);
                }
            }
            
            const successMessage = `Images generated! ${batchResult.summary.successful} successful, ${batchResult.summary.failed} failed`;
            showStatus(successMessage, batchResult.summary.failed > 0 ? 'warning' : 'success');
            
        } else {
            throw new Error('Batch processing failed');
        }
        
    } catch (error) {
        console.error('Error generating images:', error);
        showStatus('Error generating images. Make sure the proxy server is running.', 'error');
    } finally {
        generateBtn.disabled = false;
    }
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.classList.remove('hidden');
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            status.classList.add('hidden');
        }, 3000);
    }
}