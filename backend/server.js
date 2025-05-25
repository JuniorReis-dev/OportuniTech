// backend/server.js - Versão para servir o React SPA
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path"); // Precisamos do 'path'
const fs = require("fs"); // Precisamos do 'fs' para verificar o index.html

const app = express();

console.log("[Vercel Server Log - SPA] Iniciando server.js para servir SPA...");
console.log(`[Vercel Server Log - SPA] __dirname: ${__dirname}`);

app.use(cors());
app.use(express.json());

// Caminho para a pasta de build do seu frontend
const frontendBuildPath = path.join(__dirname, "../frontend/build");
console.log(
  `[Vercel Server Log - SPA] Servindo arquivos estáticos de: ${frontendBuildPath}`
);

// 1. Servir arquivos estáticos da build do React (CSS, JS, imagens, etc.)
app.use(express.static(frontendBuildPath));

// 2. Sua rota de API (mantenha a sua lógica original aqui ou a simplificada por enquanto)
const SPREADSHEET_ID = "13lutgdWIY7ezc-6PihVQcjWaqsdk0Pb-SBIEDpHx9as"; // Seu ID
const API_KEY = process.env.GOOGLE_API_KEY;
const { google } = require("googleapis"); // Se for usar a API do Google

app.get("/api/estagios", async (req, res) => {
  console.log("[Vercel Server Log - SPA] Requisição recebida em /api/estagios");
  if (!API_KEY) {
    console.error(
      "[Vercel Server Log - SPA] ERRO CRÍTICO: GOOGLE_API_KEY não está definida!"
    );
    return res.status(500).json({
      error:
        "Erro de configuração no servidor: Chave da API do Google ausente.",
    });
  }
  try {
    // ####################################################################
    // # COLOQUE SUA LÓGICA COMPLETA E TESTADA DA API DO GOOGLE SHEETS AQUI #
    // # O código abaixo é apenas um placeholder.                         #
    // ####################################################################
    console.log(
      "[Vercel Server Log - SPA] /api/estagios: Usando lógica de placeholder para API."
    );
    const estagiosExemplo = [
      {
        Titulo_da_Vaga: `API Funcionando - ${SPREADSHEET_ID.substring(
          0,
          5
        )}...`,
        Empresa: "OportuniTech",
      },
    ];
    res.json(estagiosExemplo);
    // ####################################################################
  } catch (error) {
    console.error(
      "[Vercel Server Log - SPA] ERRO em /api/estagios:",
      error.message,
      error.stack
    );
    res.status(500).json({
      error: "Erro interno ao processar a requisição da API.",
      details: error.message,
    });
  }
});

// 3. Rota catch-all para servir o index.html (SPA Fallback)
// DEVE SER A ÚLTIMA ROTA (depois de /api/estagios e app.use(express.static))
app.get("*", (req, res) => {
  const indexPath = path.join(frontendBuildPath, "index.html");
  console.log(
    `[Vercel Server Log - SPA] Rota catch-all '*': Tentando servir ${indexPath} para ${req.path}`
  );

  fs.access(indexPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(
        `[Vercel Server Log - SPA] ERRO no catch-all: index.html NÃO ENCONTRADO em: ${indexPath}`
      );
      console.error(
        `[Vercel Server Log - SPA] Detalhes do erro fs.access: ${err.message}`
      );
      return res
        .status(404)
        .send(
          `index.html não encontrado em ${indexPath}. Verifique o build do frontend e os logs.`
        );
    }

    console.log(
      `[Vercel Server Log - SPA] SUCESSO no catch-all: index.html ENCONTRADO. Enviando para ${req.path}...`
    );
    res.sendFile(indexPath, (sendFileError) => {
      if (sendFileError) {
        console.error(
          `[Vercel Server Log - SPA] ERRO no catch-all ao enviar index.html: `,
          sendFileError
        );
        if (!res.headersSent) {
          res
            .status(500)
            .send("Erro ao enviar o arquivo principal da aplicação.");
        }
      } else {
        console.log(
          `[Vercel Server Log - SPA] SUCESSO no catch-all: index.html enviado para ${req.path}`
        );
      }
    });
  });
});

// Middleware de tratamento de erro (opcional, mas bom ter)
app.use((err, req, res, next) => {
  console.error(
    "[Vercel Server Log - SPA] ERRO NÃO TRATADO GERAL:",
    err.message,
    err.stack
  );
  if (!res.headersSent) {
    res.status(500).send("Erro Interno Geral do Servidor.");
  }
});

module.exports = app;
