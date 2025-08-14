
// Rate table for area and roof angle
const rateTable = {
    "JB": [100.8, 96, 87],
    "Austin/Tebrau/Setia Tropika": [97.65, 93, 87],
    "Kluang/Batu Pahat": [103.95, 99, 87],
    "Muar/Malacca": [111.825, 106.5, 87],
    "KL/Selangor": [103.95, 99, 87]
};

const areas = [
    "JB",
    "Austin/Tebrau/Setia Tropika",
    "Kluang/Batu Pahat",
    "Muar/Malacca",
    "KL/Selangor"
];

const angles = ["5°-15°", "15°-35°", "35°-45°"];

const TNB_DOMESTRIC_RATES = {
    low_general: {  // ≤1500 kWh
        energy: 0.2703,      // 27.03 sen/kWh
        capacity: 0.0455,    // 4.55 sen/kWh
        network: 0.1285,     // 12.85 sen/kWh
        retail: 10.00        // RM 10.00/month
    },
    high_general: {  // >1500 kWh
        energy: 0.3703,      // 37.03 sen/kWh
        capacity: 0.0455,    // 4.55 sen/kWh
        network: 0.1285,     // 12.85 sen/kWh
        retail: 10.00        // RM 10.00/month
    },
    low_TOU: {  // ≤1500 kWh
        peak: 0.2852,        // 28.52 sen/kWh
        off_peak: 0.2443,    // 24.43 sen/kWh
        capacity: 0.0455,    // 4.55 sen/kWh
        network: 0.1285,     // 12.85 sen/kWh
        retail: 10.00        // RM 10.00/month
    },
    high_TOU: {  // >1500 kWh
        peak: 0.3852,        // 38.52 sen/kWh
        off_peak: 0.3443,    // 34.43 sen/kWh
        capacity: 0.0455,    // 4.55 sen/kWh
        network: 0.1285,     // 12.85 sen/kWh
        retail: 10.00        // RM 10.00/month
    }
};

// EEI Rates (common to both, but functions are slightly different)
const EEI_RATES_domestic = [
    { 'min': 1, 'max': 200, 'rate': 0.25 },
    { 'min': 201, 'max': 250, 'rate': 0.245 },
    { 'min': 251, 'max': 300, 'rate': 0.225 },
    { 'min': 301, 'max': 350, 'rate': 0.21 },
    { 'min': 351, 'max': 400, 'rate': 0.17 },
    { 'min': 401, 'max': 450, 'rate': 0.145 },
    { 'min': 451, 'max': 500, 'rate': 0.12 },
    { 'min': 501, 'max': 550, 'rate': 0.105 },
    { 'min': 551, 'max': 600, 'rate': 0.09 },
    { 'min': 601, 'max': 650, 'rate': 0.075 },
    { 'min': 651, 'max': 700, 'rate': 0.055 },
    { 'min': 701, 'max': 750, 'rate': 0.045 },
    { 'min': 751, 'max': 800, 'rate': 0.04 },
    { 'min': 801, 'max': 850, 'rate': 0.025 },
    { 'min': 851, 'max': 900, 'rate': 0.01 },
    { 'min': 901, 'max': 1000, 'rate': 0.005 }
];


// This function is for EEI calculation for both ToU and General Tariff
function calculate_eei_general(kwh) {
    if (kwh > 1000) return 0;
    for (let s of EEI_RATES_domestic) { // Reusing the same EEI_RATES_domestic as they are identical
        if (kwh >= s.min && kwh <= s.max) {
            return +(kwh * s.rate).toFixed(2);
        }
    }
    return 0;
}

// Functions for Time-of-Use (ToU) Calculations
function calculate_bill_from_usage_tou(total_usage, peak_percent) {
    const peak_usage = total_usage * (peak_percent / 100);
    const off_peak_usage = total_usage - peak_usage;

    const rates = total_usage <= 1500 ? TNB_DOMESTRIC_RATES['low_TOU'] : TNB_DOMESTRIC_RATES['high_TOU'];

    let non_taxable_kwh_limit = 600;

    let non_taxable_peak = Math.min(peak_usage, non_taxable_kwh_limit);
    let remaining_nt_limit = non_taxable_kwh_limit - non_taxable_peak;
    let non_taxable_off_peak = Math.min(off_peak_usage, remaining_nt_limit);

    let taxable_peak = peak_usage - non_taxable_peak;
    let taxable_off_peak = off_peak_usage - non_taxable_off_peak;

    let non_taxable_kwh = non_taxable_peak + non_taxable_off_peak;
    let taxable_kwh = taxable_peak + taxable_off_peak;

    // Using the unified EEI calculation function
    const eei_rebate = calculate_eei_general(total_usage);

    let eei_rebate_non_tax = 0.0;
    let eei_rebate_tax = 0.0;

    if (eei_rebate > 0 && total_usage > 0) {
        eei_rebate_non_tax = eei_rebate * (non_taxable_kwh / total_usage);
        eei_rebate_tax = eei_rebate * (taxable_kwh / total_usage);
    }

    // Charges - non-taxable part (<= 600kWh)
    const nt_energy_peak = non_taxable_peak * rates['peak'];
    const nt_energy_off_peak = non_taxable_off_peak * rates['off_peak'];
    const nt_capacity = non_taxable_kwh * rates['capacity'];
    const nt_network = non_taxable_kwh * rates['network'];
    const nt_retail = 0; // Retail waived if total <= 600

    const nt_subtotal = nt_energy_peak + nt_energy_off_peak + nt_capacity + nt_network + nt_retail - eei_rebate_non_tax;

    // Charges - taxable part (> 600kWh)
    const t_energy_peak = taxable_peak * rates['peak'];
    const t_energy_off_peak = taxable_off_peak * rates['off_peak'];
    const t_capacity = taxable_kwh * rates['capacity'];
    const t_network = taxable_kwh * rates['network'];
    const t_retail = total_usage > 600 ? rates['retail'] : 0;
    const t_subtotal = t_energy_peak + t_energy_off_peak + t_capacity + t_network + t_retail - eei_rebate_tax;

    const combined_subtotal = nt_subtotal + t_subtotal;

    const tax_base = t_subtotal;
    const service_tax = tax_base * 0.08;

    let kwtbb = 0.0;
    if (total_usage > 300) {
        const retail_for_kwtbb = total_usage > 600 ? t_retail : 0;
        kwtbb = (combined_subtotal - retail_for_kwtbb) * 0.016;
    }

    const total_bill = combined_subtotal + service_tax + kwtbb;

    return {
        'total_usage': parseFloat(total_usage.toFixed(2)),
        'peak_percent': parseFloat(peak_percent.toFixed(2)),
        'peak_usage_kwh': parseFloat(peak_usage.toFixed(2)),
        'off_peak_usage_kwh': parseFloat(off_peak_usage.toFixed(2)),
        'non_taxable_kwh': parseFloat(non_taxable_kwh.toFixed(2)),
        'taxable_kwh': parseFloat(taxable_kwh.toFixed(2)),
        'non_taxable_subtotal': parseFloat(nt_subtotal.toFixed(2)),
        'taxable_subtotal': parseFloat(t_subtotal.toFixed(2)),
        'energy_peak_total': parseFloat((nt_energy_peak + t_energy_peak).toFixed(2)),
        'energy_off_peak_total': parseFloat((nt_energy_off_peak + t_energy_off_peak).toFixed(2)),
        'capacity_total': parseFloat((nt_capacity + t_capacity).toFixed(2)),
        'network_total': parseFloat((nt_network + t_network).toFixed(2)),
        'retail_total': parseFloat(t_retail.toFixed(2)),
        'eei_rebate': parseFloat(eei_rebate.toFixed(2)),
        'subtotal_before_tax': parseFloat(combined_subtotal.toFixed(2)),
        'service_tax': parseFloat(service_tax.toFixed(2)),
        'kwtbb': parseFloat(kwtbb.toFixed(2)),
        'total_bill': parseFloat(total_bill.toFixed(2))
    };
}

function reverse_tnb_tou_bill(total_bill_input, peak_percent, tolerance = 0.01, max_kwh = 100000000000) {
    let low = 1.0;
    let high = max_kwh * 1.0;
    let guess = (low + high) / 2;

    let iterations = 0;
    const max_iterations = 100;

    let best_guess_kwh = null;
    let best_result_obj = null;
    let min_diff = Infinity;

    while (iterations < max_iterations) {
        const result = calculate_bill_from_usage_tou(guess, peak_percent);
        const calculated_bill = result['total_bill'];
        const difference = calculated_bill - total_bill_input;

        if (Math.abs(difference) < min_diff) {
            min_diff = Math.abs(difference);
            best_guess_kwh = guess;
            best_result_obj = result;
        }

        if (Math.abs(difference) <= tolerance) {
            return {
                'estimated_total_kwh': parseFloat(guess.toFixed(2)),
                'estimated_peak_kwh': parseFloat(result['peak_usage_kwh'].toFixed(2)),
                'estimated_off_peak_kwh': parseFloat(result['off_peak_usage_kwh'].toFixed(2)),
                'peak_percent': parseFloat(peak_percent.toFixed(2)),
                'off_peak_percent': parseFloat((100 - peak_percent).toFixed(2)),
                'matched_total_bill': parseFloat(calculated_bill.toFixed(2)),
                'service_tax': result['service_tax'],
                'kwtbb': result['kwtbb'],
                'retail_total': result['retail_total'], // Corrected key to match calculate_bill_from_usage_tou
                'network_total': result['network_total'], // Corrected key
                'capacity_total': result['capacity_total'], // Corrected key
                'energy_peak_total': result['energy_peak_total'],
                'energy_off_peak_total': result['energy_off_peak_total'],
                'eei_rebate': result['eei_rebate'],
                'subtotal_before_tax': result['subtotal_before_tax'],
                'iterations': iterations,
                'status': 'matched_within_tolerance'
            };
        }

        if (calculated_bill < total_bill_input) {
            low = guess;
        } else {
            high = guess;
        }

        guess = (low + high) / 2;
        iterations += 1;
    }

    // Fine-tune scan ±2 kWh
    for (let i = -20; i <= 20; i++) {
        const adj = i / 10.0;
        const refined_kwh = best_guess_kwh + adj;
        if (refined_kwh < 0) {
            continue;
        }
        const result = calculate_bill_from_usage_tou(refined_kwh, peak_percent);
        const calculated_bill = result['total_bill'];
        const diff = Math.abs(calculated_bill - total_bill_input);
        if (diff <= tolerance) {
            return {
                'estimated_total_kwh': parseFloat(refined_kwh.toFixed(2)),
                'estimated_peak_kwh': parseFloat(result['peak_usage_kwh'].toFixed(2)),
                'estimated_off_peak_kwh': parseFloat(result['off_peak_usage_kwh'].toFixed(2)),
                'peak_percent': parseFloat(peak_percent.toFixed(2)),
                'off_peak_percent': parseFloat((100 - peak_percent).toFixed(2)),
                'matched_total_bill': parseFloat(calculated_bill.toFixed(2)),
                'service_tax': result['service_tax'],
                'kwtbb': result['kwtbb'],
                'retail_total': result['retail_total'],
                'network_total': result['network_total'],
                'capacity_total': result['capacity_total'],
                'energy_peak_total': result['energy_peak_total'],
                'energy_off_peak_total': result['energy_off_peak_total'],
                'eei_rebate': result['eei_rebate'],
                'subtotal_before_tax': result['subtotal_before_tax'],
                'iterations': iterations,
                'status': 'matched_in_fine_scan'
            };
        }
    }

    // Final fallback: return best guess even if not matched
    const best_kwh = parseFloat(best_guess_kwh.toFixed(2));
    const best_result = best_result_obj;
    const best_peak_kwh = parseFloat((best_kwh * (peak_percent / 100)).toFixed(2));
    const best_off_peak_kwh = parseFloat((best_kwh - best_peak_kwh).toFixed(2));

    return {
        'error': 'No exact match found within tolerance, returning best estimate.',
        'estimated_total_kwh': best_kwh, // Changed from best_guess_kwh to align with other fields
        'estimated_peak_kwh': best_peak_kwh,
        'estimated_off_peak_kwh': best_off_peak_kwh,
        'peak_percent': parseFloat(peak_percent.toFixed(2)),
        'off_peak_percent': parseFloat((100 - peak_percent).toFixed(2)),
        'matched_total_bill': parseFloat(best_result['total_bill'].toFixed(2)), // Consistent naming
        'service_tax': best_result['service_tax'],
        'kwtbb': best_result['kwtbb'],
        'retail_total': best_result['retail_total'], // Corrected key to match calculate_bill_from_usage_tou
        'network_total': best_result['network_total'], // Corrected key
        'capacity_total': best_result['capacity_total'], // Corrected key
        'energy_peak_total': best_result['energy_peak_total'],
        'energy_off_peak_total': best_result['energy_off_peak_total'],
        'eei_rebate': best_result['eei_rebate'],
        'subtotal_before_tax': best_result['subtotal_before_tax'],
        'difference': parseFloat(min_diff.toFixed(2)), // Use min_diff for accuracy
        'iterations': iterations,
        'status': 'best_estimate_only'
    };
}

