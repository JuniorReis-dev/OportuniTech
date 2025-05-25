// backend/server.js - VERSÃO MÍNIMA PARA TESTE
require("dotenv").config(); // Mantido caso alguma configuração de build dependa disso
const express = require("express");
const cors = require("cors");

const app = express();

console.log(
  "[Vercel Server Log - MÍNIMO] Iniciando server.js (versão de teste mínima)..."
);
console.log(`[Vercel Server Log - MÍNIMO] __dirname: ${__dirname}`);

app.use(cors());
app.use(express.json());

// Rota de teste
app.get("/api/test", (req, res) => {
  console.log(
    "[Vercel Server Log - MÍNIMO] Rota /api/test acessada com SUCESSO!"
  );
  res
    .status(200)
    .json({ message: "Servidor MÍNIMO: Rota de teste /api/test FUNCIONANDO!" });
});

// Rota catch-all
app.get("*", (req, res) => {
  console.log(
    `[Vercel Server Log - MÍNIMO] Rota catch-all '*' acessada para o caminho: ${req.path}. Nenhuma SPA configurada neste teste.`
  );
  res
    .status(404)
    .send(
      `Servidor MÍNIMO: Caminho ${req.path} não mapeado. A rota /api/test existe.`
    );
});

// Middleware de tratamento de erro
app.use((err, req, res, next) => {
  console.error(
    "[Vercel Server Log - MÍNIMO] ERRO NÃO TRATADO:",
    err.message,
    err.stack
  );
  if (!res.headersSent) {
    res.status(500).send("Servidor MÍNIMO: Erro Interno do Servidor.");
  }
});

console.log(
  "[Vercel Server Log - MÍNIMO] Configuração do Express MÍNIMO concluída. Exportando app."
);
module.exports = app;
