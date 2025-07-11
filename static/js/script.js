let tasks = [];
let progressChart = null;
let dailyProgressChart = null;

document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  initializeDashboard();
});

// -------------------- Theme --------------------
function initializeTheme() {
  const themeSelector = document.getElementById('themeSelector');
  const savedTheme = localStorage.getItem('selectedTheme') || 'aesthetic';
  if (themeSelector) {
    themeSelector.value = savedTheme;
    applyTheme(savedTheme);
    themeSelector.addEventListener('change', function () {
      applyTheme(this.value);
      localStorage.setItem('selectedTheme', this.value);
    });
  }
}
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
}

// -------------------- Dashboard --------------------
function initializeDashboard() {
  loadTasksFromBackend();
  setupTaskForm();
  initializeExport();
  initializeAnalytics();
}

// -------------------- Load Tasks from Backend --------------------
function loadTasksFromBackend() {
  fetch('/api/tasks')
    .then(res => res.json())
    .then(data => {
      tasks = data;
      renderTasks();
      renderTodayTasks();
      updateCalendar();
      updateAnalytics();
    })
    .catch(err => console.error("Failed to load tasks:", err));
}

// -------------------- Submit New Task --------------------
function setupTaskForm() {
  const form = document.getElementById('taskForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('taskName').value.trim();
    const type = document.getElementById('taskType').value;
    const start_date = document.getElementById('taskDate').value;
    const deadline = document.getElementById('taskDeadline').value;
    const estimated_hours = parseFloat(document.getElementById('taskHours').value);
    const difficulty = parseInt(document.getElementById('taskDifficulty').value);

    if (!name || !type || !start_date || !deadline || isNaN(estimated_hours) || isNaN(difficulty)) {
      alert("⚠️ Please fill in all fields correctly.");
      return;
    }

    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    if (deadlineDate < today) {
      alert("❌ Deadline cannot be in the past.");
      return;
    }

    const task = { name, type, start_date, deadline, estimated_hours, difficulty };

    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    })
      .then(res => res.json())
      .then(() => {
        loadTasksFromBackend();
        form.reset();
      })
      .catch(err => console.error("Failed to add task:", err));
  });
}

// -------------------- Render Tasks --------------------
function renderTasks() {
  const taskList = document.getElementById('taskList');
  taskList.innerHTML = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  tasks.forEach(task => {
    const deadlineDate = new Date(task.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    if (deadlineDate < today) return;

    const taskEl = createTaskElement(task);
    taskList.appendChild(taskEl);
  });

  updateTaskProgress();
}

// -------------------- Create Task UI --------------------
function createTaskElement(task) {
  const div = document.createElement('div');
  div.className = 'task-item';
  if (task.completed) div.classList.add('completed');

  const startFormatted = formatDate(task.start_date);
  const deadlineFormatted = formatDate(task.deadline);

  div.innerHTML = `
    <div class="task-info">
      <div class="task-name">${getTaskEmoji(task.type)} ${task.name}</div>
      <div class="task-details">
        <span>📅 ${startFormatted} to ${deadlineFormatted}</span>
        <span>⏱️ ${task.estimated_hours}h</span>
        <span>${getDifficultyStars(task.difficulty)}</span>
      </div>
    </div>
    <div class="task-actions">
      <label class="task-complete-checkbox">
        <input type="checkbox" ${task.completed ? 'checked' : ''}> Done
      </label>
      <button class="delete-btn">Delete</button>
    </div>
  `;

  div.querySelector('input[type="checkbox"]').addEventListener('change', () => {
    fetch(`/api/tasks/${task.id}/complete`, { method: 'POST' })
      .then(() => {
        task.completed = !task.completed;
        renderTasks();
        updateTaskProgress();
      })
      .catch(err => {
        console.error("Failed to toggle completion:", err);
        showToast("❌ Failed to update task status", "error");
      });
      updateGlobalHoursAnalytics(); // ✅ Add this
  });

  div.querySelector('.delete-btn').addEventListener('click', () => {
fetch('/api/tasks', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: task.id })
})
.then(() => {
  tasks = tasks.filter(t => t.id !== task.id);    // ✅ remove from global array
  renderTasks();                                   // ✅ re-render full task list
  renderTodayTasks();                              // ✅ re-render today's section
  updateTaskProgress();                            // ✅ analytics and chart
  showToast("🗑 Task deleted", "success");
})

      .catch(err => {
        console.error("Failed to delete task:", err);
        showToast("❌ Failed to delete task", "error");
      });
  });

  return div;
}

