const taskList = document.getElementById("taskList");
const dayTitle = document.getElementById("dayTitle");
const prevDayBtn = document.getElementById("prevDayBtn");
const nextDayBtn = document.getElementById("nextDayBtn");
const errorMessage = document.getElementById("errorMessage");

const addTaskModal = document.getElementById("addTaskModal");
const openAddTaskBtn = document.getElementById("openAddTaskBtn");
const closeModalBtn = document.querySelector(".close");

const newTaskInput = document.getElementById("newTaskInput");
const taskDaySelect = document.getElementById("taskDay");
const taskDateInput = document.getElementById("taskDate");
const taskRecurrentCheckbox = document.getElementById("taskRecurrent");
const addTaskBtn = document.getElementById("addTaskBtn");

const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzld0iHmXKE7MjD7EhTWDE3lMTldfoNWhd2qt2luzsXsfauDSQXSn16C3bWm2A6MWI/exec"; // Remplacer par l'URL de déploiement
const days = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
let currentDayIndex = new Date().getDay();

// ----------------- Modal -----------------
openAddTaskBtn.addEventListener("click", () => addTaskModal.style.display = "block");
closeModalBtn.addEventListener("click", () => addTaskModal.style.display = "none");
window.addEventListener("click", e => { if(e.target === addTaskModal) addTaskModal.style.display = "none"; });

// ----------------- Fetch tasks -----------------
async function fetchAllTasks() {
  try {
    const res = await fetch(WEBAPP_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ action: "get" })
    });
    if (!res.ok) throw new Error("Impossible de charger les tâches");
    return await res.json();
  } catch(err) {
    console.error(err);
    errorMessage.textContent = "Erreur lors du chargement des tâches";
    return [];
  }
}

// ----------------- Render tasks -----------------
async function renderTasks() {
  taskList.innerHTML = "";
  errorMessage.textContent = "";
  const todayName = days[currentDayIndex];
  dayTitle.textContent = `📝 Mes tâches pour ${todayName}`;

  const allTasks = await fetchAllTasks();
  const tasks = allTasks.filter(t => t.jour === todayName);

  if(tasks.length === 0){
    const li = document.createElement("li");
    li.textContent = "Aucune tâche pour ce jour ✅";
    li.style.fontStyle = "italic";
    li.style.color = "#888";
    li.style.textAlign = "center";
    li.style.cursor = "default";
    taskList.appendChild(li);
    return;
  }

  tasks.forEach(task => {
    const li = document.createElement("li");
    li.textContent = `${task.tâche}${task.recurrent ? " 🔁" : ""}${task.date ? " (" + task.date + ")" : ""}`;
    if(task.done) li.classList.add("done");

    li.addEventListener("click", async () => {
      task.done = !task.done;
      await fetch(WEBAPP_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"update", jour:todayName, tâche:task.tâche, done:task.done })
      });
      renderTasks();
    });

    li.addEventListener("contextmenu", async e => {
      e.preventDefault();
      if(confirm(`Supprimer "${task.tâche}" ?`)){
        await fetch(WEBAPP_URL,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ action:"delete", jour:todayName, tâche:task.tâche })
        });
        renderTasks();
      }
    });

    taskList.appendChild(li);
  });
}

// ----------------- Navigation -----------------
prevDayBtn.addEventListener("click", () => { currentDayIndex = (currentDayIndex+6)%7; renderTasks(); });
nextDayBtn.addEventListener("click", () => { currentDayIndex = (currentDayIndex+1)%7; renderTasks(); });

// ----------------- Ajouter tâche -----------------
addTaskBtn.addEventListener("click", async () => {
  const text = newTaskInput.value.trim();
  const day = taskDaySelect.value;
  const date = taskDateInput.value;
  const recurrent = taskRecurrentCheckbox.checked;

  if(!text) return alert("Veuillez saisir le nom de la tâche.");

  await fetch(WEBAPP_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ action:"add", jour:day, tâche:text, done:false, date, recurrent })
  });

  addTaskModal.style.display = "none";
  newTaskInput.value = "";
  taskDateInput.value = "";
  taskRecurrentCheckbox.checked = false;

  renderTasks();
});

// ----------------- Initialisation -----------------
renderTasks();
