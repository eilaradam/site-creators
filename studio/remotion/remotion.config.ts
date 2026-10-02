import { Config } from '@remotion/cli/config';

// Frames em PNG: e o que preserva o canal alpha ate o encoder.
// Codec e pixel format ficam nos scripts, porque cada saida quer um par diferente
// (ProRes 4444 para overlay em editor, VP8/yuva420p para web).
Config.setVideoImageFormat('png');
Config.setOverwriteOutput(true);
