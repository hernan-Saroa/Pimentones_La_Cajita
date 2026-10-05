import { Injectable, Logger } from '@nestjs/common';
import { suggestByRules, type Suggestion } from '@lacajita/shared';
import { CatalogService } from '../catalog/catalog.service';
import { loadConfig } from '../config/config';

/** "¿Qué vas a cocinar?": Claude si hay llave; reglas locales como respaldo. Nunca queda caído. */
@Injectable()
export class AssistantService {
  private readonly log = new Logger(AssistantService.name);
  private readonly cfg = loadConfig().anthropic;
  constructor(private readonly catalog: CatalogService) {}

  async suggest(text: string): Promise<Suggestion> {
    const products = await this.catalog.list();
    const valid = new Set(products.map((p) => p.slug));
    if (this.cfg.apiKey) {
      try { return await this.byClaude(text, products, valid); } catch (e) { this.log.warn(`Asistente IA falló, uso reglas: ${(e as Error).message}`); }
    }
    const r = suggestByRules(text);
    return { slugs: r.slugs.filter((s) => valid.has(s)), tip: r.tip };
  }

  private async byClaude(text: string, products: { slug: string; name: string; tagline: string | null; pairing: string | null }[], valid: Set<string>): Promise<Suggestion> {
    const catalog = products.map((p) => `${p.slug}: ${p.name}. ${p.tagline ?? ''} Va con: ${p.pairing ?? ''}`).join('\n');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { 'content-type': 'application/json', 'x-api-key': this.cfg.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: this.cfg.model, max_tokens: 200,
        system: 'Eres el asistente de una tienda colombiana de conservas de pimentón. Recomiendas SOLO productos del catálogo. ' +
          'Responde únicamente JSON: {"slugs":["slug1","slug2"],"tip":"una frase en español de Colombia, máximo 25 palabras"}. Máximo 2 slugs.\n\nCatálogo:\n' + catalog,
        messages: [{ role: 'user', content: text.slice(0, 200) }],
      }),
    });
    if (!r.ok) throw new Error(`anthropic ${r.status}`);
    const j = (await r.json()) as { content?: { text?: string }[] };
    const out = JSON.parse((j.content ?? []).map((c) => c.text ?? '').join('').replace(/```json|```/g, '').trim());
    const slugs = (out.slugs as string[]).filter((s) => valid.has(s)).slice(0, 2);
    if (!slugs.length || typeof out.tip !== 'string') throw new Error('respuesta inválida');
    return { slugs, tip: out.tip.slice(0, 220) };
  }
}
