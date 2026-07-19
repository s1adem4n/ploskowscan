<script lang="ts">
  import BlobImage from '@/lib/components/BlobImage.svelte';
  import Icon from '@/lib/components/Icon.svelte';
  import { db } from '@/lib/db/database';
  import { appState } from '@/lib/state/app.svelte';
  import type { Measurement, Photo, Point } from '@/lib/types/project';
  import { createId, now } from '@/lib/utils/id';
  import { createPanzoom, type PanzoomController } from '@/lib/utils/panzoom';

  let { photo, close }: { photo: Photo; close: () => void } = $props();
  let firstPoint = $state<Point | null>(null);
  let secondPoint = $state<Point | null>(null);
  let value = $state('');
  let note = $state('');
  let saving = $state(false);
  let error = $state('');
  let viewport = $state<HTMLElement>();
  let editor = $state<HTMLElement>();
  let panzoom = $state<PanzoomController>();
  let zoomScale = $state(1);
  let selectedMeasurementId = $state<string | null>(null);
  let measurementsHidden = $state(false);
  let measurements = $derived(
    appState.measurements.filter((item) => item.photoId === photo.id),
  );
  let visibleMeasurements = $derived(
    selectedMeasurementId
      ? measurements.filter((item) => item.id === selectedMeasurementId)
      : measurements,
  );
  let displayedMeasurements = $derived(
    measurementsHidden ? [] : visibleMeasurements,
  );

  $effect(() => {
    if (!viewport || !editor) return;
    const controller = createPanzoom(
      viewport,
      editor,
      setPoint,
      (scale) => (zoomScale = scale),
    );
    panzoom = controller;
    return () => controller.destroy();
  });

  $effect(() => {
    if (appState.editing) {
      selectedMeasurementId = null;
    } else {
      measurementsHidden = false;
      firstPoint = null;
      secondPoint = null;
    }
  });

  function setPoint(event: PointerEvent) {
    if (!appState.editing) {
      const measurement = (event.target as Element).closest('.measure-hit');
      const measurementId = measurement?.getAttribute('data-measurement');
      if (measurementId) {
        selectMeasurement(measurementId);
      } else if (!(event.target as Element).closest('[data-measurement]')) {
        selectedMeasurementId = null;
      }
      return;
    }
    if ((event.target as Element).closest('[data-measurement]')) return;
    if (!editor) return;
    const rect = editor.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
    if (!firstPoint || secondPoint) {
      firstPoint = point;
      secondPoint = null;
      value = '';
      note = '';
    } else secondPoint = point;
  }

  async function save() {
    if (!firstPoint || !secondPoint || !value.trim() || saving) return;
    saving = true;
    error = '';
    const measurement: Measurement = {
      id: createId(),
      projectId: photo.projectId,
      photoId: photo.id,
      start: { x: firstPoint.x, y: firstPoint.y },
      end: { x: secondPoint.x, y: secondPoint.y },
      value: value.trim(),
      note: note.trim(),
      createdAt: now(),
    };
    try {
      await db.measurements.add(measurement);
      await db.projects.update(photo.projectId, { updatedAt: now() });
      await appState.load();
      firstPoint = null;
      secondPoint = null;
      value = '';
      note = '';
    } catch (reason) {
      error =
        reason instanceof Error
          ? reason.message
          : 'Das Maß konnte nicht gespeichert werden.';
    } finally {
      saving = false;
    }
  }

  async function remove(id: string) {
    await db.measurements.delete(id);
    await appState.load();
  }

  function selectMeasurement(id: string) {
    if (appState.editing) return;
    selectedMeasurementId = selectedMeasurementId === id ? null : id;
  }

  function labelPosition(item: Pick<Measurement, 'start' | 'end'>): Point {
    return {
      x: (item.start.x + item.end.x) / 2,
      y: (item.start.y + item.end.y) / 2,
    };
  }
</script>

