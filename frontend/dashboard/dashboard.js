document.addEventListener("DOMContentLoaded", async () => {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.style.display = "flex";

  try {
    await loadCards();
  } finally {
    if (loader) loader.style.display = "none";
  }
});

async function loadCards() {
  const cards = [
    { title: "Planning tâches", link: "../planFam/planFam.html" },
    { title: "Liste courses", link: "#" },
    { title: "Prise de note", link: "#" },
    { title: "Autre", link: "#" }
  ];

  const container = document.getElementById("cards");
  container.innerHTML = "";

  let previewTasks = [];
  try {
    const today = new Date().toISOString().slice(0, 10);
    const weekdays = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
    const todayName = weekdays[new Date().getDay()];

    const res = await fetch(`http://localhost:3000/tasks`);
    const tasks = await res.json();

    // inclut tâches du jour ou récurrentes du jour
    previewTasks = tasks.filter(t => {
      const isToday = t.date === today;
      const isRecurrentToday = t.recurrent && t.recurrent === todayName;
      return isToday || isRecurrentToday;
    })
  } catch (e) {
    console.error("Erreur fetch tasks preview:", e);
    previewTasks = [];
  }

  cards.forEach(card => {
    const div = document.createElement("div");
    div.className = "card";

    const title = document.createElement("h3");
    title.textContent = card.title;
    div.appendChild(title);

    if (card.title === "Planning tâches") {
      div.classList.add("planning"); // classe spéciale pour scroll

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

          // clic sur tâche → toggle fait/non fait
          taskDiv.addEventListener("click", async (e) => {
            e.stopPropagation();
            t.fait = !t.fait;
            taskDiv.classList.toggle("done", t.fait);
            statusSpan.textContent = t.fait ? "✅" : "";

            try {
              await fetch(`http://localhost:3000/tasks/${t.id}`, {
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
    } else {
      const p = document.createElement("p");
      p.style.margin = "8px 0 0 0";
      p.style.color = "#6b7280";
      p.textContent = "Ouvrir";
      div.appendChild(p);
    }

    // clic ailleurs sur la carte → ouvre la page liée
    div.addEventListener("click", () => {
      window.location.href = card.link;
    });

    container.appendChild(div);
  });
}
