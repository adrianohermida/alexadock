export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    url.hostname = env.API_HOSTNAME; // Variável de ambiente para o hostname do seu backend FastAPI
    url.port = env.API_PORT; // Variável de ambiente para a porta do seu backend FastAPI
    url.protocol = 'http'; // Ou 'https' se o seu backend estiver em HTTPS

    const newRequest = new Request(url.toString(), request);
    return fetch(newRequest);
  },
};
