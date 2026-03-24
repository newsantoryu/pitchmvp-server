<script setup>
/**
 * Results.vue — Visualização de cifra com pitch detection
 *
 * Algoritmo de supressão de notas repetidas (buildAnnotatedWords):
 *
 *   Regra 1 — Line reset:
 *     Início de cada linha visual zera o contexto tonal.
 *     O olho do leitor não carrega memória entre linhas —
 *     a primeira nota de qualquer linha sempre aparece.
 *
 *   Regra 2 — Gap reset:
 *     Após GAP_RESET_THRESHOLD palavras consecutivas sem nota, o
 *     contexto é considerado perdido (pausa, frase nova).
 *     A próxima nota aparece mesmo que seja igual à última exibida.
 *
 *   Regra 3 — Change detection:
 *     Nota só é exibida textualmente quando difere da última exibida.
 *
 *   Regra 4 — Continuation indicator:
 *     Palavra com nota ativa mas suprimida recebe status 'continues'.
 *     O template renderiza um underline sutil na cor da nota —
 *     sinal visual de "ligadura": "continue cantando esta nota".
 *
 * NoteStatus:
 *   'show'      — nota mudou → exibir texto acima da palavra
 *   'continues' — mesma nota → suprimir texto, mostrar underline
 *   'gap'       — sem nota detectada → nada exibido
 */

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getScore } from '../services/api.js'

const route  = useRoute()
const router = useRouter()

const transcriptionId = computed(() => route.params.id)
const transcription   = ref(null)
const loading         = ref(true)
const error           = ref(null)
const viewMode        = ref('cifra')

// ────────────────────────────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────────────────────────────

const WORDS_PER_LINE = 8

/**
 * Após este número de palavras sem nota consecutivas, o contexto tonal é
 * considerado perdido e a próxima nota será exibida independente de repetição.
 */
const GAP_RESET_THRESHOLD = 3

/**
 * Paleta de oitavas: escala perceptual fria (grave) → quente (agudo).
 * Permite ao cantor inferir o contorno melódico pela cor sem ler o texto.
 */
const OCTAVE_COLORS = {
  1: '#64748b',  // sub-grave
  2: '#7c9ec9',  // grave
  3: '#4f86c6',  // médio-grave
  4: '#5b72d4',  // médio
  5: '#7c6bb5',  // médio-agudo
  6: '#a855f7',  // agudo
  7: '#d946ef',  // muito agudo
}

// ────────────────────────────────────────────────────────────────────────────────
// Carregamento
// ────────────────────────────────────────────────────────────────────────────────

