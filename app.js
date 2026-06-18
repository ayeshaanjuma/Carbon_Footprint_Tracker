document.addEventListener('DOMContentLoaded', () => {
    // --- DEFAULT STATE ---
    const defaultState = {
        driving: 150,
        flights: 2,
        meat: 5,
        foodWaste: 1, // 0 = Low, 1 = Med, 2 = High
        electricity: 250,
        heating: 'gas', // gas, electric, oil, biomass
        completedChallenges: [], // Array of string IDs: 'category-id'
        streak: 3,
        longestStreak: 7,
        totalCompleted: 12,
        
        // Progress goals
        weeklyTarget: 50,
        history: [], // array of { date: string, co2: number, score: number }

        // Gamification
        xp: 0,
        unlockedBadges: [] // array of string IDs
    };

    let state = { ...defaultState };

    // --- DOM CACHE ---
    const dom = {
        sliders: {
            driving: document.getElementById('slider-driving'),
            flights: document.getElementById('slider-flights'),
            meat: document.getElementById('slider-meat'),
            foodWaste: document.getElementById('slider-foodwaste'),
            electricity: document.getElementById('slider-electricity'),
            heating: document.getElementById('select-heating'),
            target: document.getElementById('slider-target')
        },
        displays: {
            valDriving: document.getElementById('val-driving'),
            valFlights: document.getElementById('val-flights'),
            valMeat: document.getElementById('val-meat'),
            valFoodWasteLabel: document.getElementById('val-foodwaste-label'),
            valElectricity: document.getElementById('val-electricity'),
            valTarget: document.getElementById('val-target'),
            
            impactDriving: document.getElementById('impact-driving'),
            impactFlights: document.getElementById('impact-flights'),
            impactMeat: document.getElementById('impact-meat'),
            impactFoodWaste: document.getElementById('impact-foodwaste'),
            impactElectricity: document.getElementById('impact-electricity'),
            impactHeating: document.getElementById('impact-heating'),
            
            weeklyCo2: document.getElementById('weekly-co2-val'),
            carbonScore: document.getElementById('carbon-score-val'),
            scoreStatusText: document.getElementById('score-status-text'),
            scoreCard: document.getElementById('score-card'),
            scoreIconWrapper: document.getElementById('score-icon-wrapper'),
            
            insightWeekly: document.getElementById('insight-weekly-val'),
            insightAnnual: document.getElementById('insight-annual-val'),
            insightScore: document.getElementById('insight-score-val'),
            insightTrees: document.getElementById('insight-trees-val'),
            
            donutTotal: document.getElementById('donut-total'),
            legendTransport: document.getElementById('legend-transport'),
            legendDiet: document.getElementById('legend-diet'),
            legendEnergy: document.getElementById('legend-energy'),
            
            compValYou: document.getElementById('comp-val-you'),
            compBarYou: document.getElementById('comp-bar-you'),
            
            actionsContainer: document.getElementById('actions-container'),
            challengesContainer: document.getElementById('challenges-container'),
            
            currStreak: document.getElementById('curr-streak'),
            maxStreak: document.getElementById('max-streak'),
            totalCompleted: document.getElementById('total-completed'),
            
            // Goals and progress indicators
            goalStatusText: document.getElementById('goal-status-text'),
            goalProgressBar: document.getElementById('goal-progress-bar'),
            statSavedCo2: document.getElementById('stat-saved-co2'),
            statSavedMoney: document.getElementById('stat-saved-money'),
            statSavedEnergy: document.getElementById('stat-saved-energy'),
            statImprovementPct: document.getElementById('stat-improvement-pct'),
            lastLogTime: document.getElementById('last-log-time'),

            // Carbon budget elements
            budgetProgressBar: document.getElementById('budget-progress-bar'),
            budgetStatusText: document.getElementById('budget-status-text'),
            budgetCard: document.getElementById('budget-card'),

            // Gamification Levels & Badges DOM elements
            levelName: document.getElementById('lbl-level-name'),
            levelXpText: document.getElementById('lbl-level-xp'),
            levelProgressBar: document.getElementById('level-progress-bar'),
            badgesGridList: document.getElementById('badges-grid-list'),

            // GPS and OCR elements
            gpsStatus: document.getElementById('gps-status'),
            ocrStatusBox: document.getElementById('ocr-status-box'),
            ocrStatusText: document.getElementById('ocr-status-text'),

            // Leaderboard
            leaderboardList: document.getElementById('leaderboard-list'),

            // Modal elements
            modalValCo2: document.getElementById('modal-val-co2'),
            modalValStreak: document.getElementById('modal-val-streak'),
            modalBadgesBanner: document.getElementById('modal-badges-banner'),
            modalBadgesGrid: document.getElementById('modal-badges-grid')
        },
        buttons: {
            generatePlan: document.getElementById('btn-generate-plan'),
            askCoach: document.getElementById('btn-ask-coach'),
            logWeek: document.getElementById('btn-log-week'),
            resetHistory: document.getElementById('btn-reset-history'),
            closeModal: document.getElementById('btn-close-modal'),
            gpsTransit: document.getElementById('btn-gps-transit'),
            billScan: document.getElementById('btn-bill-scan')
        },
        coach: {
            askInput: document.getElementById('coach-ask-input'),
            responseBox: document.getElementById('coach-response'),
            responseText: document.getElementById('coach-response-text')
        },
        chart: {
            svg: document.getElementById('trend-chart'),
            area: document.getElementById('chart-area'),
            line: document.getElementById('chart-line'),
            dots: document.getElementById('chart-dots'),
            grid: document.getElementById('chart-grid-lines'),
            emptyMsg: document.getElementById('chart-empty-msg')
        },
        inputs: {
            billUpload: document.getElementById('bill-upload')
        },
        modalOverlay: document.getElementById('summary-modal'),
        accordionTriggers: document.querySelectorAll('.accordion-trigger'),
        streakDays: document.querySelectorAll('.streak-day')
    };

    // --- LOCAL STORAGE HANDLING ---
    const STORAGE_KEY = 'carbon_footprint_tracker_state';

    function loadState() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                state = { ...defaultState, ...parsed };
            }
        } catch (e) {
            console.error('Failed to load state from localStorage', e);
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save state to localStorage', e);
        }
    }

    // --- ACCORDION INTERACTION ---
    dom.accordionTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const item = trigger.closest('.accordion-item');
            const isExpanded = item.classList.contains('expanded');
            
            // Close other items
            document.querySelectorAll('.accordion-item').forEach(otherItem => {
                otherItem.classList.remove('expanded');
                otherItem.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
            });

            if (!isExpanded) {
                item.classList.add('expanded');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // --- CENTRALIZED ESTIMATION FORMULA ---
    const CO2_FACTORS = {
        driving: 0.17,
        flights: 500 / 52,
        meatMeal: 2.5,
        foodWaste: [2.0, 5.0, 10.0],
        electricity: 0.85 / 4.33,
        heating: {
            gas: 15.0,
            electric: 5.0,
            oil: 25.0,
            biomass: 1.0
        }
    };

    function calculateImpacts() {
        const transport = (state.driving * CO2_FACTORS.driving) + (state.flights * CO2_FACTORS.flights);
        const diet = (state.meat * CO2_FACTORS.meatMeal) + CO2_FACTORS.foodWaste[state.foodWaste];
        const energy = (state.electricity * CO2_FACTORS.electricity) + CO2_FACTORS.heating[state.heating];
        const total = transport + diet + energy;

        const score = Math.max(0, Math.min(100, Math.round(100 - total * 0.6)));

        return {
            transport: Number(transport.toFixed(1)),
            diet: Number(diet.toFixed(1)),
            energy: Number(energy.toFixed(1)),
            total: Number(total.toFixed(1)),
            score: score
        };
    }

    // --- RENDER SCHEDULER (60FPS - requestAnimationFrame) ---
    let renderRequested = false;

    function requestRender() {
        if (!renderRequested) {
            renderRequested = true;
            window.requestAnimationFrame(performRender);
        }
    }

    function performRender() {
        renderRequested = false;
        
        // 1. Centralized math output
        const impacts = calculateImpacts();
        
        // 2. Sync input labels and positions
        dom.displays.valDriving.textContent = state.driving;
        dom.displays.valFlights.textContent = state.flights;
        dom.displays.valMeat.textContent = state.meat;
        dom.displays.valTarget.textContent = state.weeklyTarget;
        
        const wasteLabels = ['Low', 'Medium', 'High'];
        dom.displays.valFoodWasteLabel.textContent = wasteLabels[state.foodWaste];
        dom.displays.valElectricity.textContent = state.electricity;

        // Set inputs values to match state
        dom.sliders.driving.value = state.driving;
        dom.sliders.flights.value = state.flights;
        dom.sliders.meat.value = state.meat;
        dom.sliders.foodWaste.value = state.foodWaste;
        dom.sliders.electricity.value = state.electricity;
        dom.sliders.heating.value = state.heating;
        dom.sliders.target.value = state.weeklyTarget;

        // 3. Update specific calculations displays
        dom.displays.impactDriving.textContent = `${(state.driving * CO2_FACTORS.driving).toFixed(1)} kg CO₂e`;
        dom.displays.impactFlights.textContent = `${(state.flights * CO2_FACTORS.flights).toFixed(1)} kg CO₂e`;
        dom.displays.impactMeat.textContent = `${(state.meat * CO2_FACTORS.meatMeal).toFixed(1)} kg CO₂e`;
        dom.displays.impactFoodWaste.textContent = `${(CO2_FACTORS.foodWaste[state.foodWaste]).toFixed(1)} kg CO₂e`;
        dom.displays.impactElectricity.textContent = `${(state.electricity * CO2_FACTORS.electricity).toFixed(1)} kg CO₂e`;
        dom.displays.impactHeating.textContent = `${(CO2_FACTORS.heating[state.heating]).toFixed(1)} kg CO₂e`;

        // 4. Update Summary Cards
        dom.displays.weeklyCo2.textContent = impacts.total.toFixed(1);
        dom.displays.carbonScore.textContent = impacts.score;

        dom.displays.scoreCard.className = 'summary-card glass-card';
        if (impacts.score >= 70) {
            dom.displays.scoreStatusText.textContent = 'Low';
            dom.displays.scoreStatusText.className = 'score-status score-green';
        } else if (impacts.score >= 40) {
            dom.displays.scoreStatusText.textContent = 'Moderate';
            dom.displays.scoreStatusText.className = 'score-status score-yellow';
        } else {
            dom.displays.scoreStatusText.textContent = 'High';
            dom.displays.scoreStatusText.className = 'score-status score-red';
        }

        // 5. Update Detailed Insights
        dom.displays.insightWeekly.textContent = `${impacts.total.toFixed(1)} kg`;
        const annualCo2 = (impacts.total * 52) / 1000;
        dom.displays.insightAnnual.textContent = `${annualCo2.toFixed(1)} t`;
        dom.displays.insightScore.textContent = impacts.score;
        dom.displays.insightTrees.textContent = Math.round((impacts.total * 52) / 22);

        // 6. SVG Donut calculation
        const circumference = 2 * Math.PI * 40; // ~251.32
        const transPercent = impacts.total > 0 ? (impacts.transport / impacts.total) : 0;
        const dietPercent = impacts.total > 0 ? (impacts.diet / impacts.total) : 0;
        const energyPercent = impacts.total > 0 ? (impacts.energy / impacts.total) : 0;

        const transDash = transPercent * circumference;
        const dietDash = dietPercent * circumference;
        const energyDash = energyPercent * circumference;

        const segmentTrans = document.querySelector('.donut-segment-transport');
        const segmentDiet = document.querySelector('.donut-segment-diet');
        const segmentEnergy = document.querySelector('.donut-segment-energy');

        if (segmentTrans && segmentDiet && segmentEnergy) {
            segmentTrans.setAttribute('stroke-dasharray', `${transDash} ${circumference}`);
            segmentTrans.setAttribute('stroke-dashoffset', '0');

            segmentDiet.setAttribute('stroke-dasharray', `${dietDash} ${circumference}`);
            segmentDiet.setAttribute('stroke-dashoffset', `${-transDash}`);

            segmentEnergy.setAttribute('stroke-dasharray', `${energyDash} ${circumference}`);
            segmentEnergy.setAttribute('stroke-dashoffset', `${-(transDash + dietDash)}`);
        }

        dom.displays.donutTotal.textContent = Math.round(impacts.total);
        dom.displays.legendTransport.textContent = `${Math.round(transPercent * 100)}%`;
        dom.displays.legendDiet.textContent = `${Math.round(dietPercent * 100)}%`;
        dom.displays.legendEnergy.textContent = `${Math.round(energyPercent * 100)}%`;

        // 7. Comparison Bars and Accessibility Attributes
        dom.displays.compValYou.textContent = `${impacts.total.toFixed(1)} kg`;
        const youPercent = Math.min(100, (impacts.total / 120) * 100);
        dom.displays.compBarYou.style.width = `${youPercent}%`;
        dom.displays.compBarYou.setAttribute('aria-valuenow', Math.round(impacts.total));

        // 8. Streak values and Indicators
        const completedCount = state.completedChallenges.length;
        const finalCompleted = state.totalCompleted + completedCount;
        dom.displays.totalCompleted.textContent = finalCompleted;

        const dynamicStreak = state.streak + completedCount;
        dom.displays.currStreak.textContent = `${dynamicStreak} days`;
        dom.displays.maxStreak.textContent = `${Math.max(state.longestStreak, dynamicStreak)} days`;

        dom.streakDays.forEach((day, index) => {
            if (index < dynamicStreak) {
                day.classList.add('completed');
            } else {
                day.classList.remove('completed');
            }
        });

        // 9. Sync Checkbox DOM states
        dom.challengeCheckboxes = document.querySelectorAll('.challenge-checkbox');
        dom.challengeCheckboxes.forEach(checkbox => {
            const challengeId = checkbox.getAttribute('data-key');
            checkbox.checked = state.completedChallenges.includes(challengeId);
            
            const card = checkbox.closest('.challenge-card');
            if (checkbox.checked) {
                card.classList.add('completed-state');
            } else {
                card.classList.remove('completed-state');
            }
        });

        // 10. Goals Status & Progress Cards
        let goalProgressPct = 0;
        if (impacts.total <= state.weeklyTarget) {
            dom.displays.goalStatusText.textContent = 'Met Target';
            dom.displays.goalStatusText.className = 'goal-status-badge score-green';
            goalProgressPct = 100;
        } else {
            const diff = impacts.total - state.weeklyTarget;
            if (diff <= state.weeklyTarget * 0.25) {
                dom.displays.goalStatusText.textContent = 'Near Goal';
                dom.displays.goalStatusText.className = 'goal-status-badge score-yellow';
            } else {
                dom.displays.goalStatusText.textContent = 'Above Target';
                dom.displays.goalStatusText.className = 'goal-status-badge score-red';
            }
            goalProgressPct = Math.max(5, Math.round((state.weeklyTarget / impacts.total) * 100));
        }
        dom.displays.goalProgressBar.style.width = `${goalProgressPct}%`;
        dom.displays.goalProgressBar.setAttribute('aria-valuenow', goalProgressPct);

        // 11. Carbon Budget Dashboard
        const monthlyAllowance = 200; // kg CO₂e allowance per month
        const currentMonthlyFootprint = impacts.total * 4.33; // 4.33 weeks per month
        const remainingBudget = monthlyAllowance - currentMonthlyFootprint;

        let budgetProgress = Math.min(100, Math.round((currentMonthlyFootprint / monthlyAllowance) * 100));
        dom.displays.budgetProgressBar.style.width = `${budgetProgress}%`;
        dom.displays.budgetProgressBar.setAttribute('aria-valuenow', budgetProgress);

        if (remainingBudget >= 0) {
            dom.displays.budgetStatusText.textContent = `${Math.round(remainingBudget)} kg left`;
            dom.displays.budgetStatusText.className = 'goal-status-badge score-green';
            dom.displays.budgetCard.style.boxShadow = 'none';
        } else {
            dom.displays.budgetStatusText.textContent = `${Math.round(Math.abs(remainingBudget))} kg OVER`;
            dom.displays.budgetStatusText.className = 'goal-status-badge score-red';
            // Trigger red pulsing warning
            dom.displays.budgetCard.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.2)';
        }

        // 12. Calculate Historical stats and Savings dashboard
        calculateHistoricalStats(impacts.total);

        // 13. Render Trend Graph
        renderTrendChart();

        // 14. Gamification Levels Progression
        const level = Math.floor(state.xp / 200) + 1;
        const xpInLevel = state.xp % 200;
        const xpPercent = (xpInLevel / 200) * 100;

        const titles = ["Eco Starter", "Green Advocate", "Carbon Warrior", "Eco Hero", "Earth Champion"];
        const currentTitle = titles[Math.min(level - 1, titles.length - 1)];

        dom.displays.levelName.textContent = `Level ${level}: ${currentTitle}`;
        dom.displays.levelXpText.textContent = `${xpInLevel} / 200 XP`;
        dom.displays.levelProgressBar.style.width = `${xpPercent}%`;
        dom.displays.levelProgressBar.setAttribute('aria-valuenow', Math.round(xpPercent));

        // 15. Dynamic Challenge updates & binding based on highest emissions
        updateDynamicChallenges(impacts.transport, impacts.diet, impacts.energy);

        // 16. Evaluate Achievement badge unlocks
        evaluateBadges(dynamicStreak);

        // 17. Community Leaderboard sorting
        updateLeaderboard(impacts.score);

        // 18. Actions & recommendations (AI personalized engine)
        updateRecommendations();
        
        // Save current parameters to LocalStorage
        saveState();
    }

    // --- COMPREHENSIVE SAVINGS DASHBOARD ---
    function calculateHistoricalStats(currentWeeklyCo2) {
        // Fallback default baseline calculations if no history recorded yet
        const firstCo2 = state.history && state.history.length > 0 ? state.history[0].co2 : 110; 
        
        let totalCo2Saved = 0;
        if (state.history && state.history.length > 0) {
            state.history.forEach(log => {
                totalCo2Saved += Math.max(0, firstCo2 - log.co2);
            });
        } else {
            // Simulated baseline comparison for savings dashboard
            totalCo2Saved = Math.max(0, firstCo2 - currentWeeklyCo2);
        }

        // Money Saved: $0.15 saved per km reduced from baseline of 250km, and $0.12 per kWh saved from baseline of 350kWh
        const drivingSaved = Math.max(0, 250 - state.driving);
        const energySavedKwh = Math.max(0, 350 - state.electricity);
        const moneySavedVal = (drivingSaved * 0.15) + (energySavedKwh * 0.12);

        // Energy Saved (in kWh equivalent)
        const drivingSavedEnergyKwh = drivingSaved * 0.8; // 1km ~0.8kWh equivalent
        const totalEnergySaved = energySavedKwh + drivingSavedEnergyKwh;

        // Trees equivalent
        const treesRequired = Math.round(totalCo2Saved / 22);

        dom.displays.statSavedCo2.textContent = `${totalCo2Saved.toFixed(1)} kg`;
        dom.displays.statSavedMoney.textContent = `$${moneySavedVal.toFixed(2)}`;
        dom.displays.statSavedEnergy.textContent = `${totalEnergySaved.toFixed(1)} kWh`;
        dom.displays.statImprovementPct.textContent = treesRequired; // Used as trees indicator

        if (state.history && state.history.length > 0) {
            dom.displays.lastLogTime.textContent = `Last entry: ${state.history[state.history.length - 1].date}`;
        } else {
            dom.displays.lastLogTime.textContent = '';
        }
    }

    // --- RENDER TREND CHART (SVG) ---
    function renderTrendChart() {
        const history = state.history || [];
        
        if (history.length === 0) {
            dom.chart.emptyMsg.classList.remove('hidden');
            dom.chart.line.setAttribute('d', '');
            dom.chart.area.setAttribute('d', 'M 0 200 L 500 200 Z');
            dom.chart.dots.innerHTML = '';
            dom.chart.grid.innerHTML = '';
            return;
        }

        dom.chart.emptyMsg.classList.add('hidden');

        const pointsCount = history.length;
        const width = 500;
        const height = 200;
        const paddingLeft = 35;
        const paddingRight = 35;
        const paddingTop = 30;
        const paddingBottom = 40;

        const maxCo2 = Math.max(...history.map(h => h.co2), state.weeklyTarget, 80);
        const minCo2 = Math.max(0, Math.min(...history.map(h => h.co2), state.weeklyTarget) - 10);
        const co2Range = maxCo2 - minCo2 || 20;

        const coords = [];
        history.forEach((log, index) => {
            let x = 250;
            if (pointsCount > 1) {
                x = paddingLeft + (index / (pointsCount - 1)) * (width - paddingLeft - paddingRight);
            }
            const y = height - paddingBottom - ((log.co2 - minCo2) / co2Range) * (height - paddingTop - paddingBottom);
            coords.push({ x, y, val: log.co2, date: log.date });
        });

        let gridLinesHtml = '';
        const targetY = height - paddingBottom - ((state.weeklyTarget - minCo2) / co2Range) * (height - paddingTop - paddingBottom);
        if (targetY >= paddingTop && targetY <= (height - paddingBottom)) {
            gridLinesHtml += `
                <line x1="0" y1="${targetY}" x2="${width}" y2="${targetY}" stroke="rgba(245, 158, 11, 0.4)" stroke-dasharray="4 4" stroke-width="1.5"></line>
                <text x="5" y="${targetY - 5}" fill="rgba(245, 158, 11, 0.8)" font-size="9">Target (${state.weeklyTarget} kg)</text>
            `;
        }
        dom.chart.grid.innerHTML = gridLinesHtml;

        let linePath = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 1; i < coords.length; i++) {
            linePath += ` L ${coords[i].x} ${coords[i].y}`;
        }
        dom.chart.line.setAttribute('d', linePath);

        const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - paddingBottom} L ${coords[0].x} ${height - paddingBottom} Z`;
        dom.chart.area.setAttribute('d', areaPath);

        let dotsHtml = '';
        coords.forEach((c) => {
            dotsHtml += `
                <circle cx="${c.x}" cy="${c.y}" r="5" fill="var(--accent-green)" stroke="#070d0a" stroke-width="2.5"></circle>
                <text x="${c.x}" y="${c.y - 10}" fill="var(--text-primary)" font-size="10" font-weight="700" text-anchor="middle">${c.val.toFixed(0)}</text>
                <text x="${c.x}" y="${height - 15}" fill="var(--text-muted)" font-size="9" text-anchor="middle">${c.date}</text>
            `;
        });
        dom.chart.dots.innerHTML = dotsHtml;
    }

    // --- DYNAMIC CHALLENGES ---
    const challengeTemplates = {
        transport: [
            { id: 1, icon: '🚶', title: 'Walk or Cycle Short Trips', desc: 'Leave the car keys behind for trips under 2km.' },
            { id: 2, icon: '🚍', title: 'Transit Commute Route', desc: 'Choose a bus or train line for today\'s commute.' },
            { id: 3, icon: '📦', title: 'Consolidate Travel Errands', desc: 'Bundle multiple travel runs into a single optimized path.' },
            { id: 4, icon: '🚗', title: 'Maintain Eco Highway Speeds', desc: 'Drive at continuous speeds to optimize mileage.' }
        ],
        diet: [
            { id: 1, icon: '🥗', title: 'Plant-Based Dinners', desc: 'Cook a protein-rich plant dinner (beans, tofu, or grains).' },
            { id: 2, icon: '🍎', title: 'Sustain Local Farm Stands', desc: 'Purchase regional or seasonal organic produce items.' },
            { id: 3, icon: '🍲', title: 'Prep Portion Leftovers', desc: 'Organize dynamic portions to clear all kitchen waste.' },
            { id: 4, icon: '🥤', title: 'Reject Disposable Wrap', desc: 'Swap plastic food wrap for wax wraps or glass boxes.' }
        ],
        energy: [
            { id: 1, icon: '🔌', title: 'Vampire Standby Shutdown', desc: 'De-energize standby wall plugs and chargers not in active use.' },
            { id: 2, icon: '🌡️', title: 'Thermostat Setback', desc: 'Lower heater or raise AC parameters by 1-2 degrees Celsius.' },
            { id: 3, icon: '🧺', title: 'Air Dry Wardrobes', desc: 'Use line dry racks instead of high consumption dryers.' },
            { id: 4, icon: '💡', title: 'LED Transition Check', desc: 'Audit switches and convert remaining bulbs to high-efficiency LEDs.' }
        ]
    };

    function updateDynamicChallenges(transportVal, dietVal, energyVal) {
        let highestCategory = 'transport';
        let maxVal = transportVal;

        if (dietVal > maxVal) {
            highestCategory = 'diet';
            maxVal = dietVal;
        }
        if (energyVal > maxVal) {
            highestCategory = 'energy';
            maxVal = energyVal;
        }

        const attrCategory = dom.displays.challengesContainer.getAttribute('data-category');
        if (attrCategory !== highestCategory) {
            dom.displays.challengesContainer.setAttribute('data-category', highestCategory);
            dom.displays.challengesContainer.innerHTML = '';

            const list = challengeTemplates[highestCategory];
            list.forEach(c => {
                const uniqueKey = `${highestCategory}-${c.id}`;
                const isChecked = state.completedChallenges.includes(uniqueKey);
                
                const card = document.createElement('div');
                card.className = 'challenge-card';
                card.id = `dyn-challenge-${uniqueKey}`;
                card.innerHTML = `
                    <label class="challenge-label">
                        <input type="checkbox" class="challenge-checkbox" data-key="${uniqueKey}" ${isChecked ? 'checked' : ''}>
                        <span class="checkbox-custom"></span>
                        <div class="challenge-content">
                            <span class="challenge-icon" aria-hidden="true">${c.icon}</span>
                            <div class="challenge-text">
                                <h4>${c.title}</h4>
                                <p>${c.desc}</p>
                            </div>
                        </div>
                    </label>
                `;
                dom.displays.challengesContainer.appendChild(card);
            });

            bindChallengeCheckboxes();
        }
    }

    function bindChallengeCheckboxes() {
        const checkboxes = dom.displays.challengesContainer.querySelectorAll('.challenge-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const key = e.target.getAttribute('data-key');
                const card = e.target.closest('.challenge-card');

                if (e.target.checked) {
                    card.classList.add('completed-flash');
                    if (!state.completedChallenges.includes(key)) {
                        state.completedChallenges.push(key);
                        state.xp += 50;
                    }
                    createConfetti(card);
                    setTimeout(() => card.classList.remove('completed-flash'), 500);
                } else {
                    state.completedChallenges = state.completedChallenges.filter(id => id !== key);
                    state.xp = Math.max(0, state.xp - 50);
                }

                requestRender();
            });
        });
    }

    // --- CELEBRATION CONFETTI MAKER ---
    function createConfetti(element) {
        const colors = ['#4ade80', '#38bdf8', '#fbbf24', '#f43f5e', '#a855f7'];

        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'confetti';
            
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 5 + 4;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.background = randomColor;
            
            particle.style.left = `50%`;
            particle.style.top = `50%`;

            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 80 + 40;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            particle.style.setProperty('--x', `${x}px`);
            particle.style.setProperty('--y', `${y}px`);

            element.appendChild(particle);

            setTimeout(() => particle.remove(), 800);
        }
    }

    // --- EVALUATE BADGES ---
    const badgeDefs = [
        { id: 'eco-starter', el: document.getElementById('badge-eco-starter'), icon: '🌱', label: 'Eco Starter' },
        { id: 'transit-hero', el: document.getElementById('badge-transit-hero'), icon: '🚲', label: 'Transit Hero' },
        { id: 'veggie-master', el: document.getElementById('badge-veggie-master'), icon: '🥗', label: 'Veggie Master' },
        { id: 'power-saver', el: document.getElementById('badge-power-saver'), icon: '🔌', label: 'Power Saver' },
        { id: 'streak-master', el: document.getElementById('badge-streak-master'), icon: '🔥', label: 'Streak Master' }
    ];

    function evaluateBadges(currentStreak) {
        const newlyUnlocked = [];

        badgeDefs.forEach(badge => {
            let unlocked = false;

            if (badge.id === 'eco-starter') {
                unlocked = state.history.length > 0;
            } else if (badge.id === 'transit-hero') {
                unlocked = state.driving < 50;
            } else if (badge.id === 'veggie-master') {
                unlocked = state.meat === 0;
            } else if (badge.id === 'power-saver') {
                unlocked = state.electricity < 150;
            } else if (badge.id === 'streak-master') {
                unlocked = currentStreak >= 5;
            }

            if (unlocked) {
                if (!state.unlockedBadges.includes(badge.id)) {
                    state.unlockedBadges.push(badge.id);
                    newlyUnlocked.push(badge);
                }
                if (badge.el) {
                    badge.el.classList.remove('locked');
                }
            } else {
                if (badge.el) {
                    badge.el.classList.add('locked');
                }
            }
        });

        return newlyUnlocked;
    }

    // --- LEADERBOARD ---
    const leaderboardBaseline = [
        { name: "Aarav Gupta", score: 94 },
        { name: "Priya Sharma", score: 85 },
        { name: "Kabir Mehta", score: 71 },
        { name: "Ananya Roy", score: 55 }
    ];

    function updateLeaderboard(userScore) {
        const combined = [...leaderboardBaseline, { name: "You", score: userScore }];
        
        // Sort descending by score
        combined.sort((a, b) => b.score - a.score);

        dom.displays.leaderboardList.innerHTML = '';
        combined.forEach((player, index) => {
            const isUser = player.name === "You";
            const row = document.createElement('div');
            row.className = `leaderboard-row ${isUser ? 'user-highlight' : ''}`;
            row.innerHTML = `
                <div class="leaderboard-rank-name">
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <span class="leaderboard-name">${player.name}</span>
                </div>
                <span class="leaderboard-score">${player.score} pts</span>
            `;
            dom.displays.leaderboardList.appendChild(row);
        });
    }

    // --- GPS TRANSIT LOCATOR ---
    dom.buttons.gpsTransit.addEventListener('click', () => {
        dom.displays.gpsStatus.classList.remove('hidden');
        dom.displays.gpsStatus.innerHTML = `
            <div class="text-secondary" style="font-size: 0.85rem; text-align: center; width: 100%;">
                <span class="scanner-laser-line" style="position: static; display: inline-block; width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--accent-green); border-top-color: transparent; animation: ocrScan 1s linear infinite;"></span>
                <span>Accessing GPS location coordinates...</span>
            </div>
        `;

        const renderSuggestions = (lat, lon) => {
            // Proximity calculation based on dummy offset values
            const metroDist = Math.round((Math.sin(lat) + 1) * 350 + 150);
            const busDist = Math.round((Math.cos(lon) + 1) * 120 + 80);
            const cycleDist = Math.round((Math.sin(lat + lon) + 1) * 250 + 100);

            dom.displays.gpsStatus.innerHTML = `
                <div class="gps-route-item">
                    <div class="gps-route-icon" aria-hidden="true">🚇</div>
                    <div class="gps-route-info">
                        <span class="gps-route-name">Metro Station (${metroDist}m away)</span>
                        <span class="gps-route-desc">Green Line • Rapid Transit Corridor</span>
                    </div>
                    <span class="gps-route-saving">-9.2 kg CO₂/commute</span>
                </div>
                <div class="gps-route-item">
                    <div class="gps-route-icon" aria-hidden="true">🚍</div>
                    <div class="gps-route-info">
                        <span class="gps-route-name">Bus Route 42 (${busDist}m away)</span>
                        <span class="gps-route-desc">Express Link to Downtown Terminal</span>
                    </div>
                    <span class="gps-route-saving">-5.5 kg CO₂/commute</span>
                </div>
                <div class="gps-route-item">
                    <div class="gps-route-icon" aria-hidden="true">🚲</div>
                    <div class="gps-route-info">
                        <span class="gps-route-name">Dedicated Bike Path (${cycleDist}m away)</span>
                        <span class="gps-route-desc">Safe Cycling Expressway Grid</span>
                    </div>
                    <span class="gps-route-saving">-12.0 kg CO₂/commute</span>
                </div>
            `;
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setTimeout(() => renderSuggestions(pos.coords.latitude, pos.coords.longitude), 1000);
                },
                (err) => {
                    // Fallback to coordinates mock if permission denied/fails
                    setTimeout(() => renderSuggestions(12.97, 77.59), 1000);
                }
            );
        } else {
            setTimeout(() => renderSuggestions(12.97, 77.59), 1000);
        }
    });

    // --- OCR BILL SCANNER ---
    dom.buttons.billScan.addEventListener('click', () => {
        dom.inputs.billUpload.click();
    });

    dom.inputs.billUpload.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;

        dom.displays.ocrStatusBox.classList.remove('hidden');
        dom.displays.ocrStatusText.textContent = "Uploading image...";

        setTimeout(() => {
            dom.displays.ocrStatusText.textContent = "Running OCR scan line checks...";
            setTimeout(() => {
                dom.displays.ocrStatusText.textContent = "Extracting energy data values...";
                setTimeout(() => {
                    // Extracted dynamic value simulated
                    const randomKwh = Math.floor(Math.random() * 200) + 160; // 160 to 360 kWh
                    state.electricity = randomKwh;
                    
                    dom.displays.ocrStatusText.textContent = `Success! Detected: ${randomKwh} kWh/month`;
                    requestRender();
                    
                    setTimeout(() => {
                        dom.displays.ocrStatusBox.classList.add('hidden');
                        dom.inputs.billUpload.value = ''; // clear input
                    }, 2000);
                }, 1000);
            }, 1000);
        }, 1000);
    });

    // --- RECOMMENDATIONS ---
    function updateRecommendations() {
        const list = [];

        // 1. Walk or Bike short trips
        if (state.driving > 30) {
            const savingsVal = Math.round(state.driving * 0.17 * 52 * 0.3);
            list.push({
                icon: '🚲',
                title: 'Walk or Bike Short Trips',
                desc: `Replacing 30% of your current ${state.driving} km/week driving with walking or cycling offsets fuel consumption directly.`,
                savings: savingsVal,
                priority: getPriority(savingsVal)
            });
        }

        // 2. Carpooling and Commuter sharing
        if (state.driving > 80) {
            const savingsVal = Math.round(state.driving * 0.17 * 52 * 0.4);
            list.push({
                icon: '🚍',
                title: 'Transit & Carpooling Commutes',
                desc: `Sharing rides or shifting 40% of your commutes to transit routes divides your high vehicle footprint.`,
                savings: savingsVal,
                priority: getPriority(savingsVal)
            });
        }

        // 3. Flight offsetting or avoidance
        if (state.flights > 0) {
            const savingsVal = Math.round(state.flights * 500 * 0.3);
            list.push({
                icon: '✈️',
                title: 'Flight Offsetting & Reduction',
                desc: `Your annual count of ${state.flights} flights is highly carbon intensive. Offsetting or swapping to high-speed rail cuts this.`,
                savings: savingsVal,
                priority: getPriority(savingsVal)
            });
        }

        // 4. Plant based dietary transition
        if (state.meat > 2) {
            const savingsVal = Math.round(state.meat * 2.5 * 52 * 0.5);
            list.push({
                icon: '🥗',
                title: 'Increase Plant-Based Meals',
                desc: `Transitioning half of your ${state.meat} meat meals per week to nutritious plant sources cuts agricultural emissions.`,
                savings: savingsVal,
                priority: getPriority(savingsVal)
            });
        }

        // 5. Zero Food Waste
        if (state.foodWaste >= 1) {
            const wasteCo2 = CO2_FACTORS.foodWaste[state.foodWaste];
            const savingsVal = Math.round(wasteCo2 * 52 * 0.6);
            const levelStr = state.foodWaste === 1 ? 'Medium' : 'High';
            list.push({
                icon: '🗑️',
                title: 'Minimize Organic Food Waste',
                desc: `Improving your ${levelStr} waste level via composting and meal planning stops landfills from generating methane.`,
                savings: savingsVal,
                priority: getPriority(savingsVal)
            });
        }

        // 6. Electricity optimization
        if (state.electricity > 100) {
            const savingsVal = Math.round(state.electricity * (0.85 / 4.33) * 52 * 0.15);
            list.push({
                icon: '💡',
                title: 'Energy Efficient LED & Smart Plugs',
                desc: `Reducing your electricity consumption of ${state.electricity} kWh/month by 15% drops your energy grid load.`,
                savings: savingsVal,
                priority: getPriority(savingsVal)
            });
        }

        // 7. Heating system upgrades
        if (state.heating !== 'biomass') {
            const heatingCo2 = CO2_FACTORS.heating[state.heating];
            const biomassCo2 = CO2_FACTORS.heating.biomass;
            const savingsVal = Math.round((heatingCo2 - biomassCo2) * 52 * 0.5);
            const heatLabels = { gas: 'Natural Gas', electric: 'Electric', oil: 'Heating Oil' };
            list.push({
                icon: '🌡️',
                title: 'Upgrade Heating Systems',
                desc: `Upgrading your current ${heatLabels[state.heating] || state.heating} heater to highly efficient solar thermal or biomass saves half.`,
                savings: savingsVal,
                priority: getPriority(savingsVal)
            });
        }

        function getPriority(val) {
            if (val >= 400) return 'High';
            if (val >= 150) return 'Medium';
            return 'Low';
        }

        list.sort((a, b) => b.savings - a.savings);

        const topActions = list.slice(0, 4);
        dom.displays.actionsContainer.innerHTML = '';
        
        if (topActions.length === 0) {
            dom.displays.actionsContainer.innerHTML = `
                <div class="action-card" style="grid-column: 1 / -1; justify-content: center; text-align: center;">
                    <div class="action-info">
                        <span class="action-title">✨ Excellent Footprint Status!</span>
                        <p class="action-desc">Your habits are already highly optimized. Keep up the clean green living!</p>
                    </div>
                </div>
            `;
            return;
        }

        topActions.forEach(action => {
            const priorityClass = `badge-${action.priority.toLowerCase()}`;
            const card = document.createElement('div');
            card.className = 'action-card';
            card.innerHTML = `
                <div class="action-icon-wrapper" aria-hidden="true">${action.icon}</div>
                <div class="action-info">
                    <div class="action-header">
                        <span class="action-title">${action.title}</span>
                        <span class="priority-badge ${priorityClass}">${action.priority}</span>
                    </div>
                    <p class="action-desc">${action.desc}</p>
                    <span class="action-savings">Est. Savings: ${action.savings} kg CO₂e/yr</span>
                </div>
            `;
            dom.displays.actionsContainer.appendChild(card);
        });
    }

    // --- LOG CURRENT WEEK ACTION & SHOW SUMMARY MODAL ---
    dom.buttons.logWeek.addEventListener('click', () => {
        const impacts = calculateImpacts();
        const now = new Date();
        const dateStr = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        if (!state.history) {
            state.history = [];
        }

        state.history.push({
            date: dateStr,
            co2: impacts.total,
            score: impacts.score
        });

        if (state.history.length > 10) {
            state.history.shift();
        }

        state.xp += 100;

        const currentStreak = state.streak + state.completedChallenges.length;
        const newlyUnlocked = evaluateBadges(currentStreak);

        dom.displays.modalValCo2.textContent = impacts.total.toFixed(1);
        dom.displays.modalValStreak.textContent = `${currentStreak} days`;

        dom.displays.modalBadgesGrid.innerHTML = '';
        if (newlyUnlocked.length > 0) {
            dom.displays.modalBadgesBanner.classList.remove('hidden');
            newlyUnlocked.forEach(badge => {
                const item = document.createElement('div');
                item.className = 'badge-item';
                item.innerHTML = `
                    <span class="badge-icon">${badge.icon}</span>
                    <span class="badge-label">${badge.label}</span>
                `;
                dom.displays.modalBadgesGrid.appendChild(item);
            });
        } else {
            dom.displays.modalBadgesBanner.classList.add('hidden');
        }

        dom.modalOverlay.classList.remove('hidden');
        requestRender();
    });

    dom.buttons.closeModal.addEventListener('click', () => {
        dom.modalOverlay.classList.add('hidden');
    });

    dom.buttons.resetHistory.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset your logged progress history and gamification XP?')) {
            state.history = [];
            state.xp = 0;
            state.unlockedBadges = [];
            state.completedChallenges = [];
            requestRender();
        }
    });

    // --- SLIDERS EVENT LISTENERS ---
    dom.sliders.driving.addEventListener('input', (e) => {
        state.driving = Number(e.target.value);
        requestRender();
    });

    dom.sliders.flights.addEventListener('input', (e) => {
        state.flights = Number(e.target.value);
        requestRender();
    });

    dom.sliders.meat.addEventListener('input', (e) => {
        state.meat = Number(e.target.value);
        requestRender();
    });

    dom.sliders.foodWaste.addEventListener('input', (e) => {
        state.foodWaste = Number(e.target.value);
        requestRender();
    });

    dom.sliders.electricity.addEventListener('input', (e) => {
        state.electricity = Number(e.target.value);
        requestRender();
    });

    dom.sliders.heating.addEventListener('change', (e) => {
        state.heating = e.target.value;
        requestRender();
    });

    dom.sliders.target.addEventListener('input', (e) => {
        state.weeklyTarget = Number(e.target.value);
        requestRender();
    });

    // --- AI COACH TYPING SIMULATOR ---
    function typeEffect(element, text, speed = 12) {
        element.textContent = '';
        let i = 0;
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        type();
    }

    dom.buttons.generatePlan.addEventListener('click', () => {
        dom.coach.responseBox.classList.remove('hidden');
        
        const impacts = calculateImpacts();
        let primaryFocus = 'Transportation';
        let topAdvice = 'Transition driving segments into commuter options or use active transit corridors.';
        
        if (impacts.diet > impacts.transport && impacts.diet > impacts.energy) {
            primaryFocus = 'Dietary Choices';
            topAdvice = 'Try scaling down meat meal counts and emphasizing local, seasonal vegetable selections.';
        } else if (impacts.energy > impacts.transport && impacts.energy > impacts.diet) {
            primaryFocus = 'Home Energy Systems';
            topAdvice = 'Introduce intelligent outlets to manage standby vampire draws and optimize heating types.';
        }

        const adviceText = `🌿 PERSONAL ECO ACTION PLAN
        
        Leverage Area: ${primaryFocus}
        Weekly Emissions: ${impacts.total} kg CO₂e
        Carbon Score: ${impacts.score}/100
        
        Recommended Plan:
        1. Action Plan: ${topAdvice}
        2. Offset target: offset ${Math.round((impacts.total * 52) / 22)} trees per year.
        3. Weekly habits: Keep challenges completed to retain your green streak!`;

        typeEffect(dom.coach.responseText, adviceText);
    });

    dom.buttons.askCoach.addEventListener('click', () => {
        const query = dom.coach.askInput.value.trim();
        if (!query) return;

        dom.coach.responseBox.classList.remove('hidden');
        const impacts = calculateImpacts();
        let reply = '';
        const lowercase = query.toLowerCase();

        if (lowercase.includes('electric') || lowercase.includes('energy') || lowercase.includes('heating')) {
            reply = `💡 ENERGY COACH ANSWER:
            Your home energy uses ${state.electricity} kWh/month. Setting smart temperature levels and replacing older bulbs with LEDs can reduce usage by up to 15%.`;
        } else if (lowercase.includes('diet') || lowercase.includes('meat') || lowercase.includes('meals')) {
            reply = `🥗 DIET COACH ANSWER:
            With ${state.meat} meat meals per week, swap two meals for legume or grain proteins to lower diet emissions by up to 20%.`;
        } else if (lowercase.includes('drive') || lowercase.includes('distance') || lowercase.includes('transport')) {
            reply = `🚗 TRANSPORT COACH ANSWER:
            Driving ${state.driving} km/week emits ${(state.driving * CO2_FACTORS.driving).toFixed(1)} kg CO₂e. Swap to walking or public options for nearby trips.`;
        } else {
            reply = `🌱 GENERAL COACH ANSWER:
            To help boost your score of ${impacts.score}/100, set goals like reducing meat meals, walking short distances, or using smart power strips.`;
        }

        typeEffect(dom.coach.responseText, reply);
        dom.coach.askInput.value = '';
    });

    // --- INITIALIZATION ---
    loadState();
    requestRender();
});
