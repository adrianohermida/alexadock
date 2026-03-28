/**
 * Lawdesk AI Ecosystem - Cloudflare Workers (V4)
 * Backend serverless que substitui o FastAPI
 * Integra Supabase, Ollama Local e OpenAI
 */

import { Router } from 'itty-router';
import { createClient } from '@supabase/supabase-js';

// Tipos de ambiente
interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  OPENAI_API_KEY: string;
  OLLAMA_BASE_URL: string;
  OLLAMA_MODEL: string;
}

// Inicializar router
const router = Router();

// Middleware para CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Middleware para validação de JWT (Supabase)
async function validateToken(request: Request, env: Env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    // Validar token com Supabase
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    return null;
  }
}

// AI Router - Lógica de decisão entre OpenAI e Ollama Local
async function routeToAI(
  pergunta: string,
  sensibilidade: 'publico' | 'sigiloso',
  env: Env
): Promise<string> {
  if (sensibilidade === 'sigiloso') {
    // Usar Ollama Local para dados sensíveis
    return await consultarOllama(pergunta, env);
  } else {
    // Usar OpenAI para consultas genéricas
    return await consultarOpenAI(pergunta, env);
  }
}

// Consultar Ollama Local
async function consultarOllama(pergunta: string, env: Env): Promise<string> {
  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        prompt: pergunta,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao consultar Ollama');
    }

    const data = await response.json();
    return data.response || 'Sem resposta do modelo local';
  } catch (error) {
    return `Erro ao processar com IA local: ${error.message}`;
  }
}

// Consultar OpenAI
async function consultarOpenAI(pergunta: string, env: Env): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: pergunta }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao consultar OpenAI');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sem resposta da OpenAI';
  } catch (error) {
    return `Erro ao processar com OpenAI: ${error.message}`;
  }
}

// Endpoints de API

// 1. Autenticação (Login/Registro)
router.post('/auth/register', async (request: Request, env: Env) => {
  try {
    const { email, password } = await request.json();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    const { data, error } = await supabase.auth.signUpWithPassword({
      email,
      password,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ user: data.user }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao registrar' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

router.post('/auth/login', async (request: Request, env: Env) => {
  try {
    const { email, password } = await request.json();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ session: data.session }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao fazer login' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// 2. Processos
router.get('/processos', async (request: Request, env: Env) => {
  const user = await validateToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('processos')
      .select('*')
      .eq('usuario_id', user.id);

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao buscar processos' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

router.post('/processos', async (request: Request, env: Env) => {
  const user = await validateToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { numero_processo, cliente_nome, descricao } = await request.json();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    const { data, error } = await supabase
      .from('processos')
      .insert([
        {
          usuario_id: user.id,
          numero_processo,
          cliente_nome,
          descricao,
        },
      ])
      .select();

    if (error) throw error;

    return new Response(JSON.stringify(data[0]), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao criar processo' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// 3. Consultas de IA com AI Router
router.post('/ia/consultar', async (request: Request, env: Env) => {
  const user = await validateToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { pergunta, sensibilidade = 'publico' } = await request.json();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    // Chamar AI Router
    const resposta = await routeToAI(pergunta, sensibilidade, env);

    // Salvar consulta no histórico
    const { data, error } = await supabase
      .from('consultas_ia')
      .insert([
        {
          usuario_id: user.id,
          pergunta,
          resposta,
          modelo_utilizado: sensibilidade === 'sigiloso' ? 'ollama' : 'openai',
          dados_sensibilidade: sensibilidade,
        },
      ])
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ resposta, consulta_id: data[0].id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao consultar IA' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// 4. Logs de Auditoria
router.get('/logs', async (request: Request, env: Env) => {
  const user = await validateToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('logs_auditoria')
      .select('*')
      .eq('usuario_id', user.id)
      .order('criado_em', { ascending: false })
      .limit(100);

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao buscar logs' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Tratamento de OPTIONS (CORS preflight)
router.options('*', () => {
  return new Response(null, { headers: corsHeaders });
});

// 404
router.all('*', () => {
  return new Response(JSON.stringify({ error: 'Rota não encontrada' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

// Exportar handler
export default {
  fetch: router.handle,
};
