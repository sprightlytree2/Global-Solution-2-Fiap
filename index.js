const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");
const { IamAuthenticator } = require('ibm-watson/auth');
const AssistantV2 = require('ibm-watson/assistant/v2');
require('dotenv').config();

const app = express();
const port = 3000;

// Configuração do Watson Assistant
const assistant = new AssistantV2({
  version: '2024-08-25', // Insira a versão adequada para sua integração
  authenticator: new IamAuthenticator({
    apikey: process.env.ASSISTANT_API_KEY,
  }),
  serviceUrl: process.env.ASSISTANT_URL,
});

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Endpoint para processar perguntas
app.post('/pergunta', async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Pergunta não fornecida' });
  }

  try {
    // Cria ou usa uma sessão existente
    const sessionIdResponse = await assistant.createSession({
      assistantId: process.env.ASSISTANT_ID,
    });

    const sessionId = sessionIdResponse.result.session_id;

    // Envia a pergunta ao Watson Assistant
    const response = await assistant.message({
      assistantId: process.env.ASSISTANT_ID,
      sessionId,
      input: {
        'message_type': 'text',
        'text': question,
      },
    });

    const responseBody = response.result.output.generic;

    const tipoResposta = responseBody.map(item => item.response_type).join('\n');

    if(tipoResposta == "text"){
      const respostaBot = responseBody.map(item => item.text).join('\n');
      res.json({ response: { resposta: respostaBot, listaSugestoes: []} });
    }

    if(tipoResposta == "suggestion"){
      var listaSugestoes = [];

      responseBody[0].suggestions.map(item => (listaSugestoes.push(item.label)));

      const indexParaRemover = listaSugestoes.findIndex(item => item == "Nenhum dos itens acima");

      if(indexParaRemover != -1)
        listaSugestoes.splice(indexParaRemover, 1);

      res.json({ response: { resposta: "", listaSugestoes: listaSugestoes} });
    }

    else
      res.status(400).json("Não entendi a pergunta");

  } 
  catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao processar a solicitação' });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});