async function loadTranscription() {
  try {
    loading.value = true
    error.value   = null
    if (!transcriptionId.value) { router.push('/'); return }

    const scoreData = await getScore(transcriptionId.value)
    transcription.value = {
      id:        scoreData.id,
      title:     scoreData.title,
      duration:  scoreData.duration,
      language:  scoreData.language,
      words:     scoreData.words,
      createdAt: new Date().toISOString(),
      key:       extractKey(scoreData.words),
      range:     calculateRange(scoreData.words),
    }
  } catch (err) {
    error.value = err.message
    if (err.message.includes('404') || err.message.includes('não encontrado')) {
      router.push('/scores')
    }
  } finally {
    loading.value = false
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Algoritmo de supressão — função pura (sem efeitos colaterais, testável)
// ────────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ text: string, note: string|null, start?: number, end?: number }} Word
 *
 * @typedef {{
 *   text:        string,
 *   actualNote:  string|null,
 *   displayNote: string|null,
 *   noteStatus:  'show'|'continues'|'gap',
 *   start:       number|null,
 *   end:         number|null,
 * }} AnnotatedWord
 *
 * @param {Word[]} words
 * @param {number} wordsPerLine
 * @returns {AnnotatedWord[][]}
 */
function buildAnnotatedWords(words, wordsPerLine) {
  if (!words?.length) return []

  let lastShownNote = null  // última nota efetivamente exibida na tela
  let gapCount      = 0     // palavras consecutivas sem nota desde a última nota

  const annotated = words.map((word, idx) => {
    const isLineStart = idx % wordsPerLine === 0
    const note        = word.note ?? null

    // Regra 1: início de linha → reset total do contexto
    if (isLineStart) {
      lastShownNote = null
      gapCount      = 0
    }

    let displayNote = null
    let noteStatus  = 'gap'

    if (note === null) {
      // Regra 2: lacuna — incrementa contador e reseta contexto se necessário
      gapCount++
      if (gapCount >= GAP_RESET_THRESHOLD) {
        lastShownNote = null  // contexto tonal perdido
      }
      noteStatus  = 'gap'
      displayNote = null

    } else {
      gapCount = 0  // recomeça contagem de lacunas

      if (note !== lastShownNote) {
        // Regra 3: nota mudou → exibir
        noteStatus    = 'show'
        displayNote   = note
        lastShownNote = note
      } else {
        // Regra 4: mesma nota → suprimir, marcar como continuação
        noteStatus  = 'continues'
        displayNote = null
      }
    }

    return {
      text:        word.text  ?? '',
      actualNote:  note,
      displayNote,
      noteStatus,
      start:       word.start ?? null,
      end:         word.end   ?? null,
    }
  })

  // Particionar em linhas visuais
  const lines = []
  for (let i = 0; i < annotated.length; i += wordsPerLine) {
    lines.push(annotated.slice(i, i + wordsPerLine))
  }
  return lines
}

// ────────────────────────────────────────────────────────────────────────────────
// Computed
// ────────────────────────────────────────────────────────────────────────────────

const cifraLines = computed(() =>
  transcription.value
    ? buildAnnotatedWords(transcription.value.words, WORDS_PER_LINE)
    : []
)

const stats = computed(() => {
  if (!transcription.value) return null
  const words  = transcription.value.words
  const total  = words.length
  const voiced = words.filter(w => w.note).length
  const shown  = cifraLines.value.flat().filter(w => w.noteStatus === 'show').length
  return {
    total,
    voiced,
    shown,
    pct: total ? Math.round((voiced / total) * 100) : 0,
  }
})

const noteDistribution = computed(() => {
  if (!transcription.value) return []
  const count = {}
  transcription.value.words.forEach(w => {
    if (w.note) count[w.note] = (count[w.note] || 0) + 1
  })
  const max = Math.max(...Object.values(count), 1)
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .map(([note, n]) => ({ note, n, pct: Math.round((n / max) * 100) }))
})

// ────────────────────────────────────────────────────────────────────────────────
// Helpers visuais
// ────────────────────────────────────────────────────────────────────────────────

function noteColor(note) {
  if (!note) return 'transparent'
  const oct = parseInt(note.match(/\d+/)?.[0] ?? '4')
  return OCTAVE_COLORS[oct] ?? OCTAVE_COLORS[4]
}

/** Versão com alpha para o underline de continuação */
function noteColorSoft(note) {
  return noteColor(note) + '40'  // ~25% opacidade
}

function wordTooltip(word) {
  const time = word.start != null ? ` · ${formatTime(word.start)}` : ''
  if (!word.actualNote) return `${word.text}${time}`
  const hint = word.noteStatus === 'continues' ? ' (continua)' : ''
  return `${word.text} — ${word.actualNote}${hint}${time}`
}

// ────────────────────────────────────────────────────────────────────────────────
// Helpers musicais
// ────────────────────────────────────────────────────────────────────────────────

function calculateRange(words) {
  const noteMap = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 }
  const midis = words
    .filter(w => w.note)
    .map(w => {
      const name   = w.note.replace(/\d/g, '')
      const octave = parseInt(w.note.match(/\d/)?.[0] ?? '4')
      return (noteMap[name] ?? 0) + octave * 12
    })
  if (!midis.length) return null
  const lo = Math.min(...midis)
  const hi = Math.max(...midis)
  const toNote = m => {
    const ns = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
    return ns[m % 12] + Math.floor(m / 12)
  }
  return { lowest: toNote(lo), highest: toNote(hi), span: hi - lo }
}

function extractKey(words) {
  const count = {}
  words.filter(w => w.note).forEach(w => {
    const name = w.note.replace(/\d/g, '')
    count[name] = (count[name] || 0) + 1
  })
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function formatTime(s) {
  if (s == null) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

// ────────────────────────────────────────────────────────────────────────────────
// Exportar cifra — aplica supressão no texto exportado (mesmo critério da tela)
// ────────────────────────────────────────────────────────────────────────────────

function exportCifra() {
  if (!transcription.value) return

  let out = `${transcription.value.title}\n`
  if (transcription.value.key)
    out += `Tom: ${transcription.value.key}\n`
  if (transcription.value.range)
    out += `Range: ${transcription.value.range.lowest} – ${transcription.value.range.highest}\n`
  out += '\n'

  cifraLines.value.forEach(line => {
    // Largura de cada coluna = max(nota, palavra, mínimo 3)
    const colW = line.map(w =>
      Math.max(w.displayNote?.length ?? 0, w.text?.length ?? 0, 3)
    )
    // Linha de notas: só imprime onde a nota mudou (supressão aplicada)
    const noteRow = line
      .map((w, i) => (w.displayNote ?? '').padEnd(colW[i]))
      .join(' ')
    // Linha de palavras
    const wordRow = line
      .map((w, i) => (w.text ?? '').padEnd(colW[i]))
      .join(' ')

    out += noteRow.trimEnd() + '\n'
    out += wordRow.trimEnd() + '\n\n'
  })

  const blob = new Blob([out], { type: 'text/plain' })
  const a    = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(blob),
    download: `cifra-${transcription.value.id}.txt`,
  })
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportJSON() {
  if (!transcription.value) return
  const blob = new Blob(
    [JSON.stringify(transcription.value, null, 2)],
    { type: 'application/json' }
  )
  const a = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(blob),
    download: `pitch-${transcription.value.id}.json`,
  })
  a.click()
  URL.revokeObjectURL(a.href)
}

