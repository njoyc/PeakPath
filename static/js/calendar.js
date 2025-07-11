let calendar;
let calendarInitialized = false;

document.addEventListener('DOMContentLoaded', function () {
    initializeCalendar();

    document.getElementById('addTaskBtn')?.addEventListener('click', addTask);
    document.getElementById('tasksList')?.addEventListener('click', async function (e) {
        if (e.target.classList.contains('delete-task')) {
            const index = e.target.dataset.index;
            await deleteTask(index);
        }
    });

    refreshTasksList();
});

// ----------------- Calendar Init -----------------
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    if (calendarInitialized && calendar) {
        calendar.destroy();
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 500,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: function (info, successCallback, failureCallback) {
            generateStudyEvents().then(successCallback).catch(failureCallback);
        },
        eventDisplay: 'block',
        dayMaxEvents: 3,
        moreLinkClick: 'popover',
        eventDidMount: function (info) {
            if (info.event.extendedProps.description) {
                info.el.setAttribute('title', info.event.extendedProps.description);
            }
        }
    });

    calendar.render();
    calendarInitialized = true;
    window.calendar = calendar;
}

// ----------------- Fetch & Generate Events -----------------
async function generateStudyEvents() {
    const events = [];
    let allTasks = [];

    try {
        const res = await fetch('/api/tasks');
        allTasks = await res.json();
    } catch (err) {
        console.error('Failed to fetch tasks for calendar:', err);
        return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const task of allTasks) {
        if (!task.deadline || task.completed) continue;

        const startDate = new Date(task.start_date || today);
        const endDate = new Date(task.deadline);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        if (endDate < today) continue;
        if (endDate < startDate) continue;

        const completedDates = Array.isArray(task.completed_dates) ? task.completed_dates : [];

        const rangeStart = new Date(Math.max(startDate, today));
        const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const dailyHours = (parseFloat(task.estimated_hours) / days).toFixed(2);

        let current = new Date(rangeStart);
        while (current <= endDate) {
            const dateStr = formatDateOnly(current);

            // ✅ Skip this date if marked complete
            if (completedDates.includes(dateStr)) {
                current.setDate(current.getDate() + 1);
                continue;
            }

            const isPast = current < today;
            const bg = isPast ? '#ff5555' : '#00ff88';
            const border = isPast ? '#ff0000' : '#00cc77';

            events.push({
                title: `📚 ${task.name} (${dailyHours}h)`,
                start: dateStr,
                backgroundColor: bg,
                borderColor: border,
                classNames: ['study-event'],
                description: isPast
                    ? `⚠️ Missed study for ${task.name}`
                    : `Study ${task.name} for ${dailyHours} hours`
            });

            current.setDate(current.getDate() + 1);
        }
    }

    return events;
}

// ----------------- Add Task (POST to Flask) -----------------
async function addTask() {
    const name = document.getElementById('taskName').value.trim();
    const deadline = document.getElementById('taskDeadline').value;
    const estimated_hours = parseFloat(document.getElementById('taskHours').value);

    if (!name || !deadline || isNaN(estimated_hours)) return;

    const task = {
        name: name,
        type: 'Custom',
        deadline: deadline,
        estimated_hours: estimated_hours,
        difficulty: 2 // default
    };

    await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });

    refreshTasksList();
    calendar.refetchEvents();

    document.getElementById('taskName').value = '';
    document.getElementById('taskDeadline').value = '';
    document.getElementById('taskHours').value = '';
}

// ----------------- Delete Task (DELETE to Flask) -----------------
async function deleteTask(index) {
    const allTasks = await fetch('/api/tasks').then(res => res.json());
    const task = allTasks[index];
    if (!task) return;

    await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id })
    });

    refreshTasksList();
    calendar.refetchEvents();
}

// ----------------- Refresh Task List -----------------
async function refreshTasksList() {
    const taskListEl = document.getElementById('tasksList');
    if (!taskListEl) return;

    const allTasks = await fetch('/api/tasks').then(res => res.json());
    taskListEl.innerHTML = allTasks.map((task, index) => `
        <li style="margin-bottom: 10px;">
            <strong>${task.name}</strong><br>
            🗓️ ${task.deadline} | ⏱️ ${task.estimated_hours}h
            ${task.completed ? '<span style="color:green;">✔️ Done</span>' : ''}
            <button class="delete-task" data-index="${index}">❌ Delete</button>
        </li>
    `).join('');
}

// ----------------- Format Date for FullCalendar -----------------
function formatDateOnly(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
