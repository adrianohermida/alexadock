from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Processo(Base):
    __tablename__ = "processos"

    id = Column(Integer, primary_key=True, index=True)
    cliente = Column(String, index=True)
    status = Column(String)
    fase = Column(String)
    prazo = Column(String)

class LogEvento(Base):
    __tablename__ = "log_eventos"

    id = Column(Integer, primary_key=True, index=True)
    usuario = Column(String, nullable=True)
    acao = Column(String)
    detalhes = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    senha_hash = Column(String)
    ativo = Column(Integer, default=1)  # 1 = ativo, 0 = inativo
    criado_em = Column(DateTime, default=datetime.utcnow)
