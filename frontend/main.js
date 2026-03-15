async function startMic() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext({ sampleRate: 16000 });

    await audioContext.audioWorklet.addModule("processor.js");

    const source = audioContext.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(audioContext, "pitch-processor");

    worklet.port.onmessage = e => sendFrame(e.data);
    source.connect(worklet);
}

document.getElementById("start").onclick = startMic;

async function sendFrame(frame) {
    let energy = Math.sqrt(frame.reduce((a, b) => a + b * b, 0) / frame.length);
    if (energy < 0.01) return;

    const payload = { samples: Array.from(frame) };
    const res = await fetch("/pitch-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    updateUI(data);
}

function updateUI(data) {
    if (!data.note) return;
    document.getElementById("note").innerText = data.note;
    document.getElementById("freq").innerText = data.freq.toFixed(2);
    document.getElementById("cents").innerText = data.cents;
}