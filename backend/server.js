// backend/server.js
require("dotenv").config(); // Carrega as variáveis de ambiente do arquivo .env

const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3001;

console.log("[Server] Iniciando backend/server.js...");
console.log(`[Server] __dirname: ${__dirname}`);

app.use(cors());
app.use(express.json());

// --- Servir arquivos estáticos do Frontend ---
// Isso assume que seu backend/ está em SEU_PROJETO_PRINCIPAL/backend/
// e seu frontend compilado está em SEU_PROJETO_PRINCIPAL/frontend/build/
const frontendBuildPath = path.join(__dirname, "../frontend/build");
console.log(
  `[Server] Configurando para servir estáticos de: ${frontendBuildPath}`
);

// Verifica se a pasta de build do frontend existe para evitar erros
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  console.log(
    `[Server] Servindo arquivos estáticos de ${frontendBuildPath} habilitado.`
  );
} else {
  console.warn(
    `[Server] AVISO: Pasta de build do frontend NÃO ENCONTRADA em ${frontendBuildPath}. O frontend não será servido por este backend.`
  );
  console.warn(
    `[Server] Certifique-se de ter rodado o build do frontend (ex: 'npm run build' na pasta frontend).`
  );
}
// --- Fim de servir arquivos estáticos ---

const SPREADSHEET_ID = "13lutgdWIY7ezc-6PihVQcjWaqsdk0Pb-SBIEDpHx9as"; // Considere mover para .env se puder mudar
const API_KEY = process.env.GOOGLE_API_KEY;

app.get("/api/estagios", async (req, res) => {
  console.log("[Server] GET /api/estagios: Requisição recebida.");
  if (!API_KEY) {
    console.error(
      "[Server] GET /api/estagios: ERRO - GOOGLE_API_KEY não definida!"
    );
    return res.status(500).json({
      error:
        "Erro de configuração no servidor: Chave da API do Google ausente.",
    });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth: API_KEY });
    let allEstagios = [];

    console.log("[Server] GET /api/estagios: Buscando títulos das abas...");
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
        "[Server] GET /api/estagios: Resposta inválida ao buscar títulos das abas."
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
        "[Server] GET /api/estagios: Nenhuma aba relevante (últimos 3 meses) encontrada."
      );
      return res.status(404).json({
        message: "Nenhum estágio encontrado nas abas dos últimos 3 meses.",
      });
    }
    console.log(
      `[Server] GET /api/estagios: Abas relevantes: ${relevantSheetNames.join(
        ", "
      )}`
    );

    for (const sheetName of relevantSheetNames) {
      const range = `${sheetName}!A:Z`;
      console.log(
        `[Server] GET /api/estagios: Buscando dados da aba "${sheetName}", range "${range}"`
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
        !response.data.sheets[0].data[0].rowData
      ) {
        console.log(
          `[Server] GET /api/estagios: Aba "${sheetName}" não contém dados (ou rowData) válidos. Pulando.`
        );
        continue;
      }

      const rows = response.data.sheets[0].data[0].rowData;

      if (rows.length <= 1) {
        // Considera que a primeira linha é cabeçalho
        console.log(
          `[Server] GET /api/estagios: Nenhuma linha de dados (além do cabeçalho) em "${sheetName}".`
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
          `[Server] GET /api/estagios: Sem cabeçalhos válidos em "${sheetName}". Pulando.`
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
        `[Server] GET /api/estagios: ${estagiosFromSheet.length} estágios processados da aba "${sheetName}".`
      );
      allEstagios = allEstagios.concat(estagiosFromSheet);
    }

    if (allEstagios.length === 0) {
      console.log(
        "[Server] GET /api/estagios: Nenhum estágio encontrado após processar todas as abas."
      );
      return res.status(404).json({
        message:
          "Nenhum estágio encontrado após processar todas as abas relevantes.",
      });
    }
    console.log(
      `[Server] GET /api/estagios: Total de ${allEstagios.length} estágios. Enviando.`
    );
    res.json(allEstagios);
  } catch (error) {
    console.error(
      "[Server] GET /api/estagios: ERRO DURANTE EXECUÇÃO:",
      error.message,
      error.stack
    );
    res.status(500).json({
      error: "Erro interno ao buscar dados da planilha.",
      details: error.message,
    });
  }
});

// Rota catch-all para servir o index.html do frontend para SPA
// Deve vir DEPOIS das suas rotas de API
if (fs.existsSync(frontendBuildPath)) {
  app.get("*", (req, res) => {
    const indexPath = path.join(frontendBuildPath, "index.html");
    console.log(
      `[Server] Rota catch-all '*': Tentando servir ${indexPath} para ${req.path}`
    );
    // Verifica se o index.html existe antes de tentar enviar
    fs.access(indexPath, fs.constants.F_OK, (errAccess) => {
      if (errAccess) {
        console.error(
          `[Server] Rota catch-all '*': ERRO - index.html NÃO ENCONTRADO em ${indexPath}. Detalhes: ${errAccess.message}`
        );
        return res
          .status(404)
          .send(`Arquivo principal da aplicação (index.html) não encontrado.`);
      }
      res.sendFile(indexPath, (errSendFile) => {
        if (errSendFile) {
          console.error(
            `[Server] Rota catch-all '*': ERRO ao enviar ${indexPath}: `,
            errSendFile
          );
          if (!res.headersSent) {
            res
              .status(500)
              .send("Erro ao enviar o arquivo principal da aplicação.");
          }
        } else {
          console.log(
            `[Server] Rota catch-all '*': SUCESSO - ${indexPath} enviado para ${req.path}`
          );
        }
      });
    });
  });
}

// Middleware de tratamento de erro geral (deve ser o último)
app.use((err, req, res, next) => {
  console.error("[Server] ERRO GERAL NÃO TRATADO:", err.message, err.stack);
  if (!res.headersSent) {
    res.status(500).send("Erro Interno no Servidor.");
  }
});

// Inicia o servidor APENAS se este arquivo for executado diretamente (para desenvolvimento local)
if (require.main === module) {
  app.listen(port, () => {
    console.log(
      `[Server] Servidor de back-end rodando em http://localhost:${port}`
    );
    if (fs.existsSync(frontendBuildPath)) {
      console.log(
        `[Server] Frontend DEVERIA estar acessível em http://localhost:${port} (se servido por este backend)`
      );
    } else {
      console.warn(
        `[Server] Frontend não está sendo servido por este backend (pasta ${frontendBuildPath} não encontrada).`
      );
      console.warn(
        `[Server] Você precisará rodar o servidor de desenvolvimento do frontend separadamente (ex: na pasta frontend, rode 'npm start').`
      );
    }
    console.log(
      `[Server] Endpoint da API de estágios: http://localhost:${port}/api/estagios`
    );
  });
}

// Exporta o app para ser usado pela Vercel (ou outros sistemas serverless/testes)
module.exports = app;
