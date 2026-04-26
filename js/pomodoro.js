let timerInterval = null;
let timerSeconds = 25 * 60;
const displayElem = document.getElementById("timerDisplay");
function updateDisplay() { if(displayElem) { const m = Math.floor(timerSeconds/60), s = timerSeconds%60; displayElem.innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`; } }
export function startPomodoro() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (timerSeconds <= 0) { clearInterval(timerInterval); alert("Pomodoro complete! 🍅"); timerSeconds = 25*60; updateDisplay(); }
        else { timerSeconds--; updateDisplay(); }
    }, 1000);
}
export function stopPomodoro() { if (timerInterval) clearInterval(timerInterval); timerInterval = null; }
export function resetPomodoro() { stopPomodoro(); timerSeconds = 25*60; updateDisplay(); }
updateDisplay();
