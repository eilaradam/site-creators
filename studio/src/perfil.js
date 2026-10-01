// Perfis de estilo: cores, fonte da legenda, limiares de corte.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function carregarPerfil(nome = 'lara') {
  const caminho = isAbsolute(nome) || nome.endsWith('.json')
    ? nome
    : join(RAIZ, 'perfis', `${nome}.json`);
  if (!existsSync(caminho)) throw new Error(`perfil nao encontrado: ${caminho}`);
  return JSON.parse(await readFile(caminho, 'utf8'));
}
