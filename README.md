📚 PeakPath – Your AI-Powered Study Planner & Productivity Dashboard

PeakPath is a full-stack AI-driven study planner built with **Flask**, **SQLite**, **JavaScript**, and **FullCalendar**, packed with productivity features like:

- ✅ Smart task scheduling
- 📅 Real-time calendar syncing
- 🔔 Progress analytics
- ⏱️ Pomodoro timer
- 🤖 StudyBot (powered by LLaMA/Groq)
- 🧠 Key points journaling
- 🎯 Theme-aware UI

🚀 Features

| Feature                    | Description                                                    |
| -------------------------- | -------------------------------------------------------------- |
| 📋 Task Management         | Add tasks with type, difficulty, and estimated hours           |
| 📅 Calendar Integration    | FullCalendar integration with automatic task splitting         |
| 🧠 AI StudyBot             | Powered by LLaMA (via Groq API), answers study-related queries |
| 📊 Analytics               | See total/completed tasks, hours, and daily progress           |
| ⏱ Pomodoro Timer           | Classic 25-5 Pomodoro focus tool with animation                |
| 🌙 Theme Switcher          | Supports aesthetic/dark themes (via `mode.js`)                 |
| ✨ Overdue Detection       | Red color marking + deadline validation                        |
| 📌 Key Points              | Save and manage key insights locally                           |
| 📤 Export to CSV           | Download your tasks instantly                                  |
| 🔐 \*\*User Authentication | Secure registration and login                                  |

🛠️ Tech Stack

- **Backend:** Flask, Flask-Login, SQLite, SQLAlchemy
- **Frontend:** HTML5, SCSS, JavaScript, Chart.js, FullCalendar.js
- **AI:** LLaMA 3 via Groq API (or OpenAI if preferred)
- **Auth:** Flask-Login with hashed passwords
- **Database:** SQLite (via SQLAlchemy ORM)

📦 Installation

# 1. Clone the Repository

```bash
git clone https://github.com/yourusername/peakpath-study-planner.git
cd peakpath-study-planner
```

# 2. Create & Activate a Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
```

# 3. Install Dependencies

```bash
pip install -r requirements.txt
```

# 4. Setup Environment Variables

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_key_here
```

# 🧪 Running the App

```bash
python app.py
```

Visit: [http://localhost:3000](http://localhost:3000)

# 🧠 AI StudyBot Setup

The StudyBot uses **Groq API** + LLaMA-3 by default. You can customize the `app.py` model here:

```python
"model": "meta-llama/llama-4-scout-17b-16e-instruct"
```

Or switch to `openai.ChatCompletion.create()` if you're using OpenAI.

# 📁 Project Structure

```
📦 peakpath/
├── static/
│   ├── js/
│   │   ├── script.js         ← All dashboard logic
│   │   ├── calendar.js       ← Calendar integration
│   │   ├── mode.js           ← Theme switching
│   │   └── studybot.js       ← StudyBot chat logic
│   └── css/
│       └── styles.css
├── templates/
│   ├── base.html
│   ├── dashboard.html
│   ├── login.html
│   └── register.html
├── app.py                   ← Flask backend
├── .env                     ← Secrets & API keys
├── requirements.txt
└── README.md                ← You’re here
```

# 💡 Future Enhancements

- ✅ Edit/update tasks via modal or inline
- 🗃️ Task categories or subjects
- 🌍 Sync with Google Calendar
- 🔔 Push/email reminders
- 📱 Mobile-friendly responsive UI

# 🙌 Acknowledgements

- [FullCalendar.js](https://fullcalendar.io/)
- [Chart.js](https://www.chartjs.org/)
- [Groq](https://console.groq.com/)
- [OpenAI](https://openai.com/)
- [FontAwesome](https://fontawesome.com/)
- [LLaMA 3](https://llama.meta.com/)

# 🧠 Built With Purpose

> “Study smarter, not harder.”
> This tool was created to bring structure, clarity, and intelligent planning into every student’s life — one task at a time.
