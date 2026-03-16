/**
 * Utilitários para manipulação de notas musicais
 */
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Converte nome da nota para número MIDI
 */
export function noteToMidi(note) {
  if (!note) return null;
  
  const match = note.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return null;
  
  const noteName = match[1];
  const octave = parseInt(match[2]);
  const noteIndex = NOTES.indexOf(noteName);
  
  return noteIndex < 0 ? null : (octave + 1) * 12 + noteIndex;
}

/**
 * Converte número MIDI para nome da nota
 */
export function midiToNote(midi) {
  return NOTES[midi % 12] + (Math.floor(midi / 12) - 1);
}

/**
 * Converte frequência para nota
 */
export function freqToNote(freq) {
  if (freq <= 0) return '-';
  
  const midi = Math.round(12 * Math.log2(freq / 440) + 69);
  return midiToNote(midi);
}

/**
 * Converte nota para frequência aproximada
 */
export function noteToFreq(note) {
  const midi = noteToMidi(note);
  if (midi === null) return 0;
  
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Calcula diferença em semitons entre duas notas
 */
export function noteDifference(note1, note2) {
  const midi1 = noteToMidi(note1);
  const midi2 = noteToMidi(note2);
  
  if (midi1 === null || midi2 === null) return null;
  return midi2 - midi1;
}

/**
 * Calcula cor baseada na dificuldade da nota
 */
export function getDifficultyColor(midi, lowestMidi, highestMidi) {
  const range = highestMidi - lowestMidi;
  
  if (midi >= lowestMidi + range * 0.82) return '#A32D2D'; // Difícil
  if (midi >= lowestMidi + range * 0.6) return '#BA7517';  // Médio
  return '#3B6D11'; // Confortável
}

/**
 * Escapa HTML para prevenir XSS
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Formata tempo em segundos para string legível
 */
export function formatTime(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formata tamanho de arquivo
 */
export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${Math.round(size)} ${units[unitIndex]}`;
}

/**
 * Debounce function para limitar execuções
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function para limitar frequência
 */
export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
