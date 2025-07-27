let extractedImages = [];

function extractAllImages() {
  const images = document.querySelectorAll("img");
  extractedImages = [];

  images.forEach((img, index) => {
    // Get image dimensions
    const width = img.naturalWidth || img.width || 0;
    const height = img.naturalHeight || img.height || 0;
    
    // Only include images larger than 100px in both dimensions
    if (width >= 100 && height >= 100) {
      extractedImages.push({
        id: index,
        src: img.src,
        alt: img.alt || "",
        element: img,
        selected: false,
        width: width,
        height: height
      });
    }
  });

  console.log(`Found ${extractedImages.length} images larger than 100x100px`);
  return extractedImages;
}

function replaceImage(imageId, newImageSrc) {
  const imageData = extractedImages.find((img) => img.id === imageId);
  if (imageData && imageData.element) {
    imageData.element.src = newImageSrc;
    console.log(`Replaced image ${imageId} with generated image`);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractImages") {
    const images = extractAllImages();
    sendResponse({
      images: images.map((img) => ({ 
        id: img.id, 
        src: img.src, 
        alt: img.alt,
        width: img.width,
        height: img.height
      })),
    });
  } else if (request.action === "replaceImage") {
    replaceImage(request.imageId, request.newImageSrc);
    sendResponse({ success: true });
  }
});

extractAllImages();
