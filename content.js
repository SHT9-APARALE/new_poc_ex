let extractedImages = [];

function extractAllImages() {
    const images = document.querySelectorAll('img');
    extractedImages = [];
    
    images.forEach((img, index) => {
        if (img.src && img.src.startsWith('http')) {
            extractedImages.push({
                id: index,
                src: img.src,
                alt: img.alt || '',
                element: img,
                selected: false
            });
        }
    });
    
    console.log(`Found ${extractedImages.length} images`);
    return extractedImages;
}

function replaceImage(imageId, newImageSrc) {
    const imageData = extractedImages.find(img => img.id === imageId);
    if (imageData && imageData.element) {
        imageData.element.src = newImageSrc;
        console.log(`Replaced image ${imageId} with generated image`);
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractImages') {
        const images = extractAllImages();
        sendResponse({ images: images.map(img => ({ id: img.id, src: img.src, alt: img.alt })) });
    } else if (request.action === 'replaceImage') {
        replaceImage(request.imageId, request.newImageSrc);
        sendResponse({ success: true });
    }
});

extractAllImages();