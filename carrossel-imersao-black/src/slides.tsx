import React from "react";
import { fotos as f, textos as t } from "./config";
import { c, label, mono } from "./theme";
import { Avatar, Big, Bubble, Duo, Fill, Frame, Hl, Input, Name, Photo, Row, System } from "./ui";

const L = <Avatar who="lara" src={f.avatarLara} />;
const C = <Avatar who="camila" src={f.avatarCamila} />;
const D = <Duo lara={f.avatarLara} camila={f.avatarCamila} />;

// 1 · Capa
export const S1: React.FC = () => (
  <Frame n={1}>
    <div style={{ height: 560, borderRadius: 56, overflow: "hidden", boxShadow: "0 18px 40px rgba(74,22,6,0.28)", border: `6px solid ${c.bubbleLight}` }}>
      <Photo src={f.capa} label="FOTO DAS DUAS COM CARA IRÔNICA" dark />
    </div>
    <Row side="left" avatar={D}>
      <Bubble side="left" tone="dark" style={{ maxWidth: "100%" }}>
        <Big size={60}>
          A gente vendo você passar mais uma Black <Hl on="dark">sem fechar contrato</Hl>
        </Big>
      </Bubble>
    </Row>
  </Frame>
);

// 2 · Alívio (prints no fundo)
const tilt = [
  { top: 30, left: -40, rot: -9 },
  { top: 120, right: -50, rot: 8 },
  { bottom: 20, left: 180, rot: -3 },
];
export const S2: React.FC = () => (
  <Frame n={2}>
    {tilt.map((p, i) => {
      const { rot, ...pos } = p;
      return (
        <div key={i} style={{ position: "absolute", ...pos, width: 300, height: 520, borderRadius: 36, overflow: "hidden", transform: `rotate(${rot}deg)`, opacity: 0.32 }}>
          <Photo src={f.prints[i] ?? null} label={i === 1 ? "PRINT THREADS" : "PRINT STORIES"} dark style={{ borderRadius: 36 }} />
        </div>
      );
    })}
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 24 }}>
      <Row side="left" avatar={D}>
        <Bubble side="left" tail={false}>
          <Big size={72}>Calma, a gente explica.</Big>
        </Bubble>
        <Bubble side="left">
          Essa semana a gente passou <b>dois dias discordando</b> sobre o que mais trava a creator na hora de fechar.
        </Bubble>
      </Row>
    </div>
  </Frame>
);

// Foto enviada como mensagem de imagem no chat
const PhotoBubble: React.FC<{ src: string | null; label: string; tone: "light" | "dark" }> = ({ src, label: l, tone }) => (
  <div style={{ width: 340, height: 340, borderRadius: 52, overflow: "hidden", border: `6px solid ${tone === "light" ? c.bubbleLight : c.bubbleDark}`, boxShadow: "0 18px 40px rgba(74,22,6,0.28)", flexShrink: 0 }}>
    <Photo src={src} label={l} dark />
  </div>
);

// 3 · Lado da Lara
export const S3: React.FC = () => (
  <Frame n={3}>
    <Name side="left">Lado da {t.lara}</Name>
    <Row side="left" avatar={L}>
      <PhotoBubble src={f.fotoLara} label="FOTO DA LARA" tone="light" />
      <Bubble side="left" tail={false}>
        <Big size={68}>
          Pra mim, é o <Hl on="light">portfólio.</Hl>
        </Big>
      </Bubble>
      <Bubble side="left" style={{ fontSize: 36, padding: "32px 44px" }}>
        A marca abre seu link e não encontra variedade, não encontra o nicho dela, não consegue se imaginar no seu vídeo. <b>Ela passa pra próxima.</b>
      </Bubble>
    </Row>
  </Frame>
);

// 4 · Lado da Camila
export const S4: React.FC = () => (
  <Frame n={4}>
    <Name side="right">Lado da {t.camila}</Name>
    <Row side="right" avatar={C}>
      <PhotoBubble src={f.fotoCamila} label="FOTO DA CAMILA" tone="dark" />
      <Bubble side="right" tail={false}>
        <Big size={68}>
          Pra mim, é a <Hl on="dark">abordagem.</Hl>
        </Big>
      </Bubble>
      <Bubble side="right" style={{ fontSize: 36, padding: "32px 44px" }}>
        Se a sua mensagem é igual à de todo mundo, <b>a marca nem chega a clicar no seu link.</b>
      </Bubble>
    </Row>
  </Frame>
);

// 5 · Tensão
export const S5: React.FC = () => (
  <Frame n={5}>
    <Bubble side="right" tone="light" style={{ alignSelf: "center", borderRadius: 100, padding: "28px 56px" }}>
      <Big size={56}>Quem tem razão?</Big>
    </Bubble>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, margin: "24px 0" }}>
      <Duo size={116} lara={f.avatarLara} camila={f.avatarCamila} />
      <div style={{ fontWeight: 700, fontSize: 124, color: c.creme, letterSpacing: -3, lineHeight: 1 }}>As duas.</div>
    </div>
    <Bubble side="left" tone="dark" tail={false} style={{ alignSelf: "center", textAlign: "center" }}>
      E é isso que trava tanta creator: ela cuida de um lado e <Hl on="dark">esquece o outro.</Hl>
    </Bubble>
  </Frame>
);

