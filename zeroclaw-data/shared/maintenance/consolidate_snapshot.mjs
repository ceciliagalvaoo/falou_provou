// Fixes a real, disclosed limitation (evidence/pix-rail-2026-07-29.md,
// "Cross-rail reconciliation was unproven and shape-mismatched"):
// `contador`'s only read path is `memory_recall`, a BM25 search over a
// memory store with 50+ entries - not guaranteed to surface every
// matching row for a broad "sum everything" question, confirmed
// empirically by two live runs of the same query producing different
// totals.
//
// This script does the opposite: a full, deterministic table scan (no
// search, no LLM) over every `invoice_*_verification` (Solana rail) and
// `pix_*_verification` (Pix rail) row, computed on a schedule via a
// zero-LLM-cost shell-type cron job (same pattern as
// find_unrecorded_pulls.mjs / reap_stale_sop_runs.py), and writes the
// result as ONE pinned `core` memory under `contador`'s own agent_id.
// `contador` still only ever calls `memory_recall` - no new tool, no new
// allowed_roots, no shell access is granted to `contador` itself. This
// keeps its "zero write / zero funds-moving tool by construction"
// guarantee completely untouched while fixing the actual accuracy
// problem at its root (an unreliable search) instead of asking the LLM
// to somehow search more carefully.
//
// Deliberately does NOT try to filter out core-engine-agent's own
// test/debug invoices (client names like "teste", "limpo") - there is no
// schema field reliably distinguishing them from real ones, and silently
// guessing which rows to exclude would be a worse dishonesty than
// disclosing the true, unfiltered count. The snapshot's own metadata
// reports how many rows were scanned so this is never hidden.

import { DatabaseSync } from "node:sqlite";

const BRAIN_DB_PATH = "/mnt/c/Users/Inteli/Downloads/claim_chain/zeroclaw-data/data/memory/brain.db";
const CONTADOR_AGENT_ID = "fd441a65-b580-4dff-b1d2-a2a6cc2ade1d";
// Deliberately the SAME key as the pinned instructions memory (not a
// separate "snapshot" key) - a real live test showed memory_recall's
// search sometimes returns the instructions entry instead of a
// separately-keyed snapshot entry (the instructions text itself contains
// the snapshot's key name, so BM25 scores it highly for that query,
// crowding out the actual data). Keeping the live numbers IN the same
// entry the instructions live in means there is no second retrieval to
// get wrong - whichever entry surfaces, it already has both.
const SNAPSHOT_KEY = "contador_synthesis_rules";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const STATIC_RULES = `INSTRUCOES DE SINTESE DE RESPOSTA - siga sempre, sem excecao:
1. Ao reportar o estado de qualquer entrada (fatura, Pix, etc.), use sempre o campo \`state\` gravado na propria entrada, verbatim: FALOU, PROVOU ou NAO_PROVOU. NUNCA junte NAO_PROVOU num balde generico de 'pendente' ou 'FALOU' - sao coisas diferentes. FALOU significa 'alegado, ainda nao verificado'. NAO_PROVOU significa 'verificado contra a fonte real, e a fonte negou ou nao confirmou' - e uma situacao mais seria, sempre reporte-a separadamente e com destaque.
2. Para responder 'quanto consolidou' (semana ou total): use DIRETAMENTE os numeros da secao DADOS_CONSOLIDADOS abaixo, nesta mesma memoria - NAO tente somar manualmente entradas via memory_recall, essa busca e por relevancia (BM25) e pode nao trazer todas as entradas, dando um total errado. Os numeros abaixo vem de uma varredura completa e deterministica da tabela (nao uma busca), recalculada a cada 30 minutos.
3. Se a secao DADOS_CONSOLIDADOS parecer desatualizada (campo computed_at muito antigo) ou ausente, avise o usuario explicitamente - nao tente somar manualmente como fallback, isso reintroduz o problema que esse mecanismo existe para evitar.`;

async function fetchPtaxVenda() {
  const today = new Date().toISOString().slice(0, 10).replaceAll("-", "-");
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString().slice(0, 10);
  const fmt = (iso) => {
    const [y, m, d] = iso.split("-");
    return `${m}-${d}-${y}`;
  };
  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${fmt(weekAgo)}'&@dataFinalCotacao='${fmt(today)}'&$format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const rows = data.value || [];
    if (rows.length === 0) return null;
    return rows[rows.length - 1].cotacaoVenda; // most recent day in the window
  } catch {
    return null;
  }
}

