/**
 * Controller principal da aplicação
 */

import { state } from './State.js';
import { apiService } from '../services/ApiService.js';
import { audioService } from '../services/AudioService.js';
import { pitchService } from '../services/PitchService.js';
import { realtimePitchService } from '../services/RealtimePitchService.js';
import { uiController } from '../ui/UIController.js';
import { realtimePitchUI } from '../ui/RealtimePitchUI.js';
import { midiToNote } from '../utils/NoteUtils.js';

export class AppController {

  constructor() {

    this.recTimer = null
    this.pollTimer = null

    this.initializeEventHandlers()
    this.initializeRealtimePitch()

  }

  initializeEventHandlers() {

    window.addEventListener('audioDataAvailable', this.handleAudioData.bind(this))
    window.addEventListener('audioRecordingStopped', this.handleAudioStop.bind(this))

  }

  initializeRealtimePitch() {

    realtimePitchService.setCallbacks({
      onPitchDetected: this.handlePitchDetected.bind(this),
      onRangeUpdate: this.handleRangeUpdate.bind(this)
    })

    realtimePitchUI.setCallbacks({
      onStart: this.startRealtimePitch.bind(this),
      onStop: this.stopRealtimePitch.bind(this)
    })

  }

  async toggleRecording() {

    if (audioService.isRecording()) {
      this.stopRecording()
    }
    else {
      await this.startRecording()
    }

  }

  async startRecording() {

    try {

      state.resetRecording()

      await audioService.startRecording()

      uiController.updateRecordingButton(true)

      state.recSecs = 0

      this.recTimer = setInterval(() => {

        state.recSecs++
        uiController.updateRecordingTimer()

      }, 1000)

    }
    catch (error) {

      uiController.showError(error.message)

    }

  }

  stopRecording() {

    audioService.stopRecording()

    if (this.recTimer) {
      clearInterval(this.recTimer)
      this.recTimer = null
    }

    uiController.updateRecordingButton(false)

  }

  handleAudioData(event) {

    state.recChunks.push(event.detail.data)

  }

  async handleAudioStop() {

    if (state.recChunks.length === 0) return

    const blob = new Blob(state.recChunks, { type: 'audio/wav' })
    const file = new File([blob], 'gravacao.wav', { type: 'audio/wav' })

    state.setSelectedFile(file)
    uiController.updateFileName(file.name)

    state.resetRecording()

  }

  onFileSelect(event) {

    const file = event.target.files[0]

    if (file) {

      state.setSelectedFile(file)
      uiController.updateFileName(file.name)

    }

  }

  async analyze() {

    try {

      uiController.showProgress('Enviando arquivo...', 5)

      let response

      const currentTab = state.getTab()

      if (currentTab === 'url') {

        const audioUrl = document.getElementById('supaUrl')?.value?.trim()
        const anonKey = document.getElementById('anonKey')?.value?.trim()

        response = await apiService.transcribeUrl(
          audioUrl,
          anonKey,
          state.getVoiceGender(),
          state.getVoiceLanguage()
        )

      }
      else {

        const selectedFile = state.getSelectedFile()

        if (!selectedFile) {
          uiController.showError('Selecione ou grave um arquivo.')
          return
        }

        uiController.showProgress(`Enviando ${Math.round(selectedFile.size / 1024)} KB...`, 8)

        response = await apiService.transcribeFile(
          selectedFile,
          state.getVoiceGender(),
          state.getVoiceLanguage()
        )

      }

      uiController.showProgress('Processando no servidor...', 15)

      await this.startJobPolling(response.job_id)

    }
    catch (error) {

      uiController.showError(error.message)
      this.resetAnalysisState()

    }

  }

  async startJobPolling(jobId) {

    let elapsed = 0
    let running = false

    this.pollTimer = setInterval(async () => {

      if (running) return
      running = true

      elapsed += 5

      try {

        const job = await apiService.checkJobStatus(jobId)

        if (job.status === 'transcribing' || job.status === 'queued') {

          const percentage = Math.min(15 + Math.round((elapsed / 600) * 70), 82)

          const timeStr = `${Math.floor(elapsed / 60)}m${elapsed % 60}s`

          uiController.showProgress(`Transcrevendo... (${timeStr})`, percentage)

        }

        else if (job.status === 'pitch') {

          uiController.showProgress('Detectando notas...', 85)

        }

        else if (job.status === 'done') {

          this.completeAnalysis(job.result)

        }

        else if (job.status === 'error') {

          uiController.showError(job.message || 'Erro no servidor.')
          this.resetAnalysisState()

        }

      }
      catch (error) {

        uiController.showError('Conexão perdida: ' + error.message)
        this.resetAnalysisState()

      }

      running = false

    }, 5000)

  }

  async completeAnalysis(result) {

    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }

    uiController.showProgress('Concluído!', 100)

    setTimeout(() => uiController.hideProgress(), 1200)

    state.setResultData(result)

    await uiController.renderResults(result)

    this.resetAnalysisState()

  }

  resetAnalysisState() {

    const analyzeBtn = document.getElementById('aBtn')

    if (analyzeBtn) analyzeBtn.disabled = false

    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }

  }

  async startSinging() {

    const resultData = state.getResultData()

    if (!resultData || !resultData.words) {
      uiController.showError('Analise um áudio primeiro.')
      return
    }

    const singingScore = resultData.words.map(w => ({
      word: w.text,
      note: w.note,
      start: w.start
    }))

    state.setSingingScore(singingScore)

    uiController.renderSingingScore(singingScore)

    state.setCurrentIndex(0)

    await pitchService.initPitchEngine()

    const audioData = await audioService.initAudioContext()

    audioData.processor.onaudioprocess = (e) => {

      const input = e.inputBuffer.getChannelData(0)

      const freq = pitchService.detectPitch(
        input,
        audioService.audioContext.sampleRate
      )

      if (freq > 70 && freq < 1000) {

        const midi = pitchService.freqToMidi(freq)
        const note = midiToNote(midi)

        state.addRealtimeNote(midi)

        this.comparePitch(note)

        this.updateRealtimeRange()

      }

    }

  }

  comparePitch(sungNote) {

    const singingScore = state.getSingingScore()

    if (!singingScore.length) return

    const currentIndex = state.getCurrentIndex()

    const target = singingScore[currentIndex]

    if (!target || !target.note) return

    const result = pitchService.compareNotes(sungNote, target.note)

    uiController.paintFeedback(currentIndex, result)

    if (result === 'correct') {
      state.setCurrentIndex(currentIndex + 1)
    }

  }

  updateRealtimeRange() {

    const realtimeNotes = state.getRealtimeNotes()

    if (realtimeNotes.length < 8) return

    const low = Math.min(...realtimeNotes)
    const high = Math.max(...realtimeNotes)

    const element = document.getElementById("voiceRange")

    if (element) {
      element.innerText = `Vocal range atual: ${midiToNote(low)} – ${midiToNote(high)}`
    }

  }

}

export const appController = new AppController()