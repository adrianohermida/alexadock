from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta
import requests
import os

from . import models, schemas
from .database import SessionLocal, engine, get_db
from .ai_router import orquestrar_ia, adicionar_documento 
from .auth import verificar_token, gerar_hash_senha, verificar_senha, criar_token_acesso, ACCESS_TOKEN_EXPIRE_MINUTES 

# Cria as tabelas no banco de dados
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lawdesk API - Ecossistema Completo")

# Variável de ambiente para o URL do ESP32
ESP32_BASE_URL = os.getenv("ESP32_BASE_URL", "http://localhost:8001") 

# --- Endpoints de Processos (Fase 1) ---

@app.get("/processo/{cliente_nome}", response_model=schemas.ProcessoResponse)
def consultar_processo(cliente_nome: str, db: Session = Depends(get_db)):
    processo = db.query(models.Processo).filter(models.Processo.cliente == cliente_nome).first()
    if processo is None:
        log_entry = models.LogEvento(usuario="Sistema/Alexa", acao="Consulta Processo", detalhes=f"Cliente não encontrado: {cliente_nome}")
        db.add(log_entry)
        db.commit()
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    log_entry = models.LogEvento(usuario="Sistema/Alexa", acao="Consulta Processo", detalhes=f"Cliente: {cliente_nome}, Status: {processo.status}")
    db.add(log_entry)
    db.commit()
    return processo

@app.post("/processo/add", response_model=schemas.ProcessoResponse)
def adicionar_processo(processo: schemas.ProcessoCreate, db: Session = Depends(get_db)):
    db_processo = models.Processo(cliente=processo.cliente, status=processo.status, fase=processo.fase, prazo=processo.prazo)
    db.add(db_processo)
    db.commit()
    db.refresh(db_processo)
    
    log_entry = models.LogEvento(usuario="Sistema/Admin", acao="Adicionar Processo", detalhes=f"Cliente: {processo.cliente}")
    db.add(log_entry)
    db.commit()
    return db_processo

# --- Endpoints de Controle IoT (Fase 2) ---

@app.post("/ar/ligar", status_code=status.HTTP_200_OK)
def ligar_ar(temperatura: Optional[int] = None, db: Session = Depends(get_db)):
    try:
        if temperatura:
            response = requests.post(f"{ESP32_BASE_URL}/ar/ligar", json={"temperatura": temperatura})
            detalhes_log = f"Ar-condicionado ligado com temperatura: {temperatura}°C"
        else:
            response = requests.post(f"{ESP32_BASE_URL}/ar/ligar")
            detalhes_log = "Ar-condicionado ligado"
        response.raise_for_status() 
        
        log_entry = models.LogEvento(usuario="Sistema/Alexa", acao="Ligar Ar", detalhes=detalhes_log)
        db.add(log_entry)
        db.commit()
        return {"message": detalhes_log}
    except requests.exceptions.RequestException as e:
        log_entry = models.LogEvento(usuario="Sistema/Alexa", acao="Erro Ligar Ar", detalhes=f"Falha ao comunicar com ESP32: {e}")
        db.add(log_entry)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao ligar ar-condicionado: {e}")

@app.post("/ar/desligar", status_code=status.HTTP_200_OK)
def desligar_ar(db: Session = Depends(get_db)):
    try:
        response = requests.post(f"{ESP32_BASE_URL}/ar/desligar")
        response.raise_for_status()
        
        log_entry = models.LogEvento(usuario="Sistema/Alexa", acao="Desligar Ar", detalhes="Ar-condicionado desligado")
        db.add(log_entry)
        db.commit()
        return {"message": "Ar-condicionado desligado"}
    except requests.exceptions.RequestException as e:
        log_entry = models.LogEvento(usuario="Sistema/Alexa", acao="Erro Desligar Ar", detalhes=f"Falha ao comunicar com ESP32: {e}")
        db.add(log_entry)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao desligar ar-condicionado: {e}")