onMounted(loadTranscription)
</script>

<template>
  <div class="rp">

    <!-- ── Loading ──────────────────────────────────────────────────────────── -->
    <div v-if="loading" class="rp-center">
      <div class="rp-card rp-loading">
        <div class="rp-spinner"></div>
        <p>Carregando cifra…</p>
      </div>
    </div>

    <!-- ── Error ────────────────────────────────────────────────────────────── -->
    <div v-else-if="error" class="rp-center">
      <div class="rp-card">
        <p class="rp-err">{{ error }}</p>
        <button class="rp-btn" @click="router.push('/scores')">← Voltar</button>
      </div>
    </div>

    <!-- ── Main ─────────────────────────────────────────────────────────────── -->
    <main v-else-if="transcription">

      <!-- Header -->
      <header class="rp-header">
        <button class="rp-btn-ghost" @click="router.push('/scores')">← Cifras</button>
        <div class="rp-header-center">
          <h1 class="rp-title">{{ transcription.title }}</h1>
          <div class="rp-meta">
            <span v-if="transcription.duration">{{ formatTime(transcription.duration) }}</span>
            <span v-if="transcription.key">Tom: <b>{{ transcription.key }}</b></span>
            <span v-if="transcription.range">
              Range: <b>{{ transcription.range.lowest }}</b>–<b>{{ transcription.range.highest }}</b>
            </span>
            <span v-if="stats">
              {{ stats.voiced }} notas · <b>{{ stats.shown }} marcações</b> · {{ stats.pct }}%
            </span>
          </div>
        </div>
        <div class="rp-header-actions">
          <button class="rp-btn-ghost" @click="exportCifra" title="Exportar cifra em texto">↓ Cifra</button>
          <button class="rp-btn-ghost" @click="exportJSON"  title="Exportar JSON">↓ JSON</button>
        </div>
      </header>

      <!-- Tabs -->
      <div class="rp-tabs">
        <button class="rp-tab" :class="{ active: viewMode === 'cifra' }" @click="viewMode = 'cifra'">
          Cifra
        </button>
        <button class="rp-tab" :class="{ active: viewMode === 'stats' }" @click="viewMode = 'stats'">
          Análise
        </button>
      </div>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- VIEW: CIFRA                                                          -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <section v-if="viewMode === 'cifra'" class="rp-cifra-wrap">
        <div class="rp-cifra">

          <div v-for="(line, li) in cifraLines" :key="li" class="cifra-line">
            <div
              v-for="(word, wi) in line"
              :key="wi"
              class="cifra-word"
              :title="wordTooltip(word)"
              :style="word.actualNote ? {
                '--nc':      noteColor(word.actualNote),
                '--nc-soft': noteColorSoft(word.actualNote),
              } : {}"
            >
              <!--
                Slot da nota (linha de cima).
                Altura SEMPRE reservada independente do status →
                garante alinhamento vertical uniforme de toda a linha.

                show      → texto da nota na cor da oitava
                continues → espaço invisível (altura preservada)
                gap       → espaço invisível (altura preservada)
              -->
              <span class="cifra-note" :class="`cifra-note--${word.noteStatus}`">
                {{ word.noteStatus === 'show' ? word.displayNote : '\u00A0' }}
              </span>

              <!--
                Texto da palavra (linha de baixo).

                show      → cor clara — onset de nota nova
                continues → cor média + underline na cor da nota (ligadura visual)
                gap       → cor apagada
              -->
              <span class="cifra-text" :class="`cifra-text--${word.noteStatus}`">
                {{ word.text }}
              </span>
            </div>
          </div>

        </div>

        <!-- Legenda -->
        <div class="rp-legend">
          <span class="legend-label">Oitavas:</span>
          <span
            v-for="(color, oct) in OCTAVE_COLORS"
            :key="oct"
            class="legend-dot"
            :style="{ color }"
          >● {{ oct }}</span>
          <span class="legend-sep">&nbsp;·&nbsp;</span>
          <span class="legend-hint">
            <span class="legend-ul-sample"></span>
            nota continua
          </span>
          <span class="legend-sep">&nbsp;·&nbsp;</span>
          <span class="legend-hint legend-hint--gap">palavra sem nota</span>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- VIEW: ANÁLISE                                                        -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <section v-else-if="viewMode === 'stats'" class="rp-stats-wrap">

        <div class="rp-kpi-row">
          <div class="rp-kpi">
            <span class="kpi-val">{{ stats?.total }}</span>
            <span class="kpi-label">Palavras</span>
          </div>
          <div class="rp-kpi">
            <span class="kpi-val">{{ stats?.voiced }}</span>
            <span class="kpi-label">Com nota</span>
          </div>
          <div class="rp-kpi">
            <span class="kpi-val">{{ stats?.shown }}</span>
            <span class="kpi-label">Marcações</span>
          </div>
          <div class="rp-kpi">
            <span class="kpi-val">{{ stats?.pct }}%</span>
            <span class="kpi-label">Cobertura</span>
          </div>
          <div class="rp-kpi" v-if="transcription.range">
            <span class="kpi-val">{{ transcription.range.span }}</span>
            <span class="kpi-label">Semitons range</span>
          </div>
        </div>

        <div class="rp-dist-card">
          <h3 class="rp-dist-title">Distribuição de Notas</h3>
          <div class="rp-dist-list">
            <div v-for="item in noteDistribution" :key="item.note" class="rp-dist-row">
              <span class="rp-dist-note" :style="{ color: noteColor(item.note) }">{{ item.note }}</span>
              <div class="rp-dist-bar-wrap">
                <div class="rp-dist-bar"
                  :style="{ width: item.pct + '%', background: noteColor(item.note) }"
                ></div>
              </div>
              <span class="rp-dist-count">{{ item.n }}</span>
            </div>
          </div>
        </div>

        <div class="rp-info-card">
          <div class="rp-info-row" v-if="transcription.key">
            <span>Tom estimado</span><b>{{ transcription.key }}</b>
          </div>
          <div class="rp-info-row" v-if="transcription.range">
            <span>Nota mais grave</span><b>{{ transcription.range.lowest }}</b>
          </div>
          <div class="rp-info-row" v-if="transcription.range">
            <span>Nota mais aguda</span><b>{{ transcription.range.highest }}</b>
          </div>
          <div class="rp-info-row">
            <span>Duração</span><b>{{ formatTime(transcription.duration) }}</b>
          </div>
          <div class="rp-info-row">
            <span>Idioma</span><b>{{ transcription.language?.toUpperCase() }}</b>
          </div>
          <div class="rp-info-row">
            <span>Notas exibidas / detectadas</span>
            <b>{{ stats?.shown }} / {{ stats?.voiced }}</b>
          </div>
        </div>

      </section>

    </main>

  </div>
