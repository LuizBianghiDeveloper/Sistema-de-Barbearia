export type SendResult =
  | { ok: true; simulated?: boolean }
  | { ok: false; error: string }

/** Normaliza o telefone para o formato da Z-API: só dígitos, com DDI 55. */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "")
  if (d.length <= 11) d = "55" + d // adiciona DDI Brasil se veio sem
  return d
}

/**
 * Envia uma mensagem de texto por WhatsApp via Z-API.
 * Sem as variáveis de ambiente (ZAPI_*), entra em MODO SIMULAÇÃO:
 * apenas registra no log o que seria enviado — útil em desenvolvimento.
 */
export async function sendWhatsapp(
  phoneRaw: string,
  message: string
): Promise<SendResult> {
  const instance = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN
  const phone = normalizePhone(phoneRaw)

  if (!instance || !token) {
    console.log(`[whatsapp:simulado] -> ${phone}\n${message}\n`)
    return { ok: true, simulated: true }
  }

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instance}/token/${token}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(clientToken ? { "Client-Token": clientToken } : {}),
        },
        body: JSON.stringify({ phone, message }),
      }
    )
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return { ok: false, error: `Z-API ${res.status} ${body}`.trim() }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
