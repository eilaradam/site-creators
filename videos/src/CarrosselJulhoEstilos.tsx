import { AbsoluteFill, Img, staticFile } from "remotion";
import { z } from "zod";
import { CARDS, Card } from "./CarrosselJulho";

/* =========================================================================
   CARROSSEL JULHO — 3 NOVAS DIREÇÕES VISUAIS (pra escolher)
   versao 1 = Editorial Minimalista | 2 = Bold Dark | 3 = Soft Pastel
   indice: 0 = capa, 1..6 = datas, 7 = CTA. Mesmo conteúdo/fotos do original.
   ========================================================================= */
export const julhoEstilosSchema = z.object({
  versao: z.number(),
  indice: z.number(),
});
export type JulhoEstilosProps = z.infer<typeof julhoEstilosSchema>;

const CAPA_TITULO_PRE = "As ";
const CAPA_NUM = "6";
const CAPA_TITULO_POS = " oportunidades de UGC de ";
const CAPA_MES = "julho";
const CAPA_SUB = "pra você começar o mês já fechando Publi e UGC";
const CTA_SALVA =
  "Salva esse carrossel pra não perder nenhuma data e usar o mês todo como guia.";

/* helpers ------------------------------------------------------------- */
function parseTitulo(t: string): { nome: string; data: string } {
  const m = t.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (m) return { nome: m[1], data: m[2] };
  return { nome: t, data: "" };
}
const Rico: React.FC<{ texto: string; peso?: number }> = ({ texto, peso }) => (
  <>
    {texto.split("**").map((p, i) =>
      i % 2 === 1 ? (
        <strong key={i} style={{ fontWeight: 900 }}>
          {p}
        </strong>
      ) : (
        <span key={i} style={{ fontWeight: peso }}>
          {p}
        </span>
      )
    )}
  </>
);
const Fotos: React.FC<{
  imagens?: (string | undefined)[];
  raio: number;
  altura: number;
  gap?: number;
}> = ({ imagens, raio, altura, gap = 16 }) => (
  <div style={{ display: "flex", gap }}>
    {(imagens ?? []).map((src, i) => (
      <div
        key={i}
        style={{ flex: 1, height: altura, borderRadius: raio, overflow: "hidden" }}
      >
        {src && (
          <Img
            src={staticFile(src)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
      </div>
    ))}
  </div>
);
const Dots: React.FC<{ total: number; ativo: number; cor: string; fraco: string }> = ({
  total,
  ativo,
  cor,
  fraco,
}) => (
  <div
    style={{
      position: "absolute",
      bottom: 26,
      left: 0,
      right: 0,
      display: "flex",
      gap: 9,
      justifyContent: "center",
    }}
  >
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: i === ativo ? 26 : 10,
          height: 10,
          borderRadius: 999,
          background: i === ativo ? cor : fraco,
        }}
      />
    ))}
  </div>
);

type Kind = "capa" | "card" | "cta";

export const CarrosselJulhoEstilos: React.FC<JulhoEstilosProps> = ({
  versao,
  indice,
}) => {
  const total = CARDS.length + 2;
  const kind: Kind = indice === 0 ? "capa" : indice <= CARDS.length ? "card" : "cta";
  const card = kind === "card" ? CARDS[indice - 1] : null;
  const props = { kind, card, indice, total };
  if (versao === 2) return <Dark {...props} />;
  if (versao === 3) return <Pastel {...props} />;
  return <Editorial {...props} />;
};

/* =========================================================================
   VERSÃO 1 — EDITORIAL MINIMALISTA
   ========================================================================= */
