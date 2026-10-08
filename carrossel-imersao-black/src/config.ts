// Edite aqui. Fotos: coloque o arquivo em /public e escreva só o nome (ex.: "capa.jpg").
// null = mostra um espaço reservado tracejado no lugar da foto.
// Textos entre [colchetes] aparecem tracejados para lembrar que ainda faltam.

export const fotos = {
  capa: null as string | null, // foto das duas com cara irônica
  avatarLara: null as string | null,
  avatarCamila: null as string | null,
  camilaRindo: null as string | null, // slide 6
  prints: [null, null, null] as (string | null)[], // prints dos stories/Threads (slide 2)
};

export const textos = {
  lara: "Lara",
  camila: "Camila",
  tag: "IMERSÃO DE BLACK · 18/10",
  ensinoLara: "[o que você vai ensinar de portfólio]",
  ensinoCamila: "[o que ela vai ensinar de abordagem]",
  formatoHorario: "[formato e horário]",
  valor: "[valor]",
};