function calculateBillTou() {
    const totalUsage = parseFloat(document.getElementById('totalUsage').value);
    const peakPercent = parseFloat(document.getElementById('peakPercent').value);
    const errorDiv = document.getElementById('calculateBillError');
    const outputDiv = document.getElementById('billOutput');

    errorDiv.textContent = '';
    outputDiv.classList.add('hidden'); // Hide output by default

    console.log("calculateBillTou called.");
    console.log("Input - Total Usage:", totalUsage, "Peak Percent:", peakPercent);

    if (isNaN(totalUsage) || totalUsage < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Total Usage.';
        console.error("Validation error: Invalid Total Usage.");
        return;
    }
    if (isNaN(peakPercent) || peakPercent < 0 || peakPercent > 100) {
        errorDiv.textContent = 'Please enter a valid percentage (0-100) for Peak Usage Percentage.';
        console.error("Validation error: Invalid Peak Usage Percentage.");
        return;
    }

    // Added check for 0 usage, as EEI calculation might result in NaN for 0/0
    if (totalUsage === 0) {
        errorDiv.textContent = 'Total Usage cannot be zero for a bill calculation.';
        console.error("Validation error: Total Usage is zero.");
        return;
    }

    // Assuming calculate_bill_from_usage_tou function exists and returns an object
    // with all the necessary properties (e.g., peak_usage_kwh, off_peak_usage_kwh, etc.)
    const result = calculate_bill_from_usage_tou(totalUsage, peakPercent);
    console.log("Calculation Result:", result);

    document.getElementById('outputTotalUsage').textContent = result.total_usage.toFixed(2) + ' kWh';
    // Ensure these IDs exist in your HTML
    document.getElementById('outputTPeakUsageKWH').textContent = result.peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('outputTOffPeakUsageKWH').textContent = result.off_peak_usage_kwh.toFixed(2) + ' kWh'; // NOW EXISTS
    document.getElementById('outputTPeakPercent').textContent = result.peak_percent.toFixed(2) + '%'; // NOW EXISTS
    document.getElementById('outputTOffPeakPercent').textContent = (100 - result.peak_percent).toFixed(2) + '%'; // NOW EXISTS

    document.getElementById('outputPeakUsageKWH').textContent = result.peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('outputEnergyPeakTotal').textContent = 'RM ' + result.energy_peak_total.toFixed(2);
    document.getElementById('outputOffPeakUsageKWH').textContent = result.off_peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('outputEnergyOffPeakTotal').textContent = 'RM ' + result.energy_off_peak_total.toFixed(2);

    document.getElementById('outputCapacityTotal').textContent = 'RM ' + result.capacity_total.toFixed(2);
    document.getElementById('outputNetworkTotal').textContent = 'RM ' + result.network_total.toFixed(2);
    document.getElementById('outputRetailTotal').textContent = 'RM ' + result.retail_total.toFixed(2);
    document.getElementById('outputEEIRebate').textContent = '- RM ' + result.eei_rebate.toFixed(2);
    document.getElementById('outputSubtotalBeforeTax').textContent = 'RM ' + result.subtotal_before_tax.toFixed(2);
    document.getElementById('outputServiceTax').textContent = 'RM ' + result.service_tax.toFixed(2);
    document.getElementById('outputKWTBB').textContent = 'RM ' + result.kwtbb.toFixed(2);
    document.getElementById('outputTotalBill').textContent = 'RM ' + result.total_bill.toFixed(2);

    outputDiv.classList.remove('hidden'); // Show output
    console.log("Output section should now be visible.");
}

function estimateUsageTou() {
    const targetBill = parseFloat(document.getElementById('targetBill').value);
    const peakPercentReverse = parseFloat(document.getElementById('peakPercentReverse').value);
    const errorDiv = document.getElementById('estimateUsageError');
    const outputDiv = document.getElementById('usageOutput');

    errorDiv.textContent = '';
    outputDiv.classList.add('hidden'); // Hide output by default

    if (isNaN(targetBill) || targetBill < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Target Total Bill.';
        return;
    }
    if (isNaN(peakPercentReverse) || peakPercentReverse < 0 || peakPercentReverse > 100) {
        errorDiv.textContent = 'Please enter a valid percentage (0-100) for Peak Usage Percentage.';
        return;
    }

    const result = reverse_tnb_tou_bill(targetBill, peakPercentReverse);

    let displayResult = result;
    let billToDisplay = result.matched_total_bill;

    if (result.error) {
        errorDiv.textContent = result.error + ' The closest estimate is shown.';
        billToDisplay = result.matched_total_bill + ' (Difference: RM ' + result.difference.toFixed(2) + ')';
    }

    document.getElementById('outputEstimatedTotalKWH').textContent = displayResult.estimated_total_kwh + ' kWh';
    document.getElementById('outputTEstimatedPeakKWH').textContent = displayResult.estimated_peak_kwh.toFixed(2) + ' kWh';
    document.getElementById('outputTEstimatedOffPeakKWH').textContent = displayResult.estimated_off_peak_kwh.toFixed(2) + ' kWh';
    document.getElementById('outputReversePeakPercent').textContent = displayResult.peak_percent.toFixed(2) + '%';
    document.getElementById('outputReverseOffPeakPercent').textContent = displayResult.off_peak_percent.toFixed(2) + '%';
    document.getElementById('outputMatchedTotalBill').textContent = 'RM ' + billToDisplay;

    document.getElementById('outputEstimatedPeakKWH').textContent = displayResult.estimated_peak_kwh.toFixed(2) + ' kWh';
    document.getElementById('outputEstimatedOffPeakKWH').textContent = displayResult.estimated_off_peak_kwh.toFixed(2) + ' kWh';
    document.getElementById('outputReverseServiceTax').textContent = 'RM ' + displayResult.service_tax.toFixed(2);
    document.getElementById('outputReverseKWTBB').textContent = 'RM ' + displayResult.kwtbb.toFixed(2);
    document.getElementById('outputReverseRetailCharge').textContent = 'RM ' + displayResult.retail_total.toFixed(2);
    document.getElementById('outputReverseNetworkCharge').textContent = 'RM ' + displayResult.network_total.toFixed(2);
    document.getElementById('outputReverseCapacityCharge').textContent = 'RM ' + displayResult.capacity_total.toFixed(2);
    document.getElementById('outputReverseEnergyPeakTotal').textContent = 'RM ' + displayResult.energy_peak_total.toFixed(2);
    document.getElementById('outputReverseEnergyOffPeakTotal').textContent = 'RM ' + displayResult.energy_off_peak_total.toFixed(2);
    document.getElementById('outputReverseEEIRebate').textContent = '- RM ' + displayResult.eei_rebate.toFixed(2);
    document.getElementById('outputReverseSubtotalBeforeTax').textContent = 'RM ' + displayResult.subtotal_before_tax.toFixed(2);
    document.getElementById('outputReverseStatus').textContent = 'Status: ' + (displayResult.status ? displayResult.status.replace(/_/g, ' ') : 'N/A') + ' (Iterations: ' + displayResult.iterations + ')';


    outputDiv.classList.remove('hidden'); // Show output
}

