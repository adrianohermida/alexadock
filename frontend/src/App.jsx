import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Inicializar cliente Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const workersUrl = import.meta.env.VITE_WORKERS_URL;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [processos, setProcessos] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setIsLoggedIn(true);
        await carregarDados(session.access_token);
      }
    };
    checkAuth();
  }, []);

  // Carregar dados do usuário
  const carregarDados = async (token) => {
    try {
      setLoading(true);
      
      // Buscar processos
      const processosRes = await fetch(`${workersUrl}/processos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (processosRes.ok) {
        setProcessos(await processosRes.json());
      }

      // Buscar logs
      const logsRes = await fetch(`${workersUrl}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setUser(data.user);
      setIsLoggedIn(true);
      await carregarDados(data.session.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUser(null);
    setProcessos([]);
    setLogs([]);
  };

  // Adicionar processo
  const handleAddProcesso = async (e) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();

    try {
      setLoading(true);
      const res = await fetch(`${workersUrl}/processos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          numero_processo: e.target.numero.value,
          cliente_nome: e.target.cliente.value,
          descricao: e.target.descricao.value,
        }),
      });

      if (res.ok) {
        const novoProcesso = await res.json();
        setProcessos([...processos, novoProcesso]);
        e.target.reset();
        setError(null);
      }
    } catch (err) {
      setError('Erro ao adicionar processo');
    } finally {
      setLoading(false);
    }
  };

  // Consultar IA
  const handleConsultarIA = async (e) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();

    try {
      setLoading(true);
      const res = await fetch(`${workersUrl}/ia/consultar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          pergunta: e.target.pergunta.value,
          sensibilidade: e.target.sensibilidade.value,
        }),
      });

      if (res.ok) {
        const { resposta } = await res.json();
        alert(`Resposta da IA:\n\n${resposta}`);
        e.target.reset();
      }
    } catch (err) {
      setError('Erro ao consultar IA');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <h1>Lawdesk AI</h1>
            <p className="subtitle">Ecossistema Jurídico Inteligente</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" required />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input type="password" name="password" required />
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>Lawdesk AI</h1>
        </div>
        <button
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-item ${activeTab === 'processos' ? 'active' : ''}`}
          onClick={() => setActiveTab('processos')}
        >
          📁 Processos
        </button>
        <button
          className={`nav-item ${activeTab === 'ia' ? 'active' : ''}`}
          onClick={() => setActiveTab('ia')}
        >
          🤖 IA & RAG
        </button>
        <button
          className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Logs
        </button>
        <button className="nav-item" onClick={handleLogout}>
          🚪 Sair
        </button>
      </div>

      <div className="main-content">
        <div className="header">
          <h2>Bem-vindo, {user?.email}</h2>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="content-section">
            <h3>Dashboard</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{processos.length}</div>
                <div className="stat-label">Processos</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{logs.length}</div>
                <div className="stat-label">Ações Registradas</div>
              </div>
            </div>
          </div>
        )}

        {/* Processos */}
        {activeTab === 'processos' && (
          <div className="content-section">
            <h3>Gerenciar Processos</h3>
            <form onSubmit={handleAddProcesso} className="form-section">
              <div className="form-group">
                <label>Número do Processo</label>
                <input type="text" name="numero" required />
              </div>
              <div className="form-group">
                <label>Nome do Cliente</label>
                <input type="text" name="cliente" required />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea name="descricao" rows="4"></textarea>
              </div>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Adicionando...' : 'Adicionar Processo'}
              </button>
            </form>

            <div className="table-section">
              <h4>Processos Cadastrados</h4>
              <table>
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Status</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {processos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.numero_processo}</td>
                      <td>{p.cliente_nome}</td>
                      <td>{p.status}</td>
                      <td>{new Date(p.criado_em).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* IA & RAG */}
        {activeTab === 'ia' && (
          <div className="content-section">
            <h3>Consultar IA Jurídica</h3>
            <form onSubmit={handleConsultarIA} className="form-section">
              <div className="form-group">
                <label>Pergunta Jurídica</label>
                <textarea name="pergunta" rows="4" placeholder="Faça sua pergunta..." required></textarea>
              </div>
              <div className="form-group">
                <label>Nível de Sensibilidade</label>
                <select name="sensibilidade">
                  <option value="publico">Público (OpenAI)</option>
                  <option value="sigiloso">Sigiloso (Ollama Local)</option>
                </select>
              </div>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Processando...' : 'Consultar IA'}
              </button>
            </form>
          </div>
        )}

        {/* Logs */}
        {activeTab === 'logs' && (
          <div className="content-section">
            <h3>Auditoria de Logs</h3>
            <table>
              <thead>
                <tr>
                  <th>Ação</th>
                  <th>Descrição</th>
                  <th>Sensibilidade</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.acao}</td>
                    <td>{log.descricao}</td>
                    <td>{log.dados_sensibilidade}</td>
                    <td>{new Date(log.criado_em).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
