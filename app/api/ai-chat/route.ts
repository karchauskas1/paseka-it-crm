import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// Available AI models via OpenRouter
const AI_MODELS = {
  'openai/gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    description: 'Самая мощная модель GPT-4',
  },
  'openai/gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: 'Быстрая и экономичная модель',
  },
  'anthropic/claude-3-opus': {
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Самая мощная модель Claude',
  },
  'anthropic/claude-3-sonnet': {
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: 'Баланс скорости и качества',
  },
  'anthropic/claude-3-haiku': {
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Быстрая и лёгкая модель',
  },
  'google/gemini-pro': {
    name: 'Gemini Pro',
    provider: 'Google',
    description: 'Мощная модель от Google',
  },
  'meta-llama/llama-3-70b-instruct': {
    name: 'Llama 3 70B',
    provider: 'Meta',
    description: 'Открытая модель от Meta',
  },
  'mistralai/mixtral-8x7b-instruct': {
    name: 'Mixtral 8x7B',
    provider: 'Mistral',
    description: 'MoE модель от Mistral',
  },
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY не настроен' },
        { status: 500 }
      )
    }

    const { messages, model } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages is required and must be an array' },
        { status: 400 }
      )
    }

    const selectedModel = model || 'openai/gpt-4-turbo'

    if (!AI_MODELS[selectedModel as keyof typeof AI_MODELS]) {
      return NextResponse.json(
        { error: 'Invalid model selected' },
        { status: 400 }
      )
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: 2000,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `OpenRouter API error: ${response.status}`

      if (response.status === 401) {
        errorMessage = 'Неверный API ключ OpenRouter'
      } else if (response.status === 402) {
        errorMessage = 'Недостаточно средств на счёте OpenRouter'
      } else if (response.status === 429) {
        errorMessage = 'Превышен лимит запросов'
      } else {
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error?.message || errorMessage
        } catch {
          errorMessage = `${errorMessage} - ${errorText}`
        }
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ''

    return NextResponse.json({
      content,
      model: selectedModel,
      modelInfo: AI_MODELS[selectedModel as keyof typeof AI_MODELS],
      usage: data.usage,
    })
  } catch (error: any) {
    console.error('AI Chat Error:', error)
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// GET endpoint to return available models
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ models: AI_MODELS })
  } catch (error) {
    console.error('Get models error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
