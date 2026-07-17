<script lang="ts">
  import BlobImage from '@/lib/components/BlobImage.svelte';
  import Icon from '@/lib/components/Icon.svelte';
  import { db } from '@/lib/db/database';
  import { loadPhoto, mediaBytes, type StoredPhoto } from '@/lib/db/media';
  import { appState } from '@/lib/state/app.svelte';
  import type { Photo } from '@/lib/types/project';
  import { createId, now } from '@/lib/utils/id';

  import PhotoEditor from './PhotoEditor.svelte';

  let input = $state<HTMLInputElement>();
  let replaceInput = $state<HTMLInputElement>();
  let replacing = $state<Photo | null>(null);
  let editing = $state<Photo | null>(null);
  let importing = $state(false);

  async function addPhotos(event: Event) {
    const files = [...((event.currentTarget as HTMLInputElement).files ?? [])];
    if (!files.length || !appState.area || !appState.projectId) return;
    importing = true;
    try {
      const start = appState.areaPhotos.length;
      const timestamp = now();
      const storedPhotos: StoredPhoto[] = await Promise.all(
        files.map(async (file, index) => ({
          id: createId(),
          projectId: appState.projectId!,
          areaId: appState.area!.id,
          title:
            file.name.replace(/\.[^.]+$/, '') || `Foto ${start + index + 1}`,
          ...(await mediaBytes(file)),
          createdAt: timestamp,
          sortOrder: start + index,
        })),
      );
      await db.photos.bulkAdd(storedPhotos);
      await db.projects.update(appState.projectId, { updatedAt: timestamp });
      await appState.load();
      const photos = storedPhotos.map(loadPhoto);
      if (photos.length === 1) editing = photos[0];
    } catch (reason) {
      alert(
        reason instanceof Error
          ? reason.message
          : 'Das Foto konnte nicht dauerhaft gespeichert werden.',
      );
    } finally {
      importing = false;
      if (input) input.value = '';
    }
  }

  function chooseReplacement(photo: Photo) {
    replacing = photo;
    replaceInput?.click();
  }

  async function replacePhoto(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    const photo = replacing;
    if (!file || !photo) return;
    importing = true;
    try {
      const stored = await mediaBytes(file);
      const timestamp = now();
      await db.transaction('rw', db.photos, db.projects, async () => {
        await db.photos.update(photo.id, { ...stored, blob: undefined });
        await db.projects.update(photo.projectId, { updatedAt: timestamp });
      });
      photo.blob = new Blob([stored.bytes], { type: stored.mimeType });
    } catch (reason) {
      alert(
        reason instanceof Error
          ? reason.message
          : 'Das Ersatzbild konnte nicht gespeichert werden.',
      );
    } finally {
      importing = false;
      replacing = null;
      if (replaceInput) replaceInput.value = '';
    }
  }

  async function removePhoto(photo: Photo) {
    if (!confirm(`„${photo.title}“ und alle Maße löschen?`)) return;
    await db.transaction('rw', db.photos, db.measurements, async () => {
      await db.measurements.where('photoId').equals(photo.id).delete();
      await db.photos.delete(photo.id);
    });
    await appState.load();
  }

  async function renamePhoto(photo: Photo) {
    const title = prompt('Titel des Fotos', photo.title)?.trim();
    if (!title || title === photo.title) return;
    const timestamp = now();
    await db.transaction('rw', db.photos, db.projects, async () => {
      await db.photos.update(photo.id, { title });
      await db.projects.update(photo.projectId, { updatedAt: timestamp });
    });

    // A title change does not require re-reading the Blob from IndexedDB. Apart
    // from being faster, keeping this object avoids unnecessarily replacing a
    // currently displayed image on Safari.
    photo.title = title;
    const project = appState.projects.find(
      (item) => item.id === photo.projectId,
    );
    if (project) project.updatedAt = timestamp;
  }
</script>

{#if editing}
  <PhotoEditor photo={editing} close={() => (editing = null)} />
{:else if appState.area}
  <section class="content-section">
    <div class="page-heading">
      <div>
        <span class="eyebrow">
          {appState.area.kind === 'room'
            ? 'Raum'
            : appState.area.kind === 'outside'
              ? 'Außenbereich'
              : 'Bereich'}
        </span>
        <h1>{appState.area.name}</h1>
      </div>
      {#if appState.editing}<button
          class="button primary"
          onclick={() => input?.click()}
          disabled={importing}
        >
          <Icon name="camera" />{importing
            ? 'Wird geladen …'
            : 'Fotos hinzufügen'}
        </button>{/if}
      <input
        bind:this={input}
        class="visually-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onchange={addPhotos}
      />
      <input
        bind:this={replaceInput}
        class="visually-hidden"
        type="file"
        accept="image/*"
        onchange={replacePhoto}
      />
    </div>

    {#if appState.areaPhotos.length}
      <div class="photo-grid">
        {#each appState.areaPhotos as photo (photo.id)}
          {const count = $derived(
            appState.measurements.filter((item) => item.photoId === photo.id)
              .length,
          )}
          <article class="photo-card">
            <button class="photo-open" onclick={() => (editing = photo)}>
              <BlobImage
                blob={photo.blob}
                alt={photo.title}
                mediaId={`photo:${photo.id}`}
              />
              {#if count}<span class="count-badge">
                  {count}
                  {count === 1 ? 'Maß' : 'Maße'}
                </span>{/if}
            </button>
            <div class="photo-meta">
              {#if appState.editing}
                <button
                  class="photo-title"
                  onclick={() => renamePhoto(photo)}
                  title="Titel ändern"
                >
                  {photo.title}
                </button>
                <button
                  class="icon-button"
                  onclick={() => chooseReplacement(photo)}
                  aria-label={`Bild für „${photo.title}“ ersetzen`}
                  title="Bild ersetzen; Maße bleiben erhalten"
                  disabled={importing}
                >
                  <Icon name="image" size={18} />
                </button>
                <button
                  class="icon-button danger"
                  onclick={() => removePhoto(photo)}
                  aria-label="Foto löschen"
                >
                  <Icon name="trash" size={18} />
                </button>
              {:else}
                <strong class="photo-title-static">{photo.title}</strong>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {:else if appState.editing}
      <button class="empty-upload" onclick={() => input?.click()}>
        <span class="empty-icon"><Icon name="camera" size={26} /></span>
        <strong>Erstes Foto aufnehmen</strong>
        <small>Kamera verwenden oder ein Bild auswählen</small>
      </button>
    {:else}
      <div class="empty-state">
        <Icon name="image" size={24} />
        <span>Noch keine Fotos</span>
      </div>
    {/if}
  </section>
{/if}
