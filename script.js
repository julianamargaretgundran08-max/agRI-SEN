// ======================================
// AGRISENSE WEBSITE
// Demo version without ESP32 connection
// ======================================


// ======================================
// 1. PAGE NAVIGATION
// ======================================

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.toggle("hidden", page.id !== pageId);
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.page === pageId
        );
    });
}

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        showPage(link.dataset.page);
    });
});

// Dashboard and internal navigation buttons
document.querySelectorAll("[data-goto]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.goto);
    });
});


// ======================================
// 2. SIMULATED SENSOR READINGS
// ======================================

const sensorHistory = {
    moisture: [],
    temperature: []
};
let currentReadings = {
    moisture: null,
    temperature: null,
    ph: null,
    ec: null
};

const SENSOR_LIMITS = {
    moisture: { min: 40, max: 80, scale: 100 },
    temperature: { min: 18, max: 35, scale: 50 },
    ph: { min: 5.5, max: 7, scale: 14 },
    ec: { min: 0.5, max: 2, scale: 3 }
};

function getSensorStatus(value, limits) {
    if (value < limits.min || value > limits.max) {
        return "alert";
    }

    return "normal";
}

function updateSensorStatus(id, status) {
    const element = document.getElementById(id);

    if (!element) return;

    element.classList.remove("warning", "alert");

    if (status === "alert") {
        element.textContent = "Out of range";
        element.classList.add("alert");
    } else {
        element.textContent = "Normal";
    }
}

function updateMeter(id, value, scale, status) {
    const meter = document.getElementById(id);

    if (!meter) return;

    const percentage = Math.max(
        0,
        Math.min(100, (value / scale) * 100)
    );

    meter.style.width = `${percentage}%`;
    meter.classList.remove("warning", "alert");

    if (status === "alert") {
        meter.classList.add("alert");
    }
}

function addTrendReading(type, value) {
    sensorHistory[type].push(value);

    if (sensorHistory[type].length > 12) {
        sensorHistory[type].shift();
    }

    renderTrend(type);
}

function renderTrend(type) {
    const container = document.getElementById(`trend-${type}`);

    if (!container) return;

    container.replaceChildren();

    const values = sensorHistory[type];

    if (values.length === 0) return;

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    values.forEach(value => {
        const bar = document.createElement("div");
        bar.className = "trend-bar";

        const height = 20 + ((value - minValue) / range) * 75;
        bar.style.height = `${height}%`;

        container.appendChild(bar);
    });
}

function updateReadings() {
    // Firebase integration owns live readings; never generate fake values in live mode.
    if (window.AGRISEN_LIVE_MODE) return;
    const moisture = Math.floor(35 + Math.random() * 55);
    const temperature = Number((24 + Math.random() * 12).toFixed(1));
    const ph = Number((5 + Math.random() * 3).toFixed(1));
    const ec = Number((0.3 + Math.random() * 2.2).toFixed(2));
    currentReadings = {
    moisture,
    temperature,
    ph,
    ec
};



    const moistureStatus = getSensorStatus(
        moisture,
        SENSOR_LIMITS.moisture
    );

    const temperatureStatus = getSensorStatus(
        temperature,
        SENSOR_LIMITS.temperature
    );

    const phStatus = getSensorStatus(
        ph,
        SENSOR_LIMITS.ph
    );

    const ecStatus = getSensorStatus(
        ec,
        SENSOR_LIMITS.ec
    );

    document.getElementById("moisture").textContent =
        `${moisture}%`;

    document.getElementById("temperature").textContent =
        `${temperature.toFixed(1)} °C`;

    document.getElementById("ph").textContent =
        ph.toFixed(1);

    document.getElementById("ec").textContent =
        `${ec.toFixed(2)} mS/cm`;

    updateSensorStatus("moisture-status", moistureStatus);
    updateSensorStatus("temperature-status", temperatureStatus);
    updateSensorStatus("ph-status", phStatus);
    updateSensorStatus("ec-status", ecStatus);

    updateMeter(
        "moisture-meter",
        moisture,
        SENSOR_LIMITS.moisture.scale,
        moistureStatus
    );

    updateMeter(
        "temperature-meter",
        temperature,
        SENSOR_LIMITS.temperature.scale,
        temperatureStatus
    );

    updateMeter(
        "ph-meter",
        ph,
        SENSOR_LIMITS.ph.scale,
        phStatus
    );

    updateMeter(
        "ec-meter",
        ec,
        SENSOR_LIMITS.ec.scale,
        ecStatus
    );

    document.getElementById("trend-moisture-value").textContent =
        `${moisture}%`;

    document.getElementById("trend-temperature-value").textContent =
        `${temperature.toFixed(1)} °C`;

    addTrendReading("moisture", moisture);
    addTrendReading("temperature", temperature);

    const timestamp = new Date().toLocaleTimeString();

    document.getElementById("last-updated").textContent =
        `Last updated: ${timestamp}`;

    const anyAlert = [
        moistureStatus,
        temperatureStatus,
        phStatus,
        ecStatus
    ].includes("alert");

    document.getElementById("system-status").textContent =
    anyAlert ? "Attention needed" : "Monitoring";

renderRecommendations();
}



