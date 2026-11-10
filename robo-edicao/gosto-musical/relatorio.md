# O que separa as músicas aprovadas das reprovadas

3 aprovadas, 10 reprovadas. Modelo: LAION-CLAP music_audioset_epoch_15_esc_90.14.pt (HTSAT-base); 3 x 10 s (começo, meio, fim), média normalizada.

| Medida | Aprovadas (média e faixa) | Reprovadas (média e faixa) | Separa? |
|---|---|---|---|
| BPM (medido no áudio) | 138.1 (112.3 a 184.6) | 114.5 (95.7 a 143.6) | média (d=1.17); 4 de 10 reprovadas fora da faixa das aprovadas |
| BPM (do Epidemic) | 107.7 (94.0 a 116.0) | 114.4 (96.0 a 142.0) | fraca (d=-0.49); 3 de 10 reprovadas fora da faixa das aprovadas |
| Brilho, centroide espectral (Hz) | 1683.3 (1596.0 a 1735.0) | 2265.2 (1815.0 a 2733.0) | forte (d=-2.57); 10 de 10 reprovadas fora da faixa das aprovadas |
| Energia média (dBFS) | -11.0 (-12.4 a -10.3) | -12.8 (-13.9 a -10.7) | forte (d=1.92); 7 de 10 reprovadas fora da faixa das aprovadas |
| Variação da energia (desvio, dB) | 7.2 (6.7 a 7.7) | 8.8 (5.9 a 11.6) | média (d=-0.88); 9 de 10 reprovadas fora da faixa das aprovadas |
| Peso do grave < 150 Hz (% da energia) | 71.8 (65.4 a 77.3) | 59.1 (43.7 a 79.8) | forte (d=1.48); 9 de 10 reprovadas fora da faixa das aprovadas |
| Melodia vs mistura (dB, stem MELODY) | -15.5 (-19.2 a -9.6) | -14.4 (-31.4 a -8.3) | fraca (d=-0.16); 4 de 7 reprovadas fora da faixa das aprovadas |
| Ataques por segundo (onsets) | 4.7 (4.4 a 5.2) | 4.7 (2.6 a 6.2) | fraca (d=0.05); 7 de 10 reprovadas fora da faixa das aprovadas |

## Teste: cada faixa julgada como se fosse nova (fora do grupo)

| Faixa | Nota da Lara | Só CLAP diria | Filtro (medidas + CLAP) diria | nota |
|---|---|---|---|---|
| Back on Track | aprovada | reprovada ✗ | aprovada | 1.25 |
| Up to Us | aprovada | reprovada ✗ | aprovada | 1.79 |
| Too Slow of a Drive | aprovada | aprovada | aprovada | 1.35 |
| Message in a Bottle | reprovada | aprovada ✗ | reprovada | -1.86 |
| Talk 2 Me | reprovada | aprovada ✗ | aprovada ✗ | 1.92 |
| Consolations | reprovada | reprovada | reprovada | -1.36 |
| Drum & Brass | reprovada | reprovada | reprovada | -2.23 |
| Snow Glow | reprovada | aprovada ✗ | reprovada | -0.54 |
| With Music on Repeat (Instrumental Version) | reprovada | reprovada | reprovada | -1.88 |
| Parisian Garden | reprovada | reprovada | reprovada | -2.21 |
| Some Kind of Friend | reprovada | reprovada | reprovada | -1.47 |
| Glowsticks | reprovada | reprovada | reprovada | -0.21 |
| Say a Prayer | reprovada | reprovada | reprovada | -2.79 |

Só o CLAP acertou 8 de 13; o filtro (medidas + CLAP) acertou 12 de 13, sem ter visto a faixa antes.
