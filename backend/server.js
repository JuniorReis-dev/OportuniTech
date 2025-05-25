// backend/server.js
require("dotenv").config();

const express = require("express");
const { google } = require("googleapis"); // Você tem essa dependência
const cors = require("cors");
const path = require("path");
const fs = require("fs"); // Manter para verificar o index.html dentro da rota

const app = express();
// A Vercel define a porta, então app.listen não é estritamente necessário para o deploy,
// mas é útil para testes locais. module.exports = app; é o que a Vercel usa.

app.use(cors());
app.use(express.json());

const frontendBuildPath = path.join(__dirname, "../frontend/build");
console.log(`[Vercel Server Log] __dirname (raiz da função): ${__dirname}`);
console.log(
  `[Vercel Server Log] Caminho estático configurado para: ${frontendBuildPath}`
);

app.use(express.static(frontendBuildPath));

const SPREADSHEET_ID = "13lutgdWIY7ezc-6PihVQcjWaqsdk0Pb-SBIEDpHx9as"; // Seu ID
const API_KEY = process.env.GOOGLE_API_KEY;

app.get("/api/estagios", async (req, res) => {
  console.log("[Vercel Server Log] Requisição recebida em /api/estagios");
  if (!API_KEY) {
    console.error(
      "[Vercel Server Log] ERRO CRÍTICO: GOOGLE_API_KEY não está definida!"
    );
    return res.status(500).json({
      error:
        "Erro de configuração no servidor: Chave da API do Google ausente.",
      message: "Por favor, configure a GOOGLE_API_KEY no ambiente do servidor.",
    });
  }

  try {
    // ##########################################################################
    // # IMPORTANTE: COLOQUE AQUI SUA LÓGICA COMPLETA E TESTADA DA API         #
    // # A lógica abaixo é apenas um EXEMPLO SIMPLIFICADO para garantir que     #
    // # o servidor inicie e a rota API responda algo sem crashar.            #
    // # SUBSTITUA pela sua lógica real de busca na planilha.                 #
    // ##########################################################################
    console.log(
      "[Vercel Server Log] /api/estagios: Usando lógica simplificada de API para teste."
    );
    const sheets = google.sheets({ version: "v4", auth: API_KEY }); // Exemplo de uso
    // Simule uma verificação ou uma pequena parte da sua lógica real aqui se quiser,
    // mas garanta que não vai quebrar se a planilha estiver vazia ou com formato inesperado.
    // Exemplo:
    // const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, fields: 'properties.title' });
    // if (!metadata || !metadata.data || !metadata.data.properties) {
    //   console.error("[Vercel Server Log] /api/estagios: Não foi possível obter metadados da planilha.");
    //   throw new Error("Falha ao buscar metadados da planilha.");
    // }
    const estagiosExemplo = [
      {
        Titulo_da_Vaga: `API de Teste OK - Planilha ${SPREADSHEET_ID.substring(
          0,
          5
        )}...`,
        Empresa: "OportuniTech Testes",
      },
    ];
    // ##########################################################################
    // # FIM DO EXEMPLO SIMPLIFICADO. Adapte com sua lógica real.             #
    // ##########################################################################

    if (estagiosExemplo.length === 0) {
      // Ajuste esta condição para sua lógica real
      console.log(
        "[Vercel Server Log] /api/estagios: Nenhum estágio encontrado (lógica de exemplo)."
      );
      return res
        .status(404)
        .json({ message: "Nenhum estágio encontrado (exemplo)." });
    }
    console.log(
      "[Vercel Server Log] /api/estagios: Enviando dados de exemplo."
    );
    res.json(estagiosExemplo);
  } catch (error) {
    console.error(
      "[Vercel Server Log] ERRO em /api/estagios:",
      error.message,
      error.stack
    );
    res.status(500).json({
      error: "Erro interno ao processar a requisição da API.",
      details: error.message,
    });
  }
});

// Rota catch-all para servir o index.html do React (SPA Fallback)
app.get("*", (req, res) => {
  const indexPath = path.join(frontendBuildPath, "index.html");
  console.log(
    `[Vercel Server Log] Rota catch-all '*': Tentando servir ${indexPath} para a requisição ${req.path}`
  );

  // Verifica se o arquivo index.html existe antes de tentar enviar
  fs.access(indexPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(
        `[Vercel Server Log] ERRO no catch-all: index.html NÃO ENCONTRADO em: ${indexPath}`
      );
      console.error(
        `[Vercel Server Log] Detalhes do erro fs.access: ${err.message}`
      );
      // Envie uma resposta de erro clara se o index.html não for encontrado
      return res
        .status(404)
        .send(
          `Recurso não encontrado. O servidor tentou servir ${indexPath}, mas o arquivo não existe. Verifique os logs e o processo de build do frontend.`
        );
    }

    console.log(
      `[Vercel Server Log] SUCESSO no catch-all: index.html ENCONTRADO em: ${indexPath}. Enviando arquivo...`
    );
    res.sendFile(indexPath, (sendFileError) => {
      if (sendFileError) {
        console.error(
          `[Vercel Server Log] ERRO no catch-all ao enviar index.html de ${indexPath}: `,
          sendFileError
        );
        if (!res.headersSent) {
          res
            .status(500)
            .send(
              "Erro interno do servidor ao tentar enviar o arquivo principal da aplicação."
            );
        }
      } else {
        console.log(
          `[Vercel Server Log] SUCESSO no catch-all: index.html enviado para ${req.path}`
        );
      }
    });
  });
});

// Exportar o app para a Vercel
module.exports = app;

// Se você quiser testar localmente:
// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//   console.log(`Servidor rodando localmente na porta ${PORT}`);
// });
