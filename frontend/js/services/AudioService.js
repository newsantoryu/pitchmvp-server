/**
 * Serviço de gerenciamento de áudio (gravação e análise)
 */
export class AudioService {
  constructor() {
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyserNode = null;
    this.animationFrame = null;
  }

  /**
   * Inicia gravação do microfone
   */
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.mediaRecorder = new MediaRecorder(stream);
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      source.connect(this.analyserNode);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Event será tratado pelo controller
          window.dispatchEvent(new CustomEvent('audioDataAvailable', {
            detail: { data: event.data }
          }));
        }
      };

      this.mediaRecorder.onstop = () => {
        // Event será tratado pelo controller
        window.dispatchEvent(new CustomEvent('audioRecordingStopped'));
      };

      this.mediaRecorder.start();
      this.startWaveVisualization();

      return true;
    } catch (error) {
      throw new Error('Microfone: ' + error.message);
    }
  }

  /**
   * Para gravação do microfone
   */
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();

      // Para todas as tracks do stream
      if (this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyserNode = null;
  }

  /**
   * Inicia visualização de onda
   */
  startWaveVisualization() {
    const canvas = document.getElementById('wCanvas');
    if (!canvas || !this.analyserNode) return;

    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      this.animationFrame = requestAnimationFrame(draw);

      this.analyserNode.getByteTimeDomainData(dataArray);

      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#534AB7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }

  /**
   * Inicia contexto de áudio para análise de pitch
   */
  async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micSource = this.audioContext.createMediaStreamSource(stream);
    // Usa buffer muito menor para evitar erros com Essentia.js
    this.processor = this.audioContext.createScriptProcessor(512, 1, 1);

    this.micSource.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    return { stream, processor: this.processor };
  }

  /**
   * Para contexto de áudio
   */
  stopAudioContext() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Obtém estado da gravação
   */
  getRecordingState() {
    if (!this.mediaRecorder) return 'inactive';
    return this.mediaRecorder.state;
  }

  /**
   * Verifica se está gravando
   */
  isRecording() {
    return this.mediaRecorder && this.mediaRecorder.state === 'recording';
  }
}

export const audioService = new AudioService();
