// backend/server.js
require("dotenv").config(); // Carrega as variáveis de ambiente do arquivo .env

const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const SPREADSHEET_ID = "13lutgdWIY7ezc-6PihVQcjWaqsdk0Pb-SBIEDpHx9as";
const API_KEY = process.env.GOOGLE_API_KEY; // Chave de API do Google Cloud (do .env)

app.get("/api/estagios", async (req, res) => {
  if (!API_KEY) {
    console.error(
      "ERRO FATAL: A variável de ambiente GOOGLE_API_KEY não está definida."
    );
    return res.status(500).json({
      error:
        "Erro de configuração no servidor: Chave da API do Google ausente.",
      message: "Por favor, configure a GOOGLE_API_KEY no ambiente do servidor.",
    });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth: API_KEY });

    let allEstagios = [];

    const spreadsheetInfoResponse = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: "sheets.properties.title",
    });

    const availableSheetNames = spreadsheetInfoResponse.data.sheets
      .map((sheet) => sheet.properties.title)
      .filter(Boolean);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1);

    const relevantSheetNames = availableSheetNames
      .filter((name) => {
        const match = name.match(/^(\d{2})\/(\d{4})$/);
        if (match) {
          const month = parseInt(match[1], 10);
          const year = parseInt(match[2], 10);
          const sheetDate = new Date(year, month - 1, 1);
          return (
            sheetDate >= threeMonthsAgo &&
            sheetDate <= new Date(currentYear, currentMonth + 1, 0) // Até o último dia do mês atual
          );
        }
        return false;
      })
      .sort((a, b) => {
        const [monthA, yearA] = a.split("/").map(Number);
        const [monthB, yearB] = b.split("/").map(Number);
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
      });

    if (relevantSheetNames.length === 0) {
      console.log("Nenhuma aba relevante encontrada para buscar dados.");
      return res.status(404).json({
        message: "Nenhum estágio encontrado nas abas relevantes.",
      });
    }

    for (const sheetName of relevantSheetNames) {
      const range = `${sheetName}!A:Z`;
      const response = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        ranges: [range],
        fields:
          "sheets.properties,sheets.data.rowData.values.hyperlink,sheets.data.rowData.values.formattedValue",
      });

      if (
        !response.data.sheets ||
        response.data.sheets.length === 0 ||
        !response.data.sheets[0].data ||
        response.data.sheets[0].data.length === 0
      ) {
        console.log(
          `Aba "${sheetName}" encontrada, mas sem dados no intervalo "${range}". Pulando.`
        );
        continue;
      }

      const sheetData = response.data.sheets[0].data[0];
      const rows = sheetData.rowData;

      if (!rows || rows.length === 0) {
        console.log(`Nenhuma linha de dados encontrada na aba "${sheetName}".`);
        continue;
      }

      const headers = rows[0].values
        ? rows[0].values
            .map((cell) =>
              cell.formattedValue ? cell.formattedValue.trim() : ""
            )
            .filter(Boolean)
        : [];

      if (headers.length === 0) {
        console.log(
          `Aba "${sheetName}" não tem cabeçalhos na primeira linha. Pulando.`
        );
        continue;
      }

      const estagiosFromSheet = rows
        .slice(1)
        .map((row) => {
          let obj = {};
          if (row.values) {
            headers.forEach((header, index) => {
              const cleanHeader = header
                .replace(/\s+/g, "_")
                .replace(/[^a-zA-Z0-9_]/g, "");
              const cell = row.values[index];
              if (cell) {
                obj[cleanHeader] = cell.hyperlink || cell.formattedValue || "";
              } else {
                obj[cleanHeader] = "";
              }
            });
          }
          return obj;
        })
        .filter((item) => Object.values(item).some((val) => val));

      allEstagios = allEstagios.concat(estagiosFromSheet);
    }

    if (allEstagios.length === 0) {
      return res.status(404).json({
        message:
          "Nenhum estágio encontrado em nenhuma das abas relevantes processadas.",
      });
    }
    res.json(allEstagios);
  } catch (error) {
    console.error(
      "Erro ao buscar dados da planilha:",
      error.message,
      error.stack
    );
    res.status(500).json({
      error: "Erro interno ao buscar dados da planilha.",
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor de back-end rodando em http://localhost:${port}`);
});
//Forçar novo deploy com configurações atualizadas da Vercel
