-- Lawdesk AI Ecosystem - Supabase Schema (V4)
-- Este arquivo contém a definição completa das tabelas, índices e políticas de RLS para o Supabase

-- Extensão para suporte a vetores (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela de Usuários (gerenciada pelo Supabase Auth, mas com dados adicionais)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    nome_completo VARCHAR(255),
    oab VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Processos
CREATE TABLE IF NOT EXISTS processos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    numero_processo VARCHAR(100) NOT NULL,
    cliente_nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    status VARCHAR(50) DEFAULT 'ativo',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, numero_processo)
);

-- Tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    acao VARCHAR(100) NOT NULL,
    descricao TEXT,
    dados_sensibilidade VARCHAR(50) DEFAULT 'publico',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Documentos para RAG (Memória Jurídica)
CREATE TABLE IF NOT EXISTS documentos_rag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    embedding vector(1536),
    tipo_documento VARCHAR(50) DEFAULT 'jurisprudencia',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Consultas de IA (histórico)
CREATE TABLE IF NOT EXISTS consultas_ia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    pergunta TEXT NOT NULL,
    resposta TEXT,
    modelo_utilizado VARCHAR(50) DEFAULT 'openai',
    dados_sensibilidade VARCHAR(50) DEFAULT 'publico',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_processos_usuario ON processos(usuario_id);
CREATE INDEX idx_logs_usuario ON logs_auditoria(usuario_id);
CREATE INDEX idx_documentos_usuario ON documentos_rag(usuario_id);
CREATE INDEX idx_consultas_usuario ON consultas_ia(usuario_id);
CREATE INDEX idx_documentos_embedding ON documentos_rag USING ivfflat (embedding vector_cosine_ops);

-- Row Level Security (RLS) - Ativar segurança em nível de linha
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_rag ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas_ia ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Usuários
CREATE POLICY "Usuários podem ver seus próprios dados" ON usuarios
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seus próprios dados" ON usuarios
    FOR UPDATE USING (auth.uid() = id);

-- Políticas de RLS para Processos
CREATE POLICY "Usuários podem ver seus próprios processos" ON processos
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem inserir processos" ON processos
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seus próprios processos" ON processos
    FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar seus próprios processos" ON processos
    FOR DELETE USING (auth.uid() = usuario_id);

-- Políticas de RLS para Logs de Auditoria
CREATE POLICY "Usuários podem ver seus próprios logs" ON logs_auditoria
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem inserir logs" ON logs_auditoria
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Políticas de RLS para Documentos RAG
CREATE POLICY "Usuários podem ver seus próprios documentos" ON documentos_rag
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem inserir documentos" ON documentos_rag
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seus próprios documentos" ON documentos_rag
    FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar seus próprios documentos" ON documentos_rag
    FOR DELETE USING (auth.uid() = usuario_id);

-- Políticas de RLS para Consultas de IA
CREATE POLICY "Usuários podem ver suas próprias consultas" ON consultas_ia
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem inserir consultas" ON consultas_ia
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Função para atualizar o timestamp de atualização
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamps
CREATE TRIGGER trigger_usuarios_timestamp BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_processos_timestamp BEFORE UPDATE ON processos
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_documentos_timestamp BEFORE UPDATE ON documentos_rag
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
