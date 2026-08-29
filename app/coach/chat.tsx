'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { fenetre } from '@/lib/coach/historique'
import type { ToolName } from '@/lib/coach/tools'
import { applyProposal, saveCoachMessage } from './actions'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Proposal {
  id: string
  name: ToolName
  input: Record<string, unknown>
  label: string
  state: 'pending' | 'applied' | 'refused' | 'failed'
  error?: string
}

/** Rend une proposition lisible : l'athlète doit voir ce qu'il accepte. */
function describe(proposal: Proposal): string[] {
  const input = proposal.input
  const lines: string[] = []
  const show = (label: string, value: unknown) => {
    if (value !== undefined && value !== null) lines.push(`${label} : ${String(value)}`)
  }

  switch (proposal.name) {
    case 'adjust_session':
      show('Nouvelle durée', input.duration ? `${input.duration} min` : undefined)
      show('Nouvelle cible', input.target)
      show('Nouvel objectif', input.goal)
      break
    case 'postpone_session':
      lines.push('La séance passe au lendemain. Le jour de repos se déplace avec elle.')
      break
    case 'log_session':
      show('Date', input.date)
      show('Discipline', input.type)
      show('Distance', input.km ? `${input.km} km` : undefined)
      show('Durée', `${input.minutes} min`)
      show('Distance totale', input.distance_m ? `${input.distance_m} m` : undefined)
      show('Sans pause', input.continu_m ? `${input.continu_m} m` : undefined)
      show('Répétitions', input.repetitions)
      show('RPE', `${input.rpe}/10`)
      break
    case 'set_benchmark':
      show('Repère', input.key)
      show('Valeur', input.value)
      lines.push(
        input.partiel === true
          ? 'Enregistré comme minimum connu : ton maximum reste à tester.'
          : 'Enregistré comme maximum testé.',
      )
      break
  }

  show('Raison', input.raison)
  return lines
}

