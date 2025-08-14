// Rate table (middle rate only used)
const rateTable = {
    "JB": 96,
    "Austin/Tebrau/Setia Tropika": 93,
    "Kluang/Batu Pahat": 99,
    "Muar/Malacca": 106.5,
    "KL/Selangor": 99
};

const areas = [
    "JB",
    "Austin/Tebrau/Setia Tropika",
    "Kluang/Batu Pahat",
    "Muar/Malacca",
    "KL/Selangor"
];

function calculateEnergyConsumption() {
    const solarSize = parseFloat(document.getElementById("solarSizeInput").value);
    const actualYield = parseFloat(document.getElementById("actualYieldInput").value);
    const areaIdx = parseInt(document.getElementById("areaSelect").value);
    const unit = document.getElementById("unitSelect").value;

    const errorDiv = document.getElementById("EnergyConsumptionError");
    const outputDiv = document.getElementById("EnergyConsumptionOutput");

    errorDiv.textContent = "";
    outputDiv.textContent = "";

    if (isNaN(solarSize) || solarSize <= 0) {
        errorDiv.textContent = "Please enter a valid solar system size (kW).";
        return;
    }

    if (isNaN(actualYield) || actualYield < 0) {
        errorDiv.textContent = "Please enter a valid actual yield.";
        return;
    }

    const selectedArea = areas[areaIdx];
    const rate = rateTable[selectedArea];
    const estimatedYield = solarSize * rate;

    let actualYieldInKwh = unit === "MWh" ? actualYield * 1000 : actualYield;
    let performanceDiff = 100 - (((estimatedYield - actualYieldInKwh) / estimatedYield) * 100);

    // Determine performance rating
    let rating = "";
    let description = "";

    if (performanceDiff >= 90) {
        rating = "🌞 Excellent";
        description = "System is running optimally";
    } else if (performanceDiff >= 80 && performanceDiff < 90) {
        rating = "✅ Good";
        description = "The performance is acceptable";
    } else {
        rating = "🚨 Attention Needed";
        description = "System underperforming — please contact us for assistance";
    }

    const outputUnit = unit;

    outputDiv.innerHTML = `
        <strong>Selected Area:</strong> ${selectedArea}<br>
        <strong>Rate:</strong> ${rate}<br>
        <strong>Estimated Monthly Yield:</strong> ${(estimatedYield / (unit === "MWh" ? 1000 : 1)).toFixed(2)} ${outputUnit}<br>
        <strong>Actual Monthly Yield:</strong> ${actualYield.toFixed(2)} ${outputUnit}<br>
        <strong>Performance Gap:</strong> ${performanceDiff.toFixed(2)}%<br><br>

        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: left;">
            <thead style="background-color: #f2f2f2;">
                <tr>
                    <th>Performance Gap (%)</th>
                    <th>Rating</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                <tr style="${performanceDiff >= 90 ? 'background-color: #8dccf7ff;' : ''}">
                    <td>≥ 90%</td>
                    <td>🌞 Excellent</td>
                    <td>System is running optimally</td>
                </tr>
                <tr style="${performanceDiff > 80 && performanceDiff < 90 ? 'background-color: #b4c8e7ff;' : ''}">
                    <td>80% - 89%</td>
                    <td>✅ Good</td>
                    <td>The performance is acceptable</td> 
                </tr>
                <tr style="${performanceDiff < 80 ? 'background-color: #ff1327ff;' : ''}">
                    <td>< 79% and below </td>
                    <td>🚨 Attention Needed</td>
                    <td>System underperforming — please contact us for assistance</td> 
                </tr>
                <tr>
                    <td colspan = "3"><strong>Please noted that this is used for the average roof angle calculation which is 15° - 35°</strong></td>
                </tr>
            </tbody>
        </table>
    `;
}

// Attach listener when DOM loads
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("areaSelect").addEventListener("change", () => {});
});
