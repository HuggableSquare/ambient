export function publishSong(song, channel) {
  channel.publish(`${song.metadata.common.artist} - ${song.metadata.common.title}`);
}
