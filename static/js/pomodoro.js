// Pomodoro Timer
let pomodoroTimer = {
    time: 25 * 60, // 25 minutes in seconds
    isRunning: false,
    isBreak: false,
    interval: null,
    totalTime: 25 * 60
};

document.addEventListener('DOMContentLoaded', function() {
    initializePomodoro();
});

function initializePomodoro() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    if (startBtn) startBtn.addEventListener('click', startTimer);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);
    
    updateTimerDisplay();
}

function startTimer() {
    if (pomodoroTimer.isRunning) return;
    
    pomodoroTimer.isRunning = true;
    pomodoroTimer.interval = setInterval(updateTimer, 1000);
    
    updateButtons();
}

function pauseTimer() {
    pomodoroTimer.isRunning = false;
    clearInterval(pomodoroTimer.interval);
    updateButtons();
}

function resetTimer() {
    pomodoroTimer.isRunning = false;
    clearInterval(pomodoroTimer.interval);
    pomodoroTimer.time = pomodoroTimer.isBreak ? 5 * 60 : 25 * 60;
    pomodoroTimer.totalTime = pomodoroTimer.time;
    updateTimerDisplay();
    updateProgressBar();
    updateButtons();
}

function updateTimer() {
    pomodoroTimer.time--;
    updateTimerDisplay();
    updateProgressBar();
    
    if (pomodoroTimer.time <= 0) {
        completeSession();
    }
}

function completeSession() {
    pomodoroTimer.isRunning = false;
    clearInterval(pomodoroTimer.interval);
    
    // Play sound
    playTimerSound();
    
    // Switch between focus and break
    pomodoroTimer.isBreak = !pomodoroTimer.isBreak;
    pomodoroTimer.time = pomodoroTimer.isBreak ? 5 * 60 : 25 * 60;
    pomodoroTimer.totalTime = pomodoroTimer.time;
    
    updateTimerDisplay();
    updateProgressBar();
    updateButtons();
    
    // Show notification
    showNotification(pomodoroTimer.isBreak ? 'Break Time!' : 'Focus Time!');
}

function updateTimerDisplay() {
    const timerTime = document.getElementById('timerTime');
    const timerLabel = document.getElementById('timerLabel');
    
    if (timerTime) {
        const minutes = Math.floor(pomodoroTimer.time / 60);
        const seconds = pomodoroTimer.time % 60;
        timerTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (timerLabel) {
        timerLabel.textContent = pomodoroTimer.isBreak ? 'Break Time' : 'Focus Time';
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('timerProgressBar');
    if (progressBar) {
        const progress = ((pomodoroTimer.totalTime - pomodoroTimer.time) / pomodoroTimer.totalTime) * 100;
        progressBar.style.width = `${progress}%`;
    }
}

function updateButtons() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    
    if (startBtn) {
        startBtn.disabled = pomodoroTimer.isRunning;
        startBtn.style.opacity = pomodoroTimer.isRunning ? '0.5' : '1';
    }
    
    if (pauseBtn) {
        pauseBtn.disabled = !pomodoroTimer.isRunning;
        pauseBtn.style.opacity = !pomodoroTimer.isRunning ? '0.5' : '1';
    }
}

function playTimerSound() {
    // Create audio context and play a simple beep
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1);
    } catch (error) {
        console.log('Audio not supported');
    }
}

function showNotification(message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = 'timer-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--primary-color);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        font-size: 1.5rem;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: fadeInOut 3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
    
    // Add CSS animation
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes fadeInOut {
                0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20%, 80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
}