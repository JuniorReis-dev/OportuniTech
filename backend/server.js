require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");

const app = express();

console.log("[Vercel] Iniciando backend/server.js (versão completa)...");
console.log(`[Vercel] __dirname: ${__dirname}`);

app.use(cors());
app.use(express.json());

const frontendBuildPath = path.join(__dirname, "../frontend/build");
console.log(`[Vercel] Servindo estáticos de: ${frontendBuildPath}`);

app.use(express.static(frontendBuildPath));

const SPREADSHEET_ID = "13lutgdWIY7ezc-6PihVQcjWaqsdk0Pb-SBIEDpHx9as";
const API_KEY = process.env.GOOGLE_API_KEY;

app.get("/api/estagios", async (req, res) => {
  console.log("[Vercel] GET /api/estagios: Requisição recebida.");
  if (!API_KEY) {
    console.error(
      "[Vercel] GET /api/estagios: ERRO - GOOGLE_API_KEY não definida!"
    );
    return res.status(500).json({
      error:
        "Erro de configuração no servidor: Chave da API do Google ausente.",
    });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth: API_KEY });
    let allEstagios = [];

    console.log("[Vercel] GET /api/estagios: Buscando títulos das abas...");
    const spreadsheetInfoResponse = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: "sheets.properties.title",
    });

    if (
      !spreadsheetInfoResponse ||
      !spreadsheetInfoResponse.data ||
      !spreadsheetInfoResponse.data.sheets
    ) {
      console.error(
        "[Vercel] GET /api/estagios: Resposta inválida ao buscar títulos das abas."
      );
      throw new Error(
        "Resposta inválida ao buscar títulos das abas da planilha."
      );
    }

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
            sheetDate <= new Date(currentYear, currentMonth + 1, 0)
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
      console.log(
        "[Vercel] GET /api/estagios: Nenhuma aba relevante (últimos 3 meses) encontrada."
      );
      return res.status(404).json({
        message: "Nenhum estágio encontrado nas abas dos últimos 3 meses.",
      });
    }
    console.log(
      `[Vercel] GET /api/estagios: Abas relevantes: ${relevantSheetNames.join(
        ", "
      )}`
    );

    for (const sheetName of relevantSheetNames) {
      const range = `${sheetName}!A:Z`;
      console.log(
        `[Vercel] GET /api/estagios: Buscando dados da aba "${sheetName}", range "${range}"`
      );
      const response = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        ranges: [range],
        fields:
          "sheets.data.rowData.values.hyperlink,sheets.data.rowData.values.formattedValue",
      });

      if (
        !response.data.sheets ||
        response.data.sheets.length === 0 ||
        !response.data.sheets[0].data ||
        response.data.sheets[0].data.length === 0 ||
        !response.data.sheets[0].data[0].rowData // Verifica se rowData existe
      ) {
        console.log(
          `[Vercel] GET /api/estagios: Aba "${sheetName}" não contém dados (ou rowData) válidos. Pulando.`
        );
        continue;
      }

      const rows = response.data.sheets[0].data[0].rowData;

      if (rows.length === 0) {
        // rows[0] pode ser o cabeçalho, então rows.length === 0 ou 1
        console.log(
          `[Vercel] GET /api/estagios: Nenhuma linha de dados em "${sheetName}".`
        );
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
          `[Vercel] GET /api/estagios: Sem cabeçalhos válidos em "${sheetName}". Pulando.`
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
              obj[cleanHeader] = cell
                ? cell.hyperlink || cell.formattedValue || ""
                : "";
            });
          }
          return obj;
        })
        .filter((item) =>
          Object.values(item).some((val) => val && String(val).trim() !== "")
        );

      console.log(
        `[Vercel] GET /api/estagios: ${estagiosFromSheet.length} estágios processados da aba "${sheetName}".`
      );
      allEstagios = allEstagios.concat(estagiosFromSheet);
    }

    if (allEstagios.length === 0) {
      console.log(
        "[Vercel] GET /api/estagios: Nenhum estágio encontrado após processar todas as abas."
      );
      return res.status(404).json({
        message:
          "Nenhum estágio encontrado após processar todas as abas relevantes.",
      });
    }
    console.log(
      `[Vercel] GET /api/estagios: Total de ${allEstagios.length} estágios. Enviando.`
    );
    res.json(allEstagios);
  } catch (error) {
    console.error(
      "[Vercel] GET /api/estagios: ERRO DURANTE EXECUÇÃO:",
      error.message,
      error.stack
    );
    res.status(500).json({
      error: "Erro interno ao buscar dados da planilha.",
      details: error.message,
    });
  }
});

app.get("*", (req, res) => {
  const indexPath = path.join(frontendBuildPath, "index.html");
  console.log(
    `[Vercel] Rota catch-all '*': Tentando servir ${indexPath} para ${req.path}`
  );
  fs.access(indexPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(
        `[Vercel] Rota catch-all '*': ERRO - index.html NÃO ENCONTRADO em ${indexPath}. Detalhes: ${err.message}`
      );
      return res
        .status(404)
        .send(
          `Arquivo principal da aplicação (index.html) não encontrado em ${indexPath}.`
        );
    }
    res.sendFile(indexPath, (sendFileError) => {
      if (sendFileError) {
        console.error(
          `[Vercel] Rota catch-all '*': ERRO ao enviar ${indexPath}: `,
          sendFileError
        );
        if (!res.headersSent) {
          res
            .status(500)
            .send("Erro ao enviar o arquivo principal da aplicação.");
        }
      } else {
        console.log(
          `[Vercel] Rota catch-all '*': SUCESSO - ${indexPath} enviado para ${req.path}`
        );
      }
    });
  });
});

app.use((err, req, res, next) => {
  console.error("[Vercel] ERRO GERAL NÃO TRATADO:", err.message, err.stack);
  if (!res.headersSent) {
    res.status(500).send("Erro Interno no Servidor.");
  }
});

module.exports = app;
