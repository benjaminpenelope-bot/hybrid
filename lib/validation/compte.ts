/**
 * Mot que l'athlète doit recopier pour supprimer son compte.
 *
 * Vit hors des Server Actions : un fichier « use server » ne peut exporter que
 * des fonctions async, et le formulaire comme l'action doivent comparer la
 * même valeur — la dupliquer laisserait les deux diverger en silence.
 *
 * Recopier un mot plutôt que cocher une case : une case se coche par réflexe,
 * et l'action est définitive.
 */
export const CONFIRMATION_SUPPRESSION = 'SUPPRIMER'
