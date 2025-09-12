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
const SHEET_NAME = "Feuille 1";

const auth = new google.auth.GoogleAuth({
  keyFile: "service-account.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const sheets = google.sheets({ version: "v4", auth });

// =================== HELPERS ===================
// Récupère toutes les tâches depuis la feuille
async function getRows() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:E`
  });
  const rows = res.data.values || [];
  return rows.slice(1).map((r) => ({
    id: r[0],
    titre: r[1],
    fait: r[2] === "TRUE",
    date: r[3] || "",
    recurrent: r[4] || ""
  }));
}

// =================== ROUTES ===================

// GET toutes les tâches
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await getRows();
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de récupérer les tâches" });
  }
});

// GET tâche par ID
app.get("/tasks/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const tasks = await getRows();
    const task = tasks.find(t => t.id === id);
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

    const newRow = [
      id,
      titre,
      fait ? "TRUE" : "FALSE",
      date,
      recurrent
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:E`,
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

    const resSheet = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:E`
    });
    const rows = resSheet.data.values || [];
    let rowIndex = rows.findIndex(r => r[0] === id);
    if (rowIndex === -1) return res.status(404).json({ error: "Tâche non trouvée" });

    rows[rowIndex][1] = titre ?? rows[rowIndex][1];
    rows[rowIndex][2] = fait !== undefined ? (fait ? "TRUE" : "FALSE") : rows[rowIndex][2];
    rows[rowIndex][3] = date ?? rows[rowIndex][3];
    rows[rowIndex][4] = recurrent !== undefined ? recurrent : rows[rowIndex][4];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex + 1}:E${rowIndex + 1}`,
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

    const resSheet = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:E`
    });
    const rows = resSheet.data.values || [];
    let rowIndex = rows.findIndex(r => r[0] === id);
    if (rowIndex === -1) return res.status(404).json({ error: "Tâche non trouvée" });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: { sheetId: 0, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 }
            }
          }
        ]
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de supprimer la tâche" });
  }
});

// =================== FRONTEND ===================
// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Catch-all pour le frontend SPA
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =================== START SERVER ===================
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