// ======================================
// 3. PUMP CONTROL
// ======================================

const pumps = [
    "Water Pump",
    "Nitrogen (N)",
    "Phosphorus (P)",
    "Potassium (K)"
];

const pumpStates = [false, false, false, false];

function createPumpRow(pump, index) {
    const row = document.createElement("div");
    row.className = "pump-row";

    const name = document.createElement("span");
    name.className = "pump-name";
    name.textContent = pump;

    const stateContainer = document.createElement("div");
    stateContainer.className = "pump-state";

    const stateLabel = document.createElement("span");
    stateLabel.className = "state-label";
    stateLabel.textContent = pumpStates[index]
        ? "Running"
        : "Stopped";

    const button = document.createElement("button");
    button.className = "pump-button";
    button.textContent = pumpStates[index] ? "ON" : "OFF";

    button.classList.toggle("on", pumpStates[index]);

    button.setAttribute(
        "aria-pressed",
        String(pumpStates[index])
    );

    button.disabled = true;
    button.title = "Pump control is disabled until sensor and relay safety checks are completed.";
    button.textContent = "DISABLED";
    stateLabel.textContent = "Safety lock";

    stateContainer.append(stateLabel, button);
    row.append(name, stateContainer);

    return row;
}

function renderPumpList(containerId) {
    const container = document.getElementById(containerId);

    if (!container) return;

    container.replaceChildren();

    pumps.forEach((pump, index) => {
        container.appendChild(createPumpRow(pump, index));
    });
}

function renderPumps() {
    renderPumpList("pump-list");
    renderPumpList("dashboard-pump-list");
}

renderPumps();


// ======================================
// 4. PLANT PROFILE DATA
// ======================================

const defaultProfiles = [
    {
        id: 1,
        name: "Tomato",
        moisture: 60,
        phMin: 5.5,
        phMax: 6.5,
        ecMin: 0.5,
        ecMax: 2,
        notes: "Tomato growing profile",
        recipe: {
            pump1: 2,
            pump2: 1,
            pump3: 1
        }
    },
    {
        id: 2,
        name: "Lettuce",
        moisture: 65,
        phMin: 5.5,
        phMax: 6.5,
        ecMin: 0.5,
        ecMax: 1.5,
        notes: "Lettuce growing profile",
        recipe: {
            pump1: 1,
            pump2: 1,
            pump3: 0.5
        }
    }
];

function normalizePlant(plant, index = 0) {
    return {
        ...plant,
        id: plant.id ?? Date.now() + index,
        moisture: Number(plant.moisture ?? plant.targetMoisture ?? 60),
        ecMin: Number(plant.ecMin ?? 0.5),
        ecMax: Number(plant.ecMax ?? 2),
        recipe: {
            pump1: Number(plant.recipe?.pump1 ?? 0),
            pump2: Number(plant.recipe?.pump2 ?? 0),
            pump3: Number(plant.recipe?.pump3 ?? 0)
        }
    };
}