function scanRail(db, keyPattern, amountField) {
  const rows = db.prepare(
    "SELECT key, content, created_at FROM memories WHERE key LIKE ?"
  ).all(keyPattern);

  const buckets = {
    PROVOU: { count: 0, total: 0 },
    NAO_PROVOU: { count: 0, total: 0 },
    FALOU: { count: 0, total: 0 },
  };
  const bucketsWeek = {
    PROVOU: { count: 0, total: 0 },
    NAO_PROVOU: { count: 0, total: 0 },
    FALOU: { count: 0, total: 0 },
  };
  const now = Date.now();
  let scanned = 0;
  let unparsed = 0;

  for (const row of rows) {
    scanned++;
    let parsed;
    try {
      parsed = JSON.parse(row.content);
    } catch {
      unparsed++;
      continue;
    }
    const state = parsed.state;
    if (!state || !(state in buckets)) continue;
    const amount = parseFloat(parsed[amountField]);
    if (Number.isNaN(amount)) continue;

    buckets[state].count++;
    buckets[state].total += amount;

    if (now - Date.parse(row.created_at) <= WEEK_MS) {
      bucketsWeek[state].count++;
      bucketsWeek[state].total += amount;
    }
  }

  return { allTime: buckets, last7Days: bucketsWeek, rowsScanned: scanned, rowsUnparsed: unparsed };
}

async function main() {
  const readDb = new DatabaseSync(BRAIN_DB_PATH, { readOnly: true });
  const solana = scanRail(readDb, "invoice_%_verification", "amount");
  const pix = scanRail(readDb, "pix_%_verification", "amount_brl");
  readDb.close();

  const ptaxVenda = await fetchPtaxVenda();

  const consolidatedBrlLast7Days = ptaxVenda
    ? solana.last7Days.PROVOU.total * ptaxVenda + pix.last7Days.PROVOU.total
    : null;
  const consolidatedBrlAllTime = ptaxVenda
    ? solana.allTime.PROVOU.total * ptaxVenda + pix.allTime.PROVOU.total
    : null;

  const snapshot = {
    computed_at: new Date().toISOString(),
    ptax_venda_rate: ptaxVenda,
    ptax_note: ptaxVenda === null ? "PTAX unavailable this run - BRL conversion of the USDC subtotal could not be computed, report the raw USDC subtotal instead" : undefined,
    solana_usdc: solana,
    pix_brl: pix,
    consolidated_brl_last_7_days: consolidatedBrlLast7Days,
    consolidated_brl_all_time: consolidatedBrlAllTime,
    method: "full deterministic table scan (node:sqlite, no search/LLM involved), not a memory_recall search - see zeroclaw-data/shared/maintenance/consolidate_snapshot.mjs",
  };

  const content = `${STATIC_RULES}\n\nDADOS_CONSOLIDADOS (recalculado automaticamente, nao editar a mao):\n${JSON.stringify(snapshot, null, 2)}`;

  const writeDb = new DatabaseSync(BRAIN_DB_PATH);
  const existing = writeDb.prepare("SELECT id FROM memories WHERE key = ?").get(SNAPSHOT_KEY);
  const now = new Date().toISOString();
  if (existing) {
    writeDb.prepare("UPDATE memories SET content = ?, updated_at = ? WHERE key = ?")
      .run(content, now, SNAPSHOT_KEY);
  } else {
    writeDb.prepare(
      `INSERT INTO memories (id, key, content, category, embedding, created_at, updated_at, session_id, namespace, importance, superseded_by, agent_id, kind, pinned, tenant_id)
       VALUES (?, ?, ?, 'core', NULL, ?, ?, NULL, 'default', 0.95, NULL, ?, NULL, 1, NULL)`
    ).run(crypto.randomUUID(), SNAPSHOT_KEY, content, now, now, CONTADOR_AGENT_ID);
  }
  writeDb.close();

  console.log(JSON.stringify({ ok: true, snapshot }));
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