const E = {
  bg: "#F4F1EA",
  ink: "#211E19",
  acc: "#C2562F",
  mut: "#8C8475",
  line: "#DBD5C8",
  serif: '"Georgia", "Times New Roman", serif',
  sans: "Helvetica, Arial, sans-serif",
};
const Editorial: React.FC<{
  kind: Kind;
  card: Card | null;
  indice: number;
  total: number;
}> = ({ kind, card, indice, total }) => {
  return (
    <AbsoluteFill style={{ background: E.bg, fontFamily: E.sans, color: E.ink }}>
      {kind === "capa" && (
        <div style={{ padding: "104px 92px", height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, letterSpacing: 6, color: E.mut, fontWeight: 700 }}>
            GUIA DE JULHO — UGC
          </div>
          <div style={{ height: 2, background: E.line, marginTop: 26 }} />
          <div style={{ marginTop: 60 }}>
            <div style={{ fontFamily: E.serif, fontSize: 102, lineHeight: 1.02, letterSpacing: -1 }}>
              {CAPA_TITULO_PRE}
              <span style={{ color: E.acc }}>{CAPA_NUM}</span>
              {CAPA_TITULO_POS}
              <span style={{ fontStyle: "italic", color: E.acc }}>{CAPA_MES}</span>
            </div>
          </div>
          <div
            style={{
              marginTop: 46,
              fontFamily: E.serif,
              fontStyle: "italic",
              fontSize: 44,
              lineHeight: 1.3,
              color: E.mut,
              maxWidth: 720,
            }}
          >
            {CAPA_SUB}
          </div>
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 14, fontSize: 30 }}>
            <span style={{ fontWeight: 800 }}>Lara Dam</span>
            <span style={{ color: E.line }}>/</span>
            <span style={{ color: E.acc, fontWeight: 700 }}>@meumanager</span>
          </div>
        </div>
      )}

      {kind === "card" && card && (
        <Conteudo
          card={card}
          indice={indice}
          render={(c, n, d) => (
            <div style={{ padding: "84px 84px 70px", height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 26, letterSpacing: 5, color: E.mut, fontWeight: 700 }}>
                  {String(indice).padStart(2, "0")} — UGC MANAGER
                </div>
                {d && (
                  <div style={{ fontFamily: E.serif, fontStyle: "italic", fontSize: 38, color: E.acc }}>
                    {d}
                  </div>
                )}
              </div>
              <div style={{ height: 2, background: E.line, marginTop: 20 }} />
              <div style={{ marginTop: 30, fontFamily: E.serif, fontSize: 62, lineHeight: 1.05, letterSpacing: -0.5 }}>
                {n}
              </div>
              <div style={{ marginTop: 26, fontSize: 33, lineHeight: 1.45, color: E.ink, fontWeight: 400 }}>
                {c.paras.map((p, i) => (
                  <p key={i} style={{ margin: 0 }}>
                    <Rico texto={p} peso={400} />
                  </p>
                ))}
              </div>
              <div
                style={{
                  marginTop: 22,
                  fontFamily: E.serif,
                  fontStyle: "italic",
                  fontSize: 35,
                  lineHeight: 1.3,
                  color: E.acc,
                }}
              >
                {c.ugc}
              </div>
              <div style={{ marginTop: "auto" }}>
                <Fotos imagens={c.imagens} raio={6} altura={248} gap={14} />
              </div>
              <div style={{ marginTop: 28, borderLeft: `4px solid ${E.acc}`, paddingLeft: 24 }}>
                <div style={{ fontSize: 24, letterSpacing: 2, color: E.acc, fontWeight: 800, textTransform: "uppercase" }}>
                  Dica de abordagem
                </div>
                <div style={{ marginTop: 8, fontSize: 28, lineHeight: 1.32, color: E.ink }}>
                  {c.dica}
                </div>
              </div>
              <div style={{ marginTop: 26, fontSize: 27 }}>
                <span style={{ fontWeight: 800 }}>Lara Dam</span>
                <span style={{ color: E.line }}> / </span>
                <span style={{ color: E.acc, fontWeight: 700 }}>@meumanager</span>
              </div>
            </div>
          )}
        />
      )}

      {kind === "cta" && (
        <div style={{ padding: "104px 92px", height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, letterSpacing: 6, color: E.mut, fontWeight: 700 }}>FECHAMENTO</div>
          <div style={{ height: 2, background: E.line, marginTop: 26 }} />
          <div style={{ marginTop: 60, fontFamily: E.serif, fontSize: 78, lineHeight: 1.08 }}>
            Julho tá cheio de oportunidade pra fechar{" "}
            <span style={{ color: E.acc, fontStyle: "italic" }}>Publi e UGC.</span>
          </div>
          <div style={{ marginTop: 40, fontSize: 34, lineHeight: 1.4, color: E.ink, maxWidth: 760 }}>
            {CTA_SALVA}
          </div>
          <div style={{ marginTop: 36, fontSize: 34, lineHeight: 1.4, color: E.ink, maxWidth: 800 }}>
            Comenta <span style={{ color: E.acc, fontWeight: 900 }}>NOVIDADES</span> aqui embaixo
            que eu te mando no privado as oportunidades mais quentes pra você chegar antes nas marcas.
          </div>
          <div
            style={{
              marginTop: 44,
              alignSelf: "flex-start",
              border: `2px solid ${E.acc}`,
              color: E.acc,
              fontWeight: 800,
              fontSize: 38,
              letterSpacing: 2,
              padding: "18px 40px",
              borderRadius: 4,
            }}
          >
            COMENTE “NOVIDADES”
          </div>
          <div style={{ marginTop: "auto", fontSize: 30 }}>
            <span style={{ fontWeight: 800 }}>Lara Dam</span>
            <span style={{ color: E.line }}> / </span>
            <span style={{ color: E.acc, fontWeight: 700 }}>@meumanager</span>
          </div>
        </div>
      )}

      <Dots total={total} ativo={indice} cor={E.acc} fraco={E.line} />
    </AbsoluteFill>
  );
};

