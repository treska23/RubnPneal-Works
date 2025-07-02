import levels from './pacmanLevels.json';

export type LevelMap = number[][];
export const levelMaps: LevelMap[] = levels as LevelMap[];

const wallSprite = [
  '11111111',
  '10000001',
  '10011001',
  '10011001',
  '10011001',
  '10011001',
  '10000001',
  '11111111'
];

const dotSprite = [
  '0000',
  '0110',
  '0110',
  '0000'
];

const bigDotSprite = [
  '000000',
  '001100',
  '011110',
  '011110',
  '001100',
  '000000'
];

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: string[],
  x: number,
  y: number,
  pixel: number,
  color: string
) {
  ctx.fillStyle = color;
  for (let row = 0; row < sprite.length; row++) {
    const line = sprite[row];
    for (let col = 0; col < line.length; col++) {
      if (line[col] === '1') {
        ctx.fillRect(x + col * pixel, y + row * pixel, pixel, pixel);
      }
    }
  }
}

export function drawMaze(ctx: CanvasRenderingContext2D, levelMap: LevelMap) {
  const rows = levelMap.length;
  const cols = levelMap[0].length;
  const tile = Math.floor(Math.min(ctx.canvas.width / cols, ctx.canvas.height / rows));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const type = levelMap[r][c];
      const x = c * tile;
      const y = r * tile;
      if (type === 1) {
        drawSprite(ctx, wallSprite, x, y, tile / wallSprite[0].length, '#1e3a8a');
      } else if (type === 2) {
        const offset = tile / 2 - (dotSprite[0].length * (tile / dotSprite[0].length)) / 2;
        drawSprite(
          ctx,
          dotSprite,
          x + offset,
          y + offset,
          tile / dotSprite[0].length,
          '#ffca28'
        );
      } else if (type === 3) {
        const offset = tile / 2 - (bigDotSprite[0].length * (tile / bigDotSprite[0].length)) / 2;
        drawSprite(
          ctx,
          bigDotSprite,
          x + offset,
          y + offset,
          tile / bigDotSprite[0].length,
          '#ffa726'
        );
      }
    }
  }
}
