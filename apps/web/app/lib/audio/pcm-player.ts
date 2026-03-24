export class PCMPlayer {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }

    return this.audioContext;
  }

  async playPcm16(arrayBuffer: ArrayBuffer): Promise<void> {
    const context = this.getContext();
    if (context.state === 'suspended') {
      await context.resume();
    }

    this.stop();

    const pcmData = new Int16Array(arrayBuffer);
    const floatData = new Float32Array(pcmData.length);

    for (const [index, sample] of pcmData.entries()) {
      floatData[index] = sample / 32768;
    }

    const audioBuffer = context.createBuffer(1, floatData.length, 24000);
    audioBuffer.copyToChannel(floatData, 0);

    const sourceNode = context.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(context.destination);
    this.sourceNode = sourceNode;

    await new Promise<void>((resolve) => {
      sourceNode.onended = () => {
        this.sourceNode = null;
        resolve();
      };
      sourceNode.start(0);
    });
  }

  stop() {
    if (!this.sourceNode) return;

    try {
      this.sourceNode.stop();
    } catch {
      // Ignore stop errors when source already ended.
    }

    this.sourceNode.onended = null;
    this.sourceNode.disconnect();
    this.sourceNode = null;
  }

  async dispose() {
    this.stop();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}
