// js/pomodoro.js
let timerInterval = null;
let timerSeconds = 25 * 60;
const displayElem = document.getElementById("timerDisplay");

function updateDisplay() {
    if (!displayElem) return;
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    displayElem.innerText = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
}

export function startPomodoro() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            alert("Pomodoro complete! 🍅");
            timerSeconds = 25 * 60;
            updateDisplay();
        } else {
            timerSeconds--;
            updateDisplay();
        }
    }, 1000);
}

export function stopPomodoro() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

export function resetPomodoro() {
    stopPomodoro();
    timerSeconds = 25 * 60;
    updateDisplay();
}

// Initial display
updateDisplay();