/* =========================================================================
   VERSÃO 2 — BOLD DARK
   ========================================================================= */
const D = {
  bg: "#131417",
  card: "#1C1E22",
  ink: "#F3F2EE",
  acc: "#CDF564",
  mut: "#9A9CA1",
  sans: "Helvetica, Arial, sans-serif",
};
const Dark: React.FC<{ kind: Kind; card: Card | null; indice: number; total: number }> = ({
  kind,
  card,
  indice,
  total,
}) => {
  return (
    <AbsoluteFill style={{ background: D.bg, fontFamily: D.sans, color: D.ink }}>
      {kind === "capa" && (
        <div style={{ padding: "100px 86px", height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: D.acc, letterSpacing: 1 }}>@meumanager</div>
          <div style={{ marginTop: "auto" }}>
            <div style={{ fontSize: 110, fontWeight: 900, lineHeight: 0.98, letterSpacing: -3 }}>
              {CAPA_TITULO_PRE}
              <span style={{ color: D.acc }}>{CAPA_NUM}</span>
              {CAPA_TITULO_POS}
              <span
                style={{
                  color: D.bg,
                  background: D.acc,
                  padding: "0 14px",
                  borderRadius: 8,
                }}
              >
                {CAPA_MES}
              </span>
            </div>
            <div style={{ marginTop: 44, fontSize: 42, fontWeight: 700, color: D.mut, lineHeight: 1.25, maxWidth: 760 }}>
              {CAPA_SUB}
            </div>
          </div>
          <div style={{ marginTop: 70, fontSize: 30, fontWeight: 700 }}>
            Lara Dam <span style={{ color: D.acc }}>/ @meumanager</span>
          </div>
        </div>
      )}

      {kind === "card" && card && (
        <Conteudo
          card={card}
          indice={indice}
          render={(c, n, d) => (
            <div style={{ padding: "78px 80px 68px", height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 27, letterSpacing: 4, color: D.acc, fontWeight: 800 }}>
                  {String(indice).padStart(2, "0")} · UGC MANAGER
                </div>
                {d && (
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 900,
                      color: D.bg,
                      background: D.acc,
                      padding: "6px 18px",
                      borderRadius: 999,
                    }}
                  >
                    {d}
                  </div>
                )}
              </div>
              <div style={{ marginTop: 26, fontSize: 60, fontWeight: 900, lineHeight: 1.04, letterSpacing: -1 }}>
                {n}
              </div>
              <div style={{ marginTop: 24, fontSize: 33, lineHeight: 1.4, color: D.mut, fontWeight: 500 }}>
                {c.paras.map((p, i) => (
                  <p key={i} style={{ margin: 0 }}>
                    <Rico texto={p.replace(/\*\*/g, "")} peso={500} />
                  </p>
                ))}
              </div>
              <div style={{ marginTop: 20, fontSize: 35, lineHeight: 1.32, color: D.acc, fontWeight: 800 }}>
                {c.ugc}
              </div>
              <div style={{ marginTop: "auto" }}>
                <Fotos imagens={c.imagens} raio={18} altura={262} gap={16} />
              </div>
              <div
                style={{
                  marginTop: 26,
                  background: D.card,
                  borderLeft: `6px solid ${D.acc}`,
                  borderRadius: 14,
                  padding: "22px 28px",
                }}
              >
                <span style={{ color: D.acc, fontWeight: 900, fontSize: 29 }}>Dica de abordagem: </span>
                <span style={{ color: D.ink, fontSize: 29, lineHeight: 1.3, fontWeight: 500 }}>{c.dica}</span>
              </div>
              <div style={{ marginTop: 24, fontSize: 28, fontWeight: 700 }}>
                Lara Dam <span style={{ color: D.acc }}>/ @meumanager</span>
              </div>
            </div>
          )}
        />
      )}

      {kind === "cta" && (
        <div style={{ padding: "100px 86px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.06, letterSpacing: -2 }}>
            Julho tá cheio de oportunidade pra fechar{" "}
            <span style={{ color: D.acc }}>Publi e UGC.</span>
          </div>
          <div style={{ marginTop: 40, fontSize: 36, lineHeight: 1.35, color: D.mut, fontWeight: 600 }}>
            {CTA_SALVA}
          </div>
          <div style={{ marginTop: 34, fontSize: 36, lineHeight: 1.38, color: D.ink, fontWeight: 600 }}>
            Comenta{" "}
            <span style={{ color: D.bg, background: D.acc, padding: "0 10px", borderRadius: 6, fontWeight: 900 }}>
              NOVIDADES
            </span>{" "}
            que eu te mando no privado as oportunidades mais quentes pra você chegar antes.
          </div>
          <div
            style={{
              marginTop: 48,
              alignSelf: "flex-start",
              background: D.acc,
              color: D.bg,
              fontWeight: 900,
              fontSize: 44,
              letterSpacing: 1,
              padding: "22px 44px",
              borderRadius: 999,
            }}
          >
            💬 NOVIDADES
          </div>
          <div style={{ marginTop: 64, fontSize: 30, fontWeight: 700 }}>
            Lara Dam <span style={{ color: D.acc }}>/ @meumanager</span>
          </div>
        </div>
      )}

      <Dots total={total} ativo={indice} cor={D.acc} fraco="rgba(255,255,255,0.18)" />
    </AbsoluteFill>
  );
};