function loadPlants() {
    try {
        const saved = localStorage.getItem("agrisensePlants");

        if (saved === null) {
            return defaultProfiles.map(normalizePlant);
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return defaultProfiles.map(normalizePlant);
        }

        return parsed.map(normalizePlant);
    } catch (error) {
        console.error("Unable to load plant profiles:", error);
        return defaultProfiles.map(normalizePlant);
    }
}

let plants = loadPlants();

let selectedPlantId = plants.length
    ? plants[0].id
    : null;

let editingPlantId = null;

// Plant image state
let currentPlantImage = "";
let imageProcessingPromise = Promise.resolve();

const plantList = document.getElementById("plant-list");
const plantForm = document.getElementById("plant-form");
const selectedDetails = document.getElementById("selected-details");
const plantSearch = document.getElementById("plant-search");

const plantImageInput = document.getElementById("plant-image");
const plantImagePreview = document.getElementById("plant-image-preview");
const imagePlaceholder = document.getElementById("image-placeholder");

// ======================================
// NUTRIENT RECIPE FORM FIELDS
// ======================================

function addRecipeFields() {
    if (!plantForm || document.getElementById("recipe-fields")) {
        return;
    }

    const notesField = document.getElementById("plant-notes");

    const recipeContainer = document.createElement("div");
    recipeContainer.id = "recipe-fields";
    recipeContainer.className = "form-group";

    const heading = document.createElement("h3");
    heading.textContent = "Nutrient Recipe (mg/kg)";
    recipeContainer.appendChild(heading);

    const descriptions = [
    ["recipe-pump1", "Nitrogen (N) — mg/kg", 60],
    ["recipe-pump2", "Phosphorus (P) — mg/kg", 180],
    ["recipe-pump3", "Potassium (K) — mg/kg", 180]
];

    descriptions.forEach(([id, labelText, defaultValue]) => {
        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = labelText;

        const input = document.createElement("input");
        input.type = "number";
        input.id = id;
        input.min = "0";
        input.step = "0.1";
        input.value = defaultValue;
        input.required = true;

        recipeContainer.append(label, input);
    });

    const note = document.createElement("small");
    note.textContent =
        "Example values for simulation. Validate recipes before real use.";

    recipeContainer.appendChild(note);

    if (notesField) {
        notesField.parentElement.before(recipeContainer);
    } else {
        plantForm.appendChild(recipeContainer);
    }
}

addRecipeFields();


// ======================================
// 5. SAVE PLANT PROFILES
// ======================================

function savePlants() {
    try {
        localStorage.setItem(
            "agrisensePlants",
            JSON.stringify(plants)
        );

        return true;
    } catch (error) {
        console.error("Unable to save plant profiles:", error);

        alert(
            "Unable to save profiles in this browser. " +
            "Try using a smaller image or removing some saved profiles."
        );

        return false;
    }
}


// ======================================
// 6. IMAGE RESIZING AND PREVIEW
// ======================================

function resizePlantImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = event => {
            const image = new Image();

            image.onload = () => {
                const maxSize = 600;

                let width = image.width;
                let height = image.height;

                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }

                const canvas = document.createElement("canvas");

                canvas.width = Math.round(width);
                canvas.height = Math.round(height);

                const context = canvas.getContext("2d");

                if (!context) {
                    reject(new Error("Unable to process image."));
                    return;
                }

                context.drawImage(
                    image,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                try {
                    const resizedImage = canvas.toDataURL(
                        "image/jpeg",
                        0.75
                    );

                    resolve(resizedImage);
                } catch (error) {
                    reject(error);
                }
            };

            image.onerror = () => {
                reject(new Error("Unable to load this image."));
            };

            image.src = event.target.result;
        };

        reader.onerror = () => {
            reject(new Error("Unable to read this image."));
        };

        reader.readAsDataURL(file);
    });
}


// Display the image preview
function updateImagePreview(imageData) {
    if (imageData) {
        plantImagePreview.src = imageData;
        plantImagePreview.classList.remove("hidden");

        imagePlaceholder.classList.add("hidden");
    } else {
        plantImagePreview.removeAttribute("src");
        plantImagePreview.classList.add("hidden");

        imagePlaceholder.classList.remove("hidden");
    }
}


