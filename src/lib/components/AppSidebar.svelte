<script lang="ts">
  import Icon from '@/lib/components/Icon.svelte';
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
          {#if level.id === appState.levelId}
            <div class="area-list">
              {#each appState.levelAreas as area (area.id)}
                <button
                  class:current={appState.view === 'area' &&
                    area.id === appState.areaId}
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
