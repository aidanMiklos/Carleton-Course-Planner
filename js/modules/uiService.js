// UI update logic: legend, credit summary, CGPA, autocomplete, modals, view toggling 
import * as State from './state.js';
import * as DOMUtils from './domUtils.js';
import * as Constants from './constants.js'; // Added import for gpaScale
// import * as Constants from './constants.js'; // If needed for UI specific constants
import { updateAllViewsAndSummaries } from '../app.js';

export function updateCreditSummaryHandler() {
    let currentCredits = 0.0;
    let completedProgramCredits = 0.0;
    let completedBreadthCredits = 0.0;
    let completedFreeCredits = 0.0;
    
    let plannedTotalCredits = 0.0;
    let plannedProgramCredits = 0.0;
    let plannedBreadthCredits = 0.0;
    let plannedFreeCredits = 0.0;

    State.getCourses().forEach(course => {
        if (course.completed) {
            currentCredits += course.credits;
            if (course.category === 'program') completedProgramCredits += course.credits;
            else if (course.category === 'breadth') completedBreadthCredits += course.credits;
            else if (course.category === 'free') completedFreeCredits += course.credits;
        } else {
            plannedTotalCredits += course.credits;
            if (course.category === 'program') plannedProgramCredits += course.credits;
            else if (course.category === 'breadth') plannedBreadthCredits += course.credits;
            else if (course.category === 'free') plannedFreeCredits += course.credits;
        }
    });

    DOMUtils.updateElementText('currentCredits', currentCredits.toFixed(1));
    DOMUtils.updateElementText('plannedCreditsText', plannedTotalCredits.toFixed(1));
    
    DOMUtils.updateElementText('programCredits', completedProgramCredits.toFixed(1));
    DOMUtils.updateElementText('breadthCredits', completedBreadthCredits.toFixed(1));
    DOMUtils.updateElementText('freeCredits', completedFreeCredits.toFixed(1));

    DOMUtils.updateElementText('plannedProgramCredits', plannedProgramCredits.toFixed(1));
    DOMUtils.updateElementText('plannedBreadthCredits', plannedBreadthCredits.toFixed(1));
    DOMUtils.updateElementText('plannedFreeCredits', plannedFreeCredits.toFixed(1));

    const totalRequired = State.getTotalCreditsRequired();
    const completedPercent = (totalRequired > 0 ? (currentCredits / totalRequired) * 100 : 0);
    const plannedPercent = (totalRequired > 0 ? (plannedTotalCredits / totalRequired) * 100 : 0);
    
    const creditsBar = DOMUtils.getElementById('creditsBar');
    const plannedCreditsBarElement = DOMUtils.getElementById('plannedCreditsBar');

    if (creditsBar) {
        creditsBar.style.width = `${Math.min(completedPercent, 100)}%`;
        creditsBar.setAttribute('aria-valuenow', completedPercent.toString());
    }
    if (plannedCreditsBarElement) {
        plannedCreditsBarElement.style.width = `${Math.min(plannedPercent, 100 - completedPercent)}%`; 
        plannedCreditsBarElement.setAttribute('aria-valuenow', plannedPercent.toString());
    }
    
    // Adjust border radius for stacked progress bar
    if (creditsBar && plannedCreditsBarElement) {
        if (completedPercent > 0 && plannedPercent > 0 && (completedPercent + plannedPercent <= 100)) {
            creditsBar.style.borderTopRightRadius = '0';
            creditsBar.style.borderBottomRightRadius = '0';
            plannedCreditsBarElement.style.borderTopLeftRadius = '0';
            plannedCreditsBarElement.style.borderBottomLeftRadius = '0';
            plannedCreditsBarElement.style.borderTopRightRadius = '50rem'; // Using a large value for full curve
            plannedCreditsBarElement.style.borderBottomRightRadius = '50rem';
        } else { 
            creditsBar.style.borderRadius = '50rem';
            plannedCreditsBarElement.style.borderRadius = '50rem';
        }
        if (completedPercent === 0 && plannedPercent > 0) { 
            plannedCreditsBarElement.style.borderRadius = '50rem';
        } else if (plannedPercent === 0 && completedPercent > 0) { 
            creditsBar.style.borderRadius = '50rem';
        }
        if (completedPercent + plannedPercent > 100) { 
            // Ensure the latter bar still tries to round its right edge if it exists
            plannedCreditsBarElement.style.borderTopRightRadius = '50rem';
            plannedCreditsBarElement.style.borderBottomRightRadius = '50rem';
        }
    }

    const creditsWarning = DOMUtils.getElementById('creditsWarning');
    const remainingCompletedCredits = totalRequired - currentCredits;
    const totalAchievedAndPlannedCredits = currentCredits + plannedTotalCredits;
    const remainingToPlanOrCompleteCredits = totalRequired - totalAchievedAndPlannedCredits;

    let warningMessages = [];
    if (currentCredits < totalRequired) {
        warningMessages.push(`You need <b>${remainingCompletedCredits.toFixed(1)} more COMPLETED credits</b> to graduate.`);
        if (remainingToPlanOrCompleteCredits > 0) {
             warningMessages.push(`You still need to plan for <b>${remainingToPlanOrCompleteCredits.toFixed(1)} additional credits</b>.`);
        } else if (remainingToPlanOrCompleteCredits < 0) {
             warningMessages.push(`You have over-planned by <b>${Math.abs(remainingToPlanOrCompleteCredits).toFixed(1)} credits</b> (beyond the required ${totalRequired.toFixed(1)}).`);
        } else { 
            warningMessages.push(`All credits are planned. Focus on completing the remaining courses!`);
        }
    } else {
        warningMessages.push(`🎉 Congratulations! You have completed all <b>${totalRequired.toFixed(1)} required credits</b>.`);
         if (remainingToPlanOrCompleteCredits < 0) { 
            warningMessages.push(`You also have an additional <b>${Math.abs(remainingToPlanOrCompleteCredits).toFixed(1)} credits planned</b> beyond requirements.`);
        }
    }

    if (creditsWarning) {
        creditsWarning.innerHTML = warningMessages.length > 0 ? warningMessages.join('<br>') : '';
        DOMUtils.toggleElementClass(creditsWarning.id, 'hidden', warningMessages.length === 0);
    }
}

