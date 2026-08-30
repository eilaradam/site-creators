# Remotion — Edição de Vídeos

Projeto independente do site para criar/editar vídeos programaticamente com [Remotion](https://www.remotion.dev/) (React + TypeScript).

> Este projeto é isolado na pasta `remotion/` e **não tem relação** com o site estático na raiz do repositório.

## Instalação

```bash
cd remotion
npm install
```

## Uso

```bash
# Abrir o Remotion Studio (preview interativo no navegador)
npm run dev

# Renderizar uma composição para MP4
npm run render -- HelloWorld out/video.mp4
```

## Estrutura

- `src/index.ts` — ponto de entrada (`registerRoot`)
- `src/Root.tsx` — registro das composições (`<Composition>`)
- `src/HelloWorld.tsx` — composição de exemplo
- `remotion.config.ts` — configuração de renderização

Para criar um novo vídeo, adicione um componente em `src/` e registre-o como uma
`<Composition>` em `src/Root.tsx`.

## Renderização no ambiente remoto (Claude Code on the web)

Para renderizar, o Remotion baixa o **Chrome Headless Shell** de `remotion.media`.
Nos ambientes remotos com política de rede restritiva esse host pode estar
bloqueado (erro `403 Host not in allowlist`). Para habilitar a renderização:

- Adicione `remotion.media` (e `remotion.dev`) ao allowlist de egress do ambiente, **ou**
- Aponte para um Chrome já instalado via a variável `REMOTION_BROWSER_EXECUTABLE`.

O **Studio** (`npm run dev`) e o desenvolvimento das composições funcionam
normalmente; apenas a etapa de render para arquivo precisa do Chrome.
