let currentDate = new Date();
const weekdays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const loader = document.getElementById("globalLoader");

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function renderDate() {
  const dayName = weekdays[currentDate.getDay()];
  document.getElementById("currentDay").textContent = `Mes tâches pour ${dayName}`;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "show";
  setTimeout(() => toast.className = toast.className.replace("show", ""), 3000);
}

// Wrapper fetch avec loader
async function fetchWithLoader(url, options = {}) {
  try {
    loader.style.display = "flex";
    const res = await fetch(url, options);
    return await res.json();
  } finally {
    loader.style.display = "none";
  }
}

// Charger les tâches
async function loadTasks() {
  renderDate();
  const container = document.getElementById("tasksList");
  container.innerHTML = "";
  const todayDayName = weekdays[currentDate.getDay()];

  try {
    let tasks = await fetchWithLoader(`http://localhost:3000/tasks`);
    tasks = tasks.filter(t => t.date === formatDate(currentDate) || t.recurrent === todayDayName);

    if (tasks.length === 0) {
      const emptyMsg = document.createElement("p");
      emptyMsg.textContent = "Pas de tâche prévue";
      container.appendChild(emptyMsg);
      return;
    }

    tasks.forEach(t => {
      const div = document.createElement("div");
      div.className = "task" + (t.fait ? " done" : "");

      // Le texte titre dans un span séparé
      const titleSpan = document.createElement("span");
      titleSpan.className = "task-title";   // <-- important
      titleSpan.textContent = t.titre;

      div.appendChild(titleSpan);

      // Toggle "fait"
      div.onclick = async () => {
        try {
          await fetchWithLoader(`http://localhost:3000/tasks/${t.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fait: !t.fait })
          });
          loadTasks();
        } catch (e) {
          showToast("Erreur lors du toggle tâche");
        }
      };

      // Bouton options
      const optionsBtn = document.createElement("button");
      optionsBtn.className = "options-btn";
      optionsBtn.textContent = "⋮";

      // Menu options
      const optionsMenu = document.createElement("div");
      optionsMenu.className = "options-menu";

      // Éditer
      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️ Éditer";
      editBtn.onclick = (e) => {
        e.stopPropagation();
        // ouvrir modal etc.
      };

      // Supprimer
      const delBtn = document.createElement("button");
      delBtn.textContent = "❌ Supprimer";
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        // suppression
      };

      optionsMenu.appendChild(editBtn);
      optionsMenu.appendChild(delBtn);

      optionsBtn.onclick = (e) => {
        e.stopPropagation();
        optionsMenu.style.display = optionsMenu.style.display === "block" ? "none" : "block";
      };

      window.addEventListener("click", () => optionsMenu.style.display = "none");

      div.appendChild(optionsBtn);
      div.appendChild(optionsMenu);
      container.appendChild(div);
    });


  } catch (e) {
    console.error(e);
    showToast("Impossible de charger les tâches");
  }
}

// Navigation jours
document.getElementById("prevDay").onclick = () => { currentDate.setDate(currentDate.getDate() - 1); loadTasks(); };
document.getElementById("nextDay").onclick = () => { currentDate.setDate(currentDate.getDate() + 1); loadTasks(); };

// Modal
const modal = document.getElementById("taskModal");
const openBtn = document.getElementById("openModal");
const closeBtn = document.getElementById("closeModal");
const saveBtn = document.getElementById("saveTask");

openBtn.onclick = () => modal.classList.add("show");
closeBtn.onclick = () => modal.classList.remove("show");
window.onclick = (event) => { if (event.target === modal) modal.classList.remove("show"); };

// Ajouter tâche
saveBtn.onclick = async () => {
  const titre = document.getElementById("taskName").value.trim();
  const date = document.getElementById("taskDate").value;
  const recurrent = document.getElementById("taskRecurrent").value;
  if (!titre) { showToast("Le nom est obligatoire !"); return; }
  if (!date && !recurrent) { showToast("Date ou récurrence obligatoire !"); return; }

  const task = { titre, fait: false, date: date || "", recurrent: recurrent || "" };

  try {
    await fetchWithLoader("http://localhost:3000/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task)
    });
    modal.classList.remove("show");
    document.getElementById("taskName").value = "";
    document.getElementById("taskDate").value = "";
    document.getElementById("taskRecurrent").value = "";
    loadTasks();
  } catch (e) {
    showToast("Impossible de créer la tâche");
  }
};

document.addEventListener("DOMContentLoaded", loadTasks);