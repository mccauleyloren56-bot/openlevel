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
  const parts = name.split(/[^A-Za-z0-9]+/).filter(Boolean)
  if (parts.length === 0) return undefined

  const [scope, ...secretParts] = parts
  const documentedKey = [scope, ...secretParts.map((part) => part.toUpperCase())].join('_')
  const preservedKey = parts.join('_')
  const uppercaseKey = preservedKey.toUpperCase()

  return (
    process.env[documentedKey] ??
    process.env[preservedKey] ??
    process.env[uppercaseKey]
  )
}
