// -------------------- StudyBot Config -------------------- //
let studyBot = {
  isOpen: false,
  responses: [
    "Keep up the great work! 💪",
    "How about a short break and some deep breaths? 🌬️",
    "Reviewing yesterday’s notes can really boost retention! 🧠",
    "Finish one more task before a reward break! 🎉",
    "Stay hydrated and don’t skip meals! 🍎",
    "Try using a Pomodoro timer for focused bursts! ⏱️",
    "Mix up subjects to keep your brain active! 🌀",
    "Remember your long-term goal—one step at a time! 🚀"
  ]
};

const userId = document.body.getAttribute("data-user-id"); // Inject this from Flask
let chatHistory = JSON.parse(localStorage.getItem(`studybotHistory-${userId}`)) || [];

function updateStorage() {
  localStorage.setItem(`studybotHistory-${userId}`, JSON.stringify(chatHistory));
}


// -------------------- Initialization -------------------- //
document.addEventListener("DOMContentLoaded", () => {
  initializeStudyBot();
  startStudyBotReminders();
  renderChatHistory();
});

function initializeStudyBot() {
  const botToggle = document.querySelector(".studybot-toggle");
  const botClose = document.querySelector(".studybot-close");
  const botSend = document.getElementById("studybotSend");
  const botInput = document.getElementById("studybotInput");
  const clearChat = document.getElementById("studybotClear");

  if (botToggle) botToggle.addEventListener("click", toggleStudyBot);
  if (botClose) botClose.addEventListener("click", closeStudyBot);
  if (clearChat) clearChat.addEventListener("click", clearChatHistory);
  if (botSend) botSend.addEventListener("click", sendMessage);
  if (botInput) {
    botInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  if (chatHistory.length === 0) {
    addBotMessage("Hi! I'm StudyBot 🤖 powered by Groq. Ask me anything about studying, motivation, or productivity!");
  }
}

// -------------------- Toggle -------------------- //
function toggleStudyBot() {
  studyBot.isOpen ? closeStudyBot() : openStudyBot();
}

function openStudyBot() {
  const chatContainer = document.querySelector(".studybot-chat");
  if (chatContainer) {
    chatContainer.style.display = "flex";
    studyBot.isOpen = true;
  }
}

function closeStudyBot() {
  const chatContainer = document.querySelector(".studybot-chat");
  if (chatContainer) {
    chatContainer.style.display = "none";
    studyBot.isOpen = false;
  }
}

function clearChatHistory() {
  chatHistory = [];
  localStorage.removeItem("studybotHistory");
  renderChatHistory();
  addBotMessage("🧹 Chat history cleared. Let's start fresh!");
}

// -------------------- Message Logic -------------------- //
function sendMessage() {
  const input = document.getElementById("studybotInput");
  if (!input || !input.value.trim()) return;

  const message = input.value.trim();
  chatHistory.push({ role: "user", content: message });
  updateStorage();
  renderChatHistory();
  input.value = "";

  showTypingAnimation();

  fetch("/studybot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: chatHistory })
  })
    .then((res) => res.json())
    .then((data) => {
      hideTypingAnimation();
      const botMsg = data.reply || "⚠️ No response from StudyBot.";
      chatHistory.push({ role: "assistant", content: botMsg });
      updateStorage();
      renderChatHistory();
    })
    .catch(() => {
      hideTypingAnimation();
      addBotMessage("❌ Error contacting StudyBot.");
    });
}

function renderChatHistory() {
  const messages = document.getElementById("studybotMessages");
  messages.innerHTML = "";
  chatHistory.forEach((entry) => {
    const msg = document.createElement("div");
    msg.className = `message ${entry.role === "user" ? "user" : "bot"}`;
    msg.textContent = entry.content;
    messages.appendChild(msg);
  });
  messages.scrollTop = messages.scrollHeight;
}

function updateStorage() {
  localStorage.setItem("studybotHistory", JSON.stringify(chatHistory));
}

function addUserMessage(text) {
  chatHistory.push({ role: "user", content: text });
  updateStorage();
  renderChatHistory();
}

function addBotMessage(text) {
  chatHistory.push({ role: "assistant", content: text });
  updateStorage();
  renderChatHistory();
}

// -------------------- Typing Animation -------------------- //
function showTypingAnimation() {
  const messages = document.getElementById("studybotMessages");
  const typingEl = document.createElement("div");
  typingEl.className = "message bot typing";
  typingEl.innerHTML = `<span class="typing-text">StudyBot is typing<span class="dots"></span></span>`;
  typingEl.id = "typingAnimation";
  messages.appendChild(typingEl);
  messages.scrollTop = messages.scrollHeight;
}

function hideTypingAnimation() {
  const typingEl = document.getElementById("typingAnimation");
  if (typingEl) typingEl.remove();
}

// -------------------- Encouragement + Stats -------------------- //
function startStudyBotReminders() {
  setInterval(() => {
    if (Math.random() < 0.3) {
      const tip = studyBot.responses[Math.floor(Math.random() * studyBot.responses.length)];
      addBotMessage(tip);
      showBotNotification();
    }
  }, 30 * 60 * 1000);

  setTimeout(checkStudyProgress, 5 * 60 * 1000);
}

function showBotNotification() {
  const botToggle = document.querySelector(".studybot-toggle");
  if (botToggle && !studyBot.isOpen) {
    botToggle.style.animation = "pulse 1.5s ease-in-out 3";

    if (!document.getElementById("bot-pulse-style")) {
      const style = document.createElement("style");
      style.id = "bot-pulse-style";
      style.innerHTML = `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

function checkStudyProgress() {
  if (typeof tasks === 'undefined' || tasks.length === 0) return;

  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const completionRate = completed / total;

  if (completionRate >= 0.7) {
    addBotMessage("🔥 You're crushing it! Over 70% of your tasks are done!");
  } else if (completionRate < 0.3) {
    addBotMessage("⚠️ Let's pick up the pace! Try finishing one small task right now.");
  }

  const today = new Date();
  const urgent = tasks.filter(task => {
    const due = new Date(task.deadline);
    const daysLeft = (due - today) / (1000 * 60 * 60 * 24);
    return daysLeft <= 2 && !task.completed;
  });

  if (urgent.length > 0) {
    addBotMessage(`🚨 You have ${urgent.length} task(s) due soon! Prioritize them now.`);
  }

  setTimeout(checkStudyProgress, 15 * 60 * 1000);
}