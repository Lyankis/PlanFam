import express from "express";
import { google } from "googleapis";
import bodyParser from "body-parser";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json());
app.use(cors());

// =================== CONFIG ===================
const SPREADSHEET_ID = "1KWfsKbiy5w2OVRnAD44DcmJf2vMOYIA-AFeNyuhiYyA";
const SHEET_TASKS = "PlanFam";
const SHEET_LISTCOURSE = "ListCourse";

console.log("GOOGLE_SERVICE_ACCOUNT_JSON =", process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? "LOADED" : "UNDEFINED");

let credentials;
try {
  credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
} catch (err) {
  console.error("❌ GOOGLE_SERVICE_ACCOUNT_JSON est invalide ou manquant !");
  process.exit(1); // Arrête le serveur proprement
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({ version: "v4", auth });

// =================== HELPERS ===================
async function getRows(sheetName, range = "A:E") {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`
  });
  return res.data.values || [];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

async function getSheetId(sheetName) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  return sheet?.properties.sheetId;
}

//#region TASK ROUTES
// =================== ROUTES TASKS ===================

// GET toutes les tâches
app.get("/tasks", async (req, res) => {
  try {
    const rows = await getRows(SHEET_TASKS, "A:E");
    const tasks = rows.slice(1).map((r) => ({
      id: r[0],
      titre: r[1],
      fait: r[2] === "TRUE",
      date: r[3] || "",
      recurrent: r[4] || ""
    }));
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de récupérer les tâches" });
  }
});

// GET tâche par ID
app.get("/tasks/:id", async (req, res) => {
  try {
    const rows = await getRows(SHEET_TASKS, "A:E");
    const task = rows.slice(1).map((r) => ({
      id: r[0],
      titre: r[1],
      fait: r[2] === "TRUE",
      date: r[3] || "",
      recurrent: r[4] || ""
    })).find(t => t.id === req.params.id);

    if (!task) return res.status(404).json({ error: "Tâche non trouvée" });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération de la tâche" });
  }
});

// POST créer une tâche
app.post("/tasks", async (req, res) => {
  try {
    const { titre, fait = false, date = "", recurrent = "" } = req.body;
    const id = uuidv4();

    const newRow = [id, titre, fait ? "TRUE" : "FALSE", date, recurrent];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_TASKS}!A:E`,
      valueInputOption: "USER_ENTERED",
      resource: { values: [newRow] }
    });

    res.status(201).json({ id, titre, fait, date, recurrent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de créer la tâche" });
  }
});

// PUT modifier une tâche
app.put("/tasks/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { titre, fait, date, recurrent } = req.body;

    const rows = await getRows(SHEET_TASKS, "A:E");
    let rowIndex = rows.findIndex(r => r[0] === id);
    if (rowIndex === -1) return res.status(404).json({ error: "Tâche non trouvée" });

    rows[rowIndex][1] = titre ?? rows[rowIndex][1];
    rows[rowIndex][2] = fait !== undefined ? (fait ? "TRUE" : "FALSE") : rows[rowIndex][2];
    rows[rowIndex][3] = date ?? rows[rowIndex][3];
    rows[rowIndex][4] = recurrent !== undefined ? recurrent : rows[rowIndex][4];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_TASKS}!A${rowIndex + 1}:E${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      resource: { values: [rows[rowIndex]] }
    });

    res.json({
      id,
      titre: rows[rowIndex][1],
      fait: rows[rowIndex][2] === "TRUE",
      date: rows[rowIndex][3],
      recurrent: rows[rowIndex][4]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de modifier la tâche" });
  }
});

// DELETE supprimer une tâche
app.delete("/tasks/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await getRows(SHEET_TASKS, "A:E");
    let rowIndex = rows.findIndex(r => r[0] === id);
    if (rowIndex === -1) return res.status(404).json({ error: "Tâche non trouvée" });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: { sheetId: 0, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 }
          }
        }]
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de supprimer la tâche" });
  }
});
//#endregion TASK ROUTES

//#region LISTCOURSE ROUTES
// =================== LISTCOURSE ROUTES ===================
// NOTE: routes standardisées en lowercase: /listcourses and /listcourses/:id

// GET all listcourses
app.get("/listcourses", async (req, res) => {
  try {
    const rows = await getRows(SHEET_LISTCOURSE, "A:F"); // A:id B:titre C:description D:fait E:dateCrea F:dateModif
    const items = rows.slice(1).map(r => ({
      id: r[0],
      title: r[1],
      description: r[2] || "",
      fait: r[3] === "TRUE",
      dateCrea: r[4] || "",
      dateModif: r[5] || ""
    }));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de récupérer la liste de courses" });
  }
});

// GET one by id
app.get("/listcourses/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await getRows(SHEET_LISTCOURSE, "A:F");
    const item = rows.slice(1).map(r => ({
      id: r[0],
      title: r[1],
      description: r[2] || "",
      fait: r[3] === "TRUE",
      dateCrea: r[4] || "",
      dateModif: r[5] || ""
    })).find(i => i.id === id);

    if (!item) return res.status(404).json({ error: "Liste de courses non trouvée" });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération de la liste" });
  }
});

// POST create
app.post("/listcourses", async (req, res) => {
  try {
    const { title = "", description = "" } = req.body;
    const id = uuidv4();
    const dateNow = todayIso();

    const newRow = [
      id,
      title,
      description,
      "FALSE",     // fait
      dateNow,     // dateCrea
      dateNow      // dateModif
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_LISTCOURSE}!A:F`,
      valueInputOption: "USER_ENTERED",
      resource: { values: [newRow] }
    });

    res.status(201).json({ id, title, description, fait: false, dateCrea: dateNow, dateModif: dateNow });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de créer la liste de courses" });
  }
});

// PUT update (partial permitted) — updates dateModif automatically
app.put("/listcourses/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, fait } = req.body;

    const rows = await getRows(SHEET_LISTCOURSE, "A:F");
    const rowIndex = rows.findIndex(r => r[0] === id); // index in returned values (0 = header)
    if (rowIndex === -1) return res.status(404).json({ error: "Liste de courses non trouvée" });

    // update cells in memory
    rows[rowIndex][1] = title ?? rows[rowIndex][1];
    rows[rowIndex][2] = description ?? rows[rowIndex][2];
    rows[rowIndex][3] = (fait !== undefined) ? (fait ? "TRUE" : "FALSE") : rows[rowIndex][3];
    rows[rowIndex][5] = todayIso(); // dateModif

    // Make sure row has 6 columns
    for (let i = 0; i < 6; i++) rows[rowIndex][i] = rows[rowIndex][i] ?? "";

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_LISTCOURSE}!A${rowIndex + 1}:F${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      resource: { values: [rows[rowIndex]] }
    });

    res.json({
      id,
      title: rows[rowIndex][1],
      description: rows[rowIndex][2],
      fait: rows[rowIndex][3] === "TRUE",
      dateCrea: rows[rowIndex][4],
      dateModif: rows[rowIndex][5]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de modifier la liste de courses" });
  }
});

// DELETE remove row (uses sheetId resolved dynamically)
app.delete("/listcourses/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await getRows(SHEET_LISTCOURSE, "A:F");
    const rowIndex = rows.findIndex(r => r[0] === id);
    if (rowIndex === -1) return res.status(404).json({ error: "Liste de courses non trouvée" });

    const sheetId = await getSheetId(SHEET_LISTCOURSE);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: { sheetId: sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 }
          }
        }]
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de supprimer la liste de courses" });
  }
});
//#endregion LISTCOURSE ROUTES

// =================== FRONTEND ===================

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// =================== START SERVER ===================
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));