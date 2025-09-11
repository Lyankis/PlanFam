document.addEventListener("DOMContentLoaded", async () => {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.style.display = "flex"; // montrer le loader au début

  await loadCards();

  // Cacher le loader après chargement complet
  if (loader) loader.style.display = "none";
});

async function loadCards() {
  const cards = [
    { title: "Planning familial", link: "../planFam/planFam.html" },
    { title: "Liste courses", link: "#" }
  ];

  const container = document.getElementById("cards");
  container.innerHTML = "";

  // Charger un aperçu des tâches pour le planning familial
  let previewTasks = [];
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`http://localhost:3000/tasks`);
    const tasks = await res.json();
    previewTasks = tasks.filter(t => t.date === today).slice(0, 3); // 3 tâches max
  } catch (e) {
    console.error(e);
  }

  cards.forEach(card => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<h3>${card.title}</h3>`;

    if (card.title === "Planning familial") {
      if (previewTasks.length > 0) {
        const ul = document.createElement("ul");
        previewTasks.forEach(t => {
          const li = document.createElement("li");
          li.textContent = `${t.titre} ${t.fait ? "✅" : "❌"}`;
          ul.appendChild(li);
        });
        div.appendChild(ul);
      } else {
        const p = document.createElement("p");
        p.textContent = "Aucune tâche aujourd’hui";
        div.appendChild(p);
      }
    }

    div.onclick = () => window.location.href = card.link;
    container.appendChild(div);
  });
}