export function updateCGPAHandler() {
    let totalGradePoints = 0, totalCreditsForCGPA = 0;
    let majorGradePoints = 0, majorCreditsForCGPA = 0;

    State.getCourses().forEach(course => {
        if (course.grade && course.grade !== 'N/A' && course.completed) {
            const gradePoint = Constants.gradePointMap[course.grade]; // Assuming gradePointMap is in Constants
            if (gradePoint !== null && gradePoint !== undefined) { 
                totalGradePoints += gradePoint * course.credits;
                totalCreditsForCGPA += course.credits;
                if (course.majorCGPA) {
                    majorGradePoints += gradePoint * course.credits;
                    majorCreditsForCGPA += course.credits;
                }
            }
        }
    });
    DOMUtils.updateElementText('cgpa', totalCreditsForCGPA > 0 ? (totalGradePoints / totalCreditsForCGPA).toFixed(2) : 'N/A');
    DOMUtils.updateElementText('majorCgpa', majorCreditsForCGPA > 0 ? (majorGradePoints / majorCreditsForCGPA).toFixed(2) : 'N/A');
}

export function toggleCreditsTableHandler() {
    const creditsTable = DOMUtils.getElementById('creditsTable');
    const chevron = document.querySelector('#totalCreditsWrapper svg'); // More specific selector
    if (creditsTable && chevron) {
        const isHidden = creditsTable.classList.toggle('hidden');
        chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
    }
}

export function updateLegendHandler() {
    const incompleteLegend = DOMUtils.getElementById('incompleteLegend');
    if (incompleteLegend) {
        // This is a simple legend, can be enhanced if needed
        incompleteLegend.innerHTML = '<span style="color: #48bb78; font-weight:bold; vertical-align:middle;">&#10004;</span> = Completed';
    }
}

