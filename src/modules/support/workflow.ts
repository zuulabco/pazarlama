import { normalizePhone, parseSheetId, sheetHeaders, type SupportConfig } from "./config";

/**
 * Kullanıcının seçimlerinden, içe aktarılabilir bir n8n iş akışı (JSON) üretir.
 * Kimlik bilgileri (credentials) bilerek eklenmez: kullanıcı bunları n8n içinde kendi hesabıyla bağlar.
 * Yalnızca seçilen kanallar/bildirimler için düğüm üretilir; kullanılmayan düğüm kalmaz.
 */

type Param = Record<string, unknown>;
type N8nNode = {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Param;
  webhookId?: string;
};
type Connections = Record<string, { main: { node: string; type: "main"; index: number }[][] }>;

export type N8nWorkflow = {
  name: string;
  nodes: N8nNode[];
  connections: Connections;
  active: false;
  settings: { executionOrder: "v1" };
  pinData: Record<string, never>;
};

export const names = {
  whatsappTrigger: "WhatsApp Tetikleyici",
  emailTrigger: "E-posta Tetikleyici (IMAP)",
  normalize: "Mesajı Düzenle",
  translate: "Mesajı Çevir",
  process: "Özet ve Öncelik",
  sheet: "Kayıt Tablosuna Yaz",
  adminEmail: "Yönetici E-postası",
  adminWhatsapp: "Yönetici WhatsApp Bildirimi",
  replyTranslate: "Yanıtı Müşteri Diline Çevir",
  sourceCheck: "Mesaj Kaynağı WhatsApp mı?",
  replyWhatsapp: "Müşteriye WhatsApp Yanıtı",
  replyEmail: "Müşteriye E-posta Yanıtı",
  note: "Kurulum Notu",
} as const;

const OWN = (name: string) => `$('${name}')`;

/** Kodun içine güvenle gömülecek metin (tırnak/ters bölü kaçışlı). */
const lit = (value: string) => JSON.stringify(value);

function normalizeCode(c: SupportConfig) {
  // Kendi adreslerimizden gelen postaları işlemeyiz; aksi halde bildirim/yanıt e-postaları döngü oluşturur.
  const own = [c.fromEmail, c.adminEmail].map((a) => a.trim().toLowerCase()).filter(Boolean);
  return String.raw`// Gelen mesajı tek biçime getirir (WhatsApp ve e-posta aynı yapıya dönüşür).
const OWN_ADDRESSES = ${JSON.stringify(own)};
const SKIP_SENDER = /(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounce|newsletter)/i;
const out = [];

$input.all().forEach((item, index) => {
  const d = item.json || {};
  let text = '';
  let sourceType = '';
  let sourceId = '';
  let senderName = '';
  let subject = '';

  if (Array.isArray(d.messages) && d.messages.length > 0) {
    const m = d.messages[0];
    sourceType = 'whatsapp';
    sourceId = String(m.from || '');
    senderName = (d.contacts && d.contacts[0] && d.contacts[0].profile && d.contacts[0].profile.name) || '';
    if (m.type === 'text' && m.text) text = m.text.body || '';
    else if (m.type === 'button' && m.button) text = m.button.text || '';
    else if (m.type === 'interactive' && m.interactive) {
      const reply = m.interactive.button_reply || m.interactive.list_reply || {};
      text = reply.title || '';
    } else {
      text = (m.image && m.image.caption) || (m.video && m.video.caption) || (m.document && m.document.caption) || '';
    }
    if (!text) text = '[' + (m.type || 'bilinmeyen') + ' türünde, metin içermeyen bir mesaj gönderildi]';
  } else if (d.from !== undefined || d.subject !== undefined) {
    sourceType = 'email';
    const rawFrom = typeof d.from === 'string'
      ? d.from
      : (d.from && (d.from.text || (d.from.value && d.from.value[0] && d.from.value[0].address))) || '';
    const found = rawFrom.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+/);
    sourceId = found ? found[0] : '';
    senderName = rawFrom.replace(/<[^>]*>/g, '').replace(/["']/g, '').trim();
    if (senderName.indexOf('@') !== -1) senderName = '';
    subject = String(d.subject || '');

    // Kendi bildirimlerimiz, otomatik yanıtlar ve toplu postalar atlanır.
    if (!sourceId || SKIP_SENDER.test(sourceId) || OWN_ADDRESSES.indexOf(sourceId.toLowerCase()) !== -1) return;
    if (/^\[Destek/i.test(subject)) return;
    const auto = d.headers && (d.headers['auto-submitted'] || d.headers['x-autoreply']);
    if (auto && String(auto).toLowerCase() !== 'no') return;

    const html = d.textHtml || d.html || '';
    const body = d.textPlain || d.text ||
      String(html).replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
    text = (subject ? subject + '\n' : '') + body;
  } else {
    return; // Mesaj olmayan olaylar (okundu bilgisi vb.) yok sayılır.
  }

  text = text.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  if (!text) return;
  if (text.length > 5000) text = text.substring(0, 5000) + '... [kısaltıldı]';

  const referenceId = 'DST-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  out.push({
    json: {
      originalMessage: text,
      sourceType: sourceType,
      sourceId: sourceId,
      senderName: senderName,
      subject: subject,
      referenceId: referenceId,
      timestamp: new Date().toISOString(),
      receivedAt: new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
      messageLength: text.length,
    },
    pairedItem: { item: index },
  });
});

return out;`;
}

