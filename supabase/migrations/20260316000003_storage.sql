-- ATHLETE OS — stockage des photos de progression
-- Bucket prive. Chaque fichier vit dans un dossier au nom de l'utilisateur :
-- progress-photos/<user_id>/<date>-<uuid>.jpg
-- L'affichage passe par une URL signee, demandee a la volée cote serveur.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  10 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "progress_photos_select_own" on storage.objects;
create policy "progress_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "progress_photos_insert_own" on storage.objects;
create policy "progress_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "progress_photos_update_own" on storage.objects;
create policy "progress_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "progress_photos_delete_own" on storage.objects;
create policy "progress_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
