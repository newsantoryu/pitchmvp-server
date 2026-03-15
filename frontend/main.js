(() => {
    let audioContext = null;
    let workletNode = null;
    let sourceNode = null;
    let isRunning = false;
    let lastPitch = null;
    let smoothPitch = null;

    const SMOOTH_FACTOR = 0.3; // entre 0 e 1, maior = mais suave

    async function startMic() {
        if (isRunning) return;
        isRunning = true;

        const startBtn = document.getElementById("start");
        const stopBtn = document.getElementById("stop");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new AudioContext({ sampleRate: 16000 });

            if ('audioWorklet' in audioContext) {
                await audioContext.audioWorklet.addModule("processor.js");

                sourceNode = audioContext.createMediaStreamSource(stream);
                workletNode = new AudioWorkletNode(audioContext, "pitch-processor");
                workletNode.port.onmessage = e => sendFrame(e.data);

                sourceNode.connect(workletNode);
            } else {
                console.warn("AudioWorklet não suportado neste navegador.");
            }

            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;

        } catch (err) {
            console.error("Erro ao iniciar microfone:", err);
            isRunning = false;
        }
    }

    function stopMic() {
        if (!isRunning) return;
        isRunning = false;

        if (workletNode) workletNode.disconnect();
        if (sourceNode) sourceNode.disconnect();
        if (audioContext) audioContext.close();

        workletNode = null;
        sourceNode = null;
        audioContext = null;

        const startBtn = document.getElementById("start");
        const stopBtn = document.getElementById("stop");
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
    }

    async function sendFrame(frame) {
        if (!frame || frame.length === 0) return;

        let energy = Math.sqrt(frame.reduce((a, b) => a + b * b, 0) / frame.length);
        if (energy < 0.01) {
            // manter última nota se silencioso
            updateUI(lastPitch);
            return;
        }

        try {
            const res = await fetch("/pitch-realtime/transcribe-frame-json", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ samples: Array.from(frame), sample_rate: 16000 })
            });

            const data = await res.json();
            if (data.note) {
                lastPitch = data;
                // suaviza a frequência
                if (smoothPitch === null) smoothPitch = data.freq;
                smoothPitch = SMOOTH_FACTOR * data.freq + (1 - SMOOTH_FACTOR) * smoothPitch;
                data.freq = smoothPitch;
            }
            updateUI(lastPitch);
        } catch (err) {
            console.error("Erro ao enviar frame:", err);
        }
    }

    function updateUI(data) {
        if (!data) return;
        const noteEl = document.getElementById("note");
        const freqEl = document.getElementById("freq");
        const centsEl = document.getElementById("cents");
        if (noteEl) noteEl.innerText = data.note || "-";
        if (freqEl) freqEl.innerText = data.freq?.toFixed(2) || "0.00";
        if (centsEl) centsEl.innerText = data.cents || "0";
    }

    // Event listeners sem sobrescrever onclick global
    window.addEventListener("DOMContentLoaded", () => {
        const startBtn = document.getElementById("start");
        const stopBtn = document.getElementById("stop");
        if (startBtn) startBtn.addEventListener("click", startMic);
        if (stopBtn) stopBtn.addEventListener("click", stopMic);
    });

})();