function processCode(c: SupportConfig) {
  return String.raw`// Özet çıkarır, öncelik belirler ve bildirim metinlerini hazırlar.
// Öncelik kuralları anahtar kelimeye dayanır; aşağıdaki listeleri kendi işinize göre düzenleyebilirsiniz.
const OWNER_LANG = ${lit(c.language)};
const SOURCE_LABELS = { whatsapp: 'WhatsApp', email: 'E-posta' };
const URGENT = ['urgent', 'emergency', 'asap', 'immediately', 'critical', 'lawsuit', 'legal action', 'fraud',
  'acil', 'hemen', 'derhal', 'kritik', 'avukat', 'yasal işlem', 'dolandır', 'mağdur'];
const ISSUE = ['problem', 'issue', 'error', 'bug', 'complaint', 'broken', 'refund', 'cancel', 'not working', 'help',
  'sorun', 'hata', 'şikayet', 'bozuk', 'iade', 'iptal', 'çalışmıyor', 'yardım', 'memnun değil'];

function has(text, list) {
  const a = text.toLowerCase();
  const b = text.toLocaleLowerCase('tr');
  return list.some((k) => a.indexOf(k) !== -1 || b.indexOf(k) !== -1);
}

function summarize(text, maxLength) {
  if (text.length <= maxLength) return text;
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length <= 2) return text.substring(0, maxLength - 3) + '...';
  const picked = [sentences[0].trim()];
  sentences.forEach((s) => {
    const t = s.trim();
    if (picked.indexOf(t) === -1 && (has(t, URGENT) || has(t, ISSUE))) picked.push(t);
  });
  const last = sentences[sentences.length - 1].trim();
  if (picked.indexOf(last) === -1) picked.push(last);
  const summary = picked.join(' ');
  return summary.length > maxLength ? summary.substring(0, maxLength - 3) + '...' : summary;
}

return $input.all().map((item, index) => {
  const base = $(${lit(names.normalize)}).itemMatching(index).json;
  const t = item.json || {};
  const translated = t.translatedText || base.originalMessage;
  const language = String(t.detectedSourceLanguage || OWNER_LANG).toLowerCase();

  const scan = base.originalMessage + '\n' + translated;
  const priority = has(scan, URGENT) ? 'YÜKSEK' : has(scan, ISSUE) ? 'ORTA' : 'DÜŞÜK';
  const icon = priority === 'YÜKSEK' ? '🔴' : priority === 'ORTA' ? '🟠' : '🟢';
  const summary = summarize(translated, 160);
  const channel = SOURCE_LABELS[base.sourceType] || base.sourceType;
  const who = base.senderName ? base.senderName + ' (' + base.sourceId + ')' : base.sourceId;

  return {
    json: {
      ...base,
      translatedText: translated,
      originalLanguage: language,
      summary: summary,
      priority: priority,
      priorityIcon: icon,
      channelLabel: channel,
      senderLabel: who,
      wordCount: translated.split(/\s+/).length,
      emailSubject: '[Destek • ' + priority + '] ' + channel + ' • ' + language.toUpperCase() + (base.senderName ? ' • ' + base.senderName : ''),
      notificationText: icon + ' Öncelik: ' + priority + '\nKanal: ' + channel + '\nGönderen: ' + who + '\nDil: ' + language.toUpperCase() + '\nReferans: ' + base.referenceId + '\n\nÖzet: ' + summary,
    },
    pairedItem: { item: index },
  };
});`;
}