@app.post("/ar/temperatura/{temperatura}", status_code=status.HTTP_200_OK)
def ajustar_temperatura(temperatura: int, db: Session = Depends(get_db)):
    if not (16 <= temperatura <= 30): 
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Temperatura fora da faixa permitida (16-30°C)")
    try:
        response = requests.post(f"{ESP32_BASE_URL}/ar/temperatura", json={"temperatura": temperatura})
        response.raise_for_status()
        
        log_entry = models.LogEvento(usuario="Sistema/Alexa", acao="Ajustar Temperatura Ar", detalhes=f"Temperatura ajustada para: {temperatura}°C")
        db.add(log_entry)
        db.commit()
        return {"message": f"Temperatura do ar-condicionado ajustada para {temperatura}°C"}
    except requests.exceptions.RequestException as e:
        log_entry = models.LogEvento(usuario="Sistema/Alexa", acao="Erro Ajustar Temperatura Ar", detalhes=f"Falha ao comunicar com ESP32: {e}")
        db.add(log_entry)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao ajustar temperatura do ar-condicionado: {e}")

@app.get("/logs", response_model=List[schemas.LogEventoResponse])
def get_logs(db: Session = Depends(get_db)):
    logs = db.query(models.LogEvento).order_by(models.LogEvento.timestamp.desc()).all()
    return logs

# --- Endpoints de IA e RAG (Fase 3 e 4) ---

@app.post("/ia/perguntar", response_model=schemas.IAResponse)
def perguntar_ia(pergunta_ia: schemas.IAPergunta, db: Session = Depends(get_db)):
    try:
        resposta = orquestrar_ia(pergunta_ia.pergunta)
        
        log_entry = models.LogEvento(usuario="Sistema/Alexa", acao="Consulta IA RAG", detalhes=f"Pergunta: {pergunta_ia.pergunta}")
        db.add(log_entry)
        db.commit()
        return {"resposta": resposta}
    except Exception as e:
        log_entry = models.LogEvento(usuario="Sistema/Alexa", acao="Erro Consulta IA RAG", detalhes=f"Pergunta: {pergunta_ia.pergunta}, Erro: {e}")
        db.add(log_entry)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao processar pergunta da IA: {e}")

@app.post("/ia/adicionar_documento", status_code=status.HTTP_200_OK)
def adicionar_documento_rag(documento: schemas.IADocumento, db: Session = Depends(get_db)):
    try:
        adicionar_documento(documento.texto, documento.id)
        log_entry = models.LogEvento(usuario="Sistema/Admin", acao="Adicionar Documento RAG", detalhes=f"Documento adicionado com ID: {documento.id}")
        db.add(log_entry)
        db.commit()
        return {"message": "Documento adicionado com sucesso ao banco vetorial."}
    except Exception as e:
        log_entry = models.LogEvento(usuario="Sistema/Admin", acao="Erro Adicionar Documento RAG", detalhes=f"Erro ao adicionar documento: {e}")
        db.add(log_entry)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao adicionar documento: {e}")

# --- Endpoints de Autenticação (Fase 5) ---

