/**
 * Resolve a secret by name.
 *
 * Slice 1: reads from process.env, mapping a vault item name like
 * "Alex:chatwoot:api_token" to the env key Alex_CHATWOOT_API_TOKEN.
 *
 * Later (D-36): this swaps for the Vaultwarden machine API. The agent never
 * sees a raw secret — this layer fetches the value and hands it only to the
 * outbound caller (e.g. the Chatwoot client), then the agent gets a
 * confirmation, not the credential.
 */
export function resolveSecret(name: string): string | undefined {
  // Preserve meaningful casing in the vault item name so the documented mapping
  // remains exact on case-sensitive hosts (Linux/GitHub Actions). Keep the legacy
  // all-uppercase lookup as a fallback so existing deployments are not broken.
  const envKey = name.replace(/[^A-Za-z0-9]+/g, '_')
  return process.env[envKey] ?? process.env[envKey.toUpperCase()]
}
