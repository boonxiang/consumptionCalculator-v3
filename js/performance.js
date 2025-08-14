function calculateEnergyConsumption() {
    const importThisMonth = parseFloat(document.getElementById("ReadImport_ThisMonth").value);
    const exportThisMonth = parseFloat(document.getElementById("ReadExport_ThisMonth").value);
    const importLastMonth = parseFloat(document.getElementById("ReadImport_LastMonth").value);
    const exportLastMonth = parseFloat(document.getElementById("ReadExport_LastMonth").value);
    const generationThisMonth = parseFloat(document.getElementById("ReadGeneration_ThisMonth").value);
    const generationLastMonth = parseFloat(document.getElementById("ReadGeneration_LastMonth").value);

    const errorDiv = document.getElementById("EnergyConsumptionError");
    const outputDiv = document.getElementById("EnergyConsumptionOutput");

    errorDiv.textContent = "";
    outputDiv.textContent = "";

    if ([importThisMonth, exportThisMonth, importLastMonth, exportLastMonth, generationThisMonth, generationLastMonth].some(isNaN)) {
        errorDiv.textContent = "⚠ Please enter all Import, Export, and Solar Generation values.";
        errorDiv.style.color = "red";
        return;
    }

    const directConsumptionThisMonth = generationThisMonth - exportThisMonth;
    const directConsumptionLastMonth = generationLastMonth - exportLastMonth;

    const totalConsumptionThisMonth = directConsumptionThisMonth + importThisMonth;
    const totalConsumptionLastMonth = directConsumptionLastMonth + importLastMonth;

    const genDiff = generationThisMonth - generationLastMonth;
    const totalConsDiff = totalConsumptionThisMonth - totalConsumptionLastMonth;

    let genSentence = "", genColor = "";
    if (genDiff > 0) {
        genSentence = `Your solar system produced ${genDiff.toFixed(2)} kWh more than last month! 🌞`;
        genColor = "green";
    } else if (genDiff < 0) {
        genSentence = `Your solar generation dropped by ${Math.abs(genDiff).toFixed(2)} kWh compared to last month.`;
        genColor = "red";
    } else {
        genSentence = `Your solar generation was the same as last month.`;
        genColor = "gray";
    }

    let consSentence = "", consColor = "";
    if (totalConsDiff > 0) {
        consSentence = `Your total energy consumption increased by ${totalConsDiff.toFixed(2)} kWh compared to last month, which may increase your bill. ⚡`;
        consColor = "red";
    } else if (totalConsDiff < 0) {
        consSentence = `Your total energy consumption decreased by ${Math.abs(totalConsDiff).toFixed(2)} kWh compared to last month, which may lower your bill. ✅`;
        consColor = "green";
    } else {
        consSentence = `Your total energy consumption is unchanged compared to last month.`;
        consColor = "gray";
    }

    outputDiv.innerHTML = `
        <style>
            .responsive-table {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                margin: 0 auto;
                max-width: 100%;
            }
            .responsive-table table {
                border-collapse: collapse;
                min-width: 500px;
                width: 100%;
            }
            .responsive-table th, .responsive-table td {
                padding: 12px 20px;
                text-align: center;
                word-break: break-word;
            }
            @media (max-width: 768px) {
                .responsive-table table {
                    font-size: 13px;
                }
                .responsive-table th, .responsive-table td {
                    padding: 8px 10px;
                }
                .responsive-table th {
                    background-color: #142850;
                    color: white;
                    font-size: 12px;
                }
            }
            @media (max-width: 480px) {
                .responsive-table table, 
                .responsive-table thead, 
                .responsive-table tbody, 
                .responsive-table th, 
                .responsive-table td, 
                .responsive-table tr {
                    display: block;
                    width: 100%;
                }
                .responsive-table thead tr {
                    display: none;
                }
                .responsive-table tr {
                    margin-bottom: 15px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    padding: 10px;
                    background: white;
                }
                .responsive-table td {
                    text-align: left;
                    padding: 8px;
                    position: relative;
                }
                .responsive-table td::before {
                    content: attr(data-label);
                    font-weight: bold;
                    display: block;
                    margin-bottom: 4px;
                    color: #142850;
                }
            }
        </style>
        <div style="text-align: center; font-family: Arial, sans-serif;">
            <h3 style="color: #142850; font-size: 26px;">Solar & Consumption Comparison</h3>
            <div class="responsive-table">
                <table style="box-shadow: 0 0 15px rgba(0,0,0,0.15);">
                    <thead>
                        <tr style="background-color: #142850; color: white;">
                            <th>Month</th>
                            <th>Solar Generation (kWh)</th>
                            <th>Export Value (kWh)</th>
                            <th>Import Value (kWh)</th>
                            <th>Direct Consumption (kWh)</th>
                            <th>Total Consumption (kWh)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background-color: #f2f2f2;">
                            <td data-label="Month">Previous Month</td>
                            <td data-label="Solar Generation (kWh)">${generationLastMonth.toFixed(2)}</td>
                            <td data-label="Export Value (kWh)">${exportLastMonth.toFixed(2)}</td>
                            <td data-label="Import Value (kWh)">${importLastMonth.toFixed(2)}</td>
                            <td data-label="Direct Consumption (kWh)">${directConsumptionLastMonth.toFixed(2)}</td>
                            <td data-label="Total Consumption (kWh)">${totalConsumptionLastMonth.toFixed(2)}</td>
                        </tr>
                        <tr style="background-color: #ffffff;">
                            <td data-label="Month">This Month</td>
                            <td data-label="Solar Generation (kWh)">${generationThisMonth.toFixed(2)}</td>
                            <td data-label="Export Value (kWh)">${exportThisMonth.toFixed(2)}</td>
                            <td data-label="Import Value (kWh)">${importThisMonth.toFixed(2)}</td>
                            <td data-label="Direct Consumption (kWh)">${directConsumptionThisMonth.toFixed(2)}</td>
                            <td data-label="Total Consumption (kWh)">${totalConsumptionThisMonth.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <br>
            <h4 style="margin-bottom: 8px; font-size: 20px;">Conclusion</h4>
            <p style="color:${genColor}; font-weight: bold; font-size: 16px;">${genSentence}</p>
            <p style="color:${consColor}; font-weight: bold; font-size: 16px;">${consSentence}</p>
            <br>
            <div style="max-width: 600px; margin: 0 auto; text-align: left; font-size: 14px; color: #333;">
                <p><strong>📌 Explanation:</strong></p>
                <ul>
                    <li><strong>Direct Consumption</strong> = Solar Generation − Export Value.<br> <hr>
                        This is the solar energy you used <strong>directly during the daytime</strong> while your panels were producing electricity.</li> <hr><hr>
                    <li><strong>Total Consumption</strong> = Direct Consumption + Import Value.<br> <hr>
                        This is your <strong>total energy usage for both daytime and nighttime</strong>, combining the energy from solar during the day and from the grid at night.</li>
                </ul>
            </div>
        </div>
    `;
}