const uid = (n: number) => `5a1e0000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function buildWorkflow(input: SupportConfig): N8nWorkflow {
  // Süslü parantez n8n ifadesi başlatabilir; işletme adından çıkarılır.
  const c = { ...input, businessName: input.businessName.replace(/[{}]/g, "").trim() };
  const nodes: N8nNode[] = [];
  const connections: Connections = {};
  let counter = 0;

  const add = (name: string, type: string, typeVersion: number, position: [number, number], parameters: Param, extra: Partial<N8nNode> = {}) => {
    counter += 1;
    nodes.push({ id: uid(counter), name, type, typeVersion, position, parameters, ...extra });
    return name;
  };
  const link = (from: string, to: string, output = 0) => {
    const entry = (connections[from] ??= { main: [] });
    while (entry.main.length <= output) entry.main.push([]);
    entry.main[output].push({ node: to, type: "main", index: 0 });
  };

  const src = OWN(names.process);
  const sender = c.fromEmail.trim();

  // ── Girdi ────────────────────────────────────────────────────────────────
  const triggers: string[] = [];
  let y = 0;
  if (c.whatsapp) {
    triggers.push(
      add(names.whatsappTrigger, "n8n-nodes-base.whatsAppTrigger", 1, [-1100, y], { updates: ["messages"], options: {} }, { webhookId: "5a1e0000-0000-4000-8000-0000000000a1" }),
    );
    y += 220;
  }
  if (c.email) {
    triggers.push(
      add(names.emailTrigger, "n8n-nodes-base.emailReadImap", 2, [-1100, y], { mailbox: "INBOX", postProcessAction: "read", format: "simple", options: {} }),
    );
  }

  // ── Düzenleme, çeviri, özet ──────────────────────────────────────────────
  add(names.normalize, "n8n-nodes-base.code", 2, [-860, 110], { jsCode: normalizeCode(c) });
  add(names.translate, "n8n-nodes-base.googleTranslate", 2, [-620, 110], {
    text: "={{ $json.originalMessage }}",
    translateTo: c.language,
    authentication: "serviceAccount",
  });
  add(names.process, "n8n-nodes-base.code", 2, [-380, 110], { jsCode: processCode(c) });
  triggers.forEach((t) => link(t, names.normalize));
  link(names.normalize, names.translate);
  link(names.translate, names.process);

  // ── Çıkışlar ─────────────────────────────────────────────────────────────
  const outputs: [string, number][] = [];
  let oy = -180;
  const nextY = () => (oy += 220) - 220;

  if (c.logSheet) {
    const value = Object.fromEntries(
      [
        ["Tarih", "={{ $json.receivedAt }}"],
        ["Referans", "={{ $json.referenceId }}"],
        ["Kanal", "={{ $json.channelLabel }}"],
        ["Gönderen", "={{ $json.sourceId }}"],
        ["Ad", "={{ $json.senderName }}"],
        ["Dil", "={{ $json.originalLanguage }}"],
        ["Öncelik", "={{ $json.priority }}"],
        ["Özet", "={{ $json.summary }}"],
        ["Çeviri", "={{ $json.translatedText }}"],
        ["Orijinal Mesaj", "={{ $json.originalMessage }}"],
        ["Durum", "Yeni"],
      ] satisfies [(typeof sheetHeaders)[number], string][],
    );
    const sheet = add(names.sheet, "n8n-nodes-base.googleSheets", 4, [-120, nextY()], {
      authentication: "serviceAccount",
      operation: "append",
      documentId: { __rl: true, mode: "id", value: parseSheetId(c.sheetId) },
      sheetName: { __rl: true, mode: "name", value: c.sheetTab.trim() },
      columns: { mappingMode: "defineBelow", value, matchingColumns: [], schema: [] },
      options: {},
    });
    outputs.push([sheet, 0]);
  }

  if (c.notifyEmail) {
    const node = add(names.adminEmail, "n8n-nodes-base.emailSend", 2.1, [-120, nextY()], {
      fromEmail: sender,
      toEmail: c.adminEmail.trim(),
      subject: "={{ $json.emailSubject }}",
      emailFormat: "text",
      text: "={{ $json.notificationText }}\n\nÇEVİRİ\n{{ $json.translatedText }}\n\nORİJİNAL MESAJ\n{{ $json.originalMessage }}",
      options: {},
    });
    outputs.push([node, 0]);
  }

  if (c.notifyWhatsapp) {
    const node = add(names.adminWhatsapp, "n8n-nodes-base.whatsApp", 1, [-120, nextY()], {
      operation: "send",
      phoneNumberId: c.phoneNumberId.trim(),
      recipientPhoneNumber: normalizePhone(c.adminPhone),
      textBody: "={{ $json.notificationText }}\n\nÇeviri: {{ $json.translatedText }}",
      additionalFields: {},
    });
    outputs.push([node, 0]);
  }

  if (c.autoReply) {
    const signature = `\n\n— ${c.businessName.trim()}`;
    const reference = `\nRef: {{ ${src}.item.json.referenceId }}`;
    const translateReply = add(names.replyTranslate, "n8n-nodes-base.googleTranslate", 2, [-120, nextY()], {
      // Yanıt, gelen mesajın algılanan diline çevrilir; sabit metin olduğu için ifade değildir.
      text: c.replyText.trim(),
      translateTo: `={{ ${src}.item.json.originalLanguage }}`,
      authentication: "serviceAccount",
    });
    outputs.push([translateReply, 0]);

    const waReply = c.whatsapp
      ? add(names.replyWhatsapp, "n8n-nodes-base.whatsApp", 1, [380, oy - 220], {
          operation: "send",
          phoneNumberId: c.phoneNumberId.trim(),
          recipientPhoneNumber: `={{ ${src}.item.json.sourceId }}`,
          textBody: `={{ $json.translatedText }}${signature}${reference}`,
          additionalFields: {},
        })
      : null;
    const mailReply = c.email
      ? add(names.replyEmail, "n8n-nodes-base.emailSend", 2.1, [380, oy], {
          fromEmail: sender,
          toEmail: `={{ ${src}.item.json.sourceId }}`,
          subject: `={{ ${src}.item.json.subject ? 'Re: ' + ${src}.item.json.subject : 'Ref: ' + ${src}.item.json.referenceId }}`,
          emailFormat: "text",
          text: `={{ $json.translatedText }}${signature}${reference}`,
          options: {},
        })
      : null;

    if (waReply && mailReply) {
      const check = add(names.sourceCheck, "n8n-nodes-base.if", 2, [140, oy - 110], {
        conditions: {
          options: { leftValue: "", caseSensitive: true, typeValidation: "strict" },
          combinator: "and",
          conditions: [
            {
              id: "kaynak-whatsapp",
              operator: { type: "string", operation: "equals" },
              leftValue: `={{ ${src}.item.json.sourceType }}`,
              rightValue: "whatsapp",
            },
          ],
        },
        options: {},
      });
      link(translateReply, check);
      link(check, waReply, 0);
      link(check, mailReply, 1);
    } else {
      link(translateReply, (waReply ?? mailReply)!);
    }
  }

  outputs.forEach(([name]) => link(names.process, name));

  add(names.note, "n8n-nodes-base.stickyNote", 1, [-1100, -330], {
    color: 4,
    width: 620,
    height: 200,
    content:
      "### Sinyal • Çok Dilli Müşteri Destek Otomasyonu\n" +
      `**${c.businessName.trim()}** için hazırlandı. Şifre ve erişim anahtarı içermez.\n\n` +
      "1. Kırmızı uyarılı her düğümü açıp kendi hesabınızı (credential) seçin.\n" +
      "2. Sağ üstten **Execute workflow** ile deneyin.\n" +
      "3. Sorunsuzsa akışı etkinleştirin (Active / Publish).",
  });

  return {
    name: `${c.businessName.trim()} • Çok Dilli Müşteri Desteği`,
    nodes,
    connections,
    active: false,
    settings: { executionOrder: "v1" },
    pinData: {},
  };
}

export const workflowFileName = "sinyal-destek-otomasyonu.json";

/** n8n düğüm türü → kullanıcının n8n'de oluşturması gereken kimlik bilgisi (credential) türü. */
const credentialTypes: Record<string, string> = {
  "n8n-nodes-base.whatsAppTrigger": "WhatsApp OAuth API",
  "n8n-nodes-base.whatsApp": "WhatsApp API",
  "n8n-nodes-base.emailReadImap": "IMAP",
  "n8n-nodes-base.emailSend": "SMTP",
  "n8n-nodes-base.googleTranslate": "Google Service Account API",
  "n8n-nodes-base.googleSheets": "Google Service Account API",
};

/** Üretilen akıştaki, kimlik bilgisi bağlanması gereken düğümler. */
export function credentialSlots(workflow: N8nWorkflow) {
  return workflow.nodes.flatMap((n) => (credentialTypes[n.type] ? [{ node: n.name, credential: credentialTypes[n.type] }] : []));
}
