// Generate an array of image paths for images from 001.png to 070.png
const images = [];
const customImageKeys = {};

for (let i = 1; i <= 70; i++) {
    const imageNumber = i.toString().padStart(3, '0');  // Pad numbers to 3 digits (e.g., 001, 002, ...)
    images.push(`planets/${imageNumber}.png`);
}

// Populate the image grid
function populateImageGrid() {
    const imageGrid = document.getElementById('imageGrid');
    imageGrid.innerHTML = '';  // Clear the grid before repopulating
    images.forEach(imagePath => {
        addImageToGrid(imagePath, true);
    });

    // Retrieve custom planets from local storage and add them to the grid
    chrome.storage.local.get(null, function(result) {
        Object.keys(result).forEach(key => {
            if (key.startsWith('custom_planet_')) {
                customImageKeys[key] = result[key];  // Save the reference to the custom image key
                addImageToGrid(result[key], false);  // Add custom images from local storage
            }
        });

        // Add the "Add Planet" icon at the end
        addAddPlanetIcon();
    });
}

// Add image to the grid
function addImageToGrid(imagePath, isDefault) {
    const img = document.createElement('img');
    
    if (isDefault) {
        img.src = chrome.runtime.getURL(imagePath);  // Use default image path
        img.dataset.isDefault = true;  // Mark as a default image
    } else {
        img.src = imagePath;  // Use base64 string from local storage
        img.dataset.isDefault = false;  // Mark as a custom image
    }

    img.addEventListener('click', () => {
        document.querySelectorAll('.image-grid img').forEach(i => i.classList.remove('selected'));
        img.classList.add('selected');
        img.dataset.imageKey = imagePath;  // Store image path or custom key for later use
    });
    document.getElementById('imageGrid').appendChild(img);
}

// Add the "Add Planet" icon at the end of the grid
function addAddPlanetIcon() {
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('images/add_planet.png'); // Add planet icon
    img.addEventListener('click', openFileDialog);
    document.getElementById('imageGrid').appendChild(img);
}

// Open the file dialog to upload a custom planet icon
function openFileDialog() {
    document.getElementById('fileInput').click();
}

// Handle custom image upload
document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file && file.type === 'image/png') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Image = e.target.result;
            // Extract the file name (remove extension and sanitize)
            const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, ""); // Sanitize to remove any invalid characters
            const customPlanetKey = `custom_planet_${sanitizedFileName}`; // Unique key based on file name

            // Save the custom image in local storage
            const newCustomImage = {};
            newCustomImage[customPlanetKey] = base64Image;
            chrome.storage.local.set(newCustomImage, function() {
                console.log('New custom planet image saved to local storage!');

                // Update customImageKeys to reference the new custom image
                customImageKeys[customPlanetKey] = base64Image;

                // Remove the last child (the "Add Planet" icon) before adding the new planet image
                const imageGrid = document.getElementById('imageGrid');
                if (imageGrid.lastChild) {
                    imageGrid.removeChild(imageGrid.lastChild);
                }

                // Add the new custom planet image to the grid
                addImageToGrid(base64Image, false);

                // Re-add the "Add Planet" icon
                addAddPlanetIcon();
            });
        };
        reader.readAsDataURL(file); // Convert file to base64 string
    }
});

// Highlight the selected image based on applied image for the selected planet
function highlightAppliedImage(imagePath) {
    document.querySelectorAll('.image-grid img').forEach(img => {
        if (img.src === imagePath) {
            img.classList.add('selected');
        } else {
            img.classList.remove('selected');
        }
    });
}

// Populate the planet list by sending a message to the content script
function populatePlanetList() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getPlanetNames' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError.message);
                return;
            }

            if (response && response.planetNames) {
                const planetNames = response.planetNames || [];
                const planetSelect = document.getElementById('planetSelect');
                planetSelect.innerHTML = ''; // Clear the existing options
                planetNames.forEach(planetName => {
                    const option = document.createElement('option');
                    option.value = planetName;
                    option.textContent = planetName;
                    planetSelect.appendChild(option);
                });

                checkAndHighlightAppliedImage(); // Automatically check and highlight the first planet's image
                planetSelect.addEventListener('change', checkAndHighlightAppliedImage); // Listen for dropdown changes
            }
        });
    });
}

// Check if the selected planet has an image applied and highlight it
function checkAndHighlightAppliedImage() {
    const selectedPlanet = document.getElementById('planetSelect').value;
    chrome.storage.sync.get(selectedPlanet, (result) => {
        const appliedImage = result[selectedPlanet];
        if (appliedImage) {
            if (appliedImage.startsWith('custom_planet_')) {
                // Get the custom image from local storage
                chrome.storage.local.get(appliedImage, (res) => {
                    highlightAppliedImage(res[appliedImage]);
                });
            } else {
                highlightAppliedImage(appliedImage);
            }
        } else {
            document.querySelectorAll('.image-grid img').forEach(img => img.classList.remove('selected'));
        }
    });
}

