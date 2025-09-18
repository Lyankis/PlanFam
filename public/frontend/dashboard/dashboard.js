document.addEventListener("DOMContentLoaded", async () => {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.style.display = "flex";
  API_BASE = "https://planfam.onrender.com";

  try {
    await loadCards();
    initModal(); // initialise le modal
  } finally {
    if (loader) loader.style.display = "none";
  }
});

async function loadCards() {
  const cards = [
    { title: "Planning tâches", link: "../planFam/planFam.html" },
    { title: "Liste courses", link: "../listCourse/listCourse.html" },
    { title: "Prise de note", link: "../priseNote/priseNote.html" },
    { title: "Autre", link: "#" }
  ];

  const container = document.getElementById("cards");
  container.innerHTML = "";

  // --- Récupération des tâches ---
  let previewTasks = [];
  try {
    const today = new Date().toISOString().slice(0, 10);
    const weekdays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const todayName = weekdays[new Date().getDay()];

    const res = await fetch(`${API_BASE}/tasks`);
    const tasks = await res.json();

    previewTasks = tasks.filter(t => {
      const isToday = t.date === today;
      const isRecurrentToday = t.recurrent && t.recurrent === todayName;
      return isToday || isRecurrentToday;
    });
  } catch (e) {
    console.error("Erreur fetch tasks preview:", e);
    previewTasks = [];
  }

  // --- Récupération des listes de courses ---
  let listCourses = [];
  try {
    const res = await fetch(`http://localhost:3000/listcourses`);
    listCourses = await res.json();
  } catch (err) {
    console.error("Erreur fetch listCourses:", err);
    listCourses = [];
  }

  cards.forEach(card => {
    const div = document.createElement("div");
    div.className = "card";

    const title = document.createElement("h3");
    title.textContent = card.title;
    div.appendChild(title);

    // --- Planning tâches ---
    if (card.title === "Planning tâches") {
      div.classList.add("planning");

      if (previewTasks.length > 0) {
        const tasksContainer = document.createElement("div");
        tasksContainer.className = "tasks-container";

        previewTasks.forEach(t => {
          const taskDiv = document.createElement("div");
          taskDiv.className = "task" + (t.fait ? " done" : "");

          const titleSpan = document.createElement("span");
          titleSpan.textContent = t.titre;

          const statusSpan = document.createElement("span");
          statusSpan.className = "status";
          statusSpan.textContent = t.fait ? "✅" : "";

          taskDiv.appendChild(titleSpan);
          taskDiv.appendChild(statusSpan);

          taskDiv.addEventListener("click", async (e) => {
            e.stopPropagation();
            t.fait = !t.fait;
            taskDiv.classList.toggle("done", t.fait);
            statusSpan.textContent = t.fait ? "✅" : "";

            try {
              await fetch(`${API_BASE}/tasks/${t.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(t)
              });
            } catch (err) {
              console.error("Erreur mise à jour tâche:", err);
            }
          });

          tasksContainer.appendChild(taskDiv);
        });

        div.appendChild(tasksContainer);
      } else {
        const p = document.createElement("div");
        p.className = "no-tasks";
        p.textContent = "Aucune tâche aujourd’hui";
        div.appendChild(p);
      }

      // ✅ Ajout du clic sur toute la carte → ouvre planFam.html
      div.addEventListener("click", () => {
        window.location.href = card.link;
      });
    }

    // --- Liste de courses (aperçu) ---
    else if (card.title === "Liste courses") {
      div.classList.add("courses-preview");

      if (listCourses.length > 0) {
        const coursesContainer = document.createElement("div");
        coursesContainer.className = "courses-container";

        listCourses.forEach(l => {
          const itemDiv = document.createElement("div");
          itemDiv.className = "course-item";

          const titleEl = document.createElement("h4");
          titleEl.textContent = l.title;

          const descEl = document.createElement("p");
          descEl.textContent = l.description ? l.description.split('\n')[0] : "";

          itemDiv.appendChild(titleEl);
          itemDiv.appendChild(descEl);

          // clic sur un item → ouvre modal
          itemDiv.addEventListener("click", (e) => {
            e.stopPropagation();
            openViewModalDashboard(l);
          });

          coursesContainer.appendChild(itemDiv);
        });

        div.appendChild(coursesContainer);
      } else {
        const p = document.createElement("div");
        p.className = "no-tasks";
        p.textContent = "Aucune liste de courses";
        div.appendChild(p);
      }

      // clic sur la carte → ouvre page listCourse.html
      div.addEventListener("click", () => {
        window.location.href = card.link;
      });
    }

    // --- Autres cartes ---
    else {
      const p = document.createElement("p");
      p.style.margin = "8px 0 0 0";
      p.style.color = "#6b7280";
      p.textContent = "Ouvrir";
      div.appendChild(p);

      div.addEventListener("click", () => {
        window.location.href = card.link;
      });
    }

    container.appendChild(div);
  });
}

/* === MODAL === */
function initModal() {
  const modal = document.getElementById("viewModalDashboard");
  const closeBtn = document.getElementById("closeViewModalDashboard");
  const closeBtnSecondary = document.getElementById("closeBtnDashboard"); // bouton "Fermer"
  const saveBtn = document.getElementById("saveViewDashboard");
  const titleInput = document.getElementById("viewTitleInputDashboard");
  const descInput = document.getElementById("viewDescriptionInputDashboard");
  const loader = document.getElementById("globalLoader");

  // Fermer avec la croix
  closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
  });

  // Fermer avec le bouton "Fermer"
  closeBtnSecondary.addEventListener("click", () => {
    modal.classList.remove("show");
  });

  // Sauvegarder
  saveBtn.addEventListener("click", async () => {
    if (!modal.dataset.id) return;

    const updated = {
      id: modal.dataset.id,
      title: titleInput.value,
      description: descInput.value
    };

    try {
      if (loader) loader.style.display = "flex"; // afficher loader

      await fetch(`${API_BASE}/listcourses/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });

      modal.classList.remove("show");
      await loadCards(); // rafraîchir le dashboard
    } catch (err) {
      console.error("Erreur sauvegarde liste de courses:", err);
    } finally {
      if (loader) loader.style.display = "none"; // cacher loader
    }
  });
}

// ouvre modal et remplit les champs
function openViewModalDashboard(course) {
  const modal = document.getElementById("viewModalDashboard");
  const titleInput = document.getElementById("viewTitleInputDashboard");
  const descInput = document.getElementById("viewDescriptionInputDashboard");

  modal.dataset.id = course.id;
  titleInput.value = course.title;
  descInput.value = course.description || "";
  modal.classList.add("show");
}