export function CoachChat({
  opening,
  history,
  suggestions,
}: {
  opening: string
  history: Message[]
  suggestions: string[]
}) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(history)
  const [streaming, setStreaming] = useState('')
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  /** Proposition d'abonnement, uniquement quand le plafond gratuit est atteint. */
  const [offre, setOffre] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming, proposals])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (trimmed === '' || busy) return

    const next = [...messages, { role: 'user' as const, content: trimmed }]
    setMessages(next)
    setInput('')
    setStreaming('')
    setProposals([])
    setNotice(null)
    setOffre(null)
    setBusy(true)
    void saveCoachMessage('user', trimmed)

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // On n'envoie que la fenetre : l'etat local peut contenir plus de
        // messages que le serveur n'en accepte, et l'historique est de toute
        // facon la ligne de cout la plus lourde.
        body: JSON.stringify({ messages: fenetre(next) }),
      })

      if (!response.ok) {
        /*
         * Le serveur explique pourquoi il refuse. Jeter ce message pour
         * afficher « verifie ta connexion » envoie chercher la panne au
         * mauvais endroit : c'est exactement ce qui s'est passe quand la
         * fenetre de conversation depassait la limite.
         */
        const detail = await response
          .json()
          .then((c: { error?: string }) => c.error)
          .catch(() => null)
        throw new Error(detail ?? `Le serveur a répondu ${response.status}.`)
      }
      if (!response.body) throw new Error('Réponse indisponible.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let answer = ''

      // NDJSON : une ligne complète par événement, la dernière peut être partielle.
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const raw of lines) {
          if (raw.trim() === '') continue
          const event = JSON.parse(raw)
          if (event.type === 'text') {
            answer += event.text
            setStreaming(answer)
          } else if (event.type === 'proposal') {
            setProposals((prev) => [
              ...prev,
              { id: event.id, name: event.name, input: event.input, label: event.label, state: 'pending' },
            ])
          } else if (event.type === 'quota') {
            setNotice(event.message)
            setOffre(event.offre ?? null)
          } else if (event.type === 'error') {
            setNotice(event.message)
          } else if (event.type === 'done' && event.offline) {
            setNotice((prev) => prev ?? 'Réponse locale : le coach en ligne n’est pas joignable.')
          }
        }
      }

      if (answer.trim() !== '') {
        setMessages((prev) => [...prev, { role: 'assistant', content: answer }])
        void saveCoachMessage('assistant', answer)
      }
      setStreaming('')
    } catch (e) {
      setNotice(
        e instanceof Error && e.message !== ''
          ? e.message
          : 'La requête a échoué. Vérifie ta connexion, puis réessaie.',
      )
      setStreaming('')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (proposal: Proposal, accept: boolean) => {
    if (!accept) {
      setProposals((prev) =>
        prev.map((p) => (p.id === proposal.id ? { ...p, state: 'refused' } : p)),
      )
      return
    }
    const result = await applyProposal(proposal.name, proposal.input)
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposal.id
          ? { ...p, state: result.ok ? 'applied' : 'failed', error: result.message }
          : p,
      ),
    )
    if (result.ok) router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <article className="card text-[13.5px] leading-relaxed">{opening}</article>

        {messages.map((m, i) => (
          <article
            key={`${i}-${m.content.slice(0, 12)}`}
            className={`max-w-[88%] rounded-card border p-3 text-[13.5px] leading-relaxed ${
              m.role === 'user'
                ? 'self-end border-text bg-text text-bg'
                : 'self-start border-line bg-card text-text'
            }`}
          >
            {m.content}
          </article>
        ))}

        {streaming !== '' && (
          <article className="max-w-[88%] self-start whitespace-pre-wrap rounded-card border border-line bg-card p-3 text-[13.5px] leading-relaxed">
            {streaming}
          </article>
        )}

        {busy && streaming === '' && (
          <article className="max-w-[88%] animate-pulse self-start rounded-card border border-line bg-card p-3 text-[13px] text-mut">
            Le coach lit tes données…
          </article>
        )}

        {proposals.map((p) => (
          <article
            key={p.id}
            className="rounded-card border p-4"
            style={{
              borderColor:
                p.state === 'applied'
                  ? 'var(--ok)'
                  : p.state === 'failed'
                    ? 'var(--bad)'
                    : 'var(--warn)',
            }}
          >
            <div className="eyebrow" style={{ color: 'var(--warn)' }}>
              Action proposée
            </div>
            <h3 className="dsp mt-1 text-[16px]">{p.label}</h3>
            <ul className="mt-2 flex flex-col gap-1 text-[12.5px] leading-relaxed text-mut">
              {describe(p).map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>

            {p.state === 'pending' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button small onClick={() => confirm(p, true)}>
                  Confirmer
                </Button>
                <Button variant="ghost" small onClick={() => confirm(p, false)}>
                  Refuser
                </Button>
              </div>
            )}
            {p.state === 'applied' && (
              <p className="mt-3 text-[12.5px] text-ok">Appliqué.</p>
            )}
            {p.state === 'refused' && (
              <p className="mt-3 text-[12.5px] text-dim">Refusé. Rien n&apos;a été modifié.</p>
            )}
            {p.state === 'failed' && (
              <p className="mt-3 text-[12.5px] text-bad">{p.error ?? 'Échec de l’action.'}</p>
            )}
          </article>
        ))}

        <div ref={endRef} />
      </div>

      {notice && (
        <div className="mt-4 rounded-[11px] border border-warn/40 bg-warn/10 p-3">
          <p className="text-[12.5px] leading-relaxed text-text">{notice}</p>
          {/*
            L'offre n'apparait que sur un plafond atteint en gratuit. Elle est
            absente d'une panne reseau — proposer un abonnement quand le
            service est en defaut ferait payer pour une reparation.
          */}
          {offre && (
            <>
              <p className="mt-2 border-t border-warn/30 pt-2 text-[12.5px] leading-relaxed text-mut">
                {offre}
              </p>
              <Link
                href="/pro"
                className="mt-3 inline-block rounded-[10px] border border-brand bg-brand/10 px-3 py-2 text-[12.5px] text-text"
              >
                Voir HYBRID PRO
              </Link>
            </>
          )}
        </div>
      )}

      {!busy && (
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-[10px] border border-line2 bg-bg2 px-3 py-2 text-[12px] text-mut"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="mt-3.5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écris au coach…"
          aria-label="Message au coach"
          className="min-w-0 flex-1 rounded-[11px] border border-line2 bg-bg2 px-[13px] py-3 text-base text-text outline-none focus:border-mut"
        />
        <Button type="submit" disabled={busy || input.trim() === ''} className="w-[92px] shrink-0">
          Envoyer
        </Button>
      </form>

      <p className="mt-3 text-[11.5px] leading-relaxed text-dim">
        Le coach lit tes séances, tes scores et ta charge. Il ne modifie jamais rien sans ta
        confirmation, et ne pose aucun diagnostic médical.
      </p>
    </>
  )
}