// Functions for Domestic General Tariff Calculations
function calculate_bill_from_usage_general(kwh) {
    const rates = kwh <= 1500 ? TNB_DOMESTRIC_RATES.low_general : TNB_DOMESTRIC_RATES.high_general;

    const nonTaxKwh = Math.min(kwh, 600);
    const taxKwh = Math.max(0, kwh - 600);
    const eei = calculate_eei_general(kwh); // Using the unified EEI calculation function

    let eeiNonTax = (eei > 0 && kwh > 0) ? eei * (nonTaxKwh / kwh) : 0;
    let eeiTax = (eei > 0 && kwh > 0) ? eei * (taxKwh / kwh) : 0;

    const ntEnergy = nonTaxKwh * rates.energy;
    const ntCapacity = nonTaxKwh * rates.capacity;
    const ntNetwork = nonTaxKwh * rates.network;
    const ntSubtotal = ntEnergy + ntCapacity + ntNetwork - eeiNonTax;

    const tEnergy = taxKwh * rates.energy;
    const tCapacity = taxKwh * rates.capacity;
    const tNetwork = taxKwh * rates.network;
    const tRetail = kwh > 600 ? rates.retail : 0;
    const tSubtotal = tEnergy + tCapacity + tNetwork + tRetail - eeiTax;

    const combinedSubtotal = ntSubtotal + tSubtotal;
    const serviceTax = tSubtotal * 0.08;
    const kwtbb = (kwh > 300 ? (combinedSubtotal - tRetail) * 0.016 : 0);

    const total = combinedSubtotal + serviceTax + kwtbb;

    return {
        kwh: parseFloat(kwh.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        subtotal: parseFloat(combinedSubtotal.toFixed(2)),
        serviceTax: parseFloat(serviceTax.toFixed(2)),
        kwtbb: parseFloat(kwtbb.toFixed(2)),
        eei: parseFloat(eei.toFixed(2)),
        breakdown: {
            nonTaxKwh: parseFloat(nonTaxKwh.toFixed(2)),
            taxKwh: parseFloat(taxKwh.toFixed(2)),
            energyNT: parseFloat(ntEnergy.toFixed(2)),
            energyTax: parseFloat(tEnergy.toFixed(2)),
            capacity: parseFloat((ntCapacity + tCapacity).toFixed(2)),
            network: parseFloat((ntNetwork + tNetwork).toFixed(2)),
            retail: parseFloat(tRetail.toFixed(2))
        }
    };
}

function reverse_tnb_bill_general(targetBill) {
    let low = 1, high = 100000000000, mid;
    let bestDiff = Infinity;
    let bestResult = null;
    let iterations = 0;
    const max_iterations = 100;
    const tolerance = 0.01;

    while (iterations < max_iterations) {
        mid = (low + high) / 2;
        const res = calculate_bill_from_usage_general(mid);
        const diff = Math.abs(res.total - targetBill);

        if (diff < bestDiff) {
            bestDiff = diff;
            bestResult = res;
        }

        if (diff <= tolerance) {
            return { ...res, iterations: iterations, status: 'matched_within_tolerance' };
        }
        if (res.total < targetBill) low = mid;
        else high = mid;
        iterations++;
    }

    // Fine-tune scan ±2 kWh
    for (let i = -20; i <= 20; i++) {
        const adj = i / 10.0;
        const refined_kwh = bestResult.kwh + adj;
        if (refined_kwh < 0) {
            continue;
        }
        const result = calculate_bill_from_usage_general(refined_kwh);
        const diff = Math.abs(result.total - targetBill);
        if (diff <= tolerance) {
            return { ...result, iterations: iterations, status: 'matched_in_fine_scan' };
        }
    }

    // Fallback: return best guess if no match within tolerance after iterations
    return {
        error: 'No exact match found within tolerance, returning best estimate.',
        kwh: parseFloat(bestResult.kwh.toFixed(2)),
        total: parseFloat(bestResult.total.toFixed(2)),
        subtotal: parseFloat(bestResult.subtotal.toFixed(2)),
        serviceTax: parseFloat(bestResult.serviceTax.toFixed(2)),
        kwtbb: parseFloat(bestResult.kwtbb.toFixed(2)),
        eei: parseFloat(bestResult.eei.toFixed(2)),
        breakdown: bestResult.breakdown,
        difference: parseFloat(bestDiff.toFixed(2)),
        iterations: iterations,
        status: 'best_estimate_only'
    };
}

function calculateGeneralBill() {
    const totalUsage = parseFloat(document.getElementById("generalUsageInput").value);
    const errorDiv = document.getElementById('generalCalculateBillError');
    const outputDiv = document.getElementById('generalBillOutput');

    errorDiv.textContent = '';
    outputDiv.classList.add('hidden');

    if (isNaN(totalUsage) || totalUsage < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Total Usage.';
        return;
    }

    const result = calculate_bill_from_usage_general(totalUsage);

    document.getElementById('generalOutputTotalUsage').textContent = result.kwh.toFixed(2) + ' kWh';
    document.getElementById('generalOutputNonTaxKwh').textContent = result.breakdown.nonTaxKwh.toFixed(2) + ' kWh';
    document.getElementById('generalOutputTaxKwh').textContent = result.breakdown.taxKwh.toFixed(2) + ' kWh';
    document.getElementById('generalOutputEnergyNT').textContent = 'RM ' + result.breakdown.energyNT.toFixed(2);
    document.getElementById('generalOutputEnergyTax').textContent = 'RM ' + result.breakdown.energyTax.toFixed(2);
    document.getElementById('generalOutputCapacity').textContent = 'RM ' + result.breakdown.capacity.toFixed(2);
    document.getElementById('generalOutputNetwork').textContent = 'RM ' + result.breakdown.network.toFixed(2);
    document.getElementById('generalOutputRetail').textContent = 'RM ' + result.breakdown.retail.toFixed(2);
    document.getElementById('generalOutputEEI').textContent = '- RM ' + result.eei.toFixed(2);
    document.getElementById('generalOutputSubtotal').textContent = 'RM ' + result.subtotal.toFixed(2);
    document.getElementById('generalOutputServiceTax').textContent = 'RM ' + result.serviceTax.toFixed(2);
    document.getElementById('generalOutputKWTBB').textContent = 'RM ' + result.kwtbb.toFixed(2);
    document.getElementById('generalOutputTotalBill').textContent = 'RM ' + result.total.toFixed(2);

    outputDiv.classList.remove('hidden');
}

function estimateGeneralUsage() {
    const targetBill = parseFloat(document.getElementById("generalBillInput").value);
    const errorDiv = document.getElementById('generalEstimateUsageError');
    const outputDiv = document.getElementById('generalUsageOutput');

    errorDiv.textContent = '';
    outputDiv.classList.add('hidden');

    if (isNaN(targetBill) || targetBill < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Target Total Bill.';
        return;
    }

    const result = reverse_tnb_bill_general(targetBill);

    if (result.error) {
        errorDiv.textContent = result.error + ' The closest estimate is shown.';
        document.getElementById('generalOutputEstimatedTotalKWH').textContent = result.kwh.toFixed(2) + ' kWh';
        document.getElementById('generalOutputMatchedTotalBill').textContent = 'RM ' + result.total.toFixed(2) + ' (Difference: RM ' + result.difference.toFixed(2) + ')';
    } else {
        document.getElementById('generalOutputEstimatedTotalKWH').textContent = result.kwh.toFixed(2) + ' kWh';
        document.getElementById('generalOutputMatchedTotalBill').textContent = 'RM ' + result.total.toFixed(2);
    }

    document.getElementById('generalReverseEnergyNT').textContent = 'RM ' + result.breakdown.energyNT.toFixed(2);
    document.getElementById('generalReverseEnergyTax').textContent = 'RM ' + result.breakdown.energyTax.toFixed(2);
    document.getElementById('generalReverseCapacity').textContent = 'RM ' + result.breakdown.capacity.toFixed(2);
    document.getElementById('generalReverseNetwork').textContent = 'RM ' + result.breakdown.network.toFixed(2);
    document.getElementById('generalReverseRetail').textContent = 'RM ' + result.breakdown.retail.toFixed(2);
    document.getElementById('generalReverseEEI').textContent = '- RM ' + result.eei.toFixed(2);
    document.getElementById('generalReverseSubtotal').textContent = 'RM ' + result.subtotal.toFixed(2);
    document.getElementById('generalReverseServiceTax').textContent = 'RM ' + result.serviceTax.toFixed(2);
    document.getElementById('generalReverseKWTBB').textContent = 'RM ' + result.kwtbb.toFixed(2);
    document.getElementById('generalReverseStatus').textContent = 'Status: ' + (result.status ? result.status.replace(/_/g, ' ') : 'N/A') + ' (Iterations: ' + result.iterations + ')';

    outputDiv.classList.remove('hidden');
}

// TNB Non-Domestic Rates
const TNB_Non_Domestic_RATES = {
    low_General: {
        energy: 0.2703,
        capacity: 0.0883,
        network: 0.1482,
        retail: 20.00
    },
    low_TOU: {
        peak: 0.2852,
        off_peak: 0.2443,
        capacity: 0.0883,
        network: 0.1482,
        retail: 20.00
    },
    medium_General: {
        energy: 0.2983,
        capacity: 29.43,
        network: 59.84,
        retail: 200.00
    },
    medium_TOU: {
        peak: 0.3132,
        off_peak: 0.2723,
        capacity: 30.19,
        network: 66.87,
        retail: 200.00
    },
    high_General: {
        energy: 0.4303,
        capacity: 16.68,
        network: 14.53,
        retail: 250.00
    },
    high_TOU: {
        peak: 0.4452,
        off_peak: 0.4043,
        capacity: 21.76,
        network: 23.06,
        retail: 250.00
    }
};

// EEI Calculation
function calculate_eei_nd(total_kwh) {
    if (total_kwh <= 200) {
        return 0.11;
    } else {
        return 0;
    }
}

// Non-Domestic Low General
function calculate_bill_from_usage_nd_low_general(total_usage) {
    const rates = TNB_Non_Domestic_RATES.low_General;
    const eei_rebate_rate = calculate_eei_nd(total_usage);

    const energy = total_usage * rates.energy;
    const capacity = total_usage * rates.capacity;
    const network = total_usage * rates.network;
    const retail = rates.retail;
    const eei_rebate = total_usage * eei_rebate_rate;
    const subtotal = energy + capacity + network + retail - eei_rebate;
    const kwtbb = (subtotal - retail) * 0.016;
    const total_bill = subtotal + kwtbb;

    return {
        total_usage: Number(total_usage.toFixed(2)),
        energy_total: Number(energy.toFixed(2)),
        capacity_total: Number(capacity.toFixed(2)),
        network_total: Number(network.toFixed(2)),
        retail_total: Number(retail.toFixed(2)),
        eei_rebate: Number(eei_rebate.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
        kwtbb: Number(kwtbb.toFixed(2)),
        total_bill: Number(total_bill.toFixed(2))
    };
}

function calculateNdLowGeneralBill() {
    const totalUsage = parseFloat(document.getElementById("ndLowGeneralUsageInput").value);
    const errorDiv = document.getElementById('ndLowGeneralCalculateBillError');
    const outputDiv = document.getElementById('ndLowGeneralBillOutput');

    errorDiv.textContent = '';
    outputDiv.classList.add('hidden');

    if (isNaN(totalUsage) || totalUsage < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Total Usage.';
        return;
    }

    const result = calculate_bill_from_usage_nd_low_general(totalUsage);

    document.getElementById('ndLowGeneralOutputTotalUsage').textContent = result.total_usage.toFixed(2) + ' kWh';
    document.getElementById('ndLowGeneralOutputEnergyTotal').textContent = 'RM ' + result.energy_total.toFixed(2);
    document.getElementById('ndLowGeneralOutputCapacity').textContent = 'RM ' + result.capacity_total.toFixed(2);
    document.getElementById('ndLowGeneralOutputNetwork').textContent = 'RM ' + result.network_total.toFixed(2);
    document.getElementById('ndLowGeneralOutputRetail').textContent = 'RM ' + result.retail_total.toFixed(2);
    document.getElementById('ndLowGeneralOutputEEI').textContent = '- RM ' + result.eei_rebate.toFixed(2);
    document.getElementById('ndLowGeneralOutputSubtotal').textContent = 'RM ' + result.subtotal.toFixed(2);
    document.getElementById('ndLowGeneralOutputKWTBB').textContent = 'RM ' + result.kwtbb.toFixed(2);
    document.getElementById('ndLowGeneralOutputTotalBill').textContent = 'RM ' + result.total_bill.toFixed(2);

    outputDiv.classList.remove('hidden');
}

// Reverse Non-Domestic Low General
function reverse_tnb_nd_general_bill(total_bill_input, tolerance = 0.01, max_kwh = 10000000) {
    let low = 1.0, high = max_kwh * 1.0, guess = (low + high) / 2;
    let iterations = 0, max_iterations = 100;
    let best_guess = null, min_diff = Infinity;

    while (iterations < max_iterations) {
        const result = calculate_bill_from_usage_nd_low_general(guess);
        const calculated_bill = result.total_bill;
        const difference = calculated_bill - total_bill_input;

        if (Math.abs(difference) < min_diff) {
            min_diff = Math.abs(difference);
            best_guess = [guess, result];
        }

        if (Math.abs(difference) <= tolerance) {
            return {
                estimated_total_kwh: Number(guess.toFixed(2)),
                matched_total_bill: Number(calculated_bill.toFixed(2)),
                energy_total: result.energy_total,
                network_charge: result.network_total,
                capacity_charge: result.capacity_total,
                retail_charge: result.retail_total,
                kwtbb: result.kwtbb,
                eei_rebate: result.eei_rebate,
                subtotal: result.subtotal,
                iterations: iterations,
                status: 'matched_within_tolerance'
            };
        }

        if (calculated_bill < total_bill_input) {
            low = guess;
        } else {
            high = guess;
        }
        guess = (low + high) / 2;
        iterations += 1;
    }

    // Fine-tune scan ±2 kWh
    for (let x = -20; x <= 20; x++) {
        const adj = x / 10.0;
        const refined_kwh = best_guess[0] + adj;
        if (refined_kwh < 0) continue;
        const result = calculate_bill_from_usage_nd_low_general(refined_kwh);
        const calculated_bill = result.total_bill;
        const diff = Math.abs(calculated_bill - total_bill_input);
        if (diff <= tolerance) {
            return {
                estimated_total_kwh: Number(refined_kwh.toFixed(2)),
                matched_total_bill: Number(calculated_bill.toFixed(2)),
                energy_total: result.energy_total,
                network_charge: result.network_total,
                capacity_charge: result.capacity_total,
                retail_charge: result.retail_total,
                kwtbb: result.kwtbb,
                eei_rebate: result.eei_rebate,
                subtotal: result.subtotal,
                iterations: iterations,
                status: 'matched_in_fine_scan'
            };
        }
    }

    // Final fallback: return best guess even if not matched
    const best_kwh = Number(best_guess[0].toFixed(2));
    const best_result = best_guess[1];

    return {
        error: 'No match found within tolerance.',
        best_guess_kwh: best_kwh,
        best_matched_bill: best_result.total_bill,
        energy_total: best_result.energy_total,
        network_charge: best_result.network_total,
        capacity_charge: best_result.capacity_total,
        retail_charge: best_result.retail_total,
        kwtbb: best_result.kwtbb,
        eei_rebate: best_result.eei_rebate,
        subtotal: best_result.subtotal,
        difference: Number(Math.abs(best_result.total_bill - total_bill_input).toFixed(2)),
        iterations: iterations
    };
}

// Non-Domestic Low TOU
function calculate_bill_from_usage_nd_TOU(total_usage, peak_percent) {
    const peak_usage = total_usage * (peak_percent / 100);
    const off_peak_usage = total_usage - peak_usage;
    const rates = TNB_Non_Domestic_RATES.low_TOU;
    const eei_rebate_rate = calculate_eei_nd(total_usage);

    const energy_peak = peak_usage * rates.peak;
    const energy_off_peak = off_peak_usage * rates.off_peak;
    const capacity = total_usage * rates.capacity;
    const network = total_usage * rates.network;
    const retail = rates.retail;
    const eei_rebate = total_usage * eei_rebate_rate;
    const subtotal = energy_peak + energy_off_peak + capacity + network + retail - eei_rebate;
    const kwtbb = (subtotal - retail) * 0.016;
    const total_bill = subtotal + kwtbb;

    return {
        total_usage: Number(total_usage.toFixed(2)),
        peak_percent: Number(peak_percent.toFixed(2)),
        peak_usage_kwh: Number(peak_usage.toFixed(2)),
        off_peak_usage_kwh: Number(off_peak_usage.toFixed(2)),
        energy_peak_total: Number(energy_peak.toFixed(2)),
        energy_off_peak_total: Number(energy_off_peak.toFixed(2)),
        capacity_total: Number(capacity.toFixed(2)),
        network_total: Number(network.toFixed(2)),
        retail_total: Number(retail.toFixed(2)),
        eei_rebate: Number(eei_rebate.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
        kwtbb: Number(kwtbb.toFixed(2)),
        total_bill: Number(total_bill.toFixed(2))
    };
}

function calculateNdLowTouBill() {
    const totalUsage = parseFloat(document.getElementById("ndLowTouUsageInput").value);
    const peakPercent = parseFloat(document.getElementById("ndLowTouPeakPercent").value);
    const errorDiv = document.getElementById('ndLowTouCalculateBillError');
    const outputDiv = document.getElementById('ndLowTouBillOutput');

    errorDiv.textContent = '';
    outputDiv.classList.add('hidden');

    if (isNaN(totalUsage) || totalUsage < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Total Usage.';
        return;
    }
    if (isNaN(peakPercent) || peakPercent < 0 || peakPercent > 100) {
        errorDiv.textContent = 'Please enter a valid percentage (0-100) for Peak Usage Percentage.';
        return;
    }
    if (totalUsage === 0) {
        errorDiv.textContent = 'Total Usage cannot be zero for a bill calculation.';
        return;
    }

    const result = calculate_bill_from_usage_nd_TOU(totalUsage, peakPercent);

    document.getElementById('ndLowTouOutputTotalUsage').textContent = result.total_usage.toFixed(2) + ' kWh';
    document.getElementById('ndLowTouOutputPeakUsageKWH').textContent = result.peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('ndLowTouOutputOffPeakUsageKWH').textContent = result.off_peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('ndLowTouOutputPeakPercent').textContent = result.peak_percent.toFixed(2) + '%';
    document.getElementById('ndLowTouOutputOffPeakPercent').textContent = (100 - result.peak_percent).toFixed(2) + '%';

    document.getElementById('ndLowTouOutputPeakUsageKWH2').textContent = result.peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('ndLowTouOutputEnergyPeakTotal').textContent = 'RM ' + result.energy_peak_total.toFixed(2);
    document.getElementById('ndLowTouOutputOffPeakUsageKWH2').textContent = result.off_peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('ndLowTouOutputEnergyOffPeakTotal').textContent = 'RM ' + result.energy_off_peak_total.toFixed(2);

    document.getElementById('ndLowTouOutputCapacityTotal').textContent = 'RM ' + result.capacity_total.toFixed(2);
    document.getElementById('ndLowTouOutputNetworkTotal').textContent = 'RM ' + result.network_total.toFixed(2);
    document.getElementById('ndLowTouOutputRetailTotal').textContent = 'RM ' + result.retail_total.toFixed(2);
    document.getElementById('ndLowTouOutputEEIRebate').textContent = '- RM ' + result.eei_rebate.toFixed(2);
    document.getElementById('ndLowTouOutputSubtotal').textContent = 'RM ' + result.subtotal.toFixed(2);
    document.getElementById('ndLowTouOutputKWTBB').textContent = 'RM ' + result.kwtbb.toFixed(2);
    document.getElementById('ndLowTouOutputTotalBill').textContent = 'RM ' + result.total_bill.toFixed(2);

    outputDiv.classList.remove('hidden');
}

// Reverse Non-Domestic Low TOU
function reverse_tnb_nd_tou_bill(total_bill_input, peak_percent, tolerance = 0.01, max_kwh = 5000) {
    let low = 1.0, high = max_kwh * 1.0, guess = (low + high) / 2;
    let iterations = 0, max_iterations = 100;
    let best_guess = null, min_diff = Infinity;

    while (iterations < max_iterations) {
        const result = calculate_bill_from_usage_nd_TOU(guess, peak_percent);
        const calculated_bill = result.total_bill;
        const difference = calculated_bill - total_bill_input;

        if (Math.abs(difference) < min_diff) {
            min_diff = Math.abs(difference);
            best_guess = [guess, result];
        }

        if (Math.abs(difference) <= tolerance) {
            return {
                estimated_total_kwh: Number(guess.toFixed(2)),
                estimated_peak_kwh: Number(result.peak_usage_kwh.toFixed(2)),
                estimated_off_peak_kwh: Number(result.off_peak_usage_kwh.toFixed(2)),
                peak_percent: Number(peak_percent.toFixed(2)),
                off_peak_percent: Number((100 - peak_percent).toFixed(2)),
                matched_total_bill: Number(calculated_bill.toFixed(2)),
                kwtbb: result.kwtbb,
                retail_charge: result.retail_total,
                network_charge: result.network_total,
                capacity_charge: result.capacity_total,
                energy_peak_total: result.energy_peak_total,
                energy_off_peak_total: result.energy_off_peak_total,
                eei_rebate: result.eei_rebate,
                subtotal: result.subtotal,
                iterations: iterations,
                status: 'matched_within_tolerance'
            };
        }

        if (calculated_bill < total_bill_input) {
            low = guess;
        } else {
            high = guess;
        }
        guess = (low + high) / 2;
        iterations += 1;
    }

    // Fine-tune scan ±2 kWh
    for (let x = -20; x <= 20; x++) {
        const adj = x / 10.0;
        const refined_kwh = best_guess[0] + adj;
        if (refined_kwh < 0) continue;
        const result = calculate_bill_from_usage_nd_TOU(refined_kwh, peak_percent);
        const calculated_bill = result.total_bill;
        const diff = Math.abs(calculated_bill - total_bill_input);
        if (diff <= tolerance) {
            return {
                estimated_total_kwh: Number(refined_kwh.toFixed(2)),
                estimated_peak_kwh: Number(result.peak_usage_kwh.toFixed(2)),
                estimated_off_peak_kwh: Number(result.off_peak_usage_kwh.toFixed(2)),
                peak_percent: Number(peak_percent.toFixed(2)),
                off_peak_percent: Number((100 - peak_percent).toFixed(2)),
                matched_total_bill: Number(calculated_bill.toFixed(2)),
                kwtbb: result.kwtbb,
                retail_charge: result.retail_total,
                network_charge: result.network_total,
                capacity_charge: result.capacity_total,
                energy_peak_total: result.energy_peak_total,
                energy_off_peak_total: result.energy_off_peak_total,
                eei_rebate: result.eei_rebate,
                subtotal: result.subtotal,
                iterations: iterations,
                status: 'matched_in_fine_scan'
            };
        }
    }

    // Final fallback: return best guess even if not matched
    const best_kwh = Number(best_guess[0].toFixed(2));
    const best_result = best_guess[1];
    const best_peak_kwh = Math.ceil(best_kwh * (peak_percent / 100));
    const best_off_peak_kwh = Math.ceil(best_kwh - best_peak_kwh);

    return {
        error: 'No match found within tolerance.',
        best_guess_kwh: best_kwh,
        estimated_peak_kwh: best_peak_kwh,
        estimated_off_peak_kwh: best_off_peak_kwh,
        peak_percent: Number(peak_percent.toFixed(2)),
        off_peak_percent: Number((100 - peak_percent).toFixed(2)),
        best_matched_bill: best_result.total_bill,
        kwtbb: best_result.kwtbb,
        retail_charge: best_result.retail_total,
        network_charge: best_result.network_total,
        capacity_charge: best_result.capacity_total,
        energy_peak_total: best_result.energy_peak_total,
        energy_off_peak_total: best_result.energy_off_peak_total,
        eei_rebate: best_result.eei_rebate,
        subtotal: best_result.subtotal,
        difference: Number(Math.abs(best_result.total_bill - total_bill_input).toFixed(2)),
        iterations: iterations
    };
}

// --- Medium General ---
function calculate_bill_from_usage_nd_medium_general(total_usage, maximum_demand = 0) {
    const rates = TNB_Non_Domestic_RATES.medium_General;
    const energy = total_usage * rates.energy;
    const capacity = maximum_demand * rates.capacity;
    const network = maximum_demand * rates.network;
    const retail = rates.retail;
    const subtotal = energy + capacity + network + retail;
    const kwtbb = (subtotal - retail) * 0.016;
    const total_bill = subtotal + kwtbb;

    return {
        total_usage: Number(total_usage.toFixed(2)),
        maximum_demand: Number(maximum_demand.toFixed(2)),
        energy_total: Number(energy.toFixed(2)),
        capacity_total: Number(capacity.toFixed(2)),
        network_total: Number(network.toFixed(2)),
        retail_total: Number(retail.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
        kwtbb: Number(kwtbb.toFixed(2)),
        total_bill: Number(total_bill.toFixed(2))
    };
}

function calculateNdMediumGeneralBill() {
    const totalUsage = parseFloat(document.getElementById("ndMediumGeneralUsageInput").value);
    const maxDemand = parseFloat(document.getElementById("ndMediumGeneralMaxDemandInput").value);
    const errorDiv = document.getElementById('ndMediumGeneralCalculateBillError');
    const outputDiv = document.getElementById('ndMediumGeneralBillOutput');

    errorDiv.textContent = '';
    outputDiv.classList.add('hidden');

    if (isNaN(totalUsage) || totalUsage < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Total Usage.';
        return;
    }
    if (isNaN(maxDemand) || maxDemand < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Maximum Demand.';
        return;
    }

    const result = calculate_bill_from_usage_nd_medium_general(totalUsage, maxDemand);

    document.getElementById('ndMediumGeneralOutputTotalUsage').textContent = result.total_usage.toFixed(2) + ' kWh';
    document.getElementById('ndMediumGeneralOutputMaxDemand').textContent = result.maximum_demand.toFixed(2) + ' kW';
    document.getElementById('ndMediumGeneralOutputEnergyTotal').textContent = 'RM ' + result.energy_total.toFixed(2);
    document.getElementById('ndMediumGeneralOutputCapacity').textContent = 'RM ' + result.capacity_total.toFixed(2);
    document.getElementById('ndMediumGeneralOutputNetwork').textContent = 'RM ' + result.network_total.toFixed(2);
    document.getElementById('ndMediumGeneralOutputRetail').textContent = 'RM ' + result.retail_total.toFixed(2);
    document.getElementById('ndMediumGeneralOutputSubtotal').textContent = 'RM ' + result.subtotal.toFixed(2);
    document.getElementById('ndMediumGeneralOutputKWTBB').textContent = 'RM ' + result.kwtbb.toFixed(2);
    document.getElementById('ndMediumGeneralOutputTotalBill').textContent = 'RM ' + result.total_bill.toFixed(2);

    outputDiv.classList.remove('hidden');
}

function reverse_tnb_nd_medium_general_bill(total_bill_input, maximum_demand, tolerance = 0.01, max_kwh = 10000000) {
    let low = 1.0, high = max_kwh * 1.0, guess = (low + high) / 2;
    let iterations = 0, max_iterations = 100;
    let best_guess = null, min_diff = Infinity;

    while (iterations < max_iterations) {
        const result = calculate_bill_from_usage_nd_medium_general(guess, maximum_demand);
        const calculated_bill = result.total_bill;
        const difference = calculated_bill - total_bill_input;

        if (Math.abs(difference) < min_diff) {
            min_diff = Math.abs(difference);
            best_guess = [guess, result];
        }

        if (Math.abs(difference) <= tolerance) {
            return {
                estimated_total_kwh: Number(guess.toFixed(2)),
                matched_total_bill: Number(calculated_bill.toFixed(2)),
                energy_total: result.energy_total,
                network_charge: result.network_total,
                capacity_charge: result.capacity_total,
                retail_charge: result.retail_total,
                kwtbb: result.kwtbb,
                subtotal: result.subtotal,
                iterations: iterations,
                status: 'matched_within_tolerance'
            };
        }

        if (calculated_bill < total_bill_input) {
            low = guess;
        } else {
            high = guess;
        }
        guess = (low + high) / 2;
        iterations += 1;
    }

    // Fine-tune scan ±2 kWh
    for (let x = -20; x <= 20; x++) {
        const adj = x / 10.0;
        const refined_kwh = best_guess[0] + adj;
        if (refined_kwh < 0) continue;
        const result = calculate_bill_from_usage_nd_medium_general(refined_kwh, maximum_demand);
        const calculated_bill = result.total_bill;
        const diff = Math.abs(calculated_bill - total_bill_input);
        if (diff <= tolerance) {
            return {
                estimated_total_kwh: Number(refined_kwh.toFixed(2)),
                matched_total_bill: Number(calculated_bill.toFixed(2)),
                energy_total: result.energy_total,
                network_charge: result.network_total,
                capacity_charge: result.capacity_total,
                retail_charge: result.retail_total,
                kwtbb: result.kwtbb,
                subtotal: result.subtotal,
                iterations: iterations,
                status: 'matched_in_fine_scan'
            };
        }
    }

    // Final fallback: return best guess even if not matched
    const best_kwh = Number(best_guess[0].toFixed(2));
    const best_result = best_guess[1];

    return {
        error: 'No match found within tolerance.',
        best_guess_kwh: best_kwh,
        best_matched_bill: best_result.total_bill,
        energy_total: best_result.energy_total,
        network_charge: best_result.network_total,
        capacity_charge: best_result.capacity_total,
        retail_charge: best_result.retail_total,
        kwtbb: best_result.kwtbb,
        subtotal: best_result.subtotal,
        difference: Number(Math.abs(best_result.total_bill - total_bill_input).toFixed(2)),
        iterations: iterations
    };
}

// --- Medium TOU ---
function calculate_bill_from_usage_nd_medium_TOU(total_usage, maximum_demand, peak_percent) {
    const rates = TNB_Non_Domestic_RATES.medium_TOU;
    const peak_usage = total_usage * (peak_percent / 100);
    const off_peak_usage = total_usage - peak_usage;

    const energy_peak = peak_usage * rates.peak;
    const energy_off_peak = off_peak_usage * rates.off_peak;
    const capacity = maximum_demand * rates.capacity;
    const network = maximum_demand * rates.network;
    const retail = rates.retail;
    const subtotal = energy_peak + energy_off_peak + capacity + network + retail;
    const kwtbb = (subtotal - retail) * 0.016;
    const total_bill = subtotal + kwtbb;

    return {
        total_usage: Number(total_usage.toFixed(2)),
        maximum_demand: Number(maximum_demand.toFixed(2)),
        peak_percent: Number(peak_percent.toFixed(2)),
        peak_usage_kwh: Number(peak_usage.toFixed(2)),
        off_peak_usage_kwh: Number(off_peak_usage.toFixed(2)),
        energy_peak_total: Number(energy_peak.toFixed(2)),
        energy_off_peak_total: Number(energy_off_peak.toFixed(2)),
        capacity_total: Number(capacity.toFixed(2)),
        network_total: Number(network.toFixed(2)),
        retail_total: Number(retail.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
        kwtbb: Number(kwtbb.toFixed(2)),
        total_bill: Number(total_bill.toFixed(2))
    };
}

function calculateNdMediumTouBill() {
    const totalUsage = parseFloat(document.getElementById("ndMediumTouUsageInput").value);
    const maxDemand = parseFloat(document.getElementById("ndMediumTouMaxDemandInput").value);
    const peakPercent = parseFloat(document.getElementById("ndMediumTouPeakPercent").value);
    const errorDiv = document.getElementById('ndMediumTouCalculateBillError');
    const outputDiv = document.getElementById('ndMediumTouBillOutput');

    errorDiv.textContent = '';
    outputDiv.classList.add('hidden');

    if (isNaN(totalUsage) || totalUsage < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Total Usage.';
        return;
    }
    if (isNaN(maxDemand) || maxDemand < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Maximum Demand.';
        return;
    }
    if (isNaN(peakPercent) || peakPercent < 0 || peakPercent > 100) {
        errorDiv.textContent = 'Please enter a valid percentage (0-100) for Peak Usage Percentage.';
        return;
    }
    if (totalUsage === 0) {
        errorDiv.textContent = 'Total Usage cannot be zero for a bill calculation.';
        return;
    }

    const result = calculate_bill_from_usage_nd_medium_TOU(totalUsage, maxDemand, peakPercent);

    document.getElementById('ndMediumTouOutputTotalUsage').textContent = result.total_usage.toFixed(2) + ' kWh';
    document.getElementById('ndMediumTouOutputMaxDemand').textContent = result.maximum_demand.toFixed(2) + ' kW';
    document.getElementById('ndMediumTouOutputPeakUsageKWH').textContent = result.peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('ndMediumTouOutputOffPeakUsageKWH').textContent = result.off_peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('ndMediumTouOutputPeakPercent').textContent = result.peak_percent.toFixed(2) + '%';
    document.getElementById('ndMediumTouOutputOffPeakPercent').textContent = (100 - result.peak_percent).toFixed(2) + '%';

    document.getElementById('ndMediumTouOutputPeakUsageKWH2').textContent = result.peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('ndMediumTouOutputEnergyPeakTotal').textContent = 'RM ' + result.energy_peak_total.toFixed(2);
    document.getElementById('ndMediumTouOutputOffPeakUsageKWH2').textContent = result.off_peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('ndMediumTouOutputEnergyOffPeakTotal').textContent = 'RM ' + result.energy_off_peak_total.toFixed(2);

    document.getElementById('ndMediumTouOutputCapacityTotal').textContent = 'RM ' + result.capacity_total.toFixed(2);
    document.getElementById('ndMediumTouOutputNetworkTotal').textContent = 'RM ' + result.network_total.toFixed(2);
    document.getElementById('ndMediumTouOutputRetailTotal').textContent = 'RM ' + result.retail_total.toFixed(2);
    document.getElementById('ndMediumTouOutputSubtotal').textContent = 'RM ' + result.subtotal.toFixed(2);
    document.getElementById('ndMediumTouOutputKWTBB').textContent = 'RM ' + result.kwtbb.toFixed(2);
    document.getElementById('ndMediumTouOutputTotalBill').textContent = 'RM ' + result.total_bill.toFixed(2);

    outputDiv.classList.remove('hidden');
}

function reverse_tnb_nd_medium_tou_bill(total_bill_input, maximum_demand, peak_percent, tolerance = 0.01, max_kwh = 10000000) {
    let low = 1.0, high = max_kwh * 1.0, guess = (low + high) / 2;
    let iterations = 0, max_iterations = 100;
    let best_guess = null, min_diff = Infinity;

    while (iterations < max_iterations) {
        const result = calculate_bill_from_usage_nd_medium_TOU(guess, maximum_demand, peak_percent);
        const calculated_bill = result.total_bill;
        const difference = calculated_bill - total_bill_input;

        if (Math.abs(difference) < min_diff) {
            min_diff = Math.abs(difference);
            best_guess = [guess, result];
        }

        if (Math.abs(difference) <= tolerance) {
            return {
                estimated_total_kwh: Number(guess.toFixed(2)),
                estimated_peak_kwh: Number(result.peak_usage_kwh.toFixed(2)),
                estimated_off_peak_kwh: Number(result.off_peak_usage_kwh.toFixed(2)),
                peak_percent: Number(peak_percent.toFixed(2)),
                off_peak_percent: Number((100 - peak_percent).toFixed(2)),
                matched_total_bill: Number(calculated_bill.toFixed(2)),
                kwtbb: result.kwtbb,
                retail_charge: result.retail_total,
                network_charge: result.network_total,
                capacity_charge: result.capacity_total,
                energy_peak_total: result.energy_peak_total,
                energy_off_peak_total: result.energy_off_peak_total,
                subtotal: result.subtotal,
                iterations: iterations,
                status: 'matched_within_tolerance'
            };
        }

        if (calculated_bill < total_bill_input) {
            low = guess;
        } else {
            high = guess;
        }
        guess = (low + high) / 2;
        iterations += 1;
    }

    // Fine-tune scan ±2 kWh
    for (let x = -20; x <= 20; x++) {
        const adj = x / 10.0;
        const refined_kwh = best_guess[0] + adj;
        if (refined_kwh < 0) continue;
        const result = calculate_bill_from_usage_nd_medium_TOU(refined_kwh, maximum_demand, peak_percent);
        const calculated_bill = result.total_bill;
        const diff = Math.abs(calculated_bill - total_bill_input);
        if (diff <= tolerance) {
            return {
                estimated_total_kwh: Number(refined_kwh.toFixed(2)),
                estimated_peak_kwh: Number(result.peak_usage_kwh.toFixed(2)),
                estimated_off_peak_kwh: Number(result.off_peak_usage_kwh.toFixed(2)),
                peak_percent: Number(peak_percent.toFixed(2)),
                off_peak_percent: Number((100 - peak_percent).toFixed(2)),
                matched_total_bill: Number(calculated_bill.toFixed(2)),
                kwtbb: result.kwtbb,
                retail_charge: result.retail_total,
                network_charge: result.network_total,
                capacity_charge: result.capacity_total,
                energy_peak_total: result.energy_peak_total,
                energy_off_peak_total: result.energy_off_peak_total,
                subtotal: result.subtotal,
                iterations: iterations,
                status: 'matched_in_fine_scan'
            };
        }
    }

    // Final fallback: return best guess even if not matched
    const best_kwh = Number(best_guess[0].toFixed(2));
    const best_result = best_guess[1];
    const best_peak_kwh = Math.ceil(best_kwh * (peak_percent / 100));
    const best_off_peak_kwh = Math.ceil(best_kwh - best_peak_kwh);

    return {
        error: 'No match found within tolerance.',
        best_guess_kwh: best_kwh,
        estimated_peak_kwh: best_peak_kwh,
        estimated_off_peak_kwh: best_off_peak_kwh,
        peak_percent: Number(peak_percent.toFixed(2)),
        off_peak_percent: Number((100 - peak_percent).toFixed(2)),
        best_matched_bill: best_result.total_bill,
        kwtbb: best_result.kwtbb,
        retail_charge: best_result.retail_total,
        network_charge: best_result.network_total,
        capacity_charge: best_result.capacity_total,
        energy_peak_total: best_result.energy_peak_total,
        energy_off_peak_total: best_result.energy_off_peak_total,
        subtotal: best_result.subtotal,
        difference: Number(Math.abs(best_result.total_bill - total_bill_input).toFixed(2)),
        iterations: iterations
    };
}

// --- High General ---
function calculate_bill_from_usage_nd_high_general(total_usage, maximum_demand = 0) {
    const rates = TNB_Non_Domestic_RATES.high_General;
    const energy = total_usage * rates.energy;
    const capacity = maximum_demand * rates.capacity;
    const network = maximum_demand * rates.network;
    const retail = rates.retail;
    const subtotal = energy + capacity + network + retail;
    const kwtbb = (subtotal - retail) * 0.016;
    const total_bill = subtotal + kwtbb;

    return {
        total_usage: Number(total_usage.toFixed(2)),
        maximum_demand: Number(maximum_demand.toFixed(2)),
        energy_total: Number(energy.toFixed(2)),
        capacity_total: Number(capacity.toFixed(2)),
        network_total: Number(network.toFixed(2)),
        retail_total: Number(retail.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
        kwtbb: Number(kwtbb.toFixed(2)),
        total_bill: Number(total_bill.toFixed(2))
    };
}

function calculateNdHighGeneralBill() {
    const totalUsage = parseFloat(document.getElementById("ndHighGeneralUsageInput").value);
    const maxDemand = parseFloat(document.getElementById("ndHighGeneralMaxDemandInput").value);
    const errorDiv = document.getElementById('ndHighGeneralCalculateBillError');
    const outputDiv = document.getElementById('ndHighGeneralBillOutput');

    errorDiv.textContent = '';
    outputDiv.classList.add('hidden');

    if (isNaN(totalUsage) || totalUsage < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Total Usage.';
        return;
    }
    if (isNaN(maxDemand) || maxDemand < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Maximum Demand.';
        return;
    }

    const result = calculate_bill_from_usage_nd_high_general(totalUsage, maxDemand);

    document.getElementById('ndHighGeneralOutputTotalUsage').textContent = result.total_usage.toFixed(2) + ' kWh';
    document.getElementById('ndHighGeneralOutputMaxDemand').textContent = result.maximum_demand.toFixed(2) + ' kW';
    document.getElementById('ndHighGeneralOutputEnergyTotal').textContent = 'RM ' + result.energy_total.toFixed(2);
    document.getElementById('ndHighGeneralOutputCapacity').textContent = 'RM ' + result.capacity_total.toFixed(2);
    document.getElementById('ndHighGeneralOutputNetwork').textContent = 'RM ' + result.network_total.toFixed(2);
    document.getElementById('ndHighGeneralOutputRetail').textContent = 'RM ' + result.retail_total.toFixed(2);
    document.getElementById('ndHighGeneralOutputSubtotal').textContent = 'RM ' + result.subtotal.toFixed(2);
    document.getElementById('ndHighGeneralOutputKWTBB').textContent = 'RM ' + result.kwtbb.toFixed(2);
    document.getElementById('ndHighGeneralOutputTotalBill').textContent = 'RM ' + result.total_bill.toFixed(2);

    outputDiv.classList.remove('hidden');
}

function reverse_tnb_nd_high_general_bill(total_bill_input, maximum_demand, tolerance = 0.01, max_kwh = 10000000) {
    let low = 1.0, high = max_kwh * 1.0, guess = (low + high) / 2;
    let iterations = 0, max_iterations = 100;
    let best_guess = null, min_diff = Infinity;

    while (iterations < max_iterations) {
        const result = calculate_bill_from_usage_nd_high_general(guess, maximum_demand);
        const calculated_bill = result.total_bill;
        const difference = calculated_bill - total_bill_input;

        if (Math.abs(difference) < min_diff) {
            min_diff = Math.abs(difference);
            best_guess = [guess, result];
        }

        if (Math.abs(difference) <= tolerance) {
            return {
                estimated_total_kwh: Number(guess.toFixed(2)),
                matched_total_bill: Number(calculated_bill.toFixed(2)),
                energy_total: result.energy_total,
                network_charge: result.network_total,
                capacity_charge: result.capacity_total,
                retail_charge: result.retail_total,
                kwtbb: result.kwtbb,
                subtotal: result.subtotal,
                iterations: iterations,
                status: 'matched_within_tolerance'
            };
        }

        if (calculated_bill < total_bill_input) {
            low = guess;
        } else {
            high = guess;
        }
        guess = (low + high) / 2;
        iterations += 1;
    }

    // Fine-tune scan ±2 kWh
    for (let x = -20; x <= 20; x++) {
        const adj = x / 10.0;
        const refined_kwh = best_guess[0] + adj;
        if (refined_kwh < 0) continue;
        const result = calculate_bill_from_usage_nd_high_general(refined_kwh, maximum_demand);
        const calculated_bill = result.total_bill;
        const diff = Math.abs(calculated_bill - total_bill_input);
        if (diff <= tolerance) {
            return {
                estimated_total_kwh: Number(refined_kwh.toFixed(2)),
                matched_total_bill: Number(calculated_bill.toFixed(2)),
                energy_total: result.energy_total,
                network_charge: result.network_total,
                capacity_charge: result.capacity_total,
                retail_charge: result.retail_total,
                kwtbb: result.kwtbb,
                subtotal: result.subtotal,
                iterations: iterations,
                status: 'matched_in_fine_scan'
            };
        }
    }

    // Final fallback: return best guess even if not matched
    const best_kwh = Number(best_guess[0].toFixed(2));
    const best_result = best_guess[1];

    return {
        error: 'No match found within tolerance.',
        best_guess_kwh: best_kwh,
        best_matched_bill: best_result.total_bill,
        energy_total: best_result.energy_total,
        network_charge: best_result.network_total,
        capacity_charge: best_result.capacity_total,
        retail_charge: best_result.retail_total,
        kwtbb: best_result.kwtbb,
        subtotal: best_result.subtotal,
        difference: Number(Math.abs(best_result.total_bill - total_bill_input).toFixed(2)),
        iterations: iterations
    };
}

// --- High TOU ---
function calculate_bill_from_usage_nd_high_TOU(total_usage, maximum_demand, peak_percent) {
    const rates = TNB_Non_Domestic_RATES.high_TOU;
    const peak_usage = total_usage * (peak_percent / 100);
    const off_peak_usage = total_usage - peak_usage;

    const energy_peak = peak_usage * rates.peak;
    const energy_off_peak = off_peak_usage * rates.off_peak;
    const capacity = maximum_demand * rates.capacity;
    const network = maximum_demand * rates.network;
    const retail = rates.retail;
    const subtotal = energy_peak + energy_off_peak + capacity + network + retail;
    const kwtbb = (subtotal - retail) * 0.016;
    const total_bill = subtotal + kwtbb;

    return {
        total_usage: Number(total_usage.toFixed(2)),
        maximum_demand: Number(maximum_demand.toFixed(2)),
        peak_percent: Number(peak_percent.toFixed(2)),
        peak_usage_kwh: Number(peak_usage.toFixed(2)),
        off_peak_usage_kwh: Number(off_peak_usage.toFixed(2)),
        energy_peak_total: Number(energy_peak.toFixed(2)),
        energy_off_peak_total: Number(energy_off_peak.toFixed(2)),
        capacity_total: Number(capacity.toFixed(2)),
        network_total: Number(network.toFixed(2)),
        retail_total: Number(retail.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
        kwtbb: Number(kwtbb.toFixed(2)),
        total_bill: Number(total_bill.toFixed(2))
    };
}

function calculateNdHighTouBill() {
    const totalUsage = parseFloat(document.getElementById("ndHighTouUsageInput").value);
    const maxDemand = parseFloat(document.getElementById("ndHighTouMaxDemandInput").value);
    const peakPercent = parseFloat(document.getElementById("ndHighTouPeakPercent").value);
    const errorDiv = document.getElementById('ndHighTouCalculateBillError');
    const outputDiv = document.getElementById('ndHighTouBillOutput');

    errorDiv.textContent = '';
    outputDiv.classList.add('hidden');

    if (isNaN(totalUsage) || totalUsage < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Total Usage.';
        return;
    }
    if (isNaN(maxDemand) || maxDemand < 0) {
        errorDiv.textContent = 'Please enter a valid positive number for Maximum Demand.';
        return;
    }
    if (isNaN(peakPercent) || peakPercent < 0 || peakPercent > 100) {
        errorDiv.textContent = 'Please enter a valid percentage (0-100) for Peak Usage Percentage.';
        return;
    }
    if (totalUsage === 0) {
        errorDiv.textContent = 'Total Usage cannot be zero for a bill calculation.';
        return;
    }

    const result = calculate_bill_from_usage_nd_high_TOU(totalUsage, maxDemand, peakPercent);

    document.getElementById('ndHighTouOutputTotalUsage').textContent = result.total_usage.toFixed(2) + ' kWh';
    document.getElementById('ndHighTouOutputMaxDemand').textContent = result.maximum_demand.toFixed(2) + ' kW';
    document.getElementById('ndHighTouOutputPeakUsageKWH').textContent = result.peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('ndHighTouOutputOffPeakUsageKWH').textContent = result.off_peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('ndHighTouOutputPeakPercent').textContent = result.peak_percent.toFixed(2) + '%';
    document.getElementById('ndHighTouOutputOffPeakPercent').textContent = (100 - result.peak_percent).toFixed(2) + '%';

    document.getElementById('ndHighTouOutputPeakUsageKWH2').textContent = result.peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('ndHighTouOutputEnergyPeakTotal').textContent = 'RM ' + result.energy_peak_total.toFixed(2);
    document.getElementById('ndHighTouOutputOffPeakUsageKWH2').textContent = result.off_peak_usage_kwh.toFixed(2) + ' kWh';
    document.getElementById('ndHighTouOutputEnergyOffPeakTotal').textContent = 'RM ' + result.energy_off_peak_total.toFixed(2);

    document.getElementById('ndHighTouOutputCapacityTotal').textContent = 'RM ' + result.capacity_total.toFixed(2);
    document.getElementById('ndHighTouOutputNetworkTotal').textContent = 'RM ' + result.network_total.toFixed(2);
    document.getElementById('ndHighTouOutputRetailTotal').textContent = 'RM ' + result.retail_total.toFixed(2);
    document.getElementById('ndHighTouOutputSubtotal').textContent = 'RM ' + result.subtotal.toFixed(2);
    document.getElementById('ndHighTouOutputKWTBB').textContent = 'RM ' + result.kwtbb.toFixed(2);
    document.getElementById('ndHighTouOutputTotalBill').textContent = 'RM ' + result.total_bill.toFixed(2);

    outputDiv.classList.remove('hidden');
}

function reverse_tnb_nd_high_tou_bill(total_bill_input, maximum_demand, peak_percent, tolerance = 0.01, max_kwh = 10000000) {
    let low = 1.0, high = max_kwh * 1.0, guess = (low + high) / 2;
    let iterations = 0, max_iterations = 100;
    let best_guess = null, min_diff = Infinity;

    while (iterations < max_iterations) {
        const result = calculate_bill_from_usage_nd_high_TOU(guess, maximum_demand, peak_percent);
        const calculated_bill = result.total_bill;
        const difference = calculated_bill - total_bill_input;

        if (Math.abs(difference) < min_diff) {
            min_diff = Math.abs(difference);
            best_guess = [guess, result];
        }

        if (Math.abs(difference) <= tolerance) {
            return {
                estimated_total_kwh: Number(guess.toFixed(2)),
                estimated_peak_kwh: Number(result.peak_usage_kwh.toFixed(2)),
                estimated_off_peak_kwh: Number(result.off_peak_usage_kwh.toFixed(2)),
                peak_percent: Number(peak_percent.toFixed(2)),
                off_peak_percent: Number((100 - peak_percent).toFixed(2)),
                matched_total_bill: Number(calculated_bill.toFixed(2)),
                kwtbb: result.kwtbb,
                retail_charge: result.retail_total,
                network_charge: result.network_total,
                capacity_charge: result.capacity_total,
                energy_peak_total: result.energy_peak_total,
                energy_off_peak_total: result.energy_off_peak_total,
                subtotal: result.subtotal,
                iterations: iterations,
                status: 'matched_within_tolerance'
            };
        }

        if (calculated_bill < total_bill_input) {
            low = guess;
        } else {
            high = guess;
        }
        guess = (low + high) / 2;
        iterations += 1;
    }

    // Fine-tune scan ±2 kWh
    for (let x = -20; x <= 20; x++) {
        const adj = x / 10.0;
        const refined_kwh = best_guess[0] + adj;
        if (refined_kwh < 0) continue;
        const result = calculate_bill_from_usage_nd_high_TOU(refined_kwh, maximum_demand, peak_percent);
        const calculated_bill = result.total_bill;
        const diff = Math.abs(calculated_bill - total_bill_input);
        if (diff <= tolerance) {
            return {
                estimated_total_kwh: Number(refined_kwh.toFixed(2)),
                estimated_peak_kwh: Number(result.peak_usage_kwh.toFixed(2)),
                estimated_off_peak_kwh: Number(result.off_peak_usage_kwh.toFixed(2)),
                peak_percent: Number(peak_percent.toFixed(2)),
                off_peak_percent: Number((100 - peak_percent).toFixed(2)),
                matched_total_bill: Number(calculated_bill.toFixed(2)),
                kwtbb: result.kwtbb,
                retail_charge: result.retail_total,
                network_charge: result.network_total,
                capacity_charge: result.capacity_total,
                energy_peak_total: result.energy_peak_total,
                energy_off_peak_total: result.energy_off_peak_total,
                subtotal: result.subtotal,
                iterations: iterations,
                status: 'matched_in_fine_scan'
            };
        }
    }

    // Final fallback: return best guess even if not matched
    const best_kwh = Number(best_guess[0].toFixed(2));
    const best_result = best_guess[1];
    const best_peak_kwh = Math.ceil(best_kwh * (peak_percent / 100));
    const best_off_peak_kwh = Math.ceil(best_kwh - best_peak_kwh);

    return {
        error: 'No match found within tolerance.',
        best_guess_kwh: best_kwh,
        estimated_peak_kwh: best_peak_kwh,
        estimated_off_peak_kwh: best_off_peak_kwh,
        peak_percent: Number(peak_percent.toFixed(2)),
        off_peak_percent: Number((100 - peak_percent).toFixed(2)),
        best_matched_bill: best_result.total_bill,
        kwtbb: best_result.kwtbb,
        retail_charge: best_result.retail_total,
        network_charge: best_result.network_total,
        capacity_charge: best_result.capacity_total,
        energy_peak_total: best_result.energy_peak_total,
        energy_off_peak_total: best_result.energy_off_peak_total,
        subtotal: best_result.subtotal,
        difference: Number(Math.abs(best_result.total_bill - total_bill_input).toFixed(2)),
        iterations: iterations
    };
}

/*
// Function to calculate monthly yield
function calculateMonthlyYield() {
    const solarSize = parseFloat(document.getElementById("solarSizeInput").value);
    const areaIdx = parseInt(document.getElementById("areaSelect").value);
    const angleIdx = parseInt(document.getElementById("angleSelect").value);

    const errorDiv = document.getElementById("monthlyYieldError");
    const outputDiv = document.getElementById("monthlyYieldOutput");

    errorDiv.textContent = "";
    outputDiv.textContent = "";

    if (isNaN(solarSize) || solarSize <= 0) {
        errorDiv.textContent = "Please enter a valid solar system size (kW).";
        return;
    }

    const selectedArea = areas[areaIdx];
    const selectedAngle = angles[angleIdx];
    const rate = rateTable[selectedArea][angleIdx];

    const monthlyYield = solarSize * rate;

    outputDiv.innerHTML = `
                <strong>Selected Area:</strong> ${selectedArea}<br>
                <strong>Selected Roof Angle:</strong> ${selectedAngle}<br>
                <strong>Rate:</strong> ${rate}<br>
                <strong>Estimated Monthly Yield:</strong> ${monthlyYield.toFixed(2)} kWh
            `;
}
*/

/*
// Function to calculate monthly yield and compare with actual yield
function calculateMonthlyYield() {
    const solarSize = parseFloat(document.getElementById("solarSizeInput").value);
    const actualYield = parseFloat(document.getElementById("actualYieldInput").value);
    const areaIdx = parseInt(document.getElementById("areaSelect").value);
    const angleIdx = parseInt(document.getElementById("angleSelect").value);

    const errorDiv = document.getElementById("monthlyYieldError");
    const outputDiv = document.getElementById("monthlyYieldOutput");

    errorDiv.textContent = "";
    outputDiv.textContent = "";

    if (isNaN(solarSize) || solarSize <= 0) {
        errorDiv.textContent = "Please enter a valid solar system size (kW).";
        return;
    }

    if (isNaN(actualYield) || actualYield < 0) {
        errorDiv.textContent = "Please enter a valid actual yield (kWh).";
        return;
    }

    const selectedArea = areas[areaIdx];
    const selectedAngle = angles[angleIdx];
    const rate = rateTable[selectedArea][angleIdx];

    const estimatedYield = solarSize * rate;
    const performanceDiff = 100 - (((estimatedYield - actualYield) / estimatedYield) * 100);

    outputDiv.innerHTML = `
        <strong>Selected Area:</strong> ${selectedArea}<br>
        <strong>Selected Roof Angle:</strong> ${selectedAngle}<br>
        <strong>Rate:</strong> ${rate}<br>
        <strong>Estimated Monthly Yield:</strong> ${estimatedYield.toFixed(2)} kWh<br>
        <strong>Actual Monthly Yield:</strong> ${actualYield.toFixed(2)} kWh<br>
        <strong>Performance:</strong> ${performanceDiff.toFixed(2)}%
    `;
}
*/


function calculateMonthlyYield() {
    const solarSize = parseFloat(document.getElementById("solarSizeInput").value);
    const actualYield = parseFloat(document.getElementById("actualYieldInput").value);
    const areaIdx = parseInt(document.getElementById("areaSelect").value);
    const angleIdx = parseInt(document.getElementById("angleSelect").value);

    const errorDiv = document.getElementById("monthlyYieldError");
    const outputDiv = document.getElementById("monthlyYieldOutput");

    errorDiv.textContent = "";
    outputDiv.textContent = "";

    if (isNaN(solarSize) || solarSize <= 0) {
        errorDiv.textContent = "Please enter a valid solar system size (kW).";
        return;
    }

    if (isNaN(actualYield) || actualYield < 0) {
        errorDiv.textContent = "Please enter a valid actual yield (kWh).";
        return;
    }

    const selectedArea = areas[areaIdx];
    const selectedAngle = angles[angleIdx];
    const rate = rateTable[selectedArea][angleIdx];

    const estimatedYield = solarSize * rate;
    const performanceDiff = 100 - (((estimatedYield - actualYield) / estimatedYield) * 100);

    // Determine performance rating
    let rating = "";
    let description = "";

    if (performanceDiff >= 80) {
        rating = "🌞 Excellent";
        description = "System is running optimally";
    } else if (performanceDiff >= 70) {
        rating = "✅ Good";
        description = "The performance is good";
    } else if (performanceDiff >= 50) {
        rating = "⚠️ Fair";
        description = "May indicate inefficiencies, fair performance";
    } else {
        rating = "🚨 Attention Needed";
        description = "System underperforming — please contact us for assistance";
    }

    outputDiv.innerHTML = `
        <strong>Selected Area:</strong> ${selectedArea}<br>
        <strong>Selected Roof Angle:</strong> ${selectedAngle}<br>
        <strong>Rate:</strong> ${rate}<br>
        <strong>Estimated Monthly Yield:</strong> ${estimatedYield.toFixed(2)} kWh<br>
        <strong>Actual Monthly Yield:</strong> ${actualYield.toFixed(2)} kWh<br>
        <strong>Performance:</strong> ${performanceDiff.toFixed(2)}%<br><br>

        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: left;">
            <thead style="background-color: #f2f2f2;">
                <tr>
                    <th>Performance (%)</th>
                    <th>Rating</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                <tr style="${performanceDiff >= 80 ? 'background-color: #8dccf7ff;' : ''}">
                    <td>80% and above</td>
                    <td>🌞 Excellent</td>
                    <td>System is running optimally</td>
                </tr>
                <tr style="${performanceDiff >= 70 && performanceDiff < 80 ? 'background-color: #b4c8e7ff;' : ''}">
                    <td>70% - 79%</td>
                    <td>✅ Good</td>
                    <td>The performance is good</td> 
                </tr>
                <tr style="${performanceDiff >= 50 && performanceDiff < 70 ? 'background-color: #a9eefdff;' : ''}">
                    <td>50% - 69%</td>
                    <td>⚠️ Fair</td>
                    <td>May indicate inefficiencies, fair performance</td> 
                </tr>
                <tr style="${performanceDiff < 50 ? 'background-color: #ff1327ff;' : ''}">
                    <td>Below 50%</td>
                    <td>🚨 Attention Needed</td>
                    <td>System underperforming — please contact us for assistance</td> 
                </tr>
            </tbody>
        </table>
    `;
}


function updateAngleOptions() {
    const areaSelect = document.getElementById("areaSelect");
    const angleSelect = document.getElementById("angleSelect");
    const isJB = areaSelect.value === "0";

    // Reset all angle options
    for (let i = 0; i < angleSelect.options.length; i++) {
        angleSelect.options[i].disabled = false;
        angleSelect.options[i].style.display = "block"; // Show all
    }

    // If JB is selected, hide the 5°-15° option
    if (isJB) {
        angleSelect.options[0].style.display = "none"; // Hide 5°-15°
        // If currently selected value is 5°-15°, switch to next available
        if (angleSelect.value === "0") {
            angleSelect.value = "1";
        }
    }
}


// Attach the event listener after DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("areaSelect").addEventListener("change", updateAngleOptions);
    updateAngleOptions(); // Run once on load
});

// Function to toggle sections based on select list
function toggleSections() {
    const calculationType = document.getElementById('calculationType').value;

    // Hide all output sections
    document.querySelectorAll('.output-section').forEach(el => el.classList.add('hidden'));

    // Hide all errors (optional, but recommended)
    document.querySelectorAll('.error').forEach(el => el.textContent = '');

    // ToU sections
    const calculateBillSectionToU = document.getElementById('calculateBillSection');
    const estimateUsageSectionToU = document.getElementById('estimateUsageSection');
    const billOutputToU = document.getElementById('billOutput');
    const usageOutputToU = document.getElementById('usageOutput');
    const calculateBillErrorToU = document.getElementById('calculateBillError');
    const estimateUsageErrorToU = document.getElementById('estimateUsageError');

    // General Tariff sections
    const generalTariffCalculateBillSection = document.getElementById('generalTariffCalculateBillSection');
    const generalTariffEstimateUsageSection = document.getElementById('generalTariffEstimateUsageSection');
    const generalBillOutput = document.getElementById('generalBillOutput');
    const generalUsageOutput = document.getElementById('generalUsageOutput');
    const generalCalculateBillError = document.getElementById('generalCalculateBillError');
    const generalEstimateUsageError = document.getElementById('generalEstimateUsageError');

    // Non Domestic sections (add these to your HTML)
    const ndLowGeneralSection = document.getElementById('ndLowGeneralSection');
    const ndLowTouSection = document.getElementById('ndLowTouSection');
    const ndMediumGeneralSection = document.getElementById('ndMediumGeneralSection');
    const ndMediumTouSection = document.getElementById('ndMediumTouSection');
    const ndHighGeneralSection = document.getElementById('ndHighGeneralSection');
    const ndHighTouSection = document.getElementById('ndHighTouSection');

    // Hide all sections and clear errors first
    calculateBillSectionToU?.classList.add('hidden');
    estimateUsageSectionToU?.classList.add('hidden');
    billOutputToU?.classList.add('hidden');
    usageOutputToU?.classList.add('hidden');
    if (calculateBillErrorToU) calculateBillErrorToU.textContent = '';
    if (estimateUsageErrorToU) estimateUsageErrorToU.textContent = '';

    generalTariffCalculateBillSection?.classList.add('hidden');
    generalTariffEstimateUsageSection?.classList.add('hidden');
    generalBillOutput?.classList.add('hidden');
    generalUsageOutput?.classList.add('hidden');
    if (generalCalculateBillError) generalCalculateBillError.textContent = '';
    if (generalEstimateUsageError) generalEstimateUsageError.textContent = '';

    ndLowGeneralSection?.classList.add('hidden');
    ndLowTouSection?.classList.add('hidden');
    ndMediumGeneralSection?.classList.add('hidden');
    ndMediumTouSection?.classList.add('hidden');
    ndHighGeneralSection?.classList.add('hidden');
    ndHighTouSection?.classList.add('hidden');

    // Show the selected section
    if (calculationType === 'calculate_bill_tou') {
        calculateBillSectionToU?.classList.remove('hidden');
    } else if (calculationType === 'estimate_usage_tou') {
        estimateUsageSectionToU?.classList.remove('hidden');
    } else if (calculationType === 'calculate_bill_general') {
        generalTariffCalculateBillSection?.classList.remove('hidden');
    } else if (calculationType === 'estimate_usage_general') {
        generalTariffEstimateUsageSection?.classList.remove('hidden');
    } else if (calculationType === 'calculate_bill_nd_low_general') {
        ndLowGeneralSection?.classList.remove('hidden');
    } else if (calculationType === 'calculate_bill_nd_low_tou') {
        ndLowTouSection?.classList.remove('hidden');
    } else if (calculationType === 'calculate_bill_nd_medium_general') {
        ndMediumGeneralSection?.classList.remove('hidden');
    } else if (calculationType === 'calculate_bill_nd_medium_tou') {
        ndMediumTouSection?.classList.remove('hidden');
    } else if (calculationType === 'calculate_bill_nd_high_general') {
        ndHighGeneralSection?.classList.remove('hidden');
    } else if (calculationType === 'calculate_bill_nd_high_tou') {
        ndHighTouSection?.classList.remove('hidden');
    }
}

// Initialize the view when the page loads
document.addEventListener('DOMContentLoaded', toggleSections);