<div class="editor-screen">
  <header class="editor-toolbar">
    <button class="button quiet" onclick={close}>
      <Icon name="arrow-left" /> Zurück
    </button>
    <div class="editor-title">
      <strong>{photo.title}</strong>
      <span>
        {measurements.length}
        {measurements.length === 1 ? 'Maß' : 'Maße'}
      </span>
    </div>
    <button
      class:active={appState.editing}
      class="editor-edit-toggle"
      onclick={() => (appState.editing = !appState.editing)}
    >
      {appState.editing ? 'Bearbeiten beenden' : 'Bearbeiten'}
    </button>
    {#if appState.editing}<button
        class:active={measurementsHidden}
        class="editor-measure-toggle"
        onclick={() => (measurementsHidden = !measurementsHidden)}
        aria-pressed={measurementsHidden}
      >
        {measurementsHidden ? 'Maße einblenden' : 'Maße ausblenden'}
      </button>{/if}
    <div class="zoom-controls" aria-label="Bildzoom">
      <button onclick={() => panzoom?.zoomOut()} aria-label="Verkleinern">
        −
      </button>
      <button onclick={() => panzoom?.reset()}>Einpassen</button>
      <button onclick={() => panzoom?.zoomIn()} aria-label="Vergrößern">
        +
      </button>
    </div>
  </header>

  <main class="editor-workspace">
    <div class="photo-stage">
      <div
        class="panzoom-viewport"
        bind:this={viewport}
        style={`--annotation-scale:${1 / zoomScale};--measure-stroke-width:${Math.max(1, 3 / zoomScale)}px`}
        role="application"
        aria-label="Zoombares Foto zum Einzeichnen von Maßen"
      >
        <div class="photo-editor" bind:this={editor}>
          <BlobImage
            blob={photo.blob}
            alt={photo.title}
            mediaId={`photo:${photo.id}`}
          />
          <svg
            class="annotation-layer"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {#each displayedMeasurements as item (item.id)}
              <line
                x1={item.start.x * 100}
                y1={item.start.y * 100}
                x2={item.end.x * 100}
                y2={item.end.y * 100}
                class="measure-line"
              />
              {#if !appState.editing}<line
                  data-measurement={item.id}
                  x1={item.start.x * 100}
                  y1={item.start.y * 100}
                  x2={item.end.x * 100}
                  y2={item.end.y * 100}
                  class="measure-hit"
                />{/if}
            {/each}
            {#if firstPoint && secondPoint}
              <line
                x1={firstPoint.x * 100}
                y1={firstPoint.y * 100}
                x2={secondPoint.x * 100}
                y2={secondPoint.y * 100}
                class="draft-line"
              />
            {/if}
          </svg>
          {#each displayedMeasurements as item (item.id)}
            {const position = $derived(labelPosition(item))}
            <span
              class="measure-dot"
              style={`left:${item.start.x * 100}%;top:${item.start.y * 100}%`}
            ></span>
            <span
              class="measure-dot"
              style={`left:${item.end.x * 100}%;top:${item.end.y * 100}%`}
            ></span>
            <button
              type="button"
              data-measurement
              class="measure-label"
              class:selected={selectedMeasurementId === item.id}
              style={`left:${position.x * 100}%;top:${position.y * 100}%`}
              onclick={() => selectMeasurement(item.id)}
            >
              {item.value}{#if item.note}<small>{item.note}</small>{/if}
            </button>
          {/each}
          {#if firstPoint}<span
              class="measure-dot draft"
              style={`left:${firstPoint.x * 100}%;top:${firstPoint.y * 100}%`}
            ></span>{/if}
          {#if secondPoint}<span
              class="measure-dot draft"
              style={`left:${secondPoint.x * 100}%;top:${secondPoint.y * 100}%`}
            ></span>{/if}
        </div>
      </div>
    </div>

    <aside class="measure-panel">
      {#if appState.editing}
        {#if firstPoint && secondPoint}
          <h2>Maß eintragen</h2>
          <label>
            <span>Wert</span>
            <input
              bind:value
              placeholder="z. B. 2,46 m"
              onkeydown={(event) => event.key === 'Enter' && save()}
            />
          </label>
          <label>
            <span>
              Notiz <small>optional</small>
            </span>
            <input bind:value={note} placeholder="Fensterbreite" />
          </label>
          {#if error}<p class="editor-error">{error}</p>{/if}
          <div class="button-row">
            <button
              class="button"
              onclick={() => {
                firstPoint = null;
                secondPoint = null;
              }}
            >
              Abbrechen
            </button>
            <button
              class="button primary"
              onclick={save}
              disabled={!value.trim() || saving}
            >
              Speichern
            </button>
          </div>
        {:else if firstPoint}
          <div class="instruction">
            <span class="step-number">2</span>
            <p>Zweiten Endpunkt des Maßes antippen.</p>
          </div>
        {:else}
          <div class="instruction">
            <span class="step-number">1</span>
            <p>Ersten Endpunkt des Maßes antippen.</p>
          </div>
        {/if}
      {/if}
      {#if measurements.length}
        <div class:view-only={!appState.editing} class="measure-list">
          <h3>Maße</h3>
          {#each visibleMeasurements as item (item.id)}
            {#if appState.editing}
              <div>
                <span>
                  <strong>{item.value}</strong>
                  {#if item.note}<small>{item.note}</small>{/if}
                </span>
                <button
                  class="icon-button danger"
                  onclick={() => remove(item.id)}
                  aria-label="Maß löschen"
                >
                  <Icon name="trash" size={17} />
                </button>
              </div>
            {:else}
              <button
                type="button"
                data-measurement
                class="measure-list-item"
                onclick={() => selectMeasurement(item.id)}
              >
                <span>
                  <strong>{item.value}</strong>
                  {#if item.note}<small>{item.note}</small>{/if}
                </span>
              </button>
            {/if}
          {/each}
        </div>
      {:else if !appState.editing}
        <div class="measure-list view-only">
          <h3>Maße</h3>
          <p class="no-measurements">Keine Maße eingetragen</p>
        </div>
      {/if}
    </aside>
  </main>
</div>