// 6 · Camila ri da própria frase
export const S6: React.FC = () => (
  <Frame n={6}>
    <Row side="right" avatar={C}>
      <div style={{ width: 600, height: 470, borderRadius: 56, overflow: "hidden", border: `6px solid ${c.bubbleDark}`, boxShadow: "0 18px 40px rgba(74,22,6,0.28)" }}>
        <Photo src={f.camilaRindo} label="FOTO DA CAMILA RINDO" dark />
      </div>
      <Bubble side="right" tail={false}>E sobre aquela aula que eu ofereci pra {t.lara}…</Bubble>
      <Bubble side="right">
        <Big size={56}>
          mudei de ideia. <Hl on="dark">A gente dá aula juntas.</Hl>
        </Big>
      </Bubble>
    </Row>
  </Frame>
);

// 7 · União
export const S7: React.FC = () => (
  <Frame n={7}>
    <System>
      {t.lara} e {t.camila} criaram o grupo “Imersão de Black”
    </System>
    <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
      <Duo size={170} lara={f.avatarLara} camila={f.avatarCamila} />
    </div>
    <Bubble side="left" tail={false} style={{ alignSelf: "center", textAlign: "center" }}>
      <Big size={64}>Esse mercado já tem disputa demais.</Big>
    </Bubble>
    <Bubble side="right" tail={false} style={{ alignSelf: "center", textAlign: "center" }}>
      A gente preferiu <Hl on="dark">juntar o que cada uma faz de melhor.</Hl>
    </Bubble>
  </Frame>
);

// 8 · A imersão
export const S8: React.FC = () => (
  <Frame n={8}>
    <div style={{ color: c.creme, textAlign: "center" }}>
      <div style={{ fontFamily: label, fontWeight: 700, fontSize: 26, letterSpacing: 3, opacity: 0.85 }}>IMERSÃO DE BLACK</div>
      <Big size={84}>portfólio + abordagem</Big>
    </div>
    <Row side="left" avatar={L}>
      <Bubble side="left" style={{ fontSize: 36 }}>
        <b>Com a {t.lara}:</b> <Fill text={t.ensinoLara} on="light" />
      </Bubble>
    </Row>
    <Row side="right" avatar={C}>
      <Bubble side="right" style={{ fontSize: 36 }}>
        <b>Com a {t.camila}:</b> <Fill text={t.ensinoCamila} on="dark" />
      </Bubble>
    </Row>
    <div style={{ color: c.creme, fontSize: 40, fontWeight: 500, textAlign: "center", lineHeight: 1.3, marginTop: 8 }}>
      Pra você chegar na Black <b>pronta pra fechar contrato.</b>
    </div>
  </Frame>
);

// 9 · Informações (mensagem fixada com ícones)
const Icon: React.FC<{ d: string }> = ({ d }) => (
  <div style={{ width: 96, height: 96, borderRadius: "50%", background: c.bubbleDark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <svg width={46} height={46} viewBox="0 0 24 24" fill="none" stroke={c.creme} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  </div>
);
const ic = {
  cal: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  clock: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 2",
  tag: "M3 12V4h8l10 10-8 8zM7.5 7.5h.01",
  money: "M3 6h18v12H3zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM6 12h.01M18 12h.01",
};
const InfoRow: React.FC<{ icon: string; k: string; children: React.ReactNode }> = ({ icon, k, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
    <Icon d={icon} />
    <div>
      <div style={{ fontFamily: label, fontWeight: 700, fontSize: 22, letterSpacing: 2.5, color: c.accent }}>{k}</div>
      <div style={{ fontSize: 42, fontWeight: 700, color: c.textOnLight, lineHeight: 1.2 }}>{children}</div>
    </div>
  </div>
);
export const S9: React.FC = () => (
  <Frame n={9}>
    <System>Mensagem fixada</System>
    <Bubble side="left" tail={false} style={{ maxWidth: "100%", alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 36, padding: "52px 52px" }}>
      <InfoRow icon={ic.cal} k="QUANDO">
        <span style={{ fontFamily: mono }}>18/10</span>, domingo
      </InfoRow>
      <InfoRow icon={ic.clock} k="FORMATO E HORÁRIO">
        <Fill text={t.formatoHorario} on="light" />
      </InfoRow>
      <InfoRow icon={ic.tag} k="CONDIÇÃO ESPECIAL DE ABERTURA">
        até <span style={{ fontFamily: mono }}>10/10</span>
      </InfoRow>
      <InfoRow icon={ic.money} k="VALOR">
        <Fill text={t.valor} on="light" />
      </InfoRow>
    </Bubble>
  </Frame>
);

// 10 · CTA
export const S10: React.FC = () => (
  <Frame n={10} swipe={false}>
    <Row side="left" avatar={D}>
      <Bubble side="left" tone="dark" style={{ maxWidth: "100%" }}>
        <Big size={72}>
          Comenta <Hl on="dark">BLACK</Hl> que a gente te manda o link
        </Big>
      </Bubble>
    </Row>
    <div style={{ height: 40 }} />
    <Input text="BLACK" typed />
  </Frame>
);

export const slides = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];