</template>

<style scoped>
/* ── Reset ────────────────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.rp {
  min-height: 100vh;
  background: #0f1117;
  color: #e2e8f0;
  font-family: 'Georgia', 'Times New Roman', serif;
  padding-bottom: 4rem;
}

/* ── Centro (loading / erro) ─────────────────────────────────────────────────── */
.rp-center {
  display: flex; align-items: center; justify-content: center; min-height: 100vh;
}
.rp-card {
  background: #1a1d27; border: 1px solid #2d3148; border-radius: 12px;
  padding: 2.5rem; text-align: center; max-width: 360px;
}
.rp-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.rp-spinner {
  width: 36px; height: 36px;
  border: 3px solid #2d3148; border-top-color: #4f86c6;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.rp-err { color: #f87171; margin-bottom: 1.5rem; }

/* ── Botões ──────────────────────────────────────────────────────────────────── */
.rp-btn, .rp-btn-ghost {
  font-family: inherit; font-size: 0.85rem; border-radius: 6px;
  cursor: pointer; padding: 0.5rem 1rem;
  transition: background 0.15s, color 0.15s; white-space: nowrap;
}
.rp-btn             { background: #4f86c6; color: #fff; border: none; }
.rp-btn:hover       { background: #3a6fa8; }
.rp-btn-ghost       { background: transparent; color: #94a3b8; border: 1px solid #2d3148; }
.rp-btn-ghost:hover { background: #1a1d27; color: #e2e8f0; }

/* ── Header ──────────────────────────────────────────────────────────────────── */
.rp-header {
  display: flex; align-items: flex-start; gap: 1.5rem;
  padding: 2rem 2rem 1.25rem; border-bottom: 1px solid #1e2135;
}
.rp-header-center { flex: 1; min-width: 0; }
.rp-title {
  font-size: clamp(1.1rem, 3vw, 1.75rem); font-weight: 600; color: #f1f5f9;
  letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 0.5rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rp-meta {
  display: flex; flex-wrap: wrap; gap: 1rem;
  font-size: 0.8rem; color: #64748b; font-family: 'Courier New', monospace;
}
.rp-meta b { color: #94a3b8; font-weight: 600; }
.rp-header-actions { display: flex; gap: 0.5rem; flex-shrink: 0; padding-top: 0.1rem; }

/* ── Tabs ────────────────────────────────────────────────────────────────────── */
.rp-tabs { display: flex; padding: 0 2rem; border-bottom: 1px solid #1e2135; }
.rp-tab {
  font-family: inherit; font-size: 0.85rem; background: transparent; border: none;
  border-bottom: 2px solid transparent; color: #64748b; cursor: pointer;
  padding: 0.85rem 1.25rem; transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;
}
.rp-tab:hover  { color: #94a3b8; }
.rp-tab.active { color: #4f86c6; border-bottom-color: #4f86c6; }

/* ══════════════════════════════════════════════════════════════════════════════ */
/* CIFRA                                                                          */
/* ══════════════════════════════════════════════════════════════════════════════ */

.rp-cifra-wrap {
  padding: 2.5rem 2rem;
  max-width: 940px;
  margin: 0 auto;
}

.rp-cifra {
  background: #13161f;
  border: 1px solid #1e2135;
  border-radius: 10px;
  padding: 2.5rem 2.5rem 3rem;
}

/* ── Linha de cifra ──────────────────────────────────────────────────────────── */
.cifra-line {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;   /* baseline unificada: palavras de alturas diferentes alinham pela base */
  gap: 0 0.1rem;
  margin-bottom: 2.4rem;
}
.cifra-line:last-child { margin-bottom: 0; }

/* ── Par nota + palavra ──────────────────────────────────────────────────────── */
.cifra-word {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0 0.4rem 0 0;
  cursor: default;

  /* CSS vars injetadas pelo template com as cores da nota desta palavra */
  --nc:      #4f86c6;
  --nc-soft: #4f86c640;
}

/* ── Slot da nota (linha de cima) ────────────────────────────────────────────── */
/*
 * A altura mínima é SEMPRE reservada, independente do status.
 * Isso é crítico para o alinhamento: se palavras com e sem nota
 * tivessem alturas diferentes, a linha visual ficaria irregular.
 */
.cifra-note {
  font-family: 'Courier New', monospace;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1;
  min-height: 1.1rem;    /* altura reservada — NÃO remover */
  display: block;
  margin-bottom: 0.32rem;
  white-space: nowrap;
  user-select: none;
}

/* status='show' → nota visível na cor da oitava */
.cifra-note--show {
  color: var(--nc);
}

/* status='continues' e 'gap' → invisível mas ocupa espaço */
.cifra-note--continues,
.cifra-note--gap {
  color: transparent;
  pointer-events: none;
}

/* ── Texto da palavra (linha de baixo) ───────────────────────────────────────── */
.cifra-text {
  font-family: 'Georgia', serif;
  font-size: 1.05rem;
  line-height: 1;
  white-space: nowrap;
  transition: color 0.1s;
}

/*
 * status='show' → início de nota nova — mais brilhante, atrai atenção
 */
.cifra-text--show {
  color: #f1f5f9;
}

/*
 * status='continues' → MESMA nota em andamento.
 * Underline sutil na cor da nota = "ligadura visual".
 * Comunica ao cantor: "continue nessa nota" sem poluir com texto repetido.
 * Inspiração: notação de ligadura em partituras (tie notation).
 */
.cifra-text--continues {
  color: #a0aec0;
  border-bottom: 1.5px solid var(--nc-soft);
  padding-bottom: 1px;
}

/*
 * status='gap' → sem nota detectada para esta palavra.
 * Cor mais apagada: indica incerteza do detector (palavra curta,
 * consoante, pausa, ou início de frase).
 */
.cifra-text--gap {
  color: #4a5568;
}

/*
 * Hover: revela a nota real em qualquer estado.
 * Útil para explorar a cifra e entender o que está suprimido.
 */
.cifra-word:hover .cifra-note--continues { color: var(--nc); opacity: 0.45; }
.cifra-word:hover .cifra-note--gap       { color: #475569;   opacity: 0.45; }
.cifra-word:hover .cifra-text            { color: #fff !important; }

/* ── Legenda ─────────────────────────────────────────────────────────────────── */
.rp-legend {
  display: flex; flex-wrap: wrap; align-items: center;
  gap: 0.4rem 0.75rem; margin-top: 1.75rem; padding-top: 1rem;
  border-top: 1px solid #1e2135;
  font-size: 0.73rem; font-family: 'Courier New', monospace;
}
.legend-label  { color: #475569; }
.legend-dot    { font-size: 0.71rem; font-weight: 700; }
.legend-sep    { color: #2d3148; }
.legend-hint   { display: flex; align-items: center; gap: 0.35rem; color: #475569; }
.legend-ul-sample {
  display: inline-block; width: 24px; height: 0;
  border-bottom: 1.5px solid #5b72d440;
}
.legend-hint--gap { color: #4a5568; font-style: italic; }

/* ══════════════════════════════════════════════════════════════════════════════ */
/* ANÁLISE                                                                        */
/* ══════════════════════════════════════════════════════════════════════════════ */

.rp-stats-wrap {
  padding: 2rem; max-width: 760px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 1.5rem;
}

.rp-kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; }
.rp-kpi {
  background: #13161f; border: 1px solid #1e2135; border-radius: 10px;
  padding: 1.25rem 1.5rem; display: flex; flex-direction: column; align-items: flex-start; gap: 0.4rem;
}
.kpi-val   { font-family: 'Courier New', monospace; font-size: 2rem; font-weight: 700; color: #4f86c6; line-height: 1; }
.kpi-label { font-size: 0.74rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.07em; }

.rp-dist-card { background: #13161f; border: 1px solid #1e2135; border-radius: 10px; padding: 1.75rem; }
.rp-dist-title {
  font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: #475569; margin-bottom: 1.25rem; font-family: 'Courier New', monospace;
}
.rp-dist-list { display: flex; flex-direction: column; gap: 0.6rem; }
.rp-dist-row  { display: grid; grid-template-columns: 56px 1fr 36px; align-items: center; gap: 0.75rem; }
.rp-dist-note { font-family: 'Courier New', monospace; font-size: 0.82rem; font-weight: 700; }
.rp-dist-bar-wrap { height: 6px; background: #1e2135; border-radius: 3px; overflow: hidden; }
.rp-dist-bar      { height: 100%; border-radius: 3px; transition: width 0.4s ease; opacity: 0.85; }
.rp-dist-count    { font-family: 'Courier New', monospace; font-size: 0.78rem; color: #475569; text-align: right; }

.rp-info-card { background: #13161f; border: 1px solid #1e2135; border-radius: 10px; overflow: hidden; }
.rp-info-row  {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.75rem 1.5rem; border-bottom: 1px solid #1e2135; font-size: 0.85rem;
}
.rp-info-row:last-child { border-bottom: none; }
.rp-info-row span { color: #64748b; }
.rp-info-row b    { color: #cbd5e1; font-weight: 600; font-family: 'Courier New', monospace; }

/* ── Responsive ──────────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .rp-header         { flex-wrap: wrap; gap: 0.75rem; padding: 1.25rem 1rem; }
  .rp-header-actions { width: 100%; }
  .rp-cifra-wrap,
  .rp-stats-wrap     { padding: 1.25rem 0.75rem; }
  .rp-cifra          { padding: 1.5rem 1rem 2rem; }
  .rp-title          { font-size: 1.1rem; }
  .cifra-text        { font-size: 0.9rem; }
  .cifra-note        { font-size: 0.68rem; }
  .cifra-line        { margin-bottom: 2rem; }
}
</style>