@app.post("/auth/registrar", response_model=schemas.UsuarioResponse)
def registrar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    """Registra um novo usuário no sistema."""
    db_usuario = db.query(models.Usuario).filter(models.Usuario.username == usuario.username).first()
    if db_usuario:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuário já existe")
    
    db_email = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()
    if db_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já registrado")
    
    novo_usuario = models.Usuario(
        username=usuario.username,
        email=usuario.email,
        senha_hash=gerar_hash_senha(usuario.senha)
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    
    log_entry = models.LogEvento(usuario="Sistema/Admin", acao="Registrar Usuário", detalhes=f"Novo usuário: {usuario.username}")
    db.add(log_entry)
    db.commit()
    
    return novo_usuario

@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Autentica um usuário e retorna um token JWT."""
    usuario = db.query(models.Usuario).filter(models.Usuario.username == login_data.username).first()
    
    if not usuario or not verificar_senha(login_data.senha, usuario.senha_hash):
        log_entry = models.LogEvento(usuario="Sistema/Auth", acao="Falha de Login", detalhes=f"Usuário: {login_data.username}")
        db.add(log_entry)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    
    if not usuario.ativo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = criar_token_acesso(data={"sub": usuario.username}, expires_delta=access_token_expires)
    
    log_entry = models.LogEvento(usuario=usuario.username, acao="Login", detalhes=f"Usuário {usuario.username} fez login")
    db.add(log_entry)
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer", "usuario": usuario.username}

@app.get("/auth/me", response_model=schemas.UsuarioResponse)
def obter_usuario_atual(usuario_id: str = Depends(verificar_token), db: Session = Depends(get_db)):
    """Retorna os dados do usuário autenticado."""
    usuario = db.query(models.Usuario).filter(models.Usuario.username == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return usuario

# --- Endpoints Protegidos (Requer Autenticação) ---

@app.get("/processo/{cliente_nome}/protegido", response_model=schemas.ProcessoResponse)
def consultar_processo_protegido(cliente_nome: str, usuario_id: str = Depends(verificar_token), db: Session = Depends(get_db)):
    """Consulta um processo (versão protegida com autenticação)."""
    processo = db.query(models.Processo).filter(models.Processo.cliente == cliente_nome).first()
    if processo is None:
        log_entry = models.LogEvento(usuario=usuario_id, acao="Consulta Processo Protegida", detalhes=f"Cliente não encontrado: {cliente_nome}")
        db.add(log_entry)
        db.commit()
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    log_entry = models.LogEvento(usuario=usuario_id, acao="Consulta Processo Protegida", detalhes=f"Cliente: {cliente_nome}, Status: {processo.status}")
    db.add(log_entry)
    db.commit()
    return processo

@app.post("/processo/add/protegido", response_model=schemas.ProcessoResponse)
def adicionar_processo_protegido(processo: schemas.ProcessoCreate, usuario_id: str = Depends(verificar_token), db: Session = Depends(get_db)):
    """Adiciona um novo processo (versão protegida com autenticação)."""
    db_processo = models.Processo(cliente=processo.cliente, status=processo.status, fase=processo.fase, prazo=processo.prazo)
    db.add(db_processo)
    db.commit()
    db.refresh(db_processo)
    
    log_entry = models.LogEvento(usuario=usuario_id, acao="Adicionar Processo Protegido", detalhes=f"Cliente: {processo.cliente}")
    db.add(log_entry)
    db.commit()
    return db_processo

@app.get("/logs/protegido", response_model=List[schemas.LogEventoResponse])
def obter_logs_protegido(usuario_id: str = Depends(verificar_token), db: Session = Depends(get_db)):
    """Obtém todos os logs de auditoria (versão protegida com autenticação)."""
    logs = db.query(models.LogEvento).order_by(models.LogEvento.timestamp.desc()).all()
    return logs

@app.post("/ia/adicionar_documento/protegido", status_code=status.HTTP_200_OK)
def adicionar_documento_protegido(documento: schemas.IADocumento, usuario_id: str = Depends(verificar_token), db: Session = Depends(get_db)):
    """Adiciona um documento ao banco vetorial (versão protegida com autenticação)."""
    try:
        adicionar_documento(documento.texto, documento.id)
        log_entry = models.LogEvento(usuario=usuario_id, acao="Adicionar Documento RAG Protegido", detalhes=f"Documento adicionado com ID: {documento.id}")
        db.add(log_entry)
        db.commit()
        return {"message": "Documento adicionado com sucesso ao banco vetorial."}
    except Exception as e:
        log_entry = models.LogEvento(usuario=usuario_id, acao="Erro Adicionar Documento RAG Protegido", detalhes=f"Erro ao adicionar documento: {e}")
        db.add(log_entry)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao adicionar documento: {e}")
