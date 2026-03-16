// Utilitários para conversão de frequência em notas
// Migrado do backend: app/note_utils.js

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

/**
 * Converte frequência em nota musical
 * @param {number} freq - Frequência em Hz
 * @returns {Object} - Objeto com nota, octave e cents
 */
export function freqToNote(freq) {
  if (freq <= 0) {
    return null
  }
  
  const A4 = 440
  const n = Math.round(12 * Math.log2(freq / A4)) + 69
  const note = NOTES[n % 12]
  const octave = Math.floor(n / 12) - 1
  const ideal = A4 * Math.pow(2, (n - 69) / 12)
  const cents = Math.round(1200 * Math.log2(freq / ideal))
  
  return {
    note: `${note}${octave}`,
    cents: cents,
    frequency: freq
  }
}

/**
 * Versão simplificada que retorna apenas o nome da nota
 * @param {number} freq - Frequência em Hz
 * @returns {string} - Nome da nota (ex: "C4")
 */
export function freqToNoteSimple(freq) {
  if (freq <= 0) return '-'
  
  const A4 = 440
  const n = Math.round(12 * Math.log2(freq / A4)) + 69
  const note = NOTES[n % 12]
  const octave = Math.floor(n / 12) - 1
  
  return `${note}${octave}`
}

/**
 * Converte frequência em nota com informações detalhadas
 * @param {number} freq - Frequência em Hz
 * @returns {Object} - Objeto completo com nota, freq, cents
 */
export function freqToNoteDetailed(freq) {
  if (freq <= 0) {
    return { note: "-", freq: 0.0, cents: 0 }
  }
  
  const midi = 69 + 12 * Math.log2(freq / 440)
  const noteIndex = Math.round(midi) % 12
  const cents = Math.round((midi - Math.round(midi)) * 100)
  
  return {
    note: NOTES[noteIndex],
    freq: freq,
    cents: cents
  }
}

/**
 * Verifica se uma frequência está dentro de um range aceitável
 * @param {number} freq - Frequência em Hz
 * @param {number} min - Frequência mínima
 * @param {number} max - Frequência máxima
 * @returns {boolean}
 */
export function isFrequencyInRange(freq, min = 60, max = 2000) {
  return freq > 0 && freq >= min && freq <= max
}

/**
 * Calcula a diferença em cents entre duas frequências
 * @param {number} freq1 - Primeira frequência
 * @param {number} freq2 - Segunda frequência
 * @returns {number} - Diferença em cents
 */
export function frequencyDifference(freq1, freq2) {
  if (freq1 <= 0 || freq2 <= 0) return 0
  return 1200 * Math.log2(freq2 / freq1)
}

/**
 * Mapeia uma frequência para uma cor baseada na nota
 * @param {number} freq - Frequência em Hz
 * @returns {string} - Cor CSS
 */
export function frequencyToColor(freq) {
  if (freq <= 0) return '#666'
  
  const note = freqToNoteSimple(freq)
  const noteColors = {
    'C': '#FF6B6B',   // Vermelho
    'C#': '#FF9F40',  // Laranja
    'D': '#FFD93D',   // Amarelo
    'D#': '#6BCF7F',  // Verde
    'E': '#4ECDC4',   // Ciano
    'F': '#45B7D1',   // Azul claro
    'F#': '#5A67D8',  // Azul médio
    'G': '#667EEA',   // Azul escuro
    'G#': '#9F7AEA',  // Roxo claro
    'A': '#ED64A6',   // Rosa
    'A#': '#F56565',  // Vermelho claro
    'B': '#48BB78'    // Verde escuro
  }
  
  const noteName = note.replace(/\d/, '') // Remove octave
  return noteColors[noteName] || '#666'
}
