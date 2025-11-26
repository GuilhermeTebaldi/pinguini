// src/components/HeadInSnow.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { G, Path, Ellipse } from 'react-native-svg';

type Props = {
  left: number;           // posição base X em px (GameScreen calcula)
  bottom: number;         // posição base Y em px
  scale?: number;         // tamanho
  rotateDeg?: number;     // rotação do desenho
  offsetX?: number;       // ajuste fino horizontal (opcional)
  footWigglePx?: number;  // amplitude do pé (px)
  footSpeedHz?: number;   // velocidade da animação (Hz)
};

export default function HeadInSnow({
  left,
  bottom,
  scale = 0.14,     // tamanho do pinguim
  rotateDeg = 0,  // gira o pinguim enterrado
  offsetX = 50,      // ajuste fino horizontal sem mexer no GameScreen
  footWigglePx = 10, // amplitude do “chute” (px)
  footSpeedHz = 2.6 // velocidade do “chute” (ciclos por segundo)
}: Props) {
  // ==== Failsafe contra NaN/undefined (evita tela branca) ====
  const safeLeft = Number.isFinite(left) ? left : 0;
  const safeBottom = Number.isFinite(bottom) ? bottom : 0;

  // ===== animação simples por RAF (loop infinito) =====
  const [t, setT] = useState(0); // segundos
  const raf = useRef<number | null>(null);
  const t0 = useRef<number | null>(null);

  useEffect(() => {
    const loop = (now: number) => {
      if (t0.current == null) t0.current = now;
      setT((now - t0.current) / 1000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      t0.current = null;
    };
  }, []);

  // fase e deslocamento do pé (senoide)
  const phase = 2 * Math.PI * footSpeedHz * t;
  const wiggle = Math.sin(phase) * footWigglePx; // px
  const wiggleRot = Math.sin(phase) * 6;         // graus, giro sutil

  return (
    <View
      style={{
        position: 'absolute',
        left: safeLeft + offsetX,   // puxar pra esquerda/direita sem mexer no GameScreen
        bottom: safeBottom,
        pointerEvents: 'none',
      }}
    >
      <Svg width={320} height={240} viewBox="-60 0 420 240" style={{ overflow: 'visible' }}>
        {/* IMPORTANTE: rotate aplica em torno de (160,320) — mantém seu visual atual */}
        <G transform={`translate(0,0) scale(${scale}) rotate(${rotateDeg},160,320)`}>
         
          <G transform={`translate(${wiggle.toFixed(2)},0) rotate(${wiggleRot.toFixed(2)},20,210)`}>
            {/* pé 1 (o que você disse “ficar mais para baixo”) */}
            


            {/* se quiser animar também o segundo pé, coloque aqui dentro e remova o pé estático de baixo */}
          </G>

          {/* restante do desenho */}
          <circle cx="488" cy="604" r="178" fill="#f7f7f7" stroke="#222" strokeWidth="0" data-z="0" />
<path d="M 321.5 238 L 324 235.5 L 419 235.5 L 424 240.5 L 429 240.5 L 431.5 243 L 431.5 293 L 429 295.5 L 414 295.5 L 409 300.5 L 399 300.5 L 394 305.5 L 389 305.5 L 384 310.5 L 379 310.5 L 374 315.5 L 371.5 313 L 371.5 293 L 359 280.5 L 319 280.5 L 316.5 278 L 316.5 273 L 311.5 268 L 311.5 248 L 321.5 238 Z" fill="#faaa2f" data-z="1" />
<path d="M 553.5 238 L 556 235.5 L 646 235.5 L 651 240.5 L 656 240.5 L 658.5 243 L 658.5 248 L 663.5 253 L 663.5 263 L 658.5 268 L 658.5 273 L 651 280.5 L 616 280.5 L 608.5 288 L 608.5 313 L 606 315.5 L 601 310.5 L 596 310.5 L 591 305.5 L 581 305.5 L 576 300.5 L 566 300.5 L 561 295.5 L 546 295.5 L 543.5 293 L 543.5 248 L 553.5 238 Z" fill="#faaa2f" data-z="2" />
<path d="M 192.5 600 L 195 597.5 L 200 597.5 L 202.5 600 L 195 607.5 L 192.5 605 L 192.5 600 Z" fill="#1b3661" data-z="3" />
<path d="M 472.5 285 L 475 282.5 L 480 282.5 L 485 287.5 L 535 287.5 L 540 292.5 L 560 292.5 L 565 297.5 L 575 297.5 L 580 302.5 L 590 302.5 L 595 307.5 L 600 307.5 L 605 312.5 L 615 312.5 L 625 322.5 L 630 322.5 L 647.5 340 L 647.5 345 L 662.5 360 L 662.5 365 L 672.5 375 L 672.5 380 L 677.5 385 L 677.5 390 L 682.5 395 L 682.5 400 L 687.5 405 L 687.5 415 L 692.5 420 L 692.5 430 L 697.5 435 L 697.5 445 L 702.5 450 L 702.5 465 L 707.5 470 L 707.5 495 L 712.5 500 L 712.5 525 L 717.5 530 L 717.5 535 L 712.5 540 L 712.5 555 L 720 562.5 L 725 562.5 L 730 567.5 L 735 567.5 L 740 572.5 L 745 572.5 L 760 587.5 L 765 587.5 L 792.5 615 L 792.5 620 L 802.5 630 L 802.5 640 L 807.5 645 L 807.5 665 L 800 672.5 L 795 672.5 L 790 677.5 L 780 677.5 L 775 672.5 L 755 672.5 L 750 667.5 L 735 667.5 L 730 662.5 L 710 662.5 L 702.5 670 L 702.5 675 L 700 677.5 L 695 672.5 L 665 672.5 L 660 677.5 L 652.5 670 L 652.5 655 L 647.5 650 L 647.5 645 L 642.5 640 L 642.5 635 L 637.5 630 L 637.5 625 L 627.5 615 L 627.5 610 L 600 582.5 L 595 582.5 L 580 567.5 L 575 567.5 L 570 562.5 L 565 562.5 L 560 557.5 L 550 557.5 L 545 552.5 L 540 552.5 L 535 547.5 L 510 547.5 L 505 542.5 L 485 542.5 L 480 547.5 L 445 547.5 L 440 552.5 L 430 552.5 L 425 557.5 L 420 557.5 L 415 562.5 L 410 562.5 L 405 567.5 L 400 567.5 L 385 582.5 L 380 582.5 L 372.5 590 L 372.5 595 L 370 597.5 L 365 597.5 L 357.5 605 L 357.5 610 L 347.5 620 L 347.5 625 L 337.5 635 L 337.5 645 L 332.5 650 L 332.5 655 L 327.5 660 L 327.5 675 L 325 677.5 L 320 677.5 L 315 672.5 L 280 672.5 L 277.5 670 L 277.5 665 L 270 657.5 L 265 662.5 L 250 662.5 L 245 667.5 L 230 667.5 L 225 672.5 L 180 672.5 L 172.5 665 L 172.5 640 L 177.5 635 L 177.5 630 L 182.5 625 L 182.5 620 L 220 582.5 L 225 582.5 L 235 572.5 L 240 572.5 L 250 562.5 L 255 562.5 L 267.5 550 L 267.5 500 L 272.5 495 L 272.5 470 L 277.5 465 L 277.5 450 L 282.5 445 L 282.5 435 L 287.5 430 L 287.5 420 L 292.5 415 L 292.5 405 L 297.5 400 L 297.5 395 L 302.5 390 L 302.5 385 L 307.5 380 L 307.5 375 L 317.5 365 L 317.5 360 L 327.5 350 L 327.5 345 L 355 317.5 L 360 317.5 L 365 312.5 L 370 312.5 L 375 307.5 L 380 307.5 L 385 302.5 L 395 302.5 L 400 297.5 L 410 297.5 L 415 292.5 L 430 292.5 L 435 287.5 L 470 287.5 L 472.5 285 Z" fill="#123666" data-z="4" />
<path d="M 667.5 585 L 670 582.5 L 682.5 595 L 675 602.5 L 665 602.5 L 657.5 595 L 667.5 585 Z" fill="#123666" data-z="5" />
<path d="M 257.5 610 L 260 607.5 L 265 607.5 L 272.5 615 L 272.5 625 L 260 637.5 L 247.5 625 L 247.5 620 L 257.5 610 Z" fill="#123666" data-z="6" />
<path d="M 682.5 620 L 685 617.5 L 695 617.5 L 702.5 625 L 702.5 635 L 690 647.5 L 677.5 635 L 677.5 625 L 682.5 620 Z" fill="#123666" data-z="7" />
<path d="M 717.5 385 L 720 382.5 L 730 382.5 L 732.5 385 L 732.5 395 L 730 397.5 L 720 397.5 L 717.5 395 L 717.5 385 Z" fill="#d6e3ed" data-z="8" />
<path d="M 227.5 420 L 230 417.5 L 250 417.5 L 252.5 420 L 252.5 435 L 250 437.5 L 230 437.5 L 227.5 435 L 227.5 420 Z" fill="#d6e3ed" data-z="9" />
<path d="M 732.5 430 L 735 427.5 L 755 427.5 L 762.5 435 L 762.5 450 L 755 457.5 L 740 457.5 L 727.5 445 L 727.5 435 L 732.5 430 Z" fill="#d6e3ed" data-z="10" />
<path d="M 207.5 485 L 210 482.5 L 220 482.5 L 222.5 485 L 222.5 490 L 220 492.5 L 210 492.5 L 207.5 490 L 207.5 485 Z" fill="#d6e3ed" data-z="11" />
<path d="M 467.5 640 L 470 637.5 L 515 637.5 L 520 642.5 L 530 642.5 L 535 647.5 L 540 647.5 L 565 672.5 L 580 672.5 L 585 667.5 L 630 667.5 L 635 672.5 L 640 672.5 L 645 677.5 L 650 677.5 L 667.5 695 L 667.5 705 L 665 707.5 L 655 707.5 L 645 697.5 L 640 697.5 L 635 692.5 L 630 692.5 L 625 687.5 L 600 687.5 L 595 692.5 L 590 692.5 L 585 697.5 L 580 697.5 L 575 702.5 L 570 702.5 L 535 667.5 L 530 667.5 L 525 662.5 L 515 662.5 L 510 657.5 L 485 657.5 L 480 662.5 L 475 662.5 L 470 667.5 L 465 667.5 L 455 677.5 L 450 677.5 L 435 692.5 L 420 692.5 L 415 687.5 L 410 687.5 L 400 677.5 L 390 677.5 L 385 672.5 L 375 672.5 L 370 677.5 L 360 677.5 L 355 682.5 L 350 682.5 L 345 687.5 L 335 687.5 L 332.5 685 L 332.5 675 L 345 662.5 L 350 662.5 L 355 657.5 L 365 657.5 L 370 652.5 L 405 652.5 L 410 657.5 L 420 657.5 L 425 662.5 L 435 652.5 L 440 652.5 L 445 647.5 L 450 647.5 L 455 642.5 L 465 642.5 L 467.5 640 Z" fill="#d6e3ed" data-z="12" />
<path d="M 252.5 670 L 255 667.5 L 265 667.5 L 272.5 675 L 272.5 680 L 265 687.5 L 260 687.5 L 242.5 705 L 242.5 715 L 255 727.5 L 260 727.5 L 270 737.5 L 280 737.5 L 285 742.5 L 295 742.5 L 300 747.5 L 315 747.5 L 320 752.5 L 335 752.5 L 340 757.5 L 370 757.5 L 375 762.5 L 415 762.5 L 420 767.5 L 590 767.5 L 595 762.5 L 630 762.5 L 635 757.5 L 660 757.5 L 665 752.5 L 680 752.5 L 685 747.5 L 695 747.5 L 700 742.5 L 710 742.5 L 720 732.5 L 725 732.5 L 742.5 715 L 742.5 710 L 725 692.5 L 720 692.5 L 715 687.5 L 710 687.5 L 707.5 685 L 707.5 675 L 715 667.5 L 720 667.5 L 725 672.5 L 740 672.5 L 745 677.5 L 760 677.5 L 765 682.5 L 780 682.5 L 790 692.5 L 795 692.5 L 797.5 695 L 797.5 700 L 802.5 705 L 802.5 710 L 807.5 715 L 807.5 735 L 802.5 740 L 802.5 745 L 790 757.5 L 785 757.5 L 780 762.5 L 775 762.5 L 770 767.5 L 765 767.5 L 760 772.5 L 750 772.5 L 745 777.5 L 735 777.5 L 730 782.5 L 720 782.5 L 715 787.5 L 700 787.5 L 695 792.5 L 675 792.5 L 670 797.5 L 640 797.5 L 635 802.5 L 590 802.5 L 585 807.5 L 410 807.5 L 405 802.5 L 360 802.5 L 355 797.5 L 330 797.5 L 325 792.5 L 305 792.5 L 300 787.5 L 280 787.5 L 275 782.5 L 265 782.5 L 260 777.5 L 250 777.5 L 245 772.5 L 235 772.5 L 230 767.5 L 220 767.5 L 210 757.5 L 205 757.5 L 192.5 745 L 192.5 705 L 215 682.5 L 220 682.5 L 225 677.5 L 235 677.5 L 240 672.5 L 250 672.5 L 252.5 670 Z" fill="#d6e3ed" data-z="13" />  </G>
      </Svg>
    </View>
  );
}
