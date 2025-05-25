// backend/server.js - VERSÃO MÍNIMA PARA TESTE
require("dotenv").config(); // Para carregar GOOGLE_API_KEY se necessário para outras partes do build
const express = require("express");
const cors = require("cors"); // Adicionado para consistência, assumindo que está no seu package.json

const app = express();

console.log("[Vercel Server Log - MÍNIMO] Iniciando server.js...");
console.log(`[Vercel Server Log - MÍNIMO] __dirname: ${__dirname}`);

app.use(cors());
app.use(express.json());

// Uma rota de teste muito simples
app.get("/api/test", (req, res) => {
  console.log("[Vercel Server Log - MÍNIMO] Rota /api/test acessada!");
  res
    .status(200)
    .json({ message: "Rota de teste do servidor mínimo FUNCIONANDO!" });
});

// Uma rota catch-all simples para ver se o roteamento básico funciona
app.get("*", (req, res) => {
  console.log(
    `[Vercel Server Log - MÍNIMO] Rota catch-all '*' acessada para o caminho: ${req.path}`
  );
  res
    .status(404)
    .send(
      `Servidor mínimo: Caminho ${req.path} não encontrado. Nenhuma SPA configurada neste teste.`
    );
});

// Middleware básico para tratamento de erros (para ver erros não capturados)
app.use((err, req, res, next) => {
  console.error(
    "[Vercel Server Log - MÍNIMO] Erro não tratado:",
    err.message,
    err.stack
  );
  if (!res.headersSent) {
    res.status(500).send("Servidor mínimo: Erro Interno.");
  }
});

console.log(
  "[Vercel Server Log - MÍNIMO] Configuração do Express concluída. Exportando app..."
);
module.exports = app;
