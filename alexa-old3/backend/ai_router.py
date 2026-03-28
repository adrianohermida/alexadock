import os
import requests
from openai import OpenAI
import chromadb
from chromadb.utils import embedding_functions

# Configurações de ambiente
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

# Configuração do ChromaDB
# Usaremos um embedding function padrão para o ChromaDB, compatível com OpenAI ou modelos locais
# Para produção, considere um modelo de embedding mais robusto e persistente
embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
chroma_client = chromadb.PersistentClient(path="./chroma_data") # Persiste os dados em disco

try:
    collection = chroma_client.get_or_create_collection(name="lawdesk_jurisprudencia", embedding_function=embedding_function)
except Exception as e:
    print(f"Erro ao inicializar ChromaDB: {e}")
    print("Certifique-se de que o modelo 'all-MiniLM-L6-v2' está disponível ou ajuste a configuração.")
    collection = None

def detectar_sensibilidade(texto: str) -> bool:
    """Verifica se o texto contém dados sensíveis (LGPD).
    Esta é uma implementação simplificada. Em um cenário real, usaria NLP avançado.
    """
    palavras_chave_sensivel = ["CPF", "RG", "CNPJ", "segredo de justiça", "confidencial", "sigiloso", "dados pessoais", "informações financeiras"]
    return any(palavra in texto.lower() for palavra in palavras_chave_sensivel)

def consultar_openai(pergunta: str, contexto: str = None) -> str:
    """Consulta a OpenAI com a pergunta e contexto fornecido."""
    if not OPENAI_API_KEY:
        return "Erro: Chave da OpenAI não configurada."
    
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    messages = []
    if contexto:
        messages.append({"role": "system", "content": f"Você é um assistente jurídico. Use o seguinte contexto para responder: {contexto}"})
    messages.append({"role": "user", "content": pergunta})
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Ou gpt-4, dependendo da sua preferência e acesso
            messages=messages,
            max_tokens=500
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Erro ao consultar OpenAI: {e}"

def consultar_ollama(pergunta: str, contexto: str = None) -> str:
    """Consulta um modelo local via Ollama com a pergunta e contexto fornecido."""
    messages = []
    if contexto:
        messages.append({"role": "system", "content": f"Você é um assistente jurídico. Use o seguinte contexto para responder: {contexto}"})
    messages.append({"role": "user", "content": pergunta})

    try:
        response = requests.post(f"{OLLAMA_BASE_URL}/api/chat", json={
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": False
        })
        response.raise_for_status()
        return response.json()["message"]["content"]
    except requests.exceptions.RequestException as e:
        return f"Erro ao consultar Ollama: {e}. Verifique se o Ollama está rodando e o modelo '{OLLAMA_MODEL}' está baixado."

def adicionar_documento(texto: str, doc_id: str = None):
    """Adiciona um documento ao banco de dados vetorial ChromaDB."""
    if collection is None:
        raise Exception("ChromaDB não inicializado. Verifique a configuração.")

    if doc_id is None:
        # Gerar um ID único se não for fornecido
        doc_id = f"doc_{len(collection.get()['ids']) + 1}"
    
    collection.add(
        documents=[texto],
        metadatas=[{"source": "lawdesk_document"}],
        ids=[doc_id]
    )
    return doc_id

def buscar_contexto_rag(pergunta: str, n_resultados: int = 3) -> str:
    """Busca documentos relevantes no ChromaDB para usar como contexto RAG."""
    if collection is None:
        return ""

    try:
        results = collection.query(
            query_texts=[pergunta],
            n_results=n_resultados
        )
        # Concatenar os documentos encontrados para formar o contexto
        contexto = "\n\n".join(results["documents"][0]) if results["documents"] else ""
        return contexto
    except Exception as e:
        print(f"Erro ao buscar contexto no ChromaDB: {e}")
        return ""

def orquestrar_ia(pergunta: str) -> str:
    """Orquestra a consulta à IA, decidindo qual LLM usar e buscando contexto RAG."""
    contexto = buscar_contexto_rag(pergunta)
    
    if detectar_sensibilidade(pergunta + contexto):
        return consultar_ollama(pergunta, contexto)
    else:
        return consultar_openai(pergunta, contexto)
