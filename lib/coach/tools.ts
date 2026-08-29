import { z } from 'zod'
import type Anthropic from '@anthropic-ai/sdk'

/**
 * OUTILS DU COACH
 *
 * Le coach ne peut rien écrire lui-même. Chaque appel d'outil devient une
 * proposition affichée à l'athlète, qui la confirme ou la refuse. Rien ne
 * touche la base sans ce clic.
 */

export const adjustSessionSchema = z.object({
  session_id: z.string().uuid(),
  duration: z.number().int().min(0).max(600).optional(),
  target: z.string().max(600).optional(),
  goal: z.string().max(600).optional(),
  raison: z.string().max(300),
})

export const postponeSessionSchema = z.object({
  session_id: z.string().uuid(),
  raison: z.string().max(300),
})

export const logSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['RUN', 'LONG', 'SWIM', 'BIKE', 'RIDE', 'UPPER', 'LOWER']),
  km: z.number().min(0).max(200).optional(),
  minutes: z.number().min(0).max(600),
  distance_m: z.number().min(0).max(5000).optional(),
  continu_m: z.number().min(0).max(5000).optional(),
  repetitions: z.number().int().min(0).max(2000).optional(),
  rpe: z.number().int().min(1).max(10),
})

export const setBenchmarkSchema = z.object({
  key: z.enum(['pullups', 'dips', 'muscleups', 'legraises', 'squats', 'swim_continuous']),
  value: z.number().min(0).max(5000),
  /** true quand l'athlète annonce un minimum et non un maximum testé. */
  partiel: z.boolean(),
})

export const TOOL_SCHEMAS = {
  adjust_session: adjustSessionSchema,
  postpone_session: postponeSessionSchema,
  log_session: logSessionSchema,
  set_benchmark: setBenchmarkSchema,
} as const

export type ToolName = keyof typeof TOOL_SCHEMAS

export const TOOL_LABELS: Record<ToolName, string> = {
  adjust_session: 'Modifier une séance à venir',
  postpone_session: 'Reporter une séance',
  log_session: 'Enregistrer une séance faite hors app',
  set_benchmark: 'Enregistrer un repère',
}

/**
 * Définitions envoyées au modèle. Les descriptions disent *quand* appeler
 * l'outil, pas seulement ce qu'il fait — c'est ce qui fait la différence
 * entre un outil proposé au bon moment et un outil ignoré.
 */
export const COACH_TOOLS: Anthropic.Tool[] = [
  {
    name: 'adjust_session',
    description:
      "Propose de modifier une séance à venir : durée, cible ou objectif. Appelle cet outil quand l'athlète signale une contrainte de temps, une fatigue élevée ou une douleur qui rend la séance prévue inadaptée. Utilise l'identifiant exact fourni dans seances_a_venir.",
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Identifiant de la séance à modifier' },
        duration: { type: 'integer', description: 'Nouvelle durée en minutes' },
        target: { type: 'string', description: 'Nouvelle cible chiffrée' },
        goal: { type: 'string', description: 'Nouvel objectif de la séance' },
        raison: { type: 'string', description: "Pourquoi cette modification, en une phrase" },
      },
      required: ['session_id', 'raison'],
    },
  },
  {
    name: 'postpone_session',
    description:
      "Propose de reporter une séance au lendemain. Appelle cet outil quand l'athlète dit qu'il ne pourra pas faire la séance du jour. Le jour de repos se déplace avec elle.",
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Identifiant de la séance à reporter' },
        raison: { type: 'string', description: 'Pourquoi ce report, en une phrase' },
      },
      required: ['session_id', 'raison'],
    },
  },
  {
    name: 'log_session',
    description:
      "Propose d'enregistrer une séance réalisée hors de l'application. Appelle cet outil dès que l'athlète mentionne une séance faite qui n'est pas dans son historique. N'invente aucun chiffre : si la distance, la durée ou le RPE manquent, demande-les avant d'appeler l'outil.",
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date au format AAAA-MM-JJ' },
        type: {
          type: 'string',
          enum: ['RUN', 'LONG', 'SWIM', 'UPPER', 'LOWER'],
          description: 'Discipline de la séance',
        },
        km: { type: 'number', description: 'Distance en km, pour la course' },
        minutes: { type: 'number', description: 'Durée en minutes' },
        distance_m: { type: 'number', description: 'Distance totale en mètres, pour la natation' },
        continu_m: { type: 'number', description: 'Plus longue distance sans pause, en mètres' },
        repetitions: { type: 'number', description: 'Répétitions totales, pour la force' },
        rpe: { type: 'integer', description: 'Effort ressenti de 1 à 10' },
      },
      required: ['date', 'type', 'minutes', 'rpe'],
    },
  },
  {
    name: 'set_benchmark',
    description:
      "Propose d'enregistrer un repère de force ou de natation. Appelle cet outil quand l'athlète annonce un chiffre testé. Mets partiel à true s'il dit « au moins X » ou « je fais facilement X », false seulement s'il a testé son maximum réel.",
    input_schema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          enum: ['pullups', 'dips', 'muscleups', 'legraises', 'squats', 'swim_continuous'],
          description: 'Repère concerné',
        },
        value: { type: 'number', description: 'Valeur : répétitions, ou mètres pour la natation' },
        partiel: {
          type: 'boolean',
          description: 'true = minimum connu, false = maximum réellement testé',
        },
      },
      required: ['key', 'value', 'partiel'],
    },
  },
]

export interface ToolProposal {
  id: string
  name: ToolName
  input: unknown
  label: string
}

/** Valide une proposition avant de l'afficher. Une entrée invalide est écartée. */
export function validateProposal(name: string, input: unknown): ToolProposal['input'] | null {
  if (!(name in TOOL_SCHEMAS)) return null
  const parsed = TOOL_SCHEMAS[name as ToolName].safeParse(input)
  return parsed.success ? parsed.data : null
}
