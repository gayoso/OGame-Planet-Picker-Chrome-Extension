// Get the names of the planets in the planet list
function getPlanetNames() {
    const planetList = document.getElementById('planetList');
    if (!planetList) return []; // Return an empty array if planetList is not found
    const planetNames = Array.from(planetList.querySelectorAll('.planet-name')).map(el => el.textContent.trim());
    return planetNames;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPlanetNames') {
        const planetNames = getPlanetNames();
        sendResponse({ planetNames });
    }
});

// Apply the custom or default image to the specified planet
function applyImage(planetName, imageKey) {
    const planetList = document.getElementById('planetList');
    const planet = Array.from(planetList.querySelectorAll('.smallplanet')).find(el => {
        return el.querySelector('.planet-name').textContent.trim() === planetName;
    });
    
    if (planet) {
        const planetImg = planet.querySelector('img.planetPic');

        if (imageKey.startsWith('custom_planet_')) {
            // Retrieve the custom image (base64) from chrome.storage.local
            chrome.storage.local.get(imageKey, function(result) {
                if (result[imageKey]) {
                    planetImg.src = result[imageKey];  // Apply the base64 custom image
                    //console.log("setting planet: " + planetName + " with image: " + imageKey);
                }
                //console.log("planet: " + planetName + " had a custom image that wasnt found: " + imageKey);
            });
        } else {
            //console.log("setting planet: " + planetName + " with image: " + imageKey);
            planetImg.src = imageKey;
        }
    }
}

// Reset the image of the specified planet to its original image
function resetImage(planetName) {
    const planetList = document.getElementById('planetList');
    const planet = Array.from(planetList.querySelectorAll('.smallplanet')).find(el => {
        return el.querySelector('.planet-name').textContent.trim() === planetName;
    });
    if (planet) {
        const planetImg = planet.querySelector('img.planetPic');
        planetImg.src = planetImg.getAttribute('data-default-src');
    }
}

// Apply saved images on page load
chrome.storage.sync.get(null, (storedImages) => {
    const planetList = document.getElementById('planetList');
    for (const planetName in storedImages) {
        const imagePath = storedImages[planetName];
        applyImage(planetName, imagePath);
    }
});