// Handle uploaded image
if (plantImageInput) {
    plantImageInput.addEventListener("change", event => {
        const file = event.target.files[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select a valid image file.");
            plantImageInput.value = "";
            return;
        }

        const maxFileSize = 8 * 1024 * 1024;

        if (file.size > maxFileSize) {
            alert("Image must be smaller than 8 MB.");
            plantImageInput.value = "";
            return;
        }

        imageProcessingPromise = resizePlantImage(file)
            .then(resizedImage => {
                currentPlantImage = resizedImage;
                updateImagePreview(resizedImage);
            })
            .catch(error => {
                console.error("Image processing failed:", error);

                alert("Unable to process the image. Please try another.");

                plantImageInput.value = "";
            });
    });
}


// ======================================
// 7. DISPLAY PLANT PROFILES
// ======================================

function renderPlants() {
    plantList.replaceChildren();

    const searchTerm = plantSearch.value.trim().toLowerCase();

    const filteredPlants = plants.filter(plant =>
        plant.name.toLowerCase().includes(searchTerm)
    );

    if (filteredPlants.length === 0) {
        const message = document.createElement("p");

        message.className = "placeholder";

        message.textContent = plants.length === 0
            ? "No plant profiles yet. Add a plant to get started."
            : "No matching plant profiles found.";

        plantList.appendChild(message);
    }

    filteredPlants.forEach(plant => {
        const item = document.createElement("div");
        item.className = "plant-item";

        if (plant.id === selectedPlantId) {
            item.classList.add("selected");
        }

        // Plant thumbnail
        if (plant.image) {
            const thumbnail = document.createElement("img");

            thumbnail.src = plant.image;
            thumbnail.alt = `${plant.name} image`;
            thumbnail.className = "plant-thumbnail";

            item.appendChild(thumbnail);
        } else {
            const placeholder = document.createElement("div");

            placeholder.className = "plant-thumbnail-placeholder";
            placeholder.textContent = "🌱";

            item.appendChild(placeholder);
        }

        // Select plant button
        const selectButton = document.createElement("button");

        selectButton.className = "plant-select";
        selectButton.textContent = plant.name;

        selectButton.addEventListener("click", () => {
    selectedPlantId = plant.id;

    renderPlants();
    renderRecommendations();
});

        // Delete plant button
        const deleteButton = document.createElement("button");

        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.setAttribute(
            "aria-label",
            `Delete ${plant.name}`
        );

        deleteButton.addEventListener("click", () => {
            const confirmed = confirm(
                `Are you sure you want to delete ${plant.name}?`
            );

            if (!confirmed) return;

            plants = plants.filter(p => p.id !== plant.id);

            if (selectedPlantId === plant.id) {
                selectedPlantId = plants.length
                    ? plants[0].id
                    : null;
            }

            if (editingPlantId === plant.id) {
                clearForm();
            }

            if (savePlants()) {
                renderPlants();
            }
        });

        item.append(selectButton, deleteButton);
        plantList.appendChild(item);
    });

    renderSelectedPlant();
}


// ======================================
// 8. DISPLAY SELECTED PLANT DETAILS
// ======================================