// Apply the selected image to the selected planet
document.getElementById('applyButton').addEventListener('click', () => {
    const selectedPlanet = document.getElementById('planetSelect').value;
    const selectedImage = document.querySelector('.image-grid img.selected');
    if (selectedPlanet && selectedImage) {
        let imageKey = selectedImage.dataset.isDefault === 'true' 
            ? chrome.runtime.getURL(selectedImage.dataset.imageKey)
            : Object.keys(customImageKeys).find(key => customImageKeys[key] === selectedImage.src);

        chrome.storage.sync.set({ [selectedPlanet]: imageKey }, () => {
            console.log(`Image applied to planet ${selectedPlanet}: ${imageKey}`);
        });

        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (planetName, imageKey) => {
                    const planetList = document.getElementById('planetList');
                    const planet = Array.from(planetList.querySelectorAll('.smallplanet')).find(el => {
                        return el.querySelector('.planet-name').textContent.trim() === planetName;
                    });
                    if (planet) {
                        const planetImg = planet.querySelector('img.planetPic');
                        if (imageKey.startsWith('custom_planet_')) {
                            // Retrieve the custom image from local storage
                            chrome.storage.local.get(imageKey, function(result) {
                                planetImg.src = result[imageKey];  // Apply the base64 custom image
                            });
                        } else {
                            // Default image path
                            planetImg.src = imageKey;  // Apply the default image
                        }
                    }
                },
                args: [selectedPlanet, imageKey]
            });
        });
    }
});

// Function to apply the image to the planet on the page using chrome.scripting.executeScript
function applyImageToPlanet(planetName, imageKey) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (planetName, imageKey) => {
                const planetList = document.getElementById('planetList');
                const planet = Array.from(planetList.querySelectorAll('.smallplanet')).find(el => {
                    return el.querySelector('.planet-name').textContent.trim() === planetName;
                });
                if (planet) {
                    const planetImg = planet.querySelector('img.planetPic');
                    if (imageKey.startsWith('custom_planet_')) {
                        // Retrieve the custom image from local storage
                        chrome.storage.local.get(imageKey, function(result) {
                            planetImg.src = result[imageKey];  // Apply the base64 image
                        });
                    } else {
                        // Default image path
                        planetImg.src = imageKey;  // Apply the default image with base URL
                    }
                }
            },
            args: [planetName, imageKey] // Pass the planet name and image key only
        });
    });
}

// Reset the applied image
document.getElementById('resetButton').addEventListener('click', () => {
    const selectedPlanet = document.getElementById('planetSelect').value;
    chrome.storage.sync.remove(selectedPlanet, () => {
        console.log(`Image reset for planet ${selectedPlanet}`);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (planetName) => {
                const planetList = document.getElementById('planetList');
                const planet = Array.from(planetList.querySelectorAll('.smallplanet')).find(el => {
                    return el.querySelector('.planet-name').textContent.trim() === planetName;
                });
                if (planet) {
                    const planetImg = planet.querySelector('img.planetPic');
                    planetImg.src = planetImg.getAttribute('data-default-src');
                }
            },
            args: [selectedPlanet]
        });
    });

    // Remove the image selection when reset
    document.querySelectorAll('.image-grid img').forEach(img => img.classList.remove('selected'));
});

// Event listener for removing a custom planet
document.getElementById('removeCustomPlanetButton').addEventListener('click', () => {
    const selectedImage = document.querySelector('.image-grid img.selected');

    // Ensure the selected image is a custom image
    if (selectedImage && selectedImage.dataset.isDefault === 'false') {
        const customImageKey = Object.keys(customImageKeys).find(key => customImageKeys[key] === selectedImage.src);

        if (customImageKey) {
            // Remove the custom image from chrome.storage.local
            chrome.storage.local.remove(customImageKey, function() {
                console.log(`Custom planet image removed from local storage: ${customImageKey}`);
                
                // Remove the image from the grid
                selectedImage.remove();

                // Remove references from chrome.storage.sync
                chrome.storage.sync.get(null, function(syncData) {
                    const planetsToRemove = [];
                    
                    // Find and remove planets that referenced the removed custom image
                    for (const planet in syncData) {
                        if (syncData[planet] === customImageKey) {
                            planetsToRemove.push(planet);
                        }
                    }

                    if (planetsToRemove.length > 0) {
                        chrome.storage.sync.remove(planetsToRemove, function() {
                            console.log(`References to custom planet removed for planets: ${planetsToRemove.join(', ')}`);
                        });
                    }
                });

                // Remove the custom image key reference from memory
                delete customImageKeys[customImageKey];

                // Re-add the "Add Planet" icon after removing the custom image
                //addAddPlanetIcon();
            });
        }
    } else {
        console.log("Please select a custom planet image to remove.");
    }
});

// Load images and planet names into the popup
populateImageGrid();
populatePlanetList();