export function toggleViewHandler() {
    console.log("toggleViewHandler called");
    const flowchartDiv = DOMUtils.getElementById('flowchart');
    const semesterViewDiv = DOMUtils.getElementById('semesterView');
    const flowchartToggleBtn = DOMUtils.getElementById('toggleViewButton');
    const semesterToggleBtn = DOMUtils.getElementById('toggleViewButtonSemester');

    if (!flowchartDiv || !semesterViewDiv || !flowchartToggleBtn || !semesterToggleBtn) {
        console.error("Required elements for toggling view are missing.");
        return;
    }

    const isPrerequisiteView = State.getCurrentView() === 'prerequisite';
    console.log("Current view:", State.getCurrentView());

    if (isPrerequisiteView) {
        console.log("Switching to semester view");
        // Switch to Semester View
        flowchartDiv.style.opacity = '0';
        setTimeout(() => {
            flowchartDiv.style.display = 'none';
            semesterViewDiv.style.display = 'block';
            semesterViewDiv.offsetHeight; // Trigger reflow for transition
            semesterViewDiv.style.opacity = '1';
            State.setCurrentView('semester');
            DOMUtils.updateElementHTML(flowchartToggleBtn.id, Constants.branchIconSVG);
            DOMUtils.updateElementHTML(semesterToggleBtn.id, Constants.branchIconSVG);
            console.log("Calling updateAllViewsAndSummaries for semester view");
            updateAllViewsAndSummaries(); // Call to re-render semester view
        }, 300); // Match CSS transition time
    } else {
        console.log("Switching to prerequisite view");
        // Switch to Prerequisite View
        semesterViewDiv.style.opacity = '0';
        setTimeout(() => {
            semesterViewDiv.style.display = 'none';
            flowchartDiv.style.display = 'block';
            flowchartDiv.offsetHeight; // Trigger reflow
            flowchartDiv.style.opacity = '1';
            const network = window.network;
            if (network && network.physics && !network.physics.options.enabled) {
                network.fit({animation: {duration: 500, easingFunction: 'easeOutQuad'}});
            }
            State.setCurrentView('prerequisite');
            DOMUtils.updateElementHTML(flowchartToggleBtn.id, Constants.calendarIconSVG);
            DOMUtils.updateElementHTML(semesterToggleBtn.id, Constants.calendarIconSVG);
        }, 300); 
    }
    updateLegendHandler(); // Update legend for both views if necessary
    console.log("View toggle complete");
}

export function openRequirementsModalHandler() {
    DOMUtils.setElementValue('reqTotalCredits', State.getTotalCreditsRequired());
    DOMUtils.setElementValue('reqProgramCredits', State.getProgramCreditsRequired());
    DOMUtils.setElementValue('reqBreadthCredits', State.getBreadthCreditsRequired());
    DOMUtils.setElementValue('reqFreeCredits', State.getFreeCreditsRequired());
    DOMUtils.showModal('requirementsModal');
}

function autocomplete(inp, arr) {
    let currentFocus;
    inp.addEventListener("input", function(e) {
        let a, b, i, val = this.value;
        closeAllLists();
        if (!val) { return false;}
        currentFocus = -1;
        a = document.createElement("div");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(a);
        const enteredPrereqs = val.split(',').map(p => p.trim().toUpperCase().replace(/\s/g, ''));
        const lastPrereq = enteredPrereqs[enteredPrereqs.length - 1];
        const existingPrereqs = enteredPrereqs.slice(0, -1).join(', ');

        for (i = 0; i < arr.length; i++) {
            if (arr[i].toUpperCase().includes(lastPrereq)) {
                b = document.createElement("div");
                const matchIndex = arr[i].toUpperCase().indexOf(lastPrereq);
                b.innerHTML = arr[i].substr(0, matchIndex) + "<strong>" + arr[i].substr(matchIndex, lastPrereq.length) + "</strong>";
                b.innerHTML += arr[i].substr(matchIndex + lastPrereq.length);
                b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
                b.addEventListener("click", function(e) {
                    const selectedValue = this.getElementsByTagName("input")[0].value;
                    inp.value = existingPrereqs ? `${existingPrereqs}, ${selectedValue}` : selectedValue;
                    closeAllLists();
                });
                a.appendChild(b);
            }
        }
    });
    inp.addEventListener("keydown", function(e) {
        let x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) { /*down*/ currentFocus++; addActive(x); } 
        else if (e.keyCode == 38) { /*up*/ currentFocus--; addActive(x); } 
        else if (e.keyCode == 13) { /*enter*/ e.preventDefault(); if (currentFocus > -1) { if (x) x[currentFocus].click(); } }
    });
    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) { for (let i = 0; i < x.length; i++) { x[i].classList.remove("autocomplete-active"); } }
    function closeAllLists(elmnt) {
        const x = document.getElementsByClassName("autocomplete-items");
        for (let i = 0; i < x.length; i++) { if (elmnt != x[i] && elmnt != inp) { x[i].parentNode.removeChild(x[i]); } }
    }
    document.addEventListener("click", (e) => closeAllLists(e.target)); // Close lists when clicking elsewhere
}

export function initializeAutocompleteHandler() {
    const courseCodes = State.getCourses().map(c => c.code);
    const prereqsInput = DOMUtils.getElementById("prerequisites");
    const modalPrereqsInput = DOMUtils.getElementById("modalPrerequisites");

    if (prereqsInput) autocomplete(prereqsInput, courseCodes);
    if (modalPrereqsInput) autocomplete(modalPrereqsInput, courseCodes);
    // This needs to be re-called if State.getCourses() changes, or the `arr` for autocomplete needs to be dynamic.
    // For now, it initializes with current courses. A better approach would be to have `autocomplete` take a function that provides the array.
} 