function renderSelectedPlant() {
    const plant = plants.find(
        p => p.id === selectedPlantId
    );
document.getElementById("plant-notes").value =
    plant.notes || "";

// Load the saved nutrient recipe
document.getElementById("recipe-pump1").value =
    plant.recipe?.pump1 ?? 0;

document.getElementById("recipe-pump2").value =
    plant.recipe?.pump2 ?? 0;

document.getElementById("recipe-pump3").value =
    plant.recipe?.pump3 ?? 0;

// Load the existing image into the editor
currentPlantImage = plant.image || "";

updateImagePreview(currentPlantImage);

    selectedDetails.replaceChildren();

    if (!plant) {
        const message = document.createElement("p");

        message.textContent =
            "No plant selected. Add a profile to begin.";

        selectedDetails.appendChild(message);
        return;
    }

    // Display selected plant image
    if (plant.image) {
        const image = document.createElement("img");

        image.src = plant.image;
        image.alt = `${plant.name} plant`;
        image.className = "selected-plant-image";

        selectedDetails.appendChild(image);
    }

    // Plant information
    const details = [
    ["Plant", plant.name],
    ["Target soil moisture", `${plant.moisture}%`],
    ["pH range", `${plant.phMin}–${plant.phMax}`],
    ["EC range", `${plant.ecMin}–${plant.ecMax} mS/cm`],
    ["Nitrogen (N)", `${plant.recipe?.pump1 ?? 0} mg/kg`],
["Phosphorus (P)", `${plant.recipe?.pump2 ?? 0} mg/kg`],
["Potassium (K)", `${plant.recipe?.pump3 ?? 0} mg/kg`],
    ["Notes", plant.notes || "None"]
];

    details.forEach(([label, value]) => {
        const line = document.createElement("p");
        const strong = document.createElement("strong");

        strong.textContent = `${label}: `;

        line.append(
            strong,
            document.createTextNode(value)
        );

        selectedDetails.appendChild(line);
    });

    // Edit selected profile button
    const editButton = document.createElement("button");

    editButton.className = "secondary-button";
    editButton.textContent = "Edit Selected Profile";
    editButton.style.marginTop = "14px";

    editButton.addEventListener("click", () => {
        editingPlantId = plant.id;

        document.getElementById("form-title").textContent =
            "Edit Plant Profile";

        document.getElementById("plant-name").value =
            plant.name;

        document.getElementById("plant-moisture").value =
            plant.moisture;

        document.getElementById("ph-min").value =
            plant.phMin;

        document.getElementById("ph-max").value =
            plant.phMax;

        document.getElementById("ec-min").value =
            plant.ecMin;

        document.getElementById("ec-max").value =
            plant.ecMax;

        document.getElementById("plant-notes").value =
            plant.notes || "";

        // Load the existing image into the editor
        currentPlantImage = plant.image || "";

        updateImagePreview(currentPlantImage);

        if (plantImageInput) {
            plantImageInput.value = "";
        }

        document.getElementById("plant-name").focus();
    });

    selectedDetails.appendChild(editButton);
}


// ======================================
// 9. ADD AND EDIT PLANT PROFILES
// ======================================

plantForm.addEventListener("submit", async event => {
    event.preventDefault();

    // Wait for image processing before saving
    await imageProcessingPromise;

    const name =
        document.getElementById("plant-name").value.trim();

    const moisture =
        Number(document.getElementById("plant-moisture").value);

    const phMin =
        Number(document.getElementById("ph-min").value);

    const phMax =
        Number(document.getElementById("ph-max").value);

    const ecMin =
        Number(document.getElementById("ec-min").value);

    const ecMax =
        Number(document.getElementById("ec-max").value);

    const notes =
        document.getElementById("plant-notes").value.trim();

    if (!plantForm.reportValidity()) return;

    if (phMin > phMax || ecMin > ecMax) {
        alert("Minimum values cannot exceed maximum values.");
        return;
    }

    // Prevent duplicate plant names
    const duplicate = plants.some(plant =>
        plant.name.toLowerCase() === name.toLowerCase() &&
        plant.id !== editingPlantId
    );

    if (duplicate) {
        alert("A plant with this name already exists.");
        return;
    }

    // Create or update profile
    const profile = {
        id: editingPlantId ?? Date.now(),
        name,
        moisture,
        phMin,
        phMax,
        ecMin,
        ecMax,
        notes,
        image: currentPlantImage
    };

    let updatedPlants;

    if (editingPlantId !== null) {
        updatedPlants = plants.map(plant =>
            plant.id === editingPlantId ? profile : plant
        );
    } else {
        updatedPlants = [...plants, profile];
    }

    const previousPlants = plants;

    plants = updatedPlants;

    if (!savePlants()) {
        plants = previousPlants;
        return;
    }

    selectedPlantId = profile.id;

    clearForm();
    renderPlants();
});


// ======================================
// 10. CLEAR AND RESET FORM
// ======================================

