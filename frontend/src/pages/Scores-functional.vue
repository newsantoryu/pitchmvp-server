<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const chordTextview = ref(null)

// Estado para scroll
const scrollPosition = ref(0)
const maxScroll = ref(0)

// Dados mock das cifras (simulando dados do backend)
const transcriptions = ref([
  {
    id: '1',
    title: 'Música Exemplo 1',
    artist: 'Artista Famoso',
    duration: 180,
    tempo: 120,
    key: 'C Major',
    createdAt: '2024-03-16T10:30:00Z',
    words: [
      { time: 0, note: 'C4', word: 'Hello' },
      { time: 1, note: 'E4', word: 'world' },
      { time: 2, note: 'G4', word: 'this' },
      { time: 3, note: 'C5', word: 'is' },
      { time: 4, note: 'E4', word: 'beautiful' },
      { time: 5, note: 'D4', word: 'day' },
      { time: 6, note: 'F4', word: 'full' },
      { time: 7, note: 'A4', word: 'of' },
      { time: 8, note: 'G4', word: 'sunshine' },
      { time: 9, note: 'E4', word: 'and' },
      { time: 10, note: 'C4', word: 'laughter' },
      { time: 11, note: 'D4', word: 'everywhere' },
      { time: 12, note: 'E4', word: 'people' },
      { time: 13, note: 'G4', word: 'smiling' },
      { time: 14, note: 'C5', word: 'brightly' },
      { time: 15, note: 'A4', word: 'under' },
      { time: 16, note: 'F4', word: 'blue' },
      { time: 17, note: 'G4', word: 'skies' },
      { time: 18, note: 'E4', word: 'dreams' },
      { time: 19, note: 'C4', word: 'come' },
      { time: 20, note: 'D4', word: 'true' },
      { time: 21, note: 'F4', word: 'when' },
      { time: 22, note: 'G4', word: 'you' },
      { time: 23, note: 'E4', word: 'believe' },
      { time: 24, note: 'C4', word: 'in' },
      { time: 25, note: 'D4', word: 'magic' },
      { time: 26, note: 'E4', word: 'wonderful' },
      { time: 27, note: 'G4', word: 'things' },
      { time: 28, note: 'C5', word: 'happen' },
      { time: 29, note: 'A4', word: 'every' },
      { time: 30, note: 'F4', word: 'moment' },
      { time: 31, note: 'G4', word: 'of' },
      { time: 32, note: 'E4', word: 'your' },
      { time: 33, note: 'D4', word: 'life' },
      { time: 34, note: 'C4', word: 'journey' },
      { time: 35, note: 'E4', word: 'begins' },
      { time: 36, note: 'G4', word: 'with' },
      { time: 37, note: 'A4', word: 'courage' },
      { time: 38, note: 'F4', word: 'and' },
      { time: 39, note: 'G4', word: 'hope' },
      { time: 40, note: 'E4', word: 'in' },
      { time: 41, note: 'C4', word: 'your' },
      { time: 42, note: 'D4', word: 'heart' },
      { time: 43, note: 'E4', word: 'forever' },
      { time: 44, note: 'G4', word: 'lasting' },
      { time: 45, note: 'C5', word: 'memories' },
      { time: 46, note: 'A4', word: 'created' },
      { time: 47, note: 'F4', word: 'with' },
      { time: 48, note: 'G4', word: 'love' },
      { time: 49, note: 'E4', word: 'and' },
      { time: 50, note: 'C4', word: 'care' },
      { time: 51, note: 'D4', word: 'every' },
      { time: 52, note: 'F4', word: 'single' },
      { time: 53, note: 'G4', word: 'day' },
      { time: 54, note: 'E4', word: 'we' },
      { time: 55, note: 'C4', word: 'share' },
      { time: 56, note: 'D4', word: 'together' },
      { time: 57, note: 'E4', word: 'through' },
      { time: 58, note: 'G4', word: 'thick' },
      { time: 59, note: 'A4', word: 'and' },
      { time: 60, note: 'F4', word: 'thin' },
      { time: 61, note: 'G4', word: 'times' },
      { time: 62, note: 'E4', word: 'always' },
      { time: 63, note: 'C4', word: 'there' },
      { time: 64, note: 'D4', word: 'for' },
      { time: 65, note: 'F4', word: 'each' },
      { time: 66, note: 'G4', word: 'other' },
      { time: 67, note: 'E4', word: 'no' },
      { time: 68, note: 'C4', word: 'matter' },
      { time: 69, note: 'D4', word: 'what' },
      { time: 70, note: 'E4', word: 'comes' },
      { time: 71, note: 'G4', word: 'our' },
      { time: 72, note: 'A4', word: 'way' },
      { time: 73, note: 'F4', word: 'we' },
      { time: 74, note: 'G4', word: 'face' },
      { time: 75, note: 'E4', word: 'together' },
      { time: 76, note: 'C4', word: 'strong' },
      { time: 77, note: 'D4', word: 'and' },
      { time: 78, note: 'F4', word: 'brave' },
      { time: 79, note: 'G4', word: 'in' },
      { time: 80, note: 'E4', word: 'the' },
      { time: 81, note: 'C4', word: 'face' },
      { time: 82, note: 'D4', word: 'of' },
      { time: 83, note: 'E4', word: 'adversity' },
      { time: 84, note: 'G4', word: 'never' },
      { time: 85, note: 'A4', word: 'give' },
      { time: 86, note: 'F4', word: 'up' },
      { time: 87, note: 'G4', word: 'on' },
      { time: 88, note: 'E4', word: 'your' },
      { time: 89, note: 'C4', word: 'dreams' },
      { time: 90, note: 'D4', word: 'keep' },
      { time: 91, note: 'F4', word: 'fighting' },
      { time: 92, note: 'G4', word: 'until' },
      { time: 93, note: 'E4', word: 'the' },
      { time: 94, note: 'C4', word: 'very' },
      { time: 95, note: 'D4', word: 'end' },
      { time: 96, note: 'E4', word: 'success' },
      { time: 97, note: 'G4', word: 'will' },
      { time: 98, note: 'A4', word: 'be' },
      { time: 99, note: 'F4', word: 'yours' },
      { time: 100, note: 'G4', word: 'eventually' },
      { time: 101, note: 'E4', word: 'all' },
      { time: 102, note: 'C4', word: 'your' },
      { time: 103, note: 'D4', word: 'hard' },
      { time: 104, note: 'F4', word: 'work' },
      { time: 105, note: 'G4', word: 'pays' },
      { time: 106, note: 'E4', word: 'off' },
      { time: 107, note: 'C4', word: 'in' },
      { time: 108, note: 'D4', word: 'amazing' },
      { time: 109, note: 'E4', word: 'ways' },
      { time: 110, note: 'G4', word: 'you' },
      { time: 111, note: 'A4', word: 'never' },
      { time: 112, note: 'F4', word: 'imagined' },
      { time: 113, note: 'G4', word: 'possible' },
      { time: 114, note: 'E4', word: 'before' },
      { time: 115, note: 'C4', word: 'this' },
      { time: 116, note: 'D4', word: 'moment' },
      { time: 117, note: 'E4', word: 'arrived' },
      { time: 118, note: 'G4', word: 'so' },
      { time: 119, note: 'A4', word: 'keep' },
      { time: 120, note: 'F4', word: 'pushing' },
      { time: 121, note: 'G4', word: 'forward' },
      { time: 122, note: 'E4', word: 'every' },
      { time: 123, note: 'C4', word: 'single' },
      { time: 124, note: 'D4', word: 'day' },
      { time: 125, note: 'E4', word: 'no' },
      { time: 126, note: 'G4', word: 'matter' },
      { time: 127, note: 'A4', word: 'how' },
      { time: 128, note: 'F4', word: 'hard' },
      { time: 129, note: 'G4', word: 'it' },
      { time: 130, note: 'E4', word: 'gets' },
      { time: 131, note: 'C4', word: 'just' },
      { time: 132, note: 'D4', word: 'keep' },
      { time: 133, note: 'E4', word: 'going' },
      { time: 134, note: 'G4', word: 'and' },
      { time: 135, note: 'A4', word: 'never' },
      { time: 136, note: 'F4', word: 'stop' },
      { time: 137, note: 'G4', word: 'believing' },
      { time: 138, note: 'E4', word: 'in' },
      { time: 139, note: 'C4', word: 'yourself' },
      { time: 140, note: 'D4', word: 'and' },
      { time: 141, note: 'E4', word: 'your' },
      { time: 142, note: 'G4', word: 'abilities' },
      { time: 143, note: 'A4', word: 'you' },
      { time: 144, note: 'F4', word: 'are' },
      { time: 145, note: 'G4', word: 'stronger' },
      { time: 146, note: 'E4', word: 'than' },
      { time: 147, note: 'C4', word: 'you' },
      { time: 148, note: 'D4', word: 'think' },
      { time: 149, note: 'E4', word: 'and' },
      { time: 150, note: 'G4', word: 'more' },
      { time: 151, note: 'A4', word: 'capable' },
      { time: 152, note: 'F4', word: 'than' },
      { time: 153, note: 'G4', word: 'you' },
      { time: 154, note: 'E4', word: 'know' },
      { time: 155, note: 'C4', word: 'the' },
      { time: 156, note: 'D4', word: 'journey' },
      { time: 157, note: 'E4', word: 'may' },
      { time: 158, note: 'G4', word: 'be' },
      { time: 159, note: 'A4', word: 'long' },
      { time: 160, note: 'F4', word: 'but' },
      { time: 161, note: 'G4', word: 'the' },
      { time: 162, note: 'E4', word: 'destination' },
      { time: 163, note: 'C4', word: 'is' },
      { time: 164, note: 'D4', word: 'worth' },
      { time: 165, note: 'E4', word: 'every' },
      { time: 166, note: 'G4', word: 'step' },
      { time: 167, note: 'A4', word: 'along' },
      { time: 168, note: 'F4', word: 'the' },
      { time: 169, note: 'G4', word: 'way' },
      { time: 170, note: 'E4', word: 'so' },
      { time: 171, note: 'C4', word: 'enjoy' },
      { time: 172, note: 'D4', word: 'the' },
      { time: 173, note: 'E4', word: 'process' },
      { time: 174, note: 'G4', word: 'and' },
      { time: 175, note: 'A4', word: 'celebrate' },
      { time: 176, note: 'F4', word: 'small' },
      { time: 177, note: 'G4', word: 'victories' },
      { time: 178, note: 'E4', word: 'every' },
      { time: 179, note: 'C4', word: 'day' },
      { time: 180, note: 'D4', word: 'you' },
      { time: 181, note: 'E4', word: 'wake' },
      { time: 182, note: 'G4', word: 'up' },
      { time: 183, note: 'A4', word: 'with' },
      { time: 184, note: 'F4', word: 'gratitude' },
      { time: 185, note: 'G4', word: 'in' },
      { time: 186, note: 'E4', word: 'your' },
      { time: 187, note: 'C4', word: 'heart' },
      { time: 188, note: 'D4', word: 'for' },
      { time: 189, note: 'E4', word: 'another' },
      { time: 190, note: 'G4', word: 'chance' },
      { time: 191, note: 'A4', word: 'to' },
      { time: 192, note: 'F4', word: 'make' },
      { time: 193, note: 'G4', word: 'a' },
      { time: 194, note: 'E4', word: 'difference' },
      { time: 195, note: 'C4', word: 'in' },
      { time: 196, note: 'D4', word: 'the' },
      { time: 197, note: 'E4', word: 'world' },
      { time: 198, note: 'G4', word: 'around' },
      { time: 199, note: 'A4', word: 'you' },
      { time: 200, note: 'F4', word: 'never' },
      { time: 201, note: 'G4', word: 'underestimate' },
      { time: 202, note: 'E4', word: 'the' },
      { time: 203, note: 'C4', word: 'power' },
      { time: 204, note: 'D4', word: 'of' },
      { time: 205, note: 'E4', word: 'kindness' },
      { time: 206, note: 'G4', word: 'and' },
      { time: 207, note: 'A4', word: 'compassion' },
      { time: 208, note: 'F4', word: 'they' },
      { time: 209, note: 'G4', word: 'can' },
      { time: 210, note: 'E4', word: 'change' },
      { time: 211, note: 'C4', word: 'lives' },
      { time: 212, note: 'D4', word: 'in' },
      { time: 213, note: 'E4', word: 'ways' },
      { time: 214, note: 'G4', word: 'you' },
      { time: 215, note: 'A4', word: 'never' },
      { time: 216, note: 'F4', word: 'thought' },
      { time: 217, note: 'G4', word: 'possible' },
      { time: 218, note: 'E4', word: 'before' },
      { time: 219, note: 'C4', word: 'now' },
      { time: 220, note: 'D4', word: 'is' },
      { time: 221, note: 'E4', word: 'the' },
      { time: 222, note: 'G4', word: 'time' },
      { time: 223, note: 'A4', word: 'to' },
      { time: 224, note: 'F4', word: 'take' },
      { time: 225, note: 'G4', word: 'action' },
      { time: 226, note: 'E4', word: 'and' },
      { time: 227, note: 'C4', word: 'make' },
      { time: 228, note: 'D4', word: 'your' },
      { time: 229, note: 'E4', word: 'dreams' },
      { time: 230, note: 'G4', word: 'come' },
      { time: 231, note: 'A4', word: 'true' },
      { time: 232, note: 'F4', word: 'the' },
      { time: 233, note: 'G4', word: 'future' },
      { time: 234, note: 'E4', word: 'is' },
      { time: 235, note: 'C4', word: 'bright' },
      { time: 236, note: 'D4', word: 'and' },
      { time: 237, note: 'E4', word: 'full' },
      { time: 238, note: 'G4', word: 'of' },
      { time: 239, note: 'A4', word: 'possibilities' },
      { time: 240, note: 'F4', word: 'waiting' },
      { time: 241, note: 'G4', word: 'just' },
      { time: 242, note: 'E4', word: 'for' },
      { time: 243, note: 'C4', word: 'you' },
      { time: 244, note: 'D4', word: 'to' },
      { time: 245, note: 'E4', word: 'reach' },
      { time: 246, note: 'G4', word: 'out' },
      { time: 247, note: 'A4', word: 'and' },
      { time: 248, note: 'F4', word: 'grab' },
      { time: 249, note: 'G4', word: 'them' },
      { time: 250, note: 'E4', word: 'with' },
      { time: 251, note: 'C4', word: 'both' },
      { time: 252, note: 'D4', word: 'hands' },
      { time: 253, note: 'E4', word: 'never' },
      { time: 254, note: 'G4', word: 'let' },
      { time: 255, note: 'A4', word: 'go' },
      { time: 256, note: 'F4', word: 'of' },
      { time: 257, note: 'G4', word: 'what' },
      { time: 258, note: 'E4', word: 'matters' },
      { time: 259, note: 'C4', word: 'most' },
      { time: 260, note: 'D4', word: 'to' },
      { time: 261, note: 'E4', word: 'you' },
      { time: 262, note: 'G4', word: 'in' },
      { time: 263, note: 'A4', word: 'this' },
      { time: 264, note: 'F4', word: 'life' },
      { time: 265, note: 'G4', word: 'and' },
      { time: 266, note: 'E4', word: 'always' },
      { time: 267, note: 'C4', word: 'remember' },
      { time: 268, note: 'D4', word: 'where' },
      { time: 269, note: 'E4', word: 'you' },
      { time: 270, note: 'G4', word: 'came' },
      { time: 271, note: 'A4', word: 'from' },
      { time: 272, note: 'F4', word: 'and' },
      { time: 273, note: 'G4', word: 'how' },
      { time: 274, note: 'E4', word: 'far' },
      { time: 275, note: 'C4', word: 'you' },
      { time: 276, note: 'D4', word: 'have' },
      { time: 277, note: 'E4', word: 'come' },
      { time: 278, note: 'G4', word: 'since' },
      { time: 279, note: 'A4', word: 'then' },
      { time: 280, note: 'F4', word: 'be' },
      { time: 281, note: 'G4', word: 'proud' },
      { time: 282, note: 'E4', word: 'of' },
      { time: 283, note: 'C4', word: 'your' },
      { time: 284, note: 'D4', word: 'progress' },
      { time: 285, note: 'E4', word: 'and' },
      { time: 286, note: 'G4', word: 'keep' },
      { time: 287, note: 'A4', word: 'striving' },
      { time: 288, note: 'F4', word: 'for' },
      { time: 289, note: 'G4', word: 'excellence' },
      { time: 290, note: 'E4', word: 'in' },
      { time: 291, note: 'C4', word: 'everything' },
      { time: 292, note: 'D4', word: 'you' },
      { time: 293, note: 'E4', word: 'do' },
      { time: 294, note: 'G4', word: 'the' },
      { time: 295, note: 'A4', word: 'best' },
      { time: 296, note: 'F4', word: 'you' },
      { time: 297, note: 'G4', word: 'can' },
      { time: 298, note: 'E4', word: 'with' },
      { time: 299, note: 'C4', word: 'the' },
      { time: 300, note: 'D4', word: 'resources' },
      { time: 301, note: 'E4', word: 'you' },
      { time: 302, note: 'G4', word: 'have' },
      { time: 303, note: 'A4', word: 'available' },
      { time: 304, note: 'F4', word: 'today' },
      { time: 305, note: 'G4', word: 'is' },
      { time: 306, note: 'E4', word: 'the' },
      { time: 307, note: 'C4', word: 'first' },
      { time: 308, note: 'D4', word: 'day' },
      { time: 309, note: 'E4', word: 'of' },
      { time: 310, note: 'G4', word: 'the' },
      { time: 311, note: 'A4', word: 'rest' },
      { time: 312, note: 'F4', word: 'of' },
      { time: 313, note: 'G4', word: 'your' },
      { time: 314, note: 'E4', word: 'amazing' },
      { time: 315, note: 'C4', word: 'life' },
      { time: 316, note: 'D4', word: 'journey' }
    ]
  },
  {
    id: '2',
    title: 'Música Exemplo 2',
    artist: 'Banda Popular',
    duration: 240,
    tempo: 95,
    key: 'G Major',
    createdAt: '2024-03-16T09:15:00Z',
    words: [
      { time: 0, note: 'G4', word: 'Another' },
      { time: 1, note: 'B4', word: 'song' },
      { time: 2, note: 'D5', word: 'in' },
      { time: 3, note: 'G5', word: 'the' },
      { time: 4, note: 'D5', word: 'night' }
    ]
  },
  {
    id: '3',
    title: 'Balada Romântica',
    artist: 'Cantor Romântico',
    duration: 200,
    tempo: 80,
    key: 'A Minor',
    createdAt: '2024-03-16T08:45:00Z',
    words: [
      { time: 0, note: 'A3', word: 'Love' },
      { time: 1, note: 'C4', word: 'is' },
      { time: 2, note: 'E4', word: 'all' },
      { time: 3, note: 'A4', word: 'around' }
    ]
  }
])

