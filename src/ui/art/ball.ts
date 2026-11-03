/** A bola do título, em 9×9 píxeis. Só usa fillStyle e fillRect, para o ícone da app se gerar em Node com o mesmo desenho. */
export interface PixelPen {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
}

export const BALL_SIZE = 9;

export function drawBall(g: PixelPen): void {
  g.fillStyle = '#1b2230';
  g.fillRect(2, 0, 5, 9);
  g.fillRect(0, 2, 9, 5);
  g.fillRect(1, 1, 7, 7);
  g.fillStyle = '#e8622a';
  g.fillRect(2, 1, 5, 7);
  g.fillRect(1, 2, 7, 5);
  g.fillStyle = '#a93f14';
  g.fillRect(4, 1, 1, 7);
  g.fillRect(1, 4, 7, 1);
  g.fillStyle = '#ffb27a';
  g.fillRect(2, 2, 1, 1);
}