function clearForm() {
    plantForm.reset();

    document.getElementById("plant-moisture").value = 60;
    document.getElementById("ph-min").value = 5.5;
    document.getElementById("ph-max").value = 7;
    document.getElementById("ec-min").value = 0.5;
    document.getElementById("ec-max").value = 2;

    document.getElementById("form-title").textContent =
        "Add Plant Profile";

    editingPlantId = null;

    // Reset image state and preview
    currentPlantImage = "";
    imageProcessingPromise = Promise.resolve();

    if (plantImageInput) {
        plantImageInput.value = "";
    }

    if (plantImagePreview && imagePlaceholder) {
        updateImagePreview("");
    }
}


// Add plant button
document.getElementById("add-plant").addEventListener("click", () => {
    clearForm();

    document.getElementById("plant-name").focus();
});


// Cancel edit button
document.getElementById("cancel-edit").addEventListener("click", () => {
    clearForm();
});

function renderRecommendations() {
    const summary = document.getElementById(
        "recommendation-summary"
    );

    const list = document.getElementById(
        "recommendation-list"
    );

    if (!summary || !list) return;

    const plant = plants.find(
        p => p.id === selectedPlantId
    );

    list.replaceChildren();

    if (!plant || currentReadings.moisture === null) {
        summary.textContent =
            "Waiting for plant profile and sensor readings.";

        return;
    }

    const recommendations = [];

    const { moisture, ph, ec } = currentReadings;

    // Moisture recommendation
    if (moisture < plant.moisture - 5) {
        recommendations.push(
            "Soil moisture is below the target. Consider using the water pump."
        );
    } else if (moisture > plant.moisture + 5) {
        recommendations.push(
            "Soil moisture is above the target. Avoid additional watering for now."
        );
    } else {
        recommendations.push(
            "Soil moisture is near the target."
        );
    }

    // pH recommendation
    if (ph < plant.phMin) {
        recommendations.push(
            "pH is below the plant's configured range. Check the pH conditions."
        );
    } else if (ph > plant.phMax) {
        recommendations.push(
            "pH is above the plant's configured range. Check the pH conditions."
        );
    } else {
        recommendations.push(
            "pH is within the configured range."
        );
    }

    // EC recommendation
    if (ec < plant.ecMin) {
        recommendations.push(
            "EC is below the configured range. Review the nutrient solution."
        );
    } else if (ec > plant.ecMax) {
        recommendations.push(
            "EC is above the configured range. Check nutrient concentration."
        );
    } else {
        recommendations.push(
            "EC is within the configured range."
        );
    }

    const needsAttention = (
        moisture < plant.moisture - 5 ||
        moisture > plant.moisture + 5 ||
        ph < plant.phMin ||
        ph > plant.phMax ||
        ec < plant.ecMin ||
        ec > plant.ecMax
    );

    summary.textContent = needsAttention
        ? `Conditions need attention for ${plant.name}.`
        : `Conditions are within configured targets for ${plant.name}.`;

    recommendations.forEach(message => {
        const item = document.createElement("li");
        item.textContent = message;
        list.appendChild(item);
    });
}
// ======================================
// 11. INITIALIZE
// ======================================

plantSearch.addEventListener("input", renderPlants);

renderPlants();
showPage("dashboard");

updateReadings();
setInterval(updateReadings, 3000);


const ESP32_IP = "http://192.168.1.187";

async function getESP32Data() {
    try {
        const response = await fetch(`${ESP32_IP}/data`);

        if (!response.ok) {
            throw new Error("Failed to get ESP32 data");
        }

        const data = await response.json();

        console.log("AGRI-SEN ESP32 Data:", data);
        console.log("Soil Moisture:", data.soilMoisture);
        console.log("Temperature:", data.temperature);
        console.log("Soil pH:", data.soilPH);
        console.log("Pump Control Test:", data.pumpControlTest);

    } catch (error) {
        console.error("ESP32 connection error:", error);
    }
}

// Get data immediately, then every 3 seconds
getESP32Data();
setInterval(getESP32Data, 3000);
