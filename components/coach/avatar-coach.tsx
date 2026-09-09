'use client'

import { AnneauVideo } from '@/components/anneau-video'

/**
 * L'ANNEAU DU COACH
 *
 * La même vidéo que la page d'accueil, réduite, et qui change d'état selon ce
 * que le coach est en train de faire.
 *
 * L'écran ne disait rien de ce qui se passait entre l'envoi et la réponse :
 * une carte grise annonçait « Le coach lit tes données… » et clignotait. On
 * attendait devant un rectangle. Ici, l'attente a une forme — l'anneau
 * s'allume, un trait tourne autour, un halo respire — et l'on voit que
 * quelque chose travaille.
 *
 * TROIS ÉTATS, et c'est leur contraste qui les rend lisibles.
 *
 *   repos      immobile et sombre. Rien ne bouge tant que rien ne se passe.
 *   réfléchit  pleine lumière, le trait tourne, le halo respire.
 *   écrit      pleine lumière, le trait s'arrête. Il a trouvé, il répond.
 *
 * Un halo qui pulserait en permanence ne dirait rien. C'est le passage d'un
 * état à l'autre qui informe, pas l'animation elle-même.
 */

export type EtatCoach = 'repos' | 'reflechit' | 'ecrit'

const LUMINOSITE: Record<EtatCoach, number> = {
  repos: 1.1,
  reflechit: 2.3,
  ecrit: 1.8,
}

export function AvatarCoach({
  etat,
  taille = 56,
}: {
  etat: EtatCoach
  taille?: number
}) {
  const actif = etat !== 'repos'

  return (
    <span
      className="relative block shrink-0"
      style={{ width: taille, height: taille }}
      aria-hidden
    >
      {/*
        Le halo vit derriere l'anneau et deborde de son cadre : c'est lui qui
        donne l'impression de puissance quand le coach travaille. Il n'existe
        pas au repos — un objet qui rayonne sans rien faire ment.
      */}
      {etat === 'reflechit' && (
        <span
          className="souffle absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0.5), transparent 68%)',
            filter: 'blur(9px)',
          }}
        />
      )}

      <AnneauVideo
        anime={actif}
        luminosite={LUMINOSITE[etat]}
        className="h-full w-full"
      />

      {/* Le trait qui tourne. Present pendant la lecture des donnees, absent
          des que la reponse commence : ce qui tourne cherche, ce qui est
          immobile a trouve. */}
      {etat === 'reflechit' && <span className="anneau-tour" />}

      <span
        className="absolute inset-0 rounded-full transition-opacity duration-500"
        style={{ opacity: actif ? 0 : 0.45, background: 'var(--bg)' }}
      />
    </span>
  )
}
