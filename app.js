document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    const state = {
        driving: 150,
        flights: 2,
        meat: 5,
        foodWaste: 1, // 0 = Low, 1 = Med, 2 = High
        electricity: 250,
        heating: 'gas', // gas, electric, oil, biomass
        completedChallenges: new Set(),
        streak: 3,
        longestStreak: 7,
        totalCompleted: 12
    };

    // --- DOM REFERENCES ---
    const inputs = {
        driving: document.getElementById('slider-driving'),
        flights: document.getElementById('slider-flights'),
        meat: document.getElementById('slider-meat'),
        foodWaste: document.getElementById('slider-foodwaste'),
        electricity: document.getElementById('slider-electricity'),
        heating: document.getElementById('select-heating')
    };

    const displays = {
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
    };

    const buttons = {
        generatePlan: document.getElementById('btn-generate-plan'),
        askCoach: document.getElementById('btn-ask-coach')
    };

    const coach = {
        askInput: document.getElementById('coach-ask-input'),
        responseBox: document.getElementById('coach-response'),
        responseText: document.getElementById('coach-response-text')
    };

    const accordionTriggers = document.querySelectorAll('.accordion-trigger');

    // --- ACCORDION INTERACTION ---
    accordionTriggers.forEach(trigger => {
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

    // --- CARBON FOOTPRINT CALCULATIONS & CONSTANTS ---
    const CO2_FACTORS = {
        driving: 0.17, // kg per km
        flights: 500 / 52, // kg per flight per week (~9.615)
        meatMeal: 2.5, // kg per meal
        foodWaste: [2.0, 5.0, 10.0], // Low, Med, High kg/week
        electricity: 0.85 / 4.33, // kg per kWh per week (~0.196)
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

        // Score formulation: lower CO2 is better. 0 CO2 = 100 points. Average world emissions of ~90kg/wk = 46 score.
        // Formula: Score = max(0, min(100, 100 - total * 0.6))
        const score = Math.max(0, Math.min(100, Math.round(100 - total * 0.6)));

        return {
            transport: Number(transport.toFixed(1)),
            diet: Number(diet.toFixed(1)),
            energy: Number(energy.toFixed(1)),
            total: Number(total.toFixed(1)),
            score: score
        };
    }

    // --- RENDER DYNAMIC UI UPDATES ---
    function updateUI() {
        const impacts = calculateImpacts();
        
        // Form specific slider display labels
        displays.valDriving.textContent = state.driving;
        displays.valFlights.textContent = state.flights;
        displays.valMeat.textContent = state.meat;
        
        const wasteLabels = ['Low', 'Medium', 'High'];
        displays.valFoodWasteLabel.textContent = wasteLabels[state.foodWaste];
        displays.valElectricity.textContent = state.electricity;

        // Detail estimates
        displays.impactDriving.textContent = `${(state.driving * CO2_FACTORS.driving).toFixed(1)} kg CO₂e`;
        displays.impactFlights.textContent = `${(state.flights * CO2_FACTORS.flights).toFixed(1)} kg CO₂e`;
        displays.impactMeat.textContent = `${(state.meat * CO2_FACTORS.meatMeal).toFixed(1)} kg CO₂e`;
        displays.impactFoodWaste.textContent = `${(CO2_FACTORS.foodWaste[state.foodWaste]).toFixed(1)} kg CO₂e`;
        displays.impactElectricity.textContent = `${(state.electricity * CO2_FACTORS.electricity).toFixed(1)} kg CO₂e`;
        displays.impactHeating.textContent = `${(CO2_FACTORS.heating[state.heating]).toFixed(1)} kg CO₂e`;

        // Hero and Insights top bars
        displays.weeklyCo2.textContent = impacts.total.toFixed(1);
        displays.carbonScore.textContent = impacts.score;
        displays.insightWeekly.textContent = `${impacts.total.toFixed(1)} kg`;
        
        const annualCo2 = (impacts.total * 52) / 1000;
        displays.insightAnnual.textContent = `${annualCo2.toFixed(1)} t`;
        displays.insightScore.textContent = impacts.score;
        
        // Trees needed: ~22kg CO2 per year is offset by one mature tree
        const treesRequired = Math.round((impacts.total * 52) / 22);
        displays.insightTrees.textContent = treesRequired;

        // Update score state badge and colors
        displays.scoreCard.className = 'summary-card glass-card';
        displays.scoreIconWrapper.className = 'card-icon-wrapper';
        if (impacts.score >= 70) {
            displays.scoreStatusText.textContent = 'Low';
            displays.scoreStatusText.className = 'score-status score-green';
            displays.scoreCard.classList.add('border-green');
        } else if (impacts.score >= 40) {
            displays.scoreStatusText.textContent = 'Moderate';
            displays.scoreStatusText.className = 'score-status score-yellow';
            displays.scoreCard.classList.add('border-yellow');
        } else {
            displays.scoreStatusText.textContent = 'High';
            displays.scoreStatusText.className = 'score-status score-red';
            displays.scoreCard.classList.add('border-red');
        }

        // SVG donut segments
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

        segmentTrans.setAttribute('stroke-dasharray', `${transDash} ${circumference}`);
        segmentTrans.setAttribute('stroke-dashoffset', '0');

        segmentDiet.setAttribute('stroke-dasharray', `${dietDash} ${circumference}`);
        segmentDiet.setAttribute('stroke-dashoffset', `${-transDash}`);

        segmentEnergy.setAttribute('stroke-dasharray', `${energyDash} ${circumference}`);
        segmentEnergy.setAttribute('stroke-dashoffset', `${-(transDash + dietDash)}`);

        displays.donutTotal.textContent = Math.round(impacts.total);
        displays.legendTransport.textContent = `${Math.round(transPercent * 100)}%`;
        displays.legendDiet.textContent = `${Math.round(dietPercent * 100)}%`;
        displays.legendEnergy.textContent = `${Math.round(energyPercent * 100)}%`;

        // Comparison progress bar updates
        displays.compValYou.textContent = `${impacts.total.toFixed(1)} kg`;
        const youPercent = Math.min(100, (impacts.total / 120) * 100);
        displays.compBarYou.style.width = `${youPercent}%`;

        // Dynamic Recommendations based on highest category
        updateRecommendations(impacts.transport, impacts.diet, impacts.energy);
    }

    // --- PERSONALIZED ACTIONS GENERATOR ---
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
        displays.actionsContainer.innerHTML = '';

        selectedActions.forEach(action => {
            const priorityClass = `badge-${action.priority.toLowerCase()}`;
            const card = document.createElement('div');
            card.className = 'action-card';
            card.innerHTML = `
                <div class="action-icon-wrapper">${action.icon}</div>
                <div class="action-info">
                    <div class="action-header">
                        <span class="action-title">${action.title}</span>
                        <span class="priority-badge ${priorityClass}">${action.priority}</span>
                    </div>
                    <p class="action-desc">${action.desc}</p>
                    <span class="action-savings">Est. Savings: ${action.savings}</span>
                </div>
            `;
            displays.actionsContainer.appendChild(card);
        });
    }

    // --- DAILY CHALLENGES & STREAKS ---
    const challengeCheckboxes = document.querySelectorAll('.challenge-checkbox');
    challengeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const card = e.target.closest('.challenge-card');
            const challengeId = e.target.getAttribute('data-id');

            if (e.target.checked) {
                card.classList.add('completed-flash');
                state.completedChallenges.add(challengeId);
                setTimeout(() => card.classList.remove('completed-flash'), 500);
            } else {
                state.completedChallenges.delete(challengeId);
            }

            // Recalculate streak values
            const completedCount = state.completedChallenges.size;
            displays.totalCompleted.textContent = state.totalCompleted + completedCount;

            // Update streak visual indicators
            const days = document.querySelectorAll('.streak-day');
            days.forEach((day, index) => {
                if (index < completedCount + 3) {
                    day.classList.add('completed');
                } else {
                    day.classList.remove('completed');
                }
            });

            const currentStr = 3 + completedCount;
            displays.currStreak.textContent = `${currentStr} days`;
            displays.maxStreak.textContent = `${Math.max(state.longestStreak, currentStr)} days`;
        });
    });

    // --- AI ECO COACH SIMULATION ---
    function typeEffect(element, text, speed = 15) {
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

    buttons.generatePlan.addEventListener('click', () => {
        coach.responseBox.classList.remove('hidden');
        
        const impacts = calculateImpacts();
        let primaryFocus = 'Transportation';
        let topAdvice = 'Consider switching to carpooling or utilizing high-quality public transit corridors to decrease your weekly vehicle distance.';
        
        if (impacts.diet > impacts.transport && impacts.diet > impacts.energy) {
            primaryFocus = 'Dietary Choices';
            topAdvice = 'Adopting a high percentage of plant-based meals and implementing waste-prevention routines will yield massive instant carbon savings.';
        } else if (impacts.energy > impacts.transport && impacts.energy > impacts.diet) {
            primaryFocus = 'Home Energy Systems';
            topAdvice = 'Enhance thermal envelope insulation, adjust smart thermostat offsets by 1-2 degrees, and transition to eco-certified power sources.';
        }

        const adviceText = `🌿 PERSONAL ECO ACTION PLAN
        
        Based on your carbon indicators, your biggest leverage area is ${primaryFocus}.
        
        Current Weekly Footprint: ${impacts.total} kg CO₂e
        Current Carbon Score: ${impacts.score}/100
        
        Recommended Strategies:
        1. Primary focus: ${topAdvice}
        2. Offset Strategy: You currently need ${Math.round((impacts.total * 52) / 22)} trees planted annually to neutralize your lifestyle emissions. We suggest partnering with local reforestation programs.
        3. Daily Habits: Finish all 4 daily challenges to double your active streak speed!`;

        typeEffect(coach.responseText, adviceText);
    });

    buttons.askCoach.addEventListener('click', () => {
        const query = coach.askInput.value.trim();
        if (!query) return;

        coach.responseBox.classList.remove('hidden');
        const impacts = calculateImpacts();

        let simulatedResponse = '';
        const lowercaseQuery = query.toLowerCase();

        if (lowercaseQuery.includes('electricity') || lowercaseQuery.includes('energy') || lowercaseQuery.includes('power')) {
            simulatedResponse = `💡 ENERGY ADVICE:
            To reduce your monthly energy footprint (${state.electricity} kWh):
            - Transition traditional bulbs to high-efficiency LED alternatives.
            - Leverage intelligent power strips to eliminate phantom standby losses.
            - Ensure heating systems (currently set to ${state.heating}) are serviced regularly.`;
        } else if (lowercaseQuery.includes('meat') || lowercaseQuery.includes('diet') || lowercaseQuery.includes('food')) {
            simulatedResponse = `🥗 DIETARY ADVICE:
            Swapping meat meals (currently ${state.meat} per week) for plant alternatives can lower your weekly food emissions significantly. Food production accounts for over 25% of global greenhouse gases. Try meal-prepping with whole grains, legumes, and seasonal veggies!`;
        } else if (lowercaseQuery.includes('drive') || lowercaseQuery.includes('flight') || lowercaseQuery.includes('transport')) {
            simulatedResponse = `🚗 TRANSPORT ADVICE:
            Your driving distance of ${state.driving} km/week emits ${(state.driving * CO2_FACTORS.driving).toFixed(1)} kg CO₂e. Try to bundle trips, walk or cycle for journeys under 2km, or utilize hybrid vehicle transitions if possible.`;
        } else {
            simulatedResponse = `🌱 ECO COACH RESPONSE:
            "${query}" is a fantastic question.
            To optimize your current Carbon Score of ${impacts.score}/100:
            - Focus on minimizing high-impact habits.
            - Try walking to complete short errands, lowering transport variables.
            - Optimize home heating controls and power down standby equipment.`;
        }

        typeEffect(coach.responseText, simulatedResponse);
        coach.askInput.value = '';
    });

    // --- EVENT LISTENERS FOR RANGE INPUTS ---
    inputs.driving.addEventListener('input', (e) => {
        state.driving = Number(e.target.value);
        updateUI();
    });

    inputs.flights.addEventListener('input', (e) => {
        state.flights = Number(e.target.value);
        updateUI();
    });

    inputs.meat.addEventListener('input', (e) => {
        state.meat = Number(e.target.value);
        updateUI();
    });

    inputs.foodWaste.addEventListener('input', (e) => {
        state.foodWaste = Number(e.target.value);
        updateUI();
    });

    inputs.electricity.addEventListener('input', (e) => {
        state.electricity = Number(e.target.value);
        updateUI();
    });

    inputs.heating.addEventListener('change', (e) => {
        state.heating = e.target.value;
        updateUI();
    });

    // --- INITIALIZE ---
    updateUI();
    
    // Set baseline streak day completions for visual premium feel
    const days = document.querySelectorAll('.streak-day');
    days.forEach((day, index) => {
        if (index < state.streak) {
            day.classList.add('completed');
        }
    });
});