// -------------------- Utilities --------------------
function getTaskEmoji(type) {
  return {
    'Subject': '📚',
    'Practice': '✏️',
    'Certification': '🏆',
    'Custom': '⭐'
  }[type] || '📋';
}
function getDifficultyStars(diff) {
  return '⭐'.repeat(diff);
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d)
    ? ''
    : d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
}



// -------------------- (Other unchanged parts below) --------------------

function renderTodayTasks() {
  const container = document.getElementById("todayTaskCheckboxes");
  if (!container) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTasks = tasks.filter(t => {
    const start = new Date(t.start_date);
    const end = new Date(t.deadline);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return today >= start && today <= end;
  });

  container.innerHTML = todayTasks.length ? '' : '<p>No tasks for today 🎉</p>';

  todayTasks.forEach(task => {
    const start = new Date(task.start_date);
    const end = new Date(task.deadline);
    const dayCount = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const dailyHours = Math.round((task.estimated_hours / dayCount) * 10) / 10;

    const taskDiv = document.createElement("div");
    taskDiv.className = "task-item";
    if (task.completed) taskDiv.classList.add("completed");

    taskDiv.innerHTML = `
      <div class="task-info">
        <div class="task-name">${getTaskEmoji(task.type)} ${task.name}</div>
        <div class="task-details">
          <span>⏱️ ${dailyHours}h today</span>
        </div>
      </div>
      <div class="task-actions">
        <label class="task-complete-checkbox">
          <input type="checkbox" ${task.completed ? 'checked' : ''}> Done
        </label>
        <button class="delete-btn">Delete</button>
      </div>
    `;

    // ✅ Handle completion toggle — only update daily chart
    taskDiv.querySelector("input[type='checkbox']").addEventListener("change", () => {
  const isChecked = !task.completed;

  fetch(`/api/tasks/${task.id}/complete`, { method: 'POST' })
    .then(() => {
      task.completed = isChecked;

      renderTodayTasks();
      updateDailyStats();           // Already updates daily chart

      // 🔁 NEW: Update global stats (just hours)
      updateGlobalHoursAnalytics();
      
    })
    .catch(err => {
      console.error("❌ Failed to toggle today's task:", err);
    });
});


    // ✅ Handle delete — updates backend and reloads everything
   taskDiv.querySelector(".delete-btn").addEventListener("click", () => {
      taskDiv.remove();              // just remove the visual task card
      updateDailyStats();           // update daily stats chart accordingly
      showToast("✅ Removed from today's view", "success");
    });

    container.appendChild(taskDiv);
  });
}


// -------------------- Progress --------------------
function updateTaskProgress() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ✅ Filter only valid tasks (deadline today or future)
  const validTasks = tasks.filter(t => {
    const deadline = new Date(t.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline >= today;
  });

  const total = validTasks.length;
  const done = validTasks.filter(t => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const fill = document.getElementById('taskProgressFill');
  const text = document.getElementById('taskProgressText');

  if (fill && text) {
    fill.style.width = percent + '%';
    text.textContent = `${done} of ${total} tasks completed`;
    fill.style.background = percent < 50
      ? 'orange'
      : percent < 100
        ? 'gold'
        : '#27ae60';
  }

  // 🎉 Trigger confetti if all valid tasks are done
  if (percent === 100 && total > 0) {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    showToast("🎉 All tasks completed! Well done!", "success");
  }

  // 🔄 Update dependent systems
  updateAnalytics();   // Updates both global & daily stats
  updateCalendar();    // Syncs calendar view
}


// -------------------- Export --------------------
function initializeExport() {
  const btn = document.getElementById('exportBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.location.href = '/export/csv';
  });
}

// -------------------- Calendar --------------------
function updateCalendar() {
  if (window.calendar && window.calendar.refetchEvents) {
    window.calendar.refetchEvents();
  }
}