/* =========================================================================
   VERSÃO 3 — SOFT PASTEL
   ========================================================================= */
const P = {
  bg1: "#FCEBE2",
  bg2: "#F6E5F1",
  card: "#FFFFFF",
  ink: "#41323F",
  acc: "#F0774A",
  acc2: "#B49AD8",
  mut: "#9B8E98",
  soft: "#FDEFE9",
  sans: "Helvetica, Arial, sans-serif",
};
const Pastel: React.FC<{ kind: Kind; card: Card | null; indice: number; total: number }> = ({
  kind,
  card,
  indice,
  total,
}) => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(155deg, ${P.bg1} 0%, ${P.bg2} 100%)`,
        fontFamily: P.sans,
        color: P.ink,
      }}
    >
      {/* blobs decorativos */}
      <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: 999, background: P.acc, opacity: 0.12 }} />
      <div style={{ position: "absolute", bottom: 60, left: -90, width: 260, height: 260, borderRadius: 999, background: P.acc2, opacity: 0.16 }} />

      {kind === "capa" && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
          <div
            style={{
              width: 920,
              background: P.card,
              borderRadius: 60,
              padding: "92px 80px",
              boxShadow: "0 50px 100px rgba(65,50,63,0.16)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: P.soft,
                color: P.acc,
                fontWeight: 800,
                fontSize: 26,
                letterSpacing: 3,
                padding: "12px 24px",
                borderRadius: 999,
                textTransform: "uppercase",
              }}
            >
              ☀️ Guia de julho
            </div>
            <div style={{ marginTop: 40, fontSize: 92, fontWeight: 900, lineHeight: 1.05, letterSpacing: -2 }}>
              {CAPA_TITULO_PRE}
              <span style={{ color: P.acc }}>{CAPA_NUM}</span>
              {CAPA_TITULO_POS}
              <span style={{ color: P.acc, position: "relative" }}>
                {CAPA_MES}
                <span style={{ position: "absolute", left: 0, right: 0, bottom: -6, height: 10, borderRadius: 999, background: P.acc, opacity: 0.35 }} />
              </span>
            </div>
            <div
              style={{
                marginTop: 40,
                background: P.soft,
                borderRadius: 22,
                padding: "22px 28px",
                fontSize: 38,
                fontWeight: 600,
                lineHeight: 1.3,
                color: P.ink,
              }}
            >
              {CAPA_SUB}
            </div>
            <div style={{ marginTop: 44, fontSize: 30, fontWeight: 700 }}>
              Lara Dam <span style={{ color: P.acc }}>· @meumanager</span>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {kind === "card" && card && (
        <Conteudo
          card={card}
          indice={indice}
          render={(c, n, d) => (
            <AbsoluteFill style={{ padding: "56px 56px 70px" }}>
              <div
                style={{
                  background: P.card,
                  borderRadius: 48,
                  padding: "56px 56px 50px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 40px 90px rgba(65,50,63,0.14)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    style={{
                      background: P.acc,
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 26,
                      padding: "8px 18px",
                      borderRadius: 999,
                    }}
                  >
                    {String(indice).padStart(2, "0")}
                  </span>
                  {d && (
                    <span style={{ background: P.soft, color: P.acc, fontWeight: 800, fontSize: 26, padding: "8px 18px", borderRadius: 999 }}>
                      {d}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 24, fontSize: 56, fontWeight: 900, lineHeight: 1.04, letterSpacing: -1, color: P.ink }}>
                  {n}
                </div>
                <div style={{ marginTop: 22, fontSize: 32, lineHeight: 1.4, color: P.ink, fontWeight: 500 }}>
                  {c.paras.map((p, i) => (
                    <p key={i} style={{ margin: 0 }}>
                      <Rico texto={p} peso={500} />
                    </p>
                  ))}
                </div>
                <div style={{ marginTop: 18, fontSize: 33, lineHeight: 1.32, color: P.acc, fontWeight: 800 }}>
                  {c.ugc}
                </div>
                <div style={{ marginTop: "auto" }}>
                  <Fotos imagens={c.imagens} raio={24} altura={232} gap={16} />
                </div>
                <div style={{ marginTop: 24, background: P.soft, borderRadius: 22, padding: "22px 26px" }}>
                  <span style={{ color: P.acc, fontWeight: 900, fontSize: 28 }}>💡 Dica de abordagem: </span>
                  <span style={{ color: P.ink, fontSize: 28, lineHeight: 1.3, fontWeight: 500 }}>{c.dica}</span>
                </div>
                <div style={{ marginTop: 22, fontSize: 27, fontWeight: 700 }}>
                  Lara Dam <span style={{ color: P.acc }}>· @meumanager</span>
                </div>
              </div>
            </AbsoluteFill>
          )}
        />
      )}

      {kind === "cta" && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 70 }}>
          <div
            style={{
              width: 940,
              background: P.card,
              borderRadius: 56,
              padding: "76px 70px",
              boxShadow: "0 50px 100px rgba(65,50,63,0.16)",
            }}
          >
            <div style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.08, letterSpacing: -1, color: P.ink }}>
              Julho tá cheio de oportunidade pra fechar{" "}
              <span style={{ color: P.acc }}>Publi e UGC.</span>
            </div>
            <div style={{ marginTop: 34, background: P.soft, borderRadius: 22, padding: "22px 28px", fontSize: 34, fontWeight: 600, lineHeight: 1.3 }}>
              {CTA_SALVA}
            </div>
            <div style={{ marginTop: 30, fontSize: 34, lineHeight: 1.38, color: P.ink, fontWeight: 500 }}>
              Comenta <span style={{ color: P.acc, fontWeight: 900 }}>NOVIDADES</span> que eu te mando no
              privado as oportunidades mais quentes pra você chegar antes nas marcas.
            </div>
            <div
              style={{
                marginTop: 40,
                display: "inline-block",
                background: P.acc,
                color: "#fff",
                fontWeight: 900,
                fontSize: 42,
                padding: "22px 44px",
                borderRadius: 999,
                boxShadow: "0 18px 34px rgba(240,119,74,0.34)",
              }}
            >
              💬 NOVIDADES
            </div>
            <div style={{ marginTop: 40, fontSize: 28, fontWeight: 700 }}>
              Lara Dam <span style={{ color: P.acc }}>· @meumanager</span>
            </div>
          </div>
        </AbsoluteFill>
      )}

      <Dots total={total} ativo={indice} cor={P.acc} fraco="rgba(65,50,63,0.18)" />
    </AbsoluteFill>
  );
};

/* Wrapper que injeta nome/data parseados do título */
const Conteudo: React.FC<{
  card: Card;
  indice: number;
  render: (card: Card, nome: string, data: string) => React.ReactNode;
}> = ({ card, render }) => {
  const { nome, data } = parseTitulo(card.titulo);
  return <>{render(card, nome, data)}</>;
};
