import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const OLLAMA_URL = 'https://ollama.com/api/chat';
const OLLAMA_MODEL = 'gemma4:31b-cloud';

corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gérer les requêtes OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()

    // Récupération de la clé API depuis les secrets Supabase
    const ollamaApiKey = Deno.env.get('OLLAMA_API_KEY')

    if (!ollamaApiKey) {
      throw new Error('La clé API Ollama n\'est pas configurée sur le serveur')
    }

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ollamaApiKey}`
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Ollama: ${errorText}`)
    }

    const data = await response.json()

    return new Response(
      JSON.stringify({ content: data.message.content }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})