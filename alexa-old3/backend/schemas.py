from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class ProcessoBase(BaseModel):
    cliente: str
    status: str
    fase: str
    prazo: str

class ProcessoCreate(ProcessoBase):
    pass

class ProcessoResponse(ProcessoBase):
    id: int

    class Config:
        orm_mode = True

class LogEventoBase(BaseModel):
    usuario: str | None = None
    acao: str
    detalhes: str | None = None

class LogEventoCreate(LogEventoBase):
    pass

class LogEventoResponse(LogEventoBase):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True

# Esquemas para IA e RAG
class IAPergunta(BaseModel):
    pergunta: str

class IAResponse(BaseModel):
    resposta: str

class IADocumento(BaseModel):
    texto: str
    id: Optional[str] = None # ID opcional para o documento no banco vetorial

# Esquemas para Autenticação (Fase 5)
class UsuarioBase(BaseModel):
    username: str
    email: str

class UsuarioCreate(UsuarioBase):
    senha: str

class UsuarioResponse(UsuarioBase):
    id: int
    ativo: int
    criado_em: datetime

    class Config:
        orm_mode = True

class LoginRequest(BaseModel):
    username: str
    senha: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: str
