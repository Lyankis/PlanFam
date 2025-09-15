const loader = document.getElementById("globalLoader");
const API_BASE = "http://localhost:3000";

// === Toast ===
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// === Fetch avec loader ===
async function fetchWithLoader(url, options = {}) {
  try {
    loader.style.display = "flex";
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} - ${text}`);
    }
    if (res.status === 204) return null;
    return await res.json();
  } finally {
    loader.style.display = "none";
  }
}

// === Chargement des listes ===
async function loadListCourses() {
  const container = document.getElementById("courseList");
  if (!container) return;
  container.innerHTML = "";

  try {
    const listCourses = await fetchWithLoader(`${API_BASE}/listcourses`);

    if (!listCourses || listCourses.length === 0) {
      const emptyMsg = document.createElement("p");
      emptyMsg.textContent = "Pas de liste de courses";
      container.appendChild(emptyMsg);
      return;
    }

    listCourses.forEach(t => {
      const div = document.createElement("div");
      div.className = "listCourse" + (t.fait ? " done" : "");

      // Titre
      const titleSpan = document.createElement("span");
      titleSpan.className = "listeCourse-title";
      titleSpan.textContent = t.title || "(sans titre)";
      div.appendChild(titleSpan);

      // Bouton options
      const optionsBtn = document.createElement("button");
      optionsBtn.className = "options-btn";
      optionsBtn.textContent = "⋮";

      const optionsMenu = document.createElement("div");
      optionsMenu.className = "options-menu";

      // Bouton éditer
      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️ Éditer";
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openModalForEdit(t);
        optionsMenu.classList.remove("show");
      });

      // Bouton supprimer
      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑️ Supprimer";
      delBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await fetchWithLoader(`${API_BASE}/listcourses/${t.id}`, { method: "DELETE" });
          showToast("Liste supprimée !");
          loadListCourses();
        } catch (err) {
          console.error(err);
          showToast("Erreur lors de la suppression");
        }
      });

      optionsMenu.appendChild(editBtn);
      optionsMenu.appendChild(delBtn);

      // Gestion du clic sur le bouton options
      optionsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        // Ferme tous les autres menus
        document.querySelectorAll(".options-menu").forEach(menu => {
          if (menu !== optionsMenu) menu.classList.remove("show");
        });
        // Toggle menu actuel
        optionsMenu.classList.toggle("show");
      });

      // Toggle fait
      div.addEventListener("click", async (e) => {
        if (e.target.classList.contains("options-btn") || e.target.closest(".options-menu")) return;
        try {
          await fetchWithLoader(`${API_BASE}/listcourses/${t.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fait: !t.fait })
          });
          loadListCourses();
        } catch (err) {
          console.error(err);
          showToast("Erreur lors du toggle");
        }
      });

      div.appendChild(optionsBtn);
      div.appendChild(optionsMenu);
      container.appendChild(div);
    });

    // Fermer tous les menus si on clique ailleurs
    window.addEventListener("click", () => {
      document.querySelectorAll(".options-menu").forEach(m => m.classList.remove("show"));
    });
  } catch (err) {
    console.error(err);
    showToast("Impossible de charger les listes de courses");
  }
}

// === Modal ===
const modal = document.getElementById("listCourseModal");
const openBtn = document.getElementById("openModal");
const closeBtn = document.getElementById("closeModal");
const saveBtn = document.getElementById("saveTask");
const editingIdInput = document.getElementById("editingId");
const nameInput = document.getElementById("listCourseName");
const dateInput = document.getElementById("listCourseDate");
const itemsInput = document.getElementById("listCourseItems");

function openModalForEdit(item) {
  editingIdInput.value = item.id;
  nameInput.value = item.title || "";
  dateInput.value = (item.dateCrea || "").slice(0, 10);
  itemsInput.value = item.description || "";
  document.getElementById("modalTitle").textContent = "Modifier la liste";
  modal.classList.add("show");
}

function openModalForNew() {
  editingIdInput.value = "";
  nameInput.value = "";
  dateInput.value = "";
  itemsInput.value = "";
  document.getElementById("modalTitle").textContent = "Nouvelle liste";
  modal.classList.add("show");
}

openBtn.addEventListener("click", openModalForNew);
closeBtn.addEventListener("click", () => modal.classList.remove("show"));
window.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("show"); });

// Sauvegarde (create/update)
saveBtn.onclick = async () => {
  const title = nameInput.value.trim();
  const description = itemsInput.value.trim();

  if (!title) { showToast("Le nom est obligatoire !"); return; }

  const editingId = editingIdInput.value;

  try {
    if (editingId) {
      await fetchWithLoader(`${API_BASE}/listcourses/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description })
      });
      showToast("Liste mise à jour !");
    } else {
      await fetchWithLoader(`${API_BASE}/listcourses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description })
      });
      showToast("Liste créée !");
    }

    modal.classList.remove("show");
    nameInput.value = "";
    dateInput.value = "";
    itemsInput.value = "";

    loadListCourses();
  } catch {
    showToast("Impossible d'enregistrer la liste");
  }
};

// Empêche la fermeture du menu si on clique dedans
document.addEventListener("DOMContentLoaded", loadListCourses);
document.querySelectorAll('.options-menu').forEach(menu => {
  menu.addEventListener('click', e => e.stopPropagation());
});