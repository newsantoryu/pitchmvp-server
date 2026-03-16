/**
 * Controlador de interface do usuário
 */

import { state } from '../app/State.js'
import { escapeHtml } from '../utils/NoteUtils.js'

export class UIController {

  constructor() {

    this.initializeEventListeners()

  }

  initializeEventListeners() {

    this.setupAutoServerUrl()
    this.initializeDragDrop()

  }

  setupAutoServerUrl() {

    const base = window.location.origin
    const sUrl = document.getElementById('sUrl')

    if (sUrl && !sUrl.value &&
      (base.startsWith('http://') || base.startsWith('https://'))) {

      sUrl.placeholder = base
      sUrl.value = base

    }

  }

  initializeDragDrop() {

    const dropZone = document.getElementById('dz')

    if (!dropZone) return

    dropZone.addEventListener('dragover', (e) => {

      e.preventDefault()
      dropZone.classList.add('drag')

    })

    dropZone.addEventListener('dragleave', () => {

      dropZone.classList.remove('drag')

    })

    dropZone.addEventListener('drop', (e) => {

      e.preventDefault()
      dropZone.classList.remove('drag')

      const file = e.dataTransfer.files[0]

      if (file) {

        state.setSelectedFile(file)
        this.updateFileName(file.name)

      }

    })

  }

  updateFileName(fileName) {

    const el = document.getElementById('dfName')

    if (el) el.textContent = fileName

  }

  showProgress(message, percentage) {

    const wrap = document.getElementById('pWrap')
    const msg = document.getElementById('pMsg')
    const fill = document.getElementById('pFill')
    const err = document.getElementById('errBox')

    if (wrap) wrap.classList.remove('hidden')
    if (msg) msg.textContent = message
    if (fill) fill.style.width = `${percentage}%`
    if (err) err.style.display = 'none'

  }

  hideProgress() {

    const wrap = document.getElementById('pWrap')

    if (wrap) wrap.classList.add('hidden')

  }

  showError(message) {

    const err = document.getElementById('errBox')
    const wrap = document.getElementById('pWrap')

    if (err) {

      err.textContent = message
      err.style.display = 'block'

    }

    if (wrap) wrap.classList.add('hidden')

    setTimeout(() => {

      if (err) err.style.display = 'none'

    }, 10000)

  }

  updateRecordingButton(isRecording) {

    const btn = document.getElementById('recBtn')
    const dot = document.getElementById('rDot')
    const status = document.getElementById('rStatus')

    if (!btn) return

    if (isRecording) {

      btn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>Parar'

      btn.classList.add('btn-d')
      btn.classList.remove('btn-p')

      if (dot) dot.className = 'rdot on'
      if (status) status.textContent = 'Gravando...'

    }
    else {

      btn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>Gravar'

      btn.classList.remove('btn-d')
      btn.classList.add('btn-p')

      if (dot) dot.className = 'rdot'
      if (status) status.textContent = `Pronto (${state.recSecs}s)`

    }

  }

  updateRecordingTimer() {

    const timer = document.getElementById('rTime')

    if (timer) timer.textContent = state.recSecs + 's'

  }

  updateElement(id, value) {

    const el = document.getElementById(id)

    if (el) el.textContent = value

  }

}

export const uiController = new UIController()