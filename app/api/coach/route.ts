import Anthropic from '@anthropic-ai/sdk'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { loadState } from '@/lib/db/queries'
import { buildCoachContext } from '@/lib/coach/context'
import { localAnswer } from '@/lib/coach/local'
import { contextBlock, COACH_SYSTEM } from '@/lib/coach/prompt'
import { MAX_TOURS_ENVOYES } from '@/lib/coach/historique'
import { enregistrerUsage, etatQuota, messageQuota, MODELES } from '@/lib/coach/quota'
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

/**
 * Le raisonnement adaptatif consomme le meme budget que la reponse. A 1 024
 * jetons — la valeur d'origine, ecrite quand le modele ne raisonnait pas — la
 * reponse partait entiere en reflexion et se coupait avant la premiere
 * phrase. La longueur reelle est tenue par le prompt (cinq phrases), pas par
 * ce plafond, qui n'est la que comme garde-fou.
 */
const MAX_TOKENS = 8000

/** Beta du repli serveur sur refus. Voir `ConfigModele.repliServeur`. */
const BETA_REPLI = 'server-side-fallback-2026-07-01'

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(MAX_TOURS_ENVOYES),
})

type Event =
  | { type: 'text'; text: string }
  | { type: 'quota'; message: string; offre: string | null }
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

/**
 * Traduit une erreur d'API en une phrase pour l'athlete.
 *
 * Les codes qui relevent d'une configuration serveur le disent : sinon
 * l'exploitant croit a une panne reseau et cherche au mauvais endroit.
 */
function messageDErreur(error: unknown): string {
  if (!(error instanceof Anthropic.APIError)) {
    return 'Le coach en ligne est injoignable. Voici une réponse locale, plus courte.'
  }
  switch (error.status) {
    case 401:
    case 403:
      return "La clé du coach en ligne est refusée. Voici une réponse locale en attendant."
    case 400:
      return "Le coach en ligne a refusé la requête — vérifie la configuration du serveur. Voici une réponse locale."
    case 429:
      return 'Trop de requêtes sur la dernière minute. Voici une réponse locale en attendant.'
    default:
      return 'Le coach en ligne est injoignable. Voici une réponse locale, plus courte.'
  }
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

  /** Réponse locale : même forme, que ce soit faute de clé ou faute de quota. */
  const repliLocal = (entete?: Event): Response =>
    ndjson(
      new ReadableStream({
        start(controller) {
          if (entete) controller.enqueue(line(entete))
          controller.enqueue(line({ type: 'text', text: localAnswer(lastUser, state, today) }))
          controller.enqueue(line({ type: 'done', offline: true }))
          controller.close()
        },
      }),
    )

  /* ── Sans clé API, le coach répond localement plutôt que d'échouer ── */
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return repliLocal()

  /*
   * Plafond d'usage. Vérifié avant l'appel, donc avant la dépense — le
   * vérifier après ne bornerait rien. Un plafond atteint ne casse pas le
   * coach : il le fait répondre en local, comme sans clé.
   */
  const quota = await etatQuota(userId, today)
  if (!quota.autorise) {
    const m = messageQuota(quota)
    return repliLocal({ type: 'quota', message: m.texte, offre: m.offre })
  }

  const config = MODELES[quota.plan]

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
        const run = client.beta.messages.stream({
          model: config.modele,
          max_tokens: MAX_TOKENS,
          thinking: { type: 'adaptive' },
          output_config: { effort: config.effort },
          ...(config.repliServeur ? { betas: [BETA_REPLI], fallbacks: 'default' as const } : {}),
          // Le prompt systeme ne bouge pas d'un appel a l'autre : il est mis
          // en cache, et le contexte variable voyage dans le tour utilisateur.
          system: [{ type: 'text', text: COACH_SYSTEM, cache_control: { type: 'ephemeral' } }],
          tools: COACH_TOOLS,
          messages,
        })

        run.on('text', (delta) => {
          controller.enqueue(line({ type: 'text', text: delta }))
        })

        const final = await run.finalMessage()

        /*
         * Un refus arrive en HTTP 200, avec un contenu vide ou partiel. Lire
         * `content` sans verifier `stop_reason` donnerait une reponse tronquee
         * presentee comme complete.
         */
        if (final.stop_reason === 'refusal') {
          controller.enqueue(
            line({
              type: 'error',
              message:
                'Le coach en ligne n’a pas pu traiter cette demande. Voici une réponse locale.',
            }),
          )
          controller.enqueue(line({ type: 'text', text: localAnswer(lastUser, state, today) }))
          controller.enqueue(line({ type: 'done', offline: true }))
          return
        }

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

        /*
         * On compte apres coup, sur la consommation reelle. Compter avant
         * facturerait a l'athlete un appel qui a pu echouer, et les jetons ne
         * seraient de toute facon pas connus.
         */
        await enregistrerUsage(userId, {
          input: final.usage.input_tokens,
          output: final.usage.output_tokens,
          cacheRead: final.usage.cache_read_input_tokens ?? 0,
          cacheWrite: final.usage.cache_creation_input_tokens ?? 0,
        })

        controller.enqueue(line({ type: 'done', offline: false }))
      } catch (error) {
        /*
         * Quoi qu'il arrive, l'athlete recoit une reponse : on bascule sur le
         * repli local plutot que de le laisser devant un ecran vide.
         *
         * Mais le message doit distinguer les causes. Ce chemin n'avait jamais
         * tourne : une cle absente, une cle invalide et un reseau coupe
         * rendaient tous « le coach est injoignable », ce qui donne une panne
         * indiscernable d'une erreur de configuration. La cause exacte part
         * dans les journaux du serveur, jamais vers le client — un message
         * d'erreur d'API peut contenir des detourages de la requete.
         */
        console.error('[coach] appel en ligne echoue', error)

        controller.enqueue(line({ type: 'error', message: messageDErreur(error) }))
        controller.enqueue(line({ type: 'text', text: localAnswer(lastUser, state, today) }))
        controller.enqueue(line({ type: 'done', offline: true }))
      } finally {
        controller.close()
      }
    },
  })

  return ndjson(stream)
}
