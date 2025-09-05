const taskList = document.getElementById("taskList");
const dayTitle = document.getElementById("dayTitle");
const prevDayBtn = document.getElementById("prevDayBtn");
const nextDayBtn = document.getElementById("nextDayBtn");
const exportBtn = document.getElementById("exportBtn");
const reloadJsonBtn = document.getElementById("reloadJsonBtn");
const errorMessage = document.getElementById("errorMessage");

let tasks = [];
let tasksJson = {};
const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
let currentDayIndex = new Date().getDay(); // commence sur le jour actuel

// -------------------- Fonctions --------------------

// Affiche le titre et les tâches du jour
function renderTasks() {
  taskList.innerHTML = "";
  errorMessage.textContent = "";

  const todayName = days[currentDayIndex];
  dayTitle.textContent = `📝 Mes tâches pour ${todayName}`;

  tasks = tasksJson[todayName] || [];

  if (!tasks || tasks.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aucune tâche pour ce jour ✅";
    li.style.fontStyle = "italic";
    li.style.color = "#888";
    li.style.textAlign = "center";
    li.style.cursor = "default";
    taskList.appendChild(li);
    return;
  }

  tasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.textContent = task.text;
    if (task.done) li.classList.add("done");

    li.addEventListener("click", () => {
      tasks[index].done = !tasks[index].done;
      saveToLocalStorage();
      renderTasks();
    });

    taskList.appendChild(li);
  });
}

// Charger le JSON depuis le serveur
function loadTasksJson() {
  fetch('tasks.json')
    .then(res => {
      if (!res.ok) throw new Error("Impossible de charger tasks.json");
      return res.json();
    })
    .then(data => {
      tasksJson = data;
      saveToLocalStorage(); // sauvegarde dans localStorage si vide
      renderTasks();
    })
    .catch(err => {
      errorMessage.textContent = "Erreur : impossible de charger les tâches depuis tasks.json.";
      console.error(err);
    });
}

// Sauvegarder dans localStorage
function saveToLocalStorage() {
  localStorage.setItem('tasksJson', JSON.stringify(tasksJson));
}

// Charger depuis localStorage ou tasks.json si vide
function loadTasks() {
  const localData = localStorage.getItem('tasksJson');
  if (localData) {
    tasksJson = JSON.parse(localData);
    renderTasks();
  } else {
    loadTasksJson();
  }
}

// Navigation entre les jours
prevDayBtn.addEventListener("click", () => {
  currentDayIndex = (currentDayIndex + 6) % 7; // recule d'un jour
  renderTasks();
});

nextDayBtn.addEventListener("click", () => {
  currentDayIndex = (currentDayIndex + 1) % 7; // avance d'un jour
  renderTasks();
});

// Bouton recharger tasks.json manuellement
reloadJsonBtn.addEventListener("click", () => {
  loadTasksJson();
});

// Exporter JSON
exportBtn.addEventListener("click", () => {
  if (!tasksJson || Object.keys(tasksJson).length === 0) {
    alert("Aucune liste à exporter !");
    return;
  }

  tasksJson[days[currentDayIndex]] = tasks;
  saveToLocalStorage();

  const blob = new Blob([JSON.stringify(tasksJson, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mes_taches.json";
  a.click();
  URL.revokeObjectURL(url);
});

// -------------------- Initialisation --------------------
loadTasks();