const selectedTranscription = ref(null)
const isDetailView = ref(false)

// Computed property para versos agrupados
const groupedVerses = computed(() => {
  if (!selectedTranscription.value) return []
  return groupWordsIntoVerses(selectedTranscription.value.words)
})

function goHome() {
  router.push('/')
}

function viewTranscription(id) {
  selectedTranscription.value = transcriptions.value.find(t => t.id === id)
  isDetailView.value = true
  
  // Reset scroll position
  nextTick(() => {
    if (chordTextview.value) {
      chordTextview.value.scrollTop = 0
      updateScrollInfo()
    }
  })
}

function deleteTranscription(id) {
  if (confirm('Tem certeza que deseja deletar esta transcrição?')) {
    transcriptions.value = transcriptions.value.filter(t => t.id !== id)
    if (selectedTranscription.value?.id === id) {
      selectedTranscription.value = null
      isDetailView.value = false
    }
  }
}

function backToList() {
  isDetailView.value = false
  selectedTranscription.value = null
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuration(seconds) {
  if (!seconds) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function exportTranscription(transcription) {
  const data = JSON.stringify(transcription, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `cifra-${transcription.id}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function getNoteDistribution(words) {
  const distribution = {}
  words.forEach(word => {
    if (word.note) {
      distribution[word.note] = (distribution[word.note] || 0) + 1
    }
  })
  return distribution
}

function getMostFrequentNote(words) {
  const distribution = getNoteDistribution(words)
  let maxCount = 0
  let mostFrequent = '-'
  
  for (const [note, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count
      mostFrequent = note
    }
  }
  
  return mostFrequent
}

// Funções para o textview
function updateScrollInfo() {
  if (chordTextview.value) {
    scrollPosition.value = chordTextview.value.scrollTop
    maxScroll.value = chordTextview.value.scrollHeight - chordTextview.value.clientHeight
  }
}

function handleScroll() {
  updateScrollInfo()
}

function groupWordsIntoVerses(words) {
  // Agrupa palavras em versos baseado em pontuação e padrões musicais
  // Otimiza para não repetir notas que cobrem várias palavras
  const verses = []
  let currentVerse = []
  let verseChords = []
  let versePositions = [] // Para guardar posições das cifras
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    
    // Adiciona palavra ao verso atual
    currentVerse.push(word.word)
    
    // Verifica se a nota é diferente da anterior ou se é a primeira palavra
    if (i === 0 || word.note !== words[i - 1].note) {
      verseChords.push(word.note)
      versePositions.push(currentVerse.join(' ').lastIndexOf(word.word))
    } else {
      // Nota repetida - não adiciona, apenas continua a palavra atual
      versePositions.push(-1) // -1 indica sem nota nova
    }
    
    // Verifica se deve começar novo verso
    const shouldEndVerse = 
      // Pontuação final
      word.word.match(/[.!?]+$/) ||
      // Palavras que indicam fim de verso
      word.word.match(/here|there|again|away|night|day|light|bright|time/i) ||
      // Limitar verso a 8-10 palavras para legibilidade
      currentVerse.length >= 8 ||
      // Próxima palavra começa com maiúscula (possível início de frase)
      (i < words.length - 1 && words[i + 1].word.match(/^[A-Z]/)) ||
      // Última palavra
      i === words.length - 1
    
    if (shouldEndVerse) {
      verses.push({
        words: currentVerse.join(' '),
        chords: verseChords,
        positions: versePositions
      })
      currentVerse = []
      verseChords = []
      versePositions = []
    }
  }
  
  // Adiciona último verso se não estiver vazio
  if (currentVerse.length > 0) {
    verses.push({
      words: currentVerse.join(' '),
      chords: verseChords,
      positions: versePositions
    })
  }
  
  return verses
}

function getAlignedChords(verse) {
  // Cria uma string com as cifras alinhadas e centralizadas às palavras correspondentes
  // Otimizado para não repetir notas que cobrem várias palavras
  const words = verse.words.split(' ')
  const chords = verse.chords
  const positions = verse.positions
  let chordLine = ''
  let chordIndex = 0
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    
    // Verifica se há uma nota para esta palavra
    if (chordIndex < chords.length && positions[i] !== -1) {
      // Calcula a posição exata da palavra na linha
      const wordStartPos = verse.words.indexOf(word)
      const wordLength = word.length
      const chordLength = chords[chordIndex].length
      
      // Calcula posição centralizada (meio da palavra - meio da cifra)
      const centeredPos = wordStartPos + Math.floor((wordLength - chordLength) / 2)
      
      // Adiciona espaços para posicionar a cifra centralizada sobre a palavra
      while (chordLine.length < centeredPos) {
        chordLine += ' '
      }
      
      // Adiciona a cifra
      chordLine += chords[chordIndex]
      chordIndex++
    }
  }
  
  return chordLine
}

function getAlignedChordLine(verse) {
  // Gera linha de cifras alinhadas com espaçamento correto
  const words = verse.words.split(' ')
  const chords = verse.chords
  const positions = verse.positions
  let chordLine = ''
  let chordIndex = 0
  let wordPosition = 0
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const wordLength = word.length
    
    // Adiciona espaços para posicionar a cifra sobre a palavra
    while (chordLine.length < wordPosition) {
      chordLine += ' '
    }
    
    // Verifica se há uma nota para esta palavra
    if (positions[i] !== -1 && chordIndex < chords.length) {
      chordLine += chords[chordIndex]
      chordIndex++
    }
    
    // Move para a próxima posição (depois da palavra + espaço)
    wordPosition += wordLength + 1
  }
  
  return chordLine
}

onMounted(() => {
  if (chordTextview.value) {
    chordTextview.value.addEventListener('scroll', handleScroll)
    updateScrollInfo()
  }
})
</script>

<template>
  <div class="scores-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="goHome" class="back-btn">← Home</button>
      <h1>📚 Minhas Cifras</h1>
    </header>

    <!-- Main Content -->
    <main class="scores-content">
      <!-- Lista de Transcrições -->
      <div v-if="!isDetailView" class="list-view">
        <div class="list-header">
          <h2>📋 Transcrições Salvas</h2>
          <div class="stats">
            <span class="stat">{{ transcriptions.length }} transcrições</span>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="transcriptions.length === 0" class="empty-state">
          <div class="empty-icon">🎼</div>
          <h3>Nenhuma cifra encontrada</h3>
          <p>Você ainda não tem transcrições salvas</p>
          <div class="empty-actions">
            <a href="/upload" class="action-btn primary">📁 Fazer Upload</a>
            <a href="/transcription" class="action-btn secondary">🔗 Usar URL</a>
          </div>
        </div>

        <!-- Transcriptions Grid -->
        <div v-else class="transcriptions-grid">
          <div 
            v-for="transcription in transcriptions"
            :key="transcription.id"
            class="transcription-card"
          >
            <div class="card-header">
              <h3>{{ transcription.title }}</h3>
              <div class="card-actions">
                <button 
                  @click="viewTranscription(transcription.id)"
                  class="action-btn view"
                  title="Ver detalhes"
                >
                  👁️
                </button>
                <button 
                  @click="deleteTranscription(transcription.id)"
                  class="action-btn delete"
                  title="Deletar"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div class="card-content">
              <div class="metadata">
                <div class="meta-item">
                  <span class="meta-icon">🎤</span>
                  <span class="meta-text">{{ transcription.artist }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">📅</span>
                  <span class="meta-text">{{ formatDate(transcription.createdAt) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">⏱️</span>
                  <span class="meta-text">{{ formatDuration(transcription.duration) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">🎵</span>
                  <span class="meta-text">{{ transcription.tempo }} BPM</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">🎹</span>
                  <span class="meta-text">{{ transcription.key }}</span>
                </div>
              </div>

              <div class="preview">
                <h4>📝 Preview</h4>
                <div class="notes-preview">
                  <span 
                    v-for="(word, index) in transcription.words.slice(0, 6)"
                    :key="index"
                    class="note-chip"
                  >
                    {{ word.note }}
                  </span>
                  <span v-if="transcription.words.length > 6" class="more-notes">
                    +{{ transcription.words.length - 6 }}
                  </span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <button 
                @click="viewTranscription(transcription.id)"
                class="view-full-btn"
              >
                Ver Cifra Completa
              </button>
            </div>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div class="bulk-actions" v-if="transcriptions.length > 0">
          <button class="bulk-btn secondary">
            📥 Exportar Todas
          </button>
        </div>
      </div>

      <!-- Detalhe da Transcrição -->
      <div v-else-if="selectedTranscription" class="detail-view">
        <div class="detail-header">
          <button @click="backToList" class="back-btn">← Voltar</button>
          <div class="detail-title">
            <h2>{{ selectedTranscription.title }}</h2>
            <p>{{ selectedTranscription.artist }}</p>
          </div>
          <div class="detail-actions">
            <button 
              @click="exportTranscription(selectedTranscription)"
              class="export-btn"
            >
              📥 Exportar
            </button>
          </div>
        </div>

        <!-- Informações da Música -->
        <section class="song-info">
          <div class="info-card">
            <h3>📋 Informações da Música</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Duração:</span>
                <span class="info-value">{{ formatDuration(selectedTranscription.duration) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Andamento:</span>
                <span class="info-value">{{ selectedTranscription.tempo }} BPM</span>
              </div>
              <div class="info-item">
                <span class="info-label">Tom:</span>
                <span class="info-value">{{ selectedTranscription.key }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Criado em:</span>
                <span class="info-value">{{ formatDate(selectedTranscription.createdAt) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Estatísticas -->
        <section class="stats-section">
          <div class="stats-card">
            <h3>📊 Estatísticas</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-number">{{ selectedTranscription.words.length }}</span>
                <span class="stat-label">Notas Detectadas</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ getMostFrequentNote(selectedTranscription.words) }}</span>
                <span class="stat-label">Nota Mais Comum</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ Object.keys(getNoteDistribution(selectedTranscription.words)).length }}</span>
                <span class="stat-label">Notas Diferentes</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Cifra Completa -->
        <section class="chord-section">
          <div class="chord-card">
            <h3>🎼 Cifra Completa</h3>
            <div class="chord-content">
              <div class="chord-textview">
                <div class="textview-header">
                  <div class="header-info">
                    <span class="info-badge">📝 {{ selectedTranscription.words.length }} palavras</span>
                    <span class="info-badge">⏱️ {{ formatDuration(selectedTranscription.duration) }}</span>
                    <span class="info-badge">🎵 {{ selectedTranscription.tempo }} BPM</span>
                  </div>
                  <div class="header-actions">
                    <button @click="copyChordText" class="copy-btn">📋 Copiar</button>
                    <button @click="printChord" class="print-btn">🖨️ Imprimir</button>
                  </div>
                </div>
                <div class="textview-content" ref="chordTextview">
                  <div class="chord-lyrics">
                    <div 
                      v-for="(verse, index) in groupedVerses"
                      :key="index"
                      class="verse-item"
                    >
                      <div class="chord-row">
                        <template v-for="(word, wordIndex) in verse.words.split(' ')" :key="wordIndex">
                          <span 
                            v-if="verse.positions[wordIndex] !== -1"
                            class="chord-text"
                          >
                            {{ verse.chords[verse.positions.filter((p, i) => i <= wordIndex && p !== -1).length - 1] }}
                          </span>
                          <span class="spacer">{{ ' '.repeat(word.length) }}</span>
                        </template>
                      </div>
                      <div class="lyric-row">
                        {{ verse.words }}
                      </div>
                    </div>
                  </div>
                </div>
                <div class="textview-footer">
                  <div class="scroll-info">
                    <span class="scroll-indicator">📜 Role para ver mais</span>
                    <span class="position-indicator">
                      {{ Math.round(scrollPosition / maxScroll * 100) }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Distribuição de Notas -->
        <section class="distribution-section">
          <div class="distribution-card">
            <h3>📈 Distribuição de Notas</h3>
            <div class="distribution-chart">
              <div 
                v-for="(count, note) in getNoteDistribution(selectedTranscription.words)"
                :key="note"
                class="distribution-item"
              >
                <span class="note-name">{{ note }}</span>
                <div class="distribution-bar">
                  <div 
                    class="distribution-fill" 
                    :style="{ 
                      width: (count / Math.max(...Object.values(getNoteDistribution(selectedTranscription.words))) * 100) + '%' 
                    }"
                  ></div>
                </div>
                <span class="note-count">{{ count }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.scores-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  color: white;
}

.back-btn {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.page-header h1 {
  font-size: 2rem;
  margin: 0;
}

.scores-content {
  max-width: 1200px;
  margin: 0 auto;
}

/* Lista View */
.list-view {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.list-header h2 {
  margin: 0;
  color: #333;
}

.stats .stat {
  background: #f5f5f5;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin-bottom: 1rem;
  color: #333;
}

.empty-state p {
  color: #666;
  margin-bottom: 2rem;
}

.empty-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.action-btn.primary {
  background: #2196f3;
  color: white;
}

.action-btn.primary:hover {
  background: #1976d2;
}

.action-btn.secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #e0e0e0;
}

.action-btn.secondary:hover {
  background: #e0e0e0;
}

.transcriptions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.transcription-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.transcription-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.card-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
  line-height: 1.4;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.card-actions .action-btn {
  padding: 0.5rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s ease;
}

.card-actions .action-btn.view:hover {
  background: #e3f2fd;
}

.card-actions .action-btn.delete:hover {
  background: #ffebee;
}

.card-content {
  padding: 1rem 1.5rem;
}

.metadata {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.meta-icon {
  font-size: 1rem;
}

.meta-text {
  color: #666;
}

.preview h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: #333;
}

.notes-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.note-chip {
  background: #f5f5f5;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-family: monospace;
  color: #333;
}

.more-notes {
  background: #e0e0e0;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  color: #666;
}

.card-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.view-full-btn {
  width: 100%;
  padding: 0.75rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-full-btn:hover {
  background: #1976d2;
}

.bulk-actions {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.bulk-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.bulk-btn.secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #e0e0e0;
}

.bulk-btn.secondary:hover {
  background: #e0e0e0;
}

/* Detail View */
.detail-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.detail-header {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.detail-title h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.8rem;
}

.detail-title p {
  margin: 0;
  color: #666;
  font-size: 1.1rem;
}

.export-btn {
  padding: 0.75rem 1.5rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.export-btn:hover {
  background: #45a049;
}

.song-info,
.stats-section,
.chord-section,
.distribution-section {
  display: flex;
  justify-content: center;
}

.info-card,
.stats-card,
.chord-card,
.distribution-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  width: 100%;
  max-width: 800px;
}

.info-card h3,
.stats-card h3,
.chord-card h3,
.distribution-card h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-label {
  font-weight: 600;
  color: #666;
}

.info-value {
  font-weight: 600;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8f9fa, #e3f2fd);
  border-radius: 8px;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #2196f3;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

.chord-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.chord-item {
  display: grid;
  grid-template-columns: 60px 80px 1fr;
  gap: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  align-items: center;
}

.chord-time {
  font-family: monospace;
  font-weight: 600;
  color: #666;
}

.chord-note {
  font-family: monospace;
  font-weight: 700;
  color: #2196f3;
  background: #e3f2fd;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  text-align: center;
}

.chord-word {
  color: #333;
}

/* Novo TextView com Scrolagem */
.chord-textview {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 500px;
}

.textview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.info-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.copy-btn, .print-btn {
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.copy-btn:hover {
  background: #e3f2fd;
  border-color: #2196f3;
}

.print-btn:hover {
  background: #fff3e0;
  border-color: #ff9800;
}

.textview-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.95rem;
  line-height: 1.6;
  background: white;
}

.textview-content::-webkit-scrollbar {
  width: 8px;
}

.textview-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.textview-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.textview-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.chord-lyrics {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-family: 'Courier New', monospace;
}

.verse-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.5rem;
  background: #fafafa;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.verse-item:hover {
  background-color: #f0f7ff;
}

.chord-row {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  font-weight: 700;
  color: #2196f3;
  line-height: 1.2;
  white-space: pre;
}

.chord-text {
  color: #2196f3;
  font-weight: 700;
}

.spacer {
  color: transparent;
}

.lyric-row {
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  color: #333;
  line-height: 1.4;
  white-space: pre;
}

.textview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.scroll-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.scroll-indicator {
  color: #666;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.scroll-indicator::before {
  content: '↕';
  font-size: 1rem;
}

.position-indicator {
  background: #e0e0e0;
  color: #666;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: monospace;
}

.distribution-chart {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.distribution-item {
  display: grid;
  grid-template-columns: 60px 1fr 40px;
  align-items: center;
  gap: 1rem;
}

.note-name {
  font-family: monospace;
  font-weight: 600;
  color: #333;
}

.distribution-bar {
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.distribution-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #4caf50);
  transition: width 0.3s ease;
}

.note-count {
  font-weight: 600;
  color: #333;
  text-align: right;
}

@media (max-width: 768px) {
  .scores-page {
    padding: 1rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .transcriptions-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .chord-item {
    grid-template-columns: 50px 70px 1fr;
    gap: 0.5rem;
  }
  
  .distribution-item {
    grid-template-columns: 50px 1fr 30px;
    gap: 0.5rem;
  }
}
</style>
