class Metrics {
  constructor(container) {
    this.container = container;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="metrics">
        <div class="metric">
          <div class="mval" id="mW">0</div>
          <div class="mlbl">palavras</div>
        </div>
        <div class="metric">
          <div class="mval" id="mR">—</div>
          <div class="mlbl">range vocal</div>
        </div>
        <div class="metric">
          <div class="mval" id="mT">—</div>
          <div class="mlbl">tessitura</div>
        </div>
        <div class="metric">
          <div class="mval" id="mS">—</div>
          <div class="mlbl">semitons</div>
        </div>
        <div class="metric">
          <div class="mval" id="mD" style="color:var(--red)">0%</div>
          <div class="mlbl">difíceis</div>
        </div>
      </div>
    `;
  }

  updateMetrics(data) {
    const words = data.words || [];
    if (!words.length) return;

    // Calculate metrics
    const midis = words.map(w => this.noteToMidi(w.note)).filter(m => m !== null);
    const sorted = [...midis].sort((a, b) => a - b);
    const lo = sorted[0] ?? 48;
    const hi = sorted[sorted.length - 1] ?? 72;
    const p20 = sorted[Math.floor(sorted.length * .2)] ?? lo;
    const p80 = sorted[Math.floor(sorted.length * .8)] ?? hi;
    
    let hard = 0;
    midis.forEach(m => {
      if (m >= lo + (hi - lo) * .82) hard++;
    });

    // Update DOM
    this.updateElement('mW', words.length);
    this.updateElement('mR', midis.length ? `${this.midiToNote(lo)}–${this.midiToNote(hi)}` : '—');
    this.updateElement('mT', midis.length ? `${this.midiToNote(p20)}–${this.midiToNote(p80)}` : '—');
    this.updateElement('mS', midis.length ? `${hi - lo} st` : '—');
    this.updateElement('mD', midis.length ? `${Math.round(hard / midis.length * 100)}%` : '0%');
  }

  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  noteToMidi(note) {
    if (!note) return null;
    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const match = note.match(/^([A-G]#?)(-?\d+)$/);
    if (!match) return null;
    const noteIndex = NOTES.indexOf(match[1]);
    return noteIndex < 0 ? null : (parseInt(match[2]) + 1) * 12 + noteIndex;
  }

  midiToNote(midi) {
    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return NOTES[midi % 12] + (Math.floor(midi / 12) - 1);
  }
}

window.Metrics = Metrics;
