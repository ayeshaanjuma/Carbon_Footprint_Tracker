document.addEventListener('DOMContentLoaded', () => {
    // --- DEFAULT STATE ---
    const defaultState = {
        driving: 150,
        flights: 2,
        meat: 5,
        foodWaste: 1, // 0 = Low, 1 = Med, 2 = High
        electricity: 250,
        heating: 'gas', // gas, electric, oil, biomass
        completedChallenges: [], // Array of string IDs
        streak: 3,
        longestStreak: 7,
        totalCompleted: 12
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
            heating: document.getElementById('select-heating')
        },
        displays: {
            valDriving: document.getElementById('val-driving'),
            valFlights: document.getElementById('val-flights'),
            valMeat: document.getElementById('val-meat'),
            valFoodWasteLabel: document.getElementById('val-foodwaste-label'),
            valElectricity: document.getElementById('val-electricity'),
            
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
            
            currStreak: document.getElementById('curr-streak'),
            maxStreak: document.getElementById('max-streak'),
            totalCompleted: document.getElementById('total-completed')
        },
        buttons: {
            generatePlan: document.getElementById('btn-generate-plan'),
            askCoach: document.getElementById('btn-ask-coach')
        },
        coach: {
            askInput: document.getElementById('coach-ask-input'),
            responseBox: document.getElementById('coach-response'),
            responseText: document.getElementById('coach-response-text')
        },
        accordionTriggers: document.querySelectorAll('.accordion-trigger'),
        challengeCheckboxes: document.querySelectorAll('.challenge-checkbox'),
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

        // Score formulation: Score = max(0, min(100, 100 - total * 0.6))
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
        
        const wasteLabels = ['Low', 'Medium', 'High'];
        dom.displays.valFoodWasteLabel.textContent = wasteLabels[state.foodWaste];
        dom.displays.valElectricity.textContent = state.electricity;

        // Set inputs values to match state (handles initialization load)
        dom.sliders.driving.value = state.driving;
        dom.sliders.flights.value = state.flights;
        dom.sliders.meat.value = state.meat;
        dom.sliders.foodWaste.value = state.foodWaste;
        dom.sliders.electricity.value = state.electricity;
        dom.sliders.heating.value = state.heating;

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
        dom.challengeCheckboxes.forEach(checkbox => {
            const challengeId = checkbox.getAttribute('data-id');
            checkbox.checked = state.completedChallenges.includes(challengeId);
            
            const card = checkbox.closest('.challenge-card');
            if (checkbox.checked) {
                card.classList.add('completed-state'); // Styled state indicator if needed
            } else {
                card.classList.remove('completed-state');
            }
        });

        // 10. Actions & recommendations
        updateRecommendations(impacts.transport, impacts.diet, impacts.energy);
        
        // Save current parameters to LocalStorage
        saveState();
    }

    // --- RECOMMENDATIONS ---
    function updateRecommendations(transportVal, dietVal, energyVal) {
        const recommendations = {
            transport: [
                { icon: '🚲', title: 'Walk or Bike Short Trips', desc: 'Replace vehicle trips under 3km with walking or cycling.', savings: '350 kg CO₂e/yr', priority: 'High' },
                { icon: '🚍', title: 'Use Public Transit', desc: 'Commute via bus or train twice a week instead of driving.', savings: '520 kg CO₂e/yr', priority: 'High' },
                { icon: '🚗', title: 'Carpool to Work/School', desc: 'Share your drive with coworkers or friends to split emissions.', savings: '450 kg CO₂e/yr', priority: 'Medium' }
            ],
            diet: [
                { icon: '🥗', title: 'Reduce Beef & Lamb Consumption', desc: 'Swap red meats for poultry, fish, or plant proteins.', savings: '600 kg CO₂e/yr', priority: 'High' },
                { icon: '🍲', title: 'Embrace Meat-Free Mondays', desc: 'Commit to full plant-based eating at least one day a week.', savings: '400 kg CO₂e/yr', priority: 'Medium' },
                { icon: '🗑️', title: 'Compost & Minimize Waste', desc: 'Plan meals and compost leftovers to prevent landfill methane.', savings: '200 kg CO₂e/yr', priority: 'Low' }
            ],
            energy: [
                { icon: '🌡️', title: 'Adjust Smart Thermostat', desc: 'Keep heating at 20°C and cooling at 25°C to optimize electricity.', savings: '700 kg CO₂e/yr', priority: 'High' },
                { icon: '💡', title: 'Upgrade to LED Lighting', desc: 'Replace inefficient incandescent bulbs with smart LEDs.', savings: '150 kg CO₂e/yr', priority: 'Medium' },
                { icon: '🔌', title: 'Eliminate Vampire Power', desc: 'Unplug power strips and standby electronics when not in use.', savings: '100 kg CO₂e/yr', priority: 'Low' }
            ]
        };

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

        const selectedActions = recommendations[highestCategory];
        
        // Simple DOM optimization: only recreate actions grid content if category shifts or is initial
        const currentCategoryAttr = dom.displays.actionsContainer.getAttribute('data-category');
        if (currentCategoryAttr !== highestCategory) {
            dom.displays.actionsContainer.setAttribute('data-category', highestCategory);
            dom.displays.actionsContainer.innerHTML = '';
            
            selectedActions.forEach(action => {
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
                        <span class="action-savings">Est. Savings: ${action.savings}</span>
                    </div>
                `;
                dom.displays.actionsContainer.appendChild(card);
            });
        }
    }

    // --- DAILY CHALLENGES EVENT LISTENER ---
    dom.challengeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const card = e.target.closest('.challenge-card');
            const challengeId = e.target.getAttribute('data-id');

            if (e.target.checked) {
                card.classList.add('completed-flash');
                if (!state.completedChallenges.includes(challengeId)) {
                    state.completedChallenges.push(challengeId);
                }
                setTimeout(() => card.classList.remove('completed-flash'), 500);
            } else {
                state.completedChallenges = state.completedChallenges.filter(id => id !== challengeId);
            }

            requestRender();
        });
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
