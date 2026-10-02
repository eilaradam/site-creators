// Um projeto e uma pasta: bruto/ entra, edl.json e saida/ saem.
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PASTA_PROJETOS = process.env.STUDIO_PROJETOS || join(RAIZ, 'projetos');
export const VIDEOS = ['.mp4', '.mov', '.m4v', '.mkv', '.webm', '.avi'];

export function apelido(nome) {
  return String(nome)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 60) || 'projeto';
}

export function caminhos(slug) {
  const base = join(PASTA_PROJETOS, slug);
  return {
    slug,
    base,
    bruto: join(base, 'bruto'),
    cache: join(base, 'cache'),
    saida: join(base, 'saida'),
    edl: join(base, 'edl.json'),
    config: join(base, 'projeto.json'),
    roteiro: join(base, 'roteiro.txt'),
  };
}

export async function criar({ nome, perfil = 'lara' }) {
  const slug = apelido(nome);
  const c = caminhos(slug);
  if (existsSync(c.base)) throw new Error(`projeto "${slug}" ja existe em ${c.base}`);
  await mkdir(c.bruto, { recursive: true });
  await mkdir(c.cache, { recursive: true });
  await mkdir(c.saida, { recursive: true });
  await writeFile(c.config, JSON.stringify({ nome, slug, perfil, criadoEm: new Date().toISOString() }, null, 2) + '\n');
  await writeFile(c.roteiro, '# Uma linha de fala por linha. Marcacao entre [] ou () e ignorada.\n');
  return c;
}

export async function listar() {
  if (!existsSync(PASTA_PROJETOS)) return [];
  const nomes = await readdir(PASTA_PROJETOS, { withFileTypes: true });
  const saida = [];
  for (const d of nomes) {
    if (!d.isDirectory()) continue;
    const c = caminhos(d.name);
    if (!existsSync(c.config)) continue;
    saida.push({ ...JSON.parse(await readFile(c.config, 'utf8')), caminhos: c, temEdl: existsSync(c.edl) });
  }
  return saida.sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
}

export async function carregarConfig(slug) {
  const c = caminhos(slug);
  if (!existsSync(c.config)) throw new Error(`projeto "${slug}" nao encontrado em ${c.base}`);
  return { ...JSON.parse(await readFile(c.config, 'utf8')), caminhos: c };
}

export async function videosBrutos(slug) {
  const c = caminhos(slug);
  if (!existsSync(c.bruto)) return [];
  const nomes = await readdir(c.bruto);
  return nomes
    .filter((n) => VIDEOS.includes(extname(n).toLowerCase()))
    .sort()
    .map((n) => join(c.bruto, n));
}

export async function lerRoteiroBruto(slug) {
  const c = caminhos(slug);
  if (!existsSync(c.roteiro)) return '';
  const texto = await readFile(c.roteiro, 'utf8');
  return texto.split(/\r?\n/).filter((l) => !l.trim().startsWith('#')).join('\n');
}
