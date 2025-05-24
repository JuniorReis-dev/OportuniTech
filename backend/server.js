// backend/server.js
require("dotenv").config(); // Carrega as variáveis de ambiente do arquivo .env

const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3001; // Porta que o servidor vai rodar

// Configura o CORS para permitir requisições do seu front-end
app.use(cors());
app.use(express.json()); // Habilita o Express a parsear JSON no corpo das requisições

// ID da planilha do Google Sheets
const SPREADSHEET_ID = "13lutgdWIY7ezc-6PihVQcjWaqsdk0Pb-SBIEDpHx9as";
// Sua chave de API do Google Cloud (obtida no .env)
const API_KEY = process.env.GOOGLE_API_KEY;

// Rota API para buscar os dados dos estágios
app.get("/api/estagios", async (req, res) => {
  try {
    // Inicializa a API do Google Sheets
    const sheets = google.sheets({ version: "v4", auth: API_KEY });

    let allEstagios = []; // Array para armazenar todos os estágios combinados

    // --- PASSO 1: Obter informações de TODAS as abas da planilha ---
    const spreadsheetInfoResponse = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: "sheets.properties.title", // Pede apenas os títulos das abas
    });

    const availableSheetNames = spreadsheetInfoResponse.data.sheets
      .map((sheet) => sheet.properties.title)
      .filter(Boolean); // Extrai os nomes e remove nulos/vazios

    console.log(
      "--- DEBUG: Abas encontradas na planilha:",
      availableSheetNames
    );

    // --- PASSO 2: Filtrar abas relevantes (formato MM/AAAA e últimos 3 meses) ---
    const currentMonth = new Date().getMonth(); // Mês atual (0 a 11)
    const currentYear = new Date().getFullYear(); // Ano atual

    // Define o início do período de 3 meses atrás (ex: se hoje é maio, pega a partir de março)
    const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1);

    const relevantSheetNames = availableSheetNames
      .filter((name) => {
        const match = name.match(/^(\d{2})\/(\d{4})$/); // Verifica o formato "MM/AAAA"
        if (match) {
          const month = parseInt(match[1], 10);
          const year = parseInt(match[2], 10);
          const sheetDate = new Date(year, month - 1, 1); // Cria um objeto Date para a aba

          // Inclui abas que estão dentro do período dos últimos 3 meses e não são futuras
          return (
            sheetDate >= threeMonthsAgo &&
            sheetDate <= new Date(currentYear, currentMonth + 1, 0)
          );
        }
        return false; // Ignora abas que não seguem o padrão ou estão fora do período
      })
      .sort((a, b) => {
        // Opcional: Ordena as abas do mais novo para o mais antigo
        const [monthA, yearA] = a.split("/").map(Number);
        const [monthB, yearB] = b.split("/").map(Number);
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
      });

    if (relevantSheetNames.length === 0) {
      console.log(
        "Nenhuma aba relevante (no formato MM/AAAA e dentro do período) encontrada para buscar dados."
      );
      return res
        .status(404)
        .json({
          message: "Nenhum estágio encontrado em nenhuma das abas relevantes.",
        });
    }
    console.log("--- DEBUG: Abas relevantes para busca:", relevantSheetNames);

    // --- PASSO 3: Iterar sobre as abas relevantes para buscar os dados ---
    for (const sheetName of relevantSheetNames) {
      const range = `${sheetName}!A:Z`; // Define o intervalo para a aba atual

      console.log(`--- DEBUG: Tentando buscar dados da aba "${sheetName}" ---`);

      // Faz a requisição para a API do Google Sheets para a aba atual
      // O parâmetro 'fields' é crucial para obter hiperlinks e valores formatados
      const response = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        ranges: [range],
        fields:
          "sheets.properties,sheets.data.rowData.values.hyperlink,sheets.data.rowData.values.formattedValue",
      });

      // Verifica se a resposta da API contém dados para a aba
      if (
        !response.data.sheets ||
        response.data.sheets.length === 0 ||
        !response.data.sheets[0].data ||
        response.data.sheets[0].data.length === 0
      ) {
        console.log(
          `Aba "<span class="math-inline">\{sheetName\}" encontrada, mas sem dados no intervalo "</span>{range}". Pulando.`
        );
        continue;
      }

      const sheetData = response.data.sheets[0].data[0];
      const rows = sheetData.rowData; // 'rowData' contém as linhas de dados

      if (!rows || rows.length === 0) {
        console.log(`Nenhuma linha de dados encontrada na aba "${sheetName}".`);
        continue;
      }
      console.log(`Número total de linhas na aba "${sheetName}":`, rows.length);

      // Extrai os cabeçalhos da primeira linha da aba, removendo vazios
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
      console.log(`Cabeçalhos da aba "${sheetName}":`, headers);

      // Processa as linhas de dados (ignorando a primeira linha de cabeçalhos)
      const estagiosFromSheet = rows
        .slice(1)
        .map((row) => {
          let obj = {};
          if (row.values) {
            // Garante que a linha tem células com valores
            headers.forEach((header, index) => {
              // Limpa o nome do cabeçalho para usar como chave (ex: "Título da Vaga" vira "Titulo_da_Vaga")
              const cleanHeader = header
                .replace(/\s+/g, "_")
                .replace(/[^a-zA-Z0-9_]/g, "");

              const cell = row.values[index]; // Pega o objeto da célula na linha atual

              if (cell) {
                if (cell.hyperlink) {
                  // Se a célula tiver um hiperlink, usa o URL real
                  obj[cleanHeader] = cell.hyperlink;
                } else {
                  // Caso contrário, usa o valor formatado da célula (o texto visível)
                  obj[cleanHeader] = cell.formattedValue || "";
                }
              } else {
                obj[cleanHeader] = ""; // Se a célula estiver vazia
              }
            });
          }
          return obj;
        })
        .filter((item) => Object.values(item).some((val) => val)); // Filtra linhas completamente vazias

      allEstagios = allEstagios.concat(estagiosFromSheet); // Adiciona os estágios desta aba ao total
    }

    console.log("--- DEBUG: Fim da requisição ---");
    console.log(
      "Total de estágios coletados de todas as abas:",
      allEstagios.length
    );
    console.log(
      "Primeiros 5 estágios combinados (para verificar a data):",
      allEstagios.slice(0, 5)
    );

    if (allEstagios.length === 0) {
      return res
        .status(404)
        .json({
          message: "Nenhum estágio encontrado em nenhuma das abas relevantes.",
        });
    }

    res.json(allEstagios); // Envia todos os dados combinados para o front-end
  } catch (error) {
    console.error("Erro ao buscar dados da planilha:", error.message);
    res
      .status(500)
      .json({
        error: "Erro ao buscar dados da planilha. Verifique o servidor.",
      });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor de back-end rodando em http://localhost:${port}`);
});
