import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  // Estados de autenticação
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [usuario, setUsuario] = useState(localStorage.getItem('usuario'))
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // Estados de registro
  const [showRegister, setShowRegister] = useState(false)
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerError, setRegisterError] = useState('')

  // Estados de seção
  const [secaoAtiva, setSecaoAtiva] = useState('dashboard')

  // Estados de processos
  const [processos, setProcessos] = useState([])
  const [clienteNome, setClienteNome] = useState('')
  const [processoStatus, setProcessoStatus] = useState('')
  const [processoFase, setProcessoFase] = useState('')
  const [processoPrazo, setProcessoPrazo] = useState('')
  const [processoError, setProcessoError] = useState('')
  const [processoSuccess, setProcessoSuccess] = useState('')

  // Estados de IA
  const [documentoTexto, setDocumentoTexto] = useState('')
  const [documentoId, setDocumentoId] = useState('')
  const [documentoError, setDocumentoError] = useState('')
  const [documentoSuccess, setDocumentoSuccess] = useState('')

  // Estados de teste de IA
  const [iaPergunta, setIaPergunta] = useState('')
  const [iaResposta, setIaResposta] = useState('')
  const [iaLoading, setIaLoading] = useState(false)
  const [iaError, setIaError] = useState('')

  // Estados de logs
  const [logs, setLogs] = useState([])

  // Estados de estatísticas
  const [stats, setStats] = useState({
    totalProcessos: 0,
    usuariosAtivos: 0,
    totalLogs: 0
  })

  // Carregar dados ao fazer login
  useEffect(() => {
    if (token && usuario) {
      carregarDados()
    }
  }, [token, usuario])

  const carregarDados = async () => {
    try {
      const logsResponse = await axios.get(`${API_URL}/logs/protegido`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setLogs(logsResponse.data)
      setStats({
        totalProcessos: 20, // Placeholder - seria necessário endpoint GET /processos
        usuariosAtivos: 5,  // Placeholder
        totalLogs: logsResponse.data.length
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  // Funções de autenticação
  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username: loginUsername,
        senha: loginPassword
      })
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('usuario', response.data.usuario)
      setToken(response.data.access_token)
      setUsuario(response.data.usuario)
      setLoginError('')
      setLoginUsername('')
      setLoginPassword('')
    } catch (error) {
      setLoginError(error.response?.data?.detail || 'Erro ao fazer login')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/auth/registrar`, {
        username: registerUsername,
        email: registerEmail,
        senha: registerPassword
      })
      setRegisterError('')
      setShowRegister(false)
      setRegisterUsername('')
      setRegisterEmail('')
      setRegisterPassword('')
      alert('Usuário registrado com sucesso! Faça login.')
    } catch (error) {
      setRegisterError(error.response?.data?.detail || 'Erro ao registrar')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setToken(null)
    setUsuario(null)
    setSecaoAtiva('dashboard')
  }

  // Funções de processos
  const handleAdicionarProcesso = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/processo/add/protegido`, {
        cliente: clienteNome,
        status: processoStatus,
        fase: processoFase,
        prazo: processoPrazo
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setProcessoSuccess('Processo adicionado com sucesso!')
      setClienteNome('')
      setProcessoStatus('')
      setProcessoFase('')
      setProcessoPrazo('')
      setProcessoError('')
      setTimeout(() => setProcessoSuccess(''), 3000)
    } catch (error) {
      setProcessoError(error.response?.data?.detail || 'Erro ao adicionar processo')
    }
  }

  // Funções de IA
  const handleAdicionarDocumento = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/ia/adicionar_documento/protegido`, {
        texto: documentoTexto,
        id: documentoId || null
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setDocumentoSuccess('Documento adicionado com sucesso!')
      setDocumentoTexto('')
      setDocumentoId('')
      setDocumentoError('')
      setTimeout(() => setDocumentoSuccess(''), 3000)
    } catch (error) {
      setDocumentoError(error.response?.data?.detail || 'Erro ao adicionar documento')
    }
  }

  const handleTestarIA = async (e) => {
    e.preventDefault()
    setIaLoading(true)
    setIaError('')
    try {
      const response = await axios.post(`${API_URL}/ia/perguntar`, {
        pergunta: iaPergunta
      })
      setIaResposta(response.data.resposta)
    } catch (error) {
      setIaError(error.response?.data?.detail || 'Erro ao processar pergunta')
    } finally {
      setIaLoading(false)
    }
  }

  // Renderização de tela de login
  if (!token) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <h1>Lawdesk AI</h1>
            <p className="subtitle">Ecossistema Jurídico Inteligente</p>
          </div>

          {!showRegister ? (
            <>
              {loginError && <div className="alert alert-error">{loginError}</div>}
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="username">Usuário:</label>
                  <input
                    id="username"
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Digite seu usuário"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Senha:</label>
                  <input
                    id="password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">Entrar</button>
              </form>
              <div className="login-footer">
                <p>Não tem conta? <button type="button" className="link-btn" onClick={() => setShowRegister(true)}>Registre-se aqui</button></p>
              </div>
            </>
          ) : (
            <>
              {registerError && <div className="alert alert-error">{registerError}</div>}
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label htmlFor="reg-username">Usuário:</label>
                  <input
                    id="reg-username"
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="Escolha um usuário"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-email">Email:</label>
                  <input
                    id="reg-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="Digite seu email"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-password">Senha:</label>
                  <input
                    id="reg-password"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Escolha uma senha"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">Registrar</button>
              </form>
              <div className="login-footer">
                <p>Já tem conta? <button type="button" className="link-btn" onClick={() => setShowRegister(false)}>Faça login</button></p>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Renderização do dashboard
  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Lawdesk AI</h1>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${secaoAtiva === 'dashboard' ? 'active' : ''}`}
            onClick={() => setSecaoAtiva('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`nav-item ${secaoAtiva === 'processos' ? 'active' : ''}`}
            onClick={() => setSecaoAtiva('processos')}
          >
            📋 Processos
          </button>
          <button
            className={`nav-item ${secaoAtiva === 'ia' ? 'active' : ''}`}
            onClick={() => setSecaoAtiva('ia')}
          >
            🤖 IA & RAG
          </button>
          <button
            className={`nav-item ${secaoAtiva === 'logs' ? 'active' : ''}`}
            onClick={() => setSecaoAtiva('logs')}
          >
            📝 Logs
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <h2>Lawdesk AI - Dashboard Administrativo</h2>
          <div className="user-section">
            <span className="user-name">{usuario}</span>
            <button className="btn btn-logout" onClick={handleLogout}>Sair</button>
          </div>
        </header>

        <div className="content">
          {/* Dashboard */}
          {secaoAtiva === 'dashboard' && (
            <section className="section">
              <h3>Dashboard</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📋</div>
                  <div className="stat-content">
                    <h4>Total de Processos</h4>
                    <p className="stat-number">{stats.totalProcessos}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-content">
                    <h4>Usuários Ativos</h4>
                    <p className="stat-number">{stats.usuariosAtivos}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <h4>Logs Registrados</h4>
                    <p className="stat-number">{stats.totalLogs}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Processos */}
          {secaoAtiva === 'processos' && (
            <section className="section">
              <h3>Gerenciar Processos</h3>
              <div className="card">
                <h4>Adicionar Novo Processo</h4>
                {processoError && <div className="alert alert-error">{processoError}</div>}
                {processoSuccess && <div className="alert alert-success">{processoSuccess}</div>}
                <form onSubmit={handleAdicionarProcesso}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="cliente">Nome do Cliente:</label>
                      <input
                        id="cliente"
                        type="text"
                        value={clienteNome}
                        onChange={(e) => setClienteNome(e.target.value)}
                        placeholder="Ex: João Silva"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="status">Status:</label>
                      <select
                        id="status"
                        value={processoStatus}
                        onChange={(e) => setProcessoStatus(e.target.value)}
                        required
                      >
                        <option value="">Selecione um status</option>
                        <option value="Aberto">Aberto</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Concluído">Concluído</option>
                        <option value="Arquivado">Arquivado</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="fase">Fase:</label>
                      <input
                        id="fase"
                        type="text"
                        value={processoFase}
                        onChange={(e) => setProcessoFase(e.target.value)}
                        placeholder="Ex: Contestação"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="prazo">Prazo:</label>
                      <input
                        id="prazo"
                        type="text"
                        value={processoPrazo}
                        onChange={(e) => setProcessoPrazo(e.target.value)}
                        placeholder="Ex: 15 dias"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">Adicionar Processo</button>
                </form>
              </div>
            </section>
          )}

          {/* IA & RAG */}
          {secaoAtiva === 'ia' && (
            <section className="section">
              <h3>IA & RAG</h3>
              
              <div className="card">
                <h4>Adicionar Documento ao Banco Vetorial</h4>
                {documentoError && <div className="alert alert-error">{documentoError}</div>}
                {documentoSuccess && <div className="alert alert-success">{documentoSuccess}</div>}
                <form onSubmit={handleAdicionarDocumento}>
                  <div className="form-group">
                    <label htmlFor="doc-texto">Texto do Documento:</label>
                    <textarea
                      id="doc-texto"
                      value={documentoTexto}
                      onChange={(e) => setDocumentoTexto(e.target.value)}
                      placeholder="Cole aqui o texto jurídico, jurisprudência ou petição modelo..."
                      rows="6"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="doc-id">ID do Documento (opcional):</label>
                    <input
                      id="doc-id"
                      type="text"
                      value={documentoId}
                      onChange={(e) => setDocumentoId(e.target.value)}
                      placeholder="Ex: doc_contestacao_1"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Adicionar Documento</button>
                </form>
              </div>

              <div className="card">
                <h4>Testar Consulta à IA</h4>
                {iaError && <div className="alert alert-error">{iaError}</div>}
                <form onSubmit={handleTestarIA}>
                  <div className="form-group">
                    <label htmlFor="pergunta">Pergunta Jurídica:</label>
                    <textarea
                      id="pergunta"
                      value={iaPergunta}
                      onChange={(e) => setIaPergunta(e.target.value)}
                      placeholder="Faça uma pergunta jurídica..."
                      rows="4"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={iaLoading}>
                    {iaLoading ? 'Processando...' : 'Enviar Pergunta'}
                  </button>
                </form>
                {iaResposta && (
                  <div className="resposta-box">
                    <h5>Resposta da IA:</h5>
                    <p>{iaResposta}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Logs */}
          {secaoAtiva === 'logs' && (
            <section className="section">
              <h3>Logs de Auditoria</h3>
              <div className="card">
                {logs.length > 0 ? (
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Data/Hora</th>
                        <th>Usuário</th>
                        <th>Ação</th>
                        <th>Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                          <td>{log.usuario || 'Sistema'}</td>
                          <td>{log.acao}</td>
                          <td>{log.detalhes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Nenhum log registrado ainda.</p>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
