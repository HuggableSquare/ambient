import EventEmitter from 'events';
import readdirp from 'readdirp';
import { parseFile } from 'music-metadata';
import { Decoder } from '@suldashi/ogg';
import { FileDecoder, StreamEncoder } from 'flac-bindings';
import OGGThrottle from './ogg-throttle.js';

const MAX_BUFFER_SIZE = 1100000;

export default class Radio extends EventEmitter {
  current;
  clients = new Set();
  buffer = [];

  constructor() {
    super();
    this.playSong();
  }

  async playSong() {
    const path = 'music/test';
    const files = await readdirp.promise(path, { fileFilter: '*.flac' });
    const random = files[Math.floor(Math.random() * files.length)];
    random.path = `${path}/${random.path}`;
    const metadata = await parseFile(random.path);

    console.log(metadata.common.artist, metadata.common.title)
    console.log(metadata.format)

    this.current = { file: random, metadata };
    this.emit('song', this.current);

    const encoder = new StreamEncoder({
      bitsPerSample: metadata.format.bitsPerSample,
      channels: metadata.format.numberOfChannels,
      samplerate: metadata.format.sampleRate,
      isOggStream: true
    });

    const throttle = new OGGThrottle({ sampleRate: metadata.format.sampleRate });
    throttle.on('data', (chunk) => {
      this.buffer.push(chunk);
      // keep buffer size right around 1.1MB, that seems to be
      // when chrome starts playing audio
      while (Buffer.concat(this.buffer).length > MAX_BUFFER_SIZE) {
        this.buffer.shift();
      }

      this.clients.forEach((client) => client.write(chunk));
    });
    throttle.on('end', () => this.playSong());

    const ogg = new Decoder();
    ogg.on('stream', (stream) => stream.pipe(throttle));

    const decoder = new FileDecoder({ file: random.path });
    decoder.pipe(encoder).pipe(ogg);
  }

  async listen(req, res) {
    res.type('application/ogg');

    // when the user first connects, we should send a large buffer of data
    // so the client/browser doesn't need to wait to build it's buffer internally
    res.write(Buffer.concat(this.buffer));

    this.clients.add(res);
    res.on('close', () => this.close(res));
  }

  close(res) {
    this.clients.delete(res);
    res.end();
  }
}
