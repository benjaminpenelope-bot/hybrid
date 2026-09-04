/**
 * ICÔNES
 *
 * Elles viennent de Lucide, dessinée par des gens dont c'est le métier.
 *
 * J'avais d'abord dessiné les quinze glyphes à la main, en écartant une
 * bibliothèque que je croyais lourde. Les deux raisons étaient mauvaises :
 * un paquet moderne ne livre que les icônes réellement importées, et dessiner
 * quinze pictogrammes cohérents — même graisse optique, mêmes terminaisons,
 * même densité à 18 px comme à 24 — est un travail de spécialiste. Le
 * résultat se voyait : des traits enfantins au milieu d'une interface qui
 * cherchait la sobriété.
 *
 * Ce fichier ne fait que nommer en français ce qu'on emploie, pour que
 * l'application ne dépende pas du vocabulaire d'une bibliothèque. Changer de
 * fournisseur d'icônes un jour se fera ici, et nulle part ailleurs.
 *
 * Réglages communs : grille de 24, trait de 1,6, terminaisons rondes — les
 * mêmes que la typographie systeme d'iOS, ce qui explique qu'elles s'accordent
 * sans effort.
 */
import {
  AudioLines,
  Bike,
  CircleCheck,
  TrendingDown,
  Mic,
  Plus,
  X,
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardList,
  Dumbbell,
  Footprints,
  House,
  MessageCircle,
  Moon,
  PersonStanding,
  Settings2,
  Target,
  Waves,
  Activity,
  Flame,
  Gauge,
  Layers,
  Medal,
  Route,
  Timer,
  CircleDashed,
  type LucideProps,
} from 'lucide-react'

export type IconeProps = Omit<LucideProps, 'size'> & { size?: number }

/** Épaisseur commune. Plus fin que le défaut de Lucide, pour aller avec SF. */
const TRAIT = 1.6

function fabrique(Source: React.ComponentType<LucideProps>) {
  return function Icone({ size = 22, ...props }: IconeProps) {
    return <Source size={size} strokeWidth={TRAIT} absoluteStrokeWidth {...props} />
  }
}

/* ── Navigation ── */
export const IconAccueil = fabrique(House)
export const IconSemaine = fabrique(CalendarDays)
export const IconPerfs = fabrique(ChartNoAxesColumn)
export const IconCorps = fabrique(PersonStanding)
export const IconCoach = fabrique(MessageCircle)
export const IconObjectifs = fabrique(Target)
export const IconRecuperation = fabrique(Moon)
export const IconBilan = fabrique(ClipboardList)
export const IconReglages = fabrique(Settings2)

/* ── Disciplines ── */
export const IconCourse = fabrique(Footprints)
export const IconNatation = fabrique(Waves)
export const IconVelo = fabrique(Bike)
export const IconBarre = fabrique(Dumbbell)
export const IconJambes = fabrique(PersonStanding)
export const IconRepos = fabrique(Moon)

/* ── Objectifs ── */
export const IconMarathon = fabrique(Route)
export const IconSemi = fabrique(Medal)
export const IconDixKm = fabrique(Timer)
export const IconHyrox = fabrique(Flame)
export const IconForce = fabrique(Dumbbell)
export const IconHypertrophie = fabrique(Layers)
export const IconEndurance = fabrique(Activity)
export const IconHybride = fabrique(Gauge)

/* ── Cartes du coach ── */
export const IconVerdict = fabrique(CircleCheck)
export const IconAllege = fabrique(TrendingDown)

/* ── Barre du coach ── */
export const IconPlus = fabrique(Plus)
export const IconMicro = fabrique(Mic)
export const IconOndes = fabrique(AudioLines)
export const IconFermer = fabrique(X)

/** « Aucun » : un cercle en pointilles, forme la plus proche d'une absence. */
export const IconAucun = fabrique(CircleDashed)
