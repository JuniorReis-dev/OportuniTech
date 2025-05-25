// backend/server.js
require("dotenv").config();

const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
const path = require("path");
const fs = require("fs"); // <<--- ADICIONE ESTA LINHA (para verificar arquivos)

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Configuração para servir o React SPA ---
const frontendBuildPath = path.join(__dirname, "../frontend/build");

// LOGS PARA DEBUG NA VERCEL
console.log(`[Vercel Server Log] __dirname: ${__dirname}`);
console.log(
  `[Vercel Server Log] Tentando usar frontendBuildPath: ${frontendBuildPath}`
);

// Verificando se a pasta de build do frontend existe
fs.access(frontendBuildPath, fs.constants.F_OK, (err) => {
  if (err) {
    console.error(
      `[Vercel Server Log] ERRO: Pasta frontendBuildPath NÃO ENCONTRADA em: ${frontendBuildPath}`
    );
    // Tenta listar conteúdo do diretório pai para ajudar no debug
    try {
      const parentDir = path.resolve(__dirname, "..");
      const parentDirContents = fs.readdirSync(parentDir);
      console.log(
        `[Vercel Server Log] Conteúdo do diretório pai ('${parentDir}'): ${parentDirContents.join(
          ", "
        )}`
      );
    } catch (e) {
      console.error(
        "[Vercel Server Log] Erro ao listar diretório pai:",
        e.message
      );
    }
  } else {
    console.log(
      `[Vercel Server Log] SUCESSO: Pasta frontendBuildPath ENCONTRADA em: ${frontendBuildPath}`
    );
  }
});
// FIM DOS LOGS PARA DEBUG

app.use(express.static(frontendBuildPath));

const SPREADSHEET_ID = "13lutgdWIY7ezc-6PihVQcjWaqsdk0Pb-SBIEDpHx9as";
const API_KEY = process.env.GOOGLE_API_KEY;

app.get("/api/estagios", async (req, res) => {
  // Seu código da API continua aqui...
  // (Não vou repetir todo o código da API para economizar espaço, mantenha o seu como está)
  if (!API_KEY) {
    console.error(
      "[Vercel Server Log] API_KEY não definida na rota /api/estagios"
    );
    return res
      .status(500)
      .json({ error: "Configuração do servidor incompleta." });
  }
  // ... resto da sua lógica da API ...
  // apenas um exemplo para garantir que a rota está definida
  try {
    // Simulação de busca de dados
    const exampleData = [{ id: 1, title: "Estágio Exemplo" }];
    // Lembre-se de colocar sua lógica de busca da planilha aqui
    res.json(exampleData); // Substitua pela sua lógica real
  } catch (error) {
    console.error("[Vercel Server Log] Erro na API /api/estagios:", error);
    res.status(500).json({ error: "Erro ao buscar estágios" });
  }
});

// Rota "catch-all" para servir o index.html do React
app.get("*", (req, res) => {
  const indexPath = path.join(frontendBuildPath, "index.html");
  console.log(
    `[Vercel Server Log] Rota '*': Tentando servir index.html de: ${indexPath}`
  );

  fs.access(indexPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(
        `[Vercel Server Log] ERRO: index.html NÃO ENCONTRADO em: ${indexPath}`
      );
      // Se o index.html não for encontrado, é provável que o frontendBuildPath esteja incorreto
      // ou a build do frontend não está acessível.
      return res
        .status(404)
        .send(
          `Servidor: index.html não encontrado em ${indexPath}. Verifique os logs da função na Vercel.`
        );
    }
    console.log(
      `[Vercel Server Log] SUCESSO: index.html ENCONTRADO em: ${indexPath}. Enviando arquivo.`
    );
    res.sendFile(indexPath, (sendFileError) => {
      if (sendFileError) {
        console.error(
          `[Vercel Server Log] ERRO ao enviar index.html: `,
          sendFileError
        );
        // Evita erro de "headers already sent"
        if (!res.headersSent) {
          res
            .status(500)
            .send("Servidor: Erro ao enviar o arquivo index.html.");
        }
      }
    });
  });
});

app.listen(port, () => {
  console.log(`Servidor de back-end rodando em http://localhost:${port}`);
});

module.exports = app;
