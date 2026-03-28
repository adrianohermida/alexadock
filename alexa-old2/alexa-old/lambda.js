const Alexa = require('ask-sdk-core');
const https = require('https');

// ⚠️ Atualize com a URL do seu webhook N8N
const WEBHOOK_URL = 'https://seu-n8n.com/webhook/alexa-claude';

function callWebhook(task) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ task });
        const url = new URL(WEBHOOK_URL);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Jarvis ativado. O que você quer que eu faça?')
            .reprompt('O que você quer que eu faça?')
            .getResponse();
    }
};

const ExecutarIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ExecutarIntent';
    },
    async handle(handlerInput) {
        const task = Alexa.getSlotValue(handlerInput.requestEnvelope, 'tarefa') || 'tarefa não identificada';
        try {
            await callWebhook(task);
            return handlerInput.responseBuilder
                .speak(`Certo, executando: ${task}`)
                .getResponse();
        } catch (err) {
            return handlerInput.responseBuilder
                .speak('Ocorreu um erro ao enviar o comando.')
                .getResponse();
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Diga algo como: executar commit no meu site')
            .reprompt('O que você quer fazer?')
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder.speak('Até logo!').getResponse();
    }
};

const ErrorHandler = {
    canHandle() { return true; },
    handle(handlerInput, error) {
        return handlerInput.responseBuilder
            .speak('Desculpe, não entendi. Tente novamente.')
            .reprompt('Tente novamente.')
            .getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        ExecutarIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
