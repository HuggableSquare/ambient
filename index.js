import express from 'express';
import SSEChannel from './sse.js';
import Radio from './radio.js';
import { publishSong } from './utils.js';

const app = express();
app.use(express.static('public'));
const channel = new SSEChannel();
const radio = new Radio();

// when song changes publish it to sse
radio.on('song', (current) => publishSong(current, channel));

app.get('/np', (req, res) => {
  channel.subscribe(req, res);
  // send off current song too
  publishSong(radio.current, channel);
});

app.get('/stream', (req, res) => radio.listen(req, res));

app.get('/art', (req, res) =>  {
  const picture = radio.current.metadata.common.picture[0];
  res.type(picture.format);
  res.send(picture.data);
});

app.listen(6873);
