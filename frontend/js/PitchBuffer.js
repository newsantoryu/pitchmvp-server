export class PitchBuffer {

    constructor(size = 5) {
        this.size = size
        this.buffer = []
    }

    add(freq) {

        if (!freq) return null

        this.buffer.push(freq)

        if (this.buffer.length > this.size) {
            this.buffer.shift()
        }

        let sum = 0

        for (let f of this.buffer) {
            sum += f
        }

        return sum / this.buffer.length
    }

}