// -------------------- Analytics --------------------
function initializeAnalytics() {
  updateAnalytics();
}
function updateAnalytics() {
  updateProgressChart();
  updateDailyStats();
}
function updateProgressChart() {
  const canvas = document.getElementById('progressChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ✅ Filter only valid (non-expired) tasks
  const validTasks = tasks.filter(t => {
    const d = new Date(t.deadline);
    d.setHours(0, 0, 0, 0);
    return d >= today;
  });

  const complete = validTasks.filter(t => t.completed).length;
  const total = validTasks.length;

  if (progressChart) progressChart.destroy();

  progressChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Remaining'],
      datasets: [{
        data: [complete, total - complete],
        backgroundColor: ['#27ae60', '#e74c3c']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
  document.getElementById("statTasksCompleted").textContent = `${complete}/${total}`;
  const completedHours = validTasks.filter(t => t.completed).reduce((sum, t) => sum + t.estimated_hours, 0);
  const totalHours = validTasks.reduce((sum, t) => sum + t.estimated_hours, 0);
  document.getElementById("statHoursCompleted").textContent = `${completedHours}h`;
  document.getElementById("statHoursRemaining").textContent = `${Math.max(totalHours - completedHours, 0)}h`;
  document.getElementById("statProgress").textContent = totalHours ? `${Math.round((completedHours / totalHours) * 100)}%` : '0%';
  /*if (total === 0) {
    document.getElementById("statTasksCompleted").textContent = "0/0";
    document.getElementById("statHoursCompleted").textContent = "0h";
    document.getElementById("statHoursRemaining").textContent = "0h";
    document.getElementById("statProgress").textContent = "0%";
    if (progressChart) progressChart.destroy();
  }*/
}

// ✅ ADD HERE
function updateGlobalHoursAnalytics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTasks = tasks.filter(t => {
    const start = new Date(t.start_date);
    const end = new Date(t.deadline);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return today >= start && today <= end;
  });

  const getDailyHours = (task) => {
    const start = new Date(task.start_date);
    const end = new Date(task.deadline);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? task.estimated_hours / days : 0;
  };

  const completedTodayHours = todayTasks
    .filter(t => t.completed)
    .reduce((sum, t) => sum + getDailyHours(t), 0);

  const validTasks = tasks.filter(t => {
    const deadline = new Date(t.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline >= today;
  });

  const totalHours = validTasks.reduce((sum, t) => sum + t.estimated_hours, 0);

  document.getElementById("statHoursCompleted").textContent = `${completedTodayHours.toFixed(1)}h`;
  document.getElementById("statHoursRemaining").textContent = `${Math.max(totalHours - completedTodayHours, 0).toFixed(1)}h`;
}




function updateDailyStats() {
  const canvas = document.getElementById("dailyProgressChart");
  if (!canvas){
    console.warn("❌ dailyProgressChart canvas not found");
    return;
  } 
  const ctx = canvas.getContext('2d');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyTasks = tasks.filter(t => {
  const start = new Date(t.start_date);
  const end = new Date(t.deadline);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return today >= start && today <= end;
});


  const complete = dailyTasks.filter(t => t.completed);
  const getDailyHours = (task) => {
  const start = new Date(task.start_date);
  const end = new Date(task.deadline);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? task.estimated_hours / days : 0;
};

const completedHours = complete.reduce((sum, t) => sum + getDailyHours(t), 0);
const totalHours = dailyTasks.reduce((sum, t) => sum + getDailyHours(t), 0);


  document.getElementById("dailyStatTasksCompleted").textContent = `${complete.length}/${dailyTasks.length}`;
 document.getElementById("dailyStatHoursCompleted").textContent = `${completedHours.toFixed(1)}h`;
document.getElementById("dailyStatHoursRemaining").textContent = `${Math.max(totalHours - completedHours, 0).toFixed(1)}h`;

  document.getElementById("dailyStatProgress").textContent = totalHours ? `${Math.round((completedHours / totalHours) * 100)}%` : "0%";

  if (dailyProgressChart) {
    dailyProgressChart.destroy();
    dailyProgressChart = null;
  }

  if (dailyTasks.length === 0 || !ctx) {
  /*if (dailyProgressChart) dailyProgressChart.destroy();
  document.getElementById("dailyStatTasksCompleted").textContent = "0/0";
  document.getElementById("dailyStatHoursCompleted").textContent = "0h";
  document.getElementById("dailyStatHoursRemaining").textContent = "0h";
  document.getElementById("dailyStatProgress").textContent = "0%";*/
  return;
}

  // chart
  dailyProgressChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Remaining'],
      datasets: [{
        data: [complete.length, dailyTasks.length - complete.length],
        backgroundColor: ['#27ae60', '#e74c3c']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}
function showToast(message, type = "success") {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
// -------------------- Confetti --------------------
