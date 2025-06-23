import fs from 'fs';
import path from 'path';

function getPngSize(p: string) {
  const buf = fs.readFileSync(p);
  if (buf.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('Invalid PNG');
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const root = process.cwd();
const idleDims = getPngSize(
  path.join(root, 'public', 'sprites', 'avatar-idle.png'),
);
const walkDims = getPngSize(
  path.join(root, 'public', 'sprites', 'avatar-walk.png'),
);

// Assume both sheets share the same frame height
export const FRAME_W = Math.min(idleDims.width / 2, walkDims.width / 6);
export const FRAME_H = idleDims.height;
export const IDLE_FRAMES = 2;
export const WALK_FRAMES = 6;
