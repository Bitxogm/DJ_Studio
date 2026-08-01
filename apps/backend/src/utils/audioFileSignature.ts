import { open } from 'fs/promises';

// Verificación por "magic number" (primeros bytes del fichero) además del
// mimetype declarado por el cliente: evita que alguien suba un .exe renombrado
// como "beat.mp3" con Content-Type falseado. No usamos una librería como
// `file-type` (ESM-only en sus versiones recientes, y con detección para
// decenas de formatos que no necesitamos) porque para 3 formatos concretos
// comprobar los bytes de cabecera a mano es trivial y evita una dependencia.
const SIGNATURE_CHECKS: Record<string, (header: Buffer) => boolean> = {
  'audio/wav': (header) =>
    header.subarray(0, 4).toString('ascii') === 'RIFF' &&
    header.subarray(8, 12).toString('ascii') === 'WAVE',
  'audio/ogg': (header) => header.subarray(0, 4).toString('ascii') === 'OggS',
  'audio/mpeg': isMpegHeader,
  // audio/mp3 es un alias no estándar de audio/mpeg que algunos navegadores/SO envían.
  'audio/mp3': isMpegHeader,
};

function isMpegHeader(header: Buffer): boolean {
  const hasId3Tag = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33; // "ID3"
  // Frame sync MPEG: 11 bits a 1 (0xFF seguido de los 3 bits altos también a 1).
  const hasFrameSync = header[0] === 0xff && (header[1] & 0xe0) === 0xe0;
  return hasId3Tag || hasFrameSync;
}

export const HEADER_BYTES_NEEDED = 12;

export async function matchesAudioSignature(filePath: string, mimetype: string): Promise<boolean> {
  const check = SIGNATURE_CHECKS[mimetype];
  if (!check) return false;

  const handle = await open(filePath, 'r');
  try {
    const header = Buffer.alloc(HEADER_BYTES_NEEDED);
    await handle.read(header, 0, HEADER_BYTES_NEEDED, 0);
    return check(header);
  } finally {
    await handle.close();
  }
}
