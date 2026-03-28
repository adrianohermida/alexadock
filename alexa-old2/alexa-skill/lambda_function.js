const axios = require("axios");

exports.handler = async (event) => {
    try {
        console.log("Evento Alexa recebido:", JSON.stringify(event, null, 2));

        if (event.request.type === "IntentRequest") {
            const intentName = event.request.intent.name;
            const API_URL = "https://SEU_URL_PUBLICO_DA_API"; // *** SUBSTITUA PELO SEU URL PÚBLICO DA API ***

            switch (intentName) {
                case "ConsultarProcessoIntent":
                    const clienteSlot = event.request.intent.slots.cliente;
                    let clienteNome = "";

                    if (clienteSlot && clienteSlot.value) {
                        clienteNome = clienteSlot.value;
                    } else {
                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: "Desculpe, não entendi o nome do cliente. Por favor, diga novamente.",
                                },
                                shouldEndSession: false,
                            },
                        };
                    }

                    try {
                        const response = await axios.get(`${API_URL}/processo/${encodeURIComponent(clienteNome)}`);
                        const status = response.data.status;
                        const fase = response.data.fase;
                        const prazo = response.data.prazo;

                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: `O processo de ${clienteNome} está ${status}, na fase de ${fase}, com prazo de ${prazo}.`,
                                },
                                shouldEndSession: true,
                            },
                        };
                    } catch (apiError) {
                        console.error("Erro ao consultar a API Lawdesk (Processo):", apiError.message);
                        let errorMessage = "";
                        if (apiError.response && apiError.response.status === 404) {
                            errorMessage = `Não encontrei nenhum processo para ${clienteNome}.`;
                        } else {
                            errorMessage = "Houve um erro ao consultar o sistema jurídico. Por favor, tente novamente mais tarde.";
                        }
                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: errorMessage,
                                },
                                shouldEndSession: true,
                            },
                        };
                    }

                case "LigarArIntent":
                    const temperaturaSlotLigar = event.request.intent.slots.temperatura;
                    let temperaturaLigar = null;
                    if (temperaturaSlotLigar && temperaturaSlotLigar.value) {
                        temperaturaLigar = parseInt(temperaturaSlotLigar.value);
                    }

                    try {
                        let response;
                        if (temperaturaLigar) {
                            response = await axios.post(`${API_URL}/ar/ligar`, { temperatura: temperaturaLigar });
                        } else {
                            response = await axios.post(`${API_URL}/ar/ligar`);
                        }
                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: response.data.message,
                                },
                                shouldEndSession: true,
                            },
                        };
                    } catch (apiError) {
                        console.error("Erro ao ligar ar-condicionado:", apiError.message);
                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: "Desculpe, não consegui ligar o ar-condicionado. Verifique a conexão ou tente novamente.",
                                },
                                shouldEndSession: true,
                            },
                        };
                    }

                case "DesligarArIntent":
                    try {
                        const response = await axios.post(`${API_URL}/ar/desligar`);
                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: response.data.message,
                                },
                                shouldEndSession: true,
                            },
                        };
                    } catch (apiError) {
                        console.error("Erro ao desligar ar-condicionado:", apiError.message);
                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: "Desculpe, não consegui desligar o ar-condicionado. Verifique a conexão ou tente novamente.",
                                },
                                shouldEndSession: true,
                            },
                        };
                    }

                case "AjustarTemperaturaIntent":
                    const temperaturaSlotAjustar = event.request.intent.slots.temperatura;
                    if (!temperaturaSlotAjustar || !temperaturaSlotAjustar.value) {
                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: "Desculpe, não entendi a temperatura. Por favor, diga a temperatura desejada.",
                                },
                                shouldEndSession: false,
                            },
                        };
                    }
                    const temperaturaAjustar = parseInt(temperaturaSlotAjustar.value);

                    try {
                        const response = await axios.post(`${API_URL}/ar/temperatura/${temperaturaAjustar}`);
                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: response.data.message,
                                },
                                shouldEndSession: true,
                            },
                        };
                    } catch (apiError) {
                        console.error("Erro ao ajustar temperatura:", apiError.message);
                        let errorMessage = "Desculpe, não consegui ajustar a temperatura. Verifique a conexão ou tente novamente.";
                        if (apiError.response && apiError.response.status === 400) {
                            errorMessage = apiError.response.data.detail || errorMessage;
                        }
                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: errorMessage,
                                },
                                shouldEndSession: true,
                            },
                        };
                    }

                case "ConsultarIAIntent": 
                    const perguntaSlot = event.request.intent.slots.pergunta;
                    if (!perguntaSlot || !perguntaSlot.value) {
                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: "Desculpe, não entendi sua pergunta. Por favor, formule-a novamente.",
                                },
                                shouldEndSession: false,
                            },
                        };
                    }
                    const perguntaIA = perguntaSlot.value;

                    try {
                        const response = await axios.post(`${API_URL}/ia/perguntar`, { pergunta: perguntaIA });
                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: response.data.resposta,
                                },
                                shouldEndSession: true,
                            },
                        };
                    } catch (apiError) {
                        console.error("Erro ao consultar a IA:", apiError.message);
                        return {
                            version: "1.0",
                            response: {
                                outputSpeech: {
                                    type: "PlainText",
                                    text: "Desculpe, houve um erro ao consultar a inteligência artificial. Por favor, tente novamente mais tarde.",
                                },
                                shouldEndSession: true,
                            },
                        };
                    }

                default:
                    return {
                        version: "1.0",
                        response: {
                            outputSpeech: {
                                type: "PlainText",
                                text: "Desculpe, não entendi o que você pediu. Posso consultar o status de um processo, controlar o ar-condicionado ou responder a perguntas jurídicas.",
                            },
                            shouldEndSession: false,
                        },
                    };
            }
        } else if (event.request.type === "LaunchRequest") {
            return {
                version: "1.0",
                response: {
                    outputSpeech: {
                        type: "PlainText",
                        text: "Bem-vindo ao Lawdesk Assistant. Posso consultar o status de um processo, controlar o ar-condicionado ou responder a perguntas jurídicas. Como posso ajudar?",
                    },
                    shouldEndSession: false,
                },
            };
        }

        return {
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Desculpe, algo deu errado. Por favor, tente novamente.",
                },
                shouldEndSession: true,
            },
        };

    } catch (error) {
        console.error("Erro geral no handler da Lambda:", error);
        return {
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.",
                },
                shouldEndSession: true,
            },
        };
    }
};
