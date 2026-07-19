<script lang="ts">
  import Icon from '@/lib/components/Icon.svelte';
  import { deleteArea, deleteLevel } from '@/lib/db/projects';
  import { appState } from '@/lib/state/app.svelte';
  let {
    addLevel,
    addArea,
    close,
  }: {
    addLevel: () => void;
    addArea: () => void;
    close?: () => void;
  } = $props();

  async function removeArea(area: (typeof appState.areas)[number]) {
    if (!confirm(`Bereich „${area.name}“ samt Fotos und Maßen löschen?`))
      return;
    await deleteArea(area);
    await appState.load();
  }

  async function removeLevel(level: (typeof appState.levels)[number]) {
    if (
      !confirm(
        `Geschoss „${level.name}“ samt Bereichen, Fotos, Maßen und Grundriss löschen?`,
      )
    )
      return;
    await deleteLevel(level);
    await appState.load();
  }
</script>

<aside class="sidebar">
  <div class="brand-row">
    <div class="project-switch">
      <span class="brand-mark">P</span>
      <span>
        <strong>{appState.project?.name ?? 'PloskowScan'}</strong>
        {#if appState.project?.address}<small>
            {appState.project.address}
          </small>{/if}
      </span>
    </div>
    {#if close}<button class="icon-button mobile-close" onclick={close}>
        <Icon name="x" />
      </button>{/if}
  </div>

  {#if appState.project}
    <nav class="project-nav" aria-label="Projekt">
      {#each appState.projectLevels as level (level.id)}
        <div class="level-block">
          <div class="level-row">
            <button
              class:current={level.id === appState.levelId &&
                appState.view === 'floorplan'}
              class="level-button"
              onclick={() => {
                appState.selectLevel(level.id);
                close?.();
              }}
            >
              <span>{level.name}</span>
              <Icon name="floorplan" size={17} />
            </button>
            {#if appState.editing}<button
                class="delete-level"
                onclick={() => removeLevel(level)}
                aria-label={`Geschoss „${level.name}“ löschen`}
                title="Geschoss löschen"
              >
                <Icon name="trash" size={15} />
              </button>{/if}
          </div>
          {#if level.id === appState.levelId}
            <div class="area-list">
              {#each appState.levelAreas as area (area.id)}
                <div class="area-row">
                  <button
                    class:current={appState.view === 'area' &&
                      area.id === appState.areaId}
                    class="area-button"
                    onclick={() => {
                      appState.selectArea(area.id);
                      close?.();
                    }}
                  >
                    <span
                      class="area-dot"
                      class:outside={area.kind === 'outside'}
                    ></span>
                    {area.name}<Icon name="chevron" size={15} />
                  </button>
                  {#if appState.editing}<button
                      class="delete-area"
                      onclick={() => removeArea(area)}
                      aria-label={`„${area.name}“ löschen`}
                      title="Bereich löschen"
                    >
                      <Icon name="trash" size={15} />
                    </button>{/if}
                </div>
              {/each}
              {#if appState.editing}<button class="add-row" onclick={addArea}>
                  <Icon name="plus" size={16} /> Bereich
                </button>{/if}
            </div>
          {/if}
        </div>
      {/each}
      {#if appState.editing}
        <button class="add-level" onclick={addLevel}>
          <Icon name="plus" size={17} /> Geschoss hinzufügen
        </button>
      {/if}
    </nav>
  {/if}
</aside>
