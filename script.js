document.addEventListener('DOMContentLoaded', () => {
    // Lawyer Stop Time Inputs
    const lawyerHoursInput = document.getElementById('lawyer-hours');
    const lawyerMinutesInput = document.getElementById('lawyer-minutes');

    // Output Elements
    const totalObstacleTimeElem = document.getElementById('total-obstacle-time');
    const prosecutorDateElem = document.getElementById('prosecutor-date');
    const prosecutorTimeElem = document.getElementById('prosecutor-time');
    const courtDateElem = document.getElementById('court-date');
    const courtTimeElem = document.getElementById('court-time');
    const resultCards = document.querySelectorAll('.result-card');

    const btnClear = document.getElementById('btn-clear');
    const btnCalculate = document.getElementById('btn-calculate');

    // Utility to get Date object from separated inputs
    function getDateFromInputs(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const monthInput = container.querySelector('.dt-month');
        const dayInput = container.querySelector('.dt-day');
        const hourInput = container.querySelector('.dt-hour');
        const minuteInput = container.querySelector('.dt-minute');

        if (!monthInput.value || !dayInput.value || !hourInput.value || !minuteInput.value) {
            return null;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = parseInt(monthInput.value, 10) - 1; // JS months are 0-11
        const day = parseInt(dayInput.value, 10);
        const hour = parseInt(hourInput.value, 10);
        const minute = parseInt(minuteInput.value, 10);

        const date = new Date(year, month, day, hour, minute);
        return isNaN(date.getTime()) ? null : date;
    }

    // Set default value for a container
    function setDefaultDate(containerId, dateObj) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.querySelector('.dt-month').value = String(dateObj.getMonth() + 1).padStart(2, '0');
        container.querySelector('.dt-day').value = String(dateObj.getDate()).padStart(2, '0');
        container.querySelector('.dt-hour').value = String(dateObj.getHours()).padStart(2, '0');
        container.querySelector('.dt-minute').value = String(dateObj.getMinutes()).padStart(2, '0');
    }

    function initializeDefaults() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        setDefaultDate('arrest-time', now);
        setDefaultDate('night-stop-time', now);
        setDefaultDate('sunrise-time', tomorrow);
        setDefaultDate('departure-time', now);
        setDefaultDate('arrival-time', now);
    }

    // Utility to populate select options
    function populateTimeSelect(selects, min, max) {
        selects.forEach(select => {
            if (!select) return;
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = '--';
            select.appendChild(defaultOpt);

            for (let i = min; i <= max; i++) {
                const opt = document.createElement('option');
                const val = String(i).padStart(2, '0');
                opt.value = val;
                opt.textContent = val;
                select.appendChild(opt);
            }
        });
    }

    populateTimeSelect(document.querySelectorAll('.dt-hour'), 0, 23);
    populateTimeSelect(document.querySelectorAll('.dt-minute'), 0, 59);
    populateTimeSelect([document.getElementById('lawyer-hours')], 0, 24);
    populateTimeSelect([document.getElementById('lawyer-minutes')], 0, 59);

    // Set defaults on load
    initializeDefaults();

    // Add event listeners
    const dtInputs = document.querySelectorAll('.dt-input');
    dtInputs.forEach(input => {
        input.addEventListener('input', calculateResults);
        input.addEventListener('change', calculateResults);

        // Auto padding zeroes on blur for neatness (optional)
        input.addEventListener('blur', (e) => {
            if (e.target.value && e.target.value.length === 1) {
                e.target.value = e.target.value.padStart(2, '0');
            }
        });
    });

    [lawyerHoursInput, lawyerMinutesInput].forEach(input => {
        if (input) {
            input.addEventListener('input', calculateResults);
            input.addEventListener('change', calculateResults);
        }
    });

    if (btnCalculate) {
        btnCalculate.addEventListener('click', calculateResults);
    }

    btnClear.addEventListener('click', () => {
        dtInputs.forEach(input => input.value = '');
        [lawyerHoursInput, lawyerMinutesInput].forEach(input => {
            if (input) input.value = '';
        });
        resetResults();

        // Reset defaults
        initializeDefaults();
        calculateResults();
    });

    function updateDurationLabel(labelId, diffMs) {
        const labelElem = document.getElementById(labelId);
        if (labelElem) {
            if (diffMs <= 0 || isNaN(diffMs)) {
                labelElem.textContent = '(使用時間：0 小時 0 分鐘)';
            } else {
                const totalMinutes = Math.floor(diffMs / 60000);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;

                let text = [];
                if (hours > 0) text.push(`${hours} 小時`);
                if (minutes > 0) text.push(`${minutes} 分鐘`);
                labelElem.textContent = `(使用時間：${text.join(' ')})`;
            }
        }
    }

    function calculateResults() {
        const arrestTime = getDateFromInputs('arrest-time');

        if (!arrestTime) {
            resetResults();
            return;
        }

        let totalObstacleMs = 0;

        // 1. Night Stop Time calculation
        let nightMs = 0;
        const nightTime = getDateFromInputs('night-stop-time');
        const sunTime = getDateFromInputs('sunrise-time');
        if (nightTime && sunTime) {
            nightMs = sunTime.getTime() - nightTime.getTime();
            if (nightMs > 0) {
                totalObstacleMs += nightMs;
            } else {
                nightMs = 0;
            }
        }
        updateDurationLabel('night-stop-duration', nightMs);

        // 2. Transport calculation
        let transMs = 0;
        const depTime = getDateFromInputs('departure-time');
        const arrTime = getDateFromInputs('arrival-time');
        if (depTime && arrTime) {
            transMs = arrTime.getTime() - depTime.getTime();
            if (transMs > 0) {
                totalObstacleMs += transMs;
            } else {
                transMs = 0;
            }
        }
        updateDurationLabel('transport-duration', transMs);

        // 3. Lawyer Stop Time calculation
        let lawyerH = parseInt(lawyerHoursInput.value, 10) || 0;
        let lawyerM = parseInt(lawyerMinutesInput.value, 10) || 0;
        if (lawyerH > 0 || lawyerM > 0) {
            totalObstacleMs += (lawyerH * 3600000) + (lawyerM * 60000);
        }

        // Display total obstacle time
        displayObstacleTime(totalObstacleMs);

        // Calculate deadlines
        const ms16H = 16 * 3600000;
        const ms24H = 24 * 3600000;

        const prosecutorTime = new Date(arrestTime.getTime() + ms16H + totalObstacleMs);
        const courtTime = new Date(arrestTime.getTime() + ms24H + totalObstacleMs);

        // Format and display
        displayDateTime(prosecutorTime, prosecutorDateElem, prosecutorTimeElem);
        displayDateTime(courtTime, courtDateElem, courtTimeElem);

        // Add glow effect
        resultCards.forEach(card => card.classList.add('glow'));
    }

    function displayObstacleTime(ms) {
        if (ms === 0) {
            totalObstacleTimeElem.textContent = '0 小時 0 分鐘';
            return;
        }

        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        let text = [];
        if (hours > 0) text.push(`${hours} 小時`);
        if (minutes > 0) text.push(`${minutes} 分鐘`);

        totalObstacleTimeElem.textContent = text.join(' ');
    }

    function displayDateTime(dateObj, dateElem, timeElem) {
        // Date format: YYYY/MM/DD
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        dateElem.textContent = `${year}/${month}/${day}`;

        // Time format: HH:mm
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        timeElem.textContent = `${hours}:${minutes}`;
    }

    function resetResults() {
        totalObstacleTimeElem.textContent = '0 小時 0 分鐘';
        prosecutorDateElem.textContent = '--/--/----';
        prosecutorTimeElem.textContent = '--:--';
        courtDateElem.textContent = '--/--/----';
        courtTimeElem.textContent = '--:--';
        resultCards.forEach(card => card.classList.remove('glow'));
    }

    // Auto-fetch sunrise time
    const citySelect = document.getElementById('city-select');
    const btnFetchSunrise = document.getElementById('btn-fetch-sunrise');

    if (citySelect && btnFetchSunrise) {
        citySelect.addEventListener('change', () => {
            if (citySelect.value) {
                btnFetchSunrise.style.display = 'flex';
                const sunriseMonth = document.querySelector('#sunrise-time .dt-month').value;
                const sunriseDay = document.querySelector('#sunrise-time .dt-day').value;
                if (sunriseMonth && sunriseDay) {
                    btnFetchSunrise.click();
                }
            } else {
                btnFetchSunrise.style.display = 'none';
            }
        });

        document.querySelector('#sunrise-time .dt-month').addEventListener('change', () => {
            if (citySelect.value) btnFetchSunrise.click();
        });
        document.querySelector('#sunrise-time .dt-day').addEventListener('change', () => {
            if (citySelect.value) btnFetchSunrise.click();
        });

        btnFetchSunrise.addEventListener('click', async (e) => {
            e.preventDefault();
            const coords = citySelect.value;
            if (!coords) return;

            const sunriseContainer = document.getElementById('sunrise-time');
            const monthVal = sunriseContainer.querySelector('.dt-month').value;
            const dayVal = sunriseContainer.querySelector('.dt-day').value;

            if (!monthVal || !dayVal) return;

            const now = new Date();
            const year = now.getFullYear();
            const monthStr = String(monthVal).padStart(2, '0');
            const dayStr = String(dayVal).padStart(2, '0');
            const dateStr = `${year}-${monthStr}-${dayStr}`;

            const [lat, lng] = coords.split(',');

            const originalText = btnFetchSunrise.textContent;
            btnFetchSunrise.textContent = '抓取中...';
            btnFetchSunrise.disabled = true;

            try {
                const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateStr}&formatted=0`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.status === 'OK') {
                    const sunriseDate = new Date(data.results.sunrise);
                    const hour = String(sunriseDate.getHours()).padStart(2, '0');
                    const minute = String(sunriseDate.getMinutes()).padStart(2, '0');

                    sunriseContainer.querySelector('.dt-hour').value = hour;
                    sunriseContainer.querySelector('.dt-minute').value = minute;
                    calculateResults();

                    btnFetchSunrise.textContent = '✅ 已填入';
                    setTimeout(() => {
                        if (btnFetchSunrise.textContent === '✅ 已填入') btnFetchSunrise.textContent = originalText;
                    }, 2500);
                }
            } catch (error) {
                console.error(error);
                btnFetchSunrise.textContent = '❌ 失敗';
                setTimeout(() => {
                    if (btnFetchSunrise.textContent === '❌ 失敗') btnFetchSunrise.textContent = originalText;
                }, 2000);
            } finally {
                btnFetchSunrise.disabled = false;
            }
        });
    }

    // Initial calculate trigger to set initial empty states if needed
    resetResults();
    calculateResults(); // Calculate immediately for the default arrest time
});
