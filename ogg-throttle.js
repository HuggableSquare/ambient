import { Transform } from 'stream';

export default class OGGThrottle extends Transform {
  sampleRate;
  _timeToWait = 0;
  _previousGranulePos = 0;

  constructor(opts) {
    super();
    this.sampleRate = opts.sampleRate;
  }

  _transform(packet, encoding, callback) {
    // chrome is bugged with chained ogg, so strip metadata packets
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1161429#c104
    if (packet.granulepos === 0) {
      return callback();
    } else if (packet.granulepos > 1) {
      this._timeToWait = ((packet.granulepos - this._previousGranulePos) / this.sampleRate) * 1000;
      this._previousGranulePos = packet.granulepos;
    } else {
      this._timeToWait = 0;
    }
    setTimeout(() => {
      this.push(packet._packet);
      callback();
    }, this._timeToWait);
  }
}
