import type { GoogleGenAI } from '@google/genai';

/**
 * Point d'entrée unique et sûr vers l'API Gemini.
 *
 * Contraintes de conception :
 * - Aucun effet de bord au chargement du module (pas d'import statique du SDK,
 *   pas d'appel réseau, pas de lecture bloquante).
 * - `@google/genai` est chargé dynamiquement (lazy) et mémoïsé.
 * - Aucune fonction ne jette d'erreur vers l'appelant : retour `null` en cas
 *   d'absence de clé ou d'échec.
 */

const DEFAULT_MODEL = 'gemini-2.5-flash';
const PLACEHOLDER_API_KEY = 'MY_GEMINI_API_KEY';

/** Client mémoïsé (résolution unique du module dynamique). */
let cachedClient: Promise<GoogleGenAI | null> | null = null;

/** Empêche les avertissements répétés en console. */
let hasWarned = false;

function warnOnce(message: string, error?: unknown): void {
  if (hasWarned) return;
  hasWarned = true;
  if (error === undefined) {
    console.warn(`[IA] ${message}`);
  } else {
    console.warn(`[IA] ${message}`, error);
  }
}

/**
 * Lit `import.meta.env.GEMINI_API_KEY` de façon défensive : retourne la clé
 * nettoyée, ou `null` si absente / vide / factice.
 */
function readApiKey(): string | null {
  const env = import.meta.env as unknown as { GEMINI_API_KEY?: unknown };
  const raw = env.GEMINI_API_KEY;
  if (typeof raw !== 'string') return null;
  const key = raw.trim();
  if (key.length === 0 || key === PLACEHOLDER_API_KEY) return null;
  return key;
}

/** Indique si l'IA est exploitable (clé Gemini présente et non factice). */
export function isAiEnabled(): boolean {
  return readApiKey() !== null;
}

async function loadClient(apiKey: string): Promise<GoogleGenAI | null> {
  try {
    const { GoogleGenAI: GoogleGenAIClient } = await import('@google/genai');
    return new GoogleGenAIClient({ apiKey });
  } catch (error) {
    warnOnce('Impossible de charger le client Gemini.', error);
    return null;
  }
}

/**
 * Retourne le client Gemini (mémoïsé), ou `null` si l'IA est désactivée.
 */
export function getClient(): Promise<GoogleGenAI | null> {
  const apiKey = readApiKey();
  if (apiKey === null) return Promise.resolve(null);
  if (cachedClient === null) {
    cachedClient = loadClient(apiKey);
  }
  return cachedClient;
}

/**
 * Génère du texte via Gemini. Ne jette jamais : retourne `null` quand l'IA est
 * désactivée ou en cas d'erreur (avec un unique avertissement en français).
 */
export async function generateText(
  prompt: string,
  opts: { systemInstruction?: string } = {},
): Promise<string | null> {
  if (!isAiEnabled()) {
    warnOnce('Fonctionnalité IA désactivée : GEMINI_API_KEY absente ou factice.');
    return null;
  }

  try {
    const client = await getClient();
    if (client === null) return null;

    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: opts.systemInstruction
        ? { systemInstruction: opts.systemInstruction }
        : undefined,
    });

    return response.text ?? null;
  } catch (error) {
    warnOnce('Échec de la génération de texte via Gemini.', error);
    return null;
  }
}
