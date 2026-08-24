import Anthropic from '@anthropic-ai/sdk'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { loadState } from '@/lib/db/queries'
import { buildCoachContext } from '@/lib/coach/context'
import { localAnswer } from '@/lib/coach/local'
import { contextBlock, COACH_SYSTEM } from '@/lib/coach/prompt'
import { COACH_TOOLS, TOOL_LABELS, validateProposal, type ToolName } from '@/lib/coach/tools'
import { todayISO } from '@/lib/engine/date'
import { currentUserId } from '@/lib/supabase/server'

/**
 * COACH — route serveur uniquement.
 *
 * La clé API ne quitte jamais le serveur. La réponse est streamée en NDJSON :
 * une ligne par événement, pour que l'interface affiche le texte au fil de
 * l'eau et les propositions d'action à la fin.
 *
 * Aucun outil n'est exécuté ici. Un appel d'outil devient une proposition que
 * l'athlète confirme depuis l'interface.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MODEL = 'claude-sonnet-4-6'

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
})

type Event =
  | { type: 'text'; text: string }
  | { type: 'proposal'; id: string; name: ToolName; input: unknown; label: string }
  | { type: 'done'; offline: boolean }
  | { type: 'error'; message: string }

const line = (event: Event): Uint8Array =>
  new TextEncoder().encode(`${JSON.stringify(event)}\n`)

function ndjson(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}

export async function POST(request: NextRequest) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Session expirée.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const state = await loadState(userId)
  if (!state) return NextResponse.json({ error: 'Données introuvables.' }, { status: 404 })

  const today = todayISO()
  const history = parsed.data.messages
  const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content ?? ''

  /* ── Sans clé API, le coach répond localement plutôt que d'échouer ── */
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return ndjson(
      new ReadableStream({
        start(controller) {
          controller.enqueue(line({ type: 'text', text: localAnswer(lastUser, state, today) }))
          controller.enqueue(line({ type: 'done', offline: true }))
          controller.close()
        },
      }),
    )
  }

  const client = new Anthropic({ apiKey })
  const context = buildCoachContext(state, today)

  // Le contexte va dans le dernier tour utilisateur : le prompt système
  // reste identique d'un appel à l'autre, donc le cache tient.
  const messages: Anthropic.MessageParam[] = history.map((m, i) => ({
    role: m.role,
    content:
      i === history.length - 1 && m.role === 'user'
        ? `${contextBlock(context, today)}\n\n${m.content}`
        : m.content,
  }))

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const run = client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: [{ type: 'text', text: COACH_SYSTEM, cache_control: { type: 'ephemeral' } }],
          tools: COACH_TOOLS,
          messages,
        })

        run.on('text', (delta) => {
          controller.enqueue(line({ type: 'text', text: delta }))
        })

        const final = await run.finalMessage()

        for (const block of final.content) {
          if (block.type !== 'tool_use') continue
          const input = validateProposal(block.name, block.input)
          if (input === null) continue // proposition mal formée : on ne l'affiche pas
          controller.enqueue(
            line({
              type: 'proposal',
              id: block.id,
              name: block.name as ToolName,
              input,
              label: TOOL_LABELS[block.name as ToolName],
            }),
          )
        }

        controller.enqueue(line({ type: 'done', offline: false }))
      } catch (error) {
        // Réseau coupé, quota atteint, clé invalide : on bascule sur le repli
        // local plutôt que de laisser l'athlète sans réponse.
        const message =
          error instanceof Anthropic.APIError && error.status === 429
            ? "Trop de requêtes sur la dernière minute. Voici une réponse locale en attendant."
            : "Le coach en ligne est injoignable. Voici une réponse locale, plus courte."
        controller.enqueue(line({ type: 'error', message }))
        controller.enqueue(line({ type: 'text', text: localAnswer(lastUser, state, today) }))
        controller.enqueue(line({ type: 'done', offline: true }))
      } finally {
        controller.close()
      }
    },
  })

  return ndjson(stream)
}
