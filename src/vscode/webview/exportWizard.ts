import type { ExportProfile, ExportSectionDefinition, SessionSummary } from "../../core/types";
import type { UiState } from "../state/uiStateStore";

interface ChildSessionPreview {
  sessionId: string;
  title: string;
  updatedAt: string;
  agentNickname?: string;
  agentRole?: string;
  parentSessionId?: string;
  previewText: string;
}

type SessionTypeFilter = "all" | "main" | "child" | "internal";

export interface RecentExportEntry {
  id: string;
  outputDir: string;
  createdAt: string;
  exportedCount: number;
  primaryDocumentPath?: string;
}

export interface AppShellConfig {
  mode: "vscode" | "desktop";
  codexRoot?: string;
  canCreateDesktopShortcut?: boolean;
  recentExports?: RecentExportEntry[];
}

export interface ExportWizardRenderInput {
  profiles: ExportProfile[];
  sections: ExportSectionDefinition[];
  sessions: SessionSummary[];
  childPreviewMap: Record<string, ChildSessionPreview[]>;
  uiState: UiState;
  maxSessionsInWizard?: number;
  appShell?: AppShellConfig;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getSessionType(session: SessionSummary): Exclude<SessionTypeFilter, "all"> {
  if (session.isInternal) {
    return "internal";
  }
  if (session.parentSessionId) {
    return "child";
  }
  return "main";
}

function getSessionTypeLabel(session: SessionSummary): string {
  const sessionType = getSessionType(session);
  if (sessionType === "internal") {
    return "Internal session";
  }
  if (sessionType === "child") {
    return "Child session";
  }
  return "Main session";
}

function renderProfileOptions(profiles: ExportProfile[], selectedProfileId: string): string {
  return profiles
    .map(
      (profile) =>
        `<option value="${escapeHtml(profile.id)}" ${profile.id === selectedProfileId ? "selected" : ""}>${escapeHtml(profile.name)}</option>`
    )
    .join("");
}

function renderSectionItems(sections: ExportSectionDefinition[]): string {
  return sections
    .map(
      (section) => `
        <label class="section-row">
          <input class="section-checkbox" type="checkbox" data-section-id="${escapeHtml(section.id)}" />
          <div class="section-main">
            <div class="section-title">${escapeHtml(section.label)}</div>
            <div class="section-raw">${escapeHtml(section.rawFieldNames.join(", "))}</div>
            <div class="section-desc">${escapeHtml(section.shortDescription)}</div>
          </div>
        </label>
      `
    )
    .join("");
}

function renderChildPreviewItems(children: ChildSessionPreview[]): string {
  return children
    .map(
      (child) => `
        <article class="child-card">
          <div class="child-header">
            <div>
              <div class="child-title">${escapeHtml(child.title)}</div>
              <div class="child-meta">${escapeHtml(child.agentNickname || "Subagent")} · ${escapeHtml(child.agentRole || "default")} · ${escapeHtml(child.updatedAt)}</div>
            </div>
            <code>${escapeHtml(child.sessionId)}</code>
          </div>
          <div class="child-preview">${escapeHtml(child.previewText)}</div>
        </article>
      `
    )
    .join("");
}

function renderRelationshipBox(session: SessionSummary, childPreviews: ChildSessionPreview[]): string {
  const sessionType = getSessionType(session);
  if (sessionType === "internal") {
    return `
      <div class="relationship-box relationship-box--internal">
        <div>
          <div class="relationship-title">Internal maintenance session</div>
          <div class="relationship-text">There is no reliable parent link, so it is exported as a standalone session folder.</div>
        </div>
        <span class="relationship-pill">${escapeHtml(session.internalCategory || "internal")}</span>
      </div>
    `;
  }

  if (sessionType === "child") {
    return `
      <div class="relationship-box relationship-box--child">
        <div>
          <div class="relationship-title">Child session parent link</div>
          <div class="relationship-text">Parent Session ID: ${escapeHtml(session.parentSessionId || "unknown")}</div>
        </div>
        <span class="relationship-pill">subagent</span>
      </div>
    `;
  }

  if (childPreviews.length === 0) {
    return "";
  }

  return `
    <div class="relationship-box relationship-box--main">
      <div>
        <div class="relationship-title">Child session appendix</div>
        <div class="relationship-text">This main session has ${escapeHtml(String(childPreviews.length))} verifiable child session(s) that can be exported together with it.</div>
      </div>
      <button type="button" class="toggle-button" data-child-toggle="${escapeHtml(session.sessionId)}">Expand to view child sessions</button>
    </div>
  `;
}

function renderSessionItems(
  sessions: SessionSummary[],
  selectedSessionIds: string[],
  childPreviewMap: Record<string, ChildSessionPreview[]>
): string {
  const selected = new Set(selectedSessionIds);

  return sessions
    .map((session) => {
      const childPreviews = childPreviewMap[session.sessionId] ?? [];
      const sessionType = getSessionType(session);
      const searchText = [
        session.title,
        session.sessionId,
        session.cwd,
        session.kind,
        session.parentSessionId,
        session.internalCategory,
        getSessionTypeLabel(session)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return `
        <article class="session-card" data-session-card data-session-id="${escapeHtml(session.sessionId)}" data-session-type="${escapeHtml(sessionType)}" data-first-message-at="${escapeHtml(session.firstMessageAt || session.timestamp || "")}" data-last-message-at="${escapeHtml(session.lastMessageAt || session.updatedAt || session.timestamp || "")}" data-search-text="${escapeHtml(searchText)}">
          <div class="session-select">
            <input class="session-checkbox" type="checkbox" data-session-id="${escapeHtml(session.sessionId)}" ${selected.has(session.sessionId) ? "checked" : ""} />
          </div>
          <div class="session-main">
            <div class="session-top">
              <div class="session-heading">
                <div class="session-title">${escapeHtml(session.title || "Untitled Session")}</div>
                <div class="session-subtitle">First: ${escapeHtml(session.firstMessageAt || session.timestamp || "unknown")} · Last: ${escapeHtml(session.lastMessageAt || session.updatedAt || session.timestamp || "unknown")}</div>
              </div>
              <div class="session-time">Updated ${escapeHtml(session.updatedAt || session.timestamp)}</div>
            </div>
            <div class="session-tags">
              <span class="tag type-tag type-tag--${escapeHtml(sessionType)}">${escapeHtml(getSessionTypeLabel(session))}</span>
              <span class="tag platform-tag">${escapeHtml(session.kind)}</span>
              ${childPreviews.length > 0 ? `<span class="tag child-tag">+${escapeHtml(String(childPreviews.length))} child session(s)</span>` : ""}
            </div>
            ${renderRelationshipBox(session, childPreviews)}
            <div class="session-meta"><code>${escapeHtml(session.sessionId)}</code><span class="session-cwd">${escapeHtml(session.cwd || "Unknown CWD")}</span></div>
            ${childPreviews.length > 0 ? `<div class="child-panel" data-child-panel="${escapeHtml(session.sessionId)}" hidden>${renderChildPreviewItems(childPreviews)}</div>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

function countSessionsByType(sessions: SessionSummary[]): Record<Exclude<SessionTypeFilter, "all"> | "total", number> {
  return sessions.reduce<Record<Exclude<SessionTypeFilter, "all"> | "total", number>>(
    (stats, session) => {
      stats.total += 1;
      stats[getSessionType(session)] += 1;
      return stats;
    },
    { total: 0, internal: 0, child: 0, main: 0 }
  );
}

function renderRecentExports(entries: RecentExportEntry[]): string {
  if (entries.length === 0) {
    return `<div class="empty-state empty-state--compact">No exports yet. Your recent exports will appear here after you finish one.</div>`;
  }

  return entries
    .map(
      (entry) => `
        <article class="history-card">
          <div class="history-copy">
            <div class="history-title">${escapeHtml(entry.outputDir.split(/[\\/]/).pop() || entry.outputDir)}</div>
            <p class="history-meta">${escapeHtml(entry.createdAt)} · ${escapeHtml(String(entry.exportedCount))} session(s)</p>
            <p class="history-path">${escapeHtml(entry.outputDir)}</p>
          </div>
          <div class="history-actions">
            ${
              entry.primaryDocumentPath
                ? `<button type="button" class="button" data-history-open-document="${escapeHtml(entry.primaryDocumentPath)}">Open transcript</button>`
                : ""
            }
            <button type="button" class="button" data-history-open-folder="${escapeHtml(entry.outputDir)}">Open folder</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderDesktopShell(input: ExportWizardRenderInput): string {
  if (input.appShell?.mode !== "desktop") {
    return "";
  }

  return `
    <section class="desktop-shell-card">
      <div class="desktop-shell-header">
        <div>
          <h2 class="desktop-shell-title">Desktop enhancements</h2>
          <p class="desktop-shell-copy">Manage the standalone exe's data root folder, recent export history and shortcuts here.</p>
        </div>
        ${
          input.appShell.canCreateDesktopShortcut
            ? `<button type="button" class="button" id="create-shortcut-button">Create desktop shortcut</button>`
            : ""
        }
      </div>
      <div class="desktop-shell-grid">
        <section class="settings-card">
          <div class="field-group">
            <label class="field-label" for="codex-root">Codex data folder</label>
            <div class="search-row">
              <input class="input" id="codex-root" type="text" value="${escapeHtml(input.appShell.codexRoot || "")}" placeholder="Select the .codex folder" />
              <button class="button" id="pick-codex-root">Browse</button>
              <span></span>
            </div>
            <p class="field-help">The session list is rescanned after switching; no need to restart the app.</p>
          </div>
        </section>
        <section class="settings-card">
          <div class="desktop-history-header">
            <div>
              <h3>Recent export history</h3>
              <p class="field-help">Keeps the last few exports so you can quickly revisit a transcript or open its folder.</p>
            </div>
          </div>
          <div class="history-list" id="recent-export-list">${renderRecentExports(input.appShell.recentExports || [])}</div>
        </section>
      </div>
    </section>
  `;
}

export function renderExportWizardHtml(input: ExportWizardRenderInput): string {
  const initialData = JSON.stringify(input).replace(/</g, "\\u003c");
  const maxSessions = input.maxSessionsInWizard ?? 1000;
  const renderedSessions = input.sessions.slice(0, maxSessions);
  const selectedCount = input.uiState.selectedSessionIds.length;
  const stats = countSessionsByType(input.sessions);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Codex Chat Exporter</title>
    <style>
      :root{color-scheme:light;--bg1:#f8fbff;--bg2:#f4f7fd;--card:rgba(255,255,255,.82);--card-strong:rgba(255,255,255,.92);--line:rgba(183,196,219,.34);--line-soft:rgba(183,196,219,.22);--text:#22324d;--muted:#6f819d;--shadow:0 14px 30px rgba(76,97,136,.1);--scroll:rgba(155,170,196,.28)}
      *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:var(--scroll) transparent}
      html,body{margin:0;min-height:100%;font-family:"Inter","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:var(--text);background:radial-gradient(circle at 8% 12%,rgba(194,223,255,.92),transparent 22%),radial-gradient(circle at 92% 10%,rgba(255,227,236,.88),transparent 20%),linear-gradient(180deg,var(--bg1) 0%,var(--bg2) 100%)}
      body{overflow:auto}
      .page{width:min(1500px,calc(100vw - 40px));min-height:calc(100vh - 40px);margin:20px auto;padding:22px;border-radius:30px;border:1px solid rgba(255,255,255,.78);background:linear-gradient(180deg,rgba(255,255,255,.58),rgba(255,255,255,.34));backdrop-filter:blur(24px) saturate(124%);box-shadow:0 28px 64px rgba(76,97,136,.14);display:grid;gap:18px}
      .topbar,.toolbar-left,.session-tags,.actions-row,.session-meta{display:flex;gap:8px;flex-wrap:wrap}.topbar{align-items:center}.dot{width:11px;height:11px;border-radius:999px;background:rgba(148,163,184,.34)}.brand{display:inline-flex;align-items:center;gap:10px;margin-left:8px;font-size:13px;font-weight:600;color:#4e6687}.brand-mark{width:18px;height:18px;border-radius:7px;display:grid;place-items:center;font-size:11px;background:rgba(91,146,247,.16);color:#5b92f7}
      .hero,.settings-header,.session-heading,.section-main,.session-main,.config-stack,.settings,.field-group,.section-list,.session-list,.action-summary,.export-cta{display:grid;gap:8px}.hero h1,.settings-header h2{margin:0;font-size:24px;line-height:1.18}.hero p,.settings-header p,.muted,.field-help,.helper,.status-line,.footer-meta,.session-subtitle,.session-cwd,.relationship-text,.child-meta,.child-preview,.section-desc,.section-raw,.session-time,.action-caption,.action-eyebrow{margin:0;color:var(--muted);line-height:1.55;font-size:12px}.section-raw{color:#9a772a}
      .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.stat-card,.settings-card,.sessions-card,.action-card{border-radius:24px;border:1px solid rgba(255,255,255,.82);background:var(--card);box-shadow:var(--shadow)}.stat-card,.settings-card,.action-card,.sessions-card{padding:16px}.stat-value{font-size:24px;font-weight:700}.stat-label{font-size:12px;color:var(--muted)}
      .settings-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px}.search-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px}.filter-grid,.date-grid,.split{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.split{grid-template-columns:repeat(2,minmax(0,1fr))}.toolbar,.footer-meta,.session-top,.relationship-box,.toggle-row,.child-header,.action-metrics{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      .section-row{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;padding:12px 0;border-top:1px solid var(--line-soft)}.section-row:first-child{border-top:none}
      .section-checkbox,.session-checkbox{appearance:none;-webkit-appearance:none;width:22px;height:22px;border-radius:999px;border:1.5px solid rgba(151,166,194,.72);background:rgba(255,255,255,.88);position:relative;cursor:pointer;flex:0 0 auto}.section-checkbox:checked,.session-checkbox:checked{border-color:rgba(91,146,247,.94);background:linear-gradient(135deg,#7fb6ff,#5b92f7);box-shadow:0 10px 22px rgba(91,146,247,.2)}.section-checkbox:checked::after,.session-checkbox:checked::after{content:"";position:absolute;inset:5px;border-radius:999px;background:#fff}
      .input,.select,.datetime,.button,.primary-button,.toggle-button,.action-chip{border-radius:16px;border:1px solid var(--line);font:inherit}.input,.select,.datetime{width:100%;padding:12px 14px;background:rgba(255,255,255,.8);color:var(--text);outline:none}.button,.primary-button,.toggle-button{padding:12px 16px;cursor:pointer}.button,.toggle-button{background:rgba(255,255,255,.74);color:#547099}.primary-button{background:linear-gradient(135deg,#1f2937,#111827);color:#fff;border-color:transparent}.primary-button--export{min-width:220px;min-height:56px;padding:14px 22px;font-size:15px;font-weight:700;box-shadow:0 18px 36px rgba(17,24,39,.18)}.input:focus,.select:focus,.datetime:focus{border-color:rgba(91,146,247,.52);box-shadow:0 0 0 4px rgba(91,146,247,.12)}
      .toggle-row{padding:14px 16px;border-radius:18px;border:1px solid var(--line-soft);background:rgba(255,255,255,.56)}.switch{position:relative;width:48px;height:28px;flex:0 0 auto}.switch input{opacity:0;width:0;height:0}.slider{position:absolute;inset:0;border-radius:999px;background:rgba(148,163,184,.28)}.slider::before{content:"";position:absolute;width:20px;height:20px;left:4px;top:4px;border-radius:50%;background:#fff;box-shadow:0 8px 20px rgba(76,97,136,.18)}.switch input:checked + .slider{background:rgba(91,146,247,.94)}.switch input:checked + .slider::before{transform:translateX(20px)}
      .sessions-card{display:grid;grid-template-rows:auto auto auto auto minmax(360px,440px);gap:12px}.pill,.tag,.relationship-pill{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:700}.pill{border:1px solid rgba(193,204,224,.54);background:rgba(255,255,255,.62);color:#647b98}.type-tag--main{background:rgba(91,146,247,.12);color:#4b78be}.type-tag--child{background:rgba(116,184,22,.14);color:#567d18}.type-tag--internal{background:rgba(239,124,155,.14);color:#b04a6a}.platform-tag{background:rgba(148,163,184,.14);color:#64748b;text-transform:uppercase}.child-tag{background:rgba(195,141,32,.14);color:#8b6312}.relationship-pill{background:rgba(255,255,255,.68);color:#5f6f88}
      .session-scroll{min-height:360px;max-height:440px;overflow:auto;padding-right:4px;border-top:1px solid var(--line-soft);padding-top:12px}.session-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:start;padding:16px;border-radius:20px;border:1px solid var(--line-soft);background:var(--card-strong)}.session-card[hidden]{display:none !important}.session-title{font-size:16px;font-weight:700;word-break:break-word}.session-meta{font-size:12px}.relationship-box{padding:12px 14px;border-radius:16px;border:1px solid rgba(91,146,247,.18)}.relationship-box--main{background:rgba(91,146,247,.1)}.relationship-box--child{background:rgba(116,184,22,.08);border-color:rgba(116,184,22,.18)}.relationship-box--internal{background:rgba(239,124,155,.08);border-color:rgba(239,124,155,.18)}
      .child-panel{display:grid;gap:10px}.child-panel[hidden]{display:none !important}.child-card{border-radius:16px;border:1px solid rgba(91,146,247,.18);background:rgba(255,255,255,.74);padding:12px 14px;display:grid;gap:8px}.child-preview{white-space:pre-wrap}.empty-state{text-align:center;padding:24px;border-radius:18px;border:1px dashed rgba(183,196,219,.55);background:rgba(255,255,255,.4);color:var(--muted)}
      .action-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;padding:18px 20px;background:linear-gradient(135deg,rgba(255,255,255,.84),rgba(244,248,255,.92));border:1px solid rgba(196,207,227,.48)}
      .action-summary{min-width:0}
      .action-title{margin:0;font-size:18px;font-weight:700;color:var(--text)}
      .action-chip{display:inline-flex;align-items:center;padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.78);border-color:rgba(193,204,224,.54);color:#5f7495;font-size:12px;font-weight:600}
      .status-line{min-height:18px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.58);border:1px solid transparent;transition:all .2s ease}
      .status-line[data-tone="progress"]{background:rgba(91,146,247,.12);border-color:rgba(91,146,247,.18);color:#4b78be}
      .status-line[data-tone="success"]{background:rgba(116,184,22,.12);border-color:rgba(116,184,22,.18);color:#4f7b17}
      .status-line[data-tone="error"]{background:rgba(239,124,155,.12);border-color:rgba(239,124,155,.2);color:#a84766}
      .progress-shell{display:grid;gap:8px}
      .progress-shell[hidden]{display:none !important}
      .progress-track{height:10px;border-radius:999px;background:rgba(183,196,219,.26);overflow:hidden}
      .progress-fill{height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,#7fb6ff,#5b92f7,#3b82f6);transition:width .22s ease}
      .progress-meta{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
      .progress-label{font-size:12px;color:#4b78be}
      .primary-button--export{position:relative;overflow:hidden;transition:transform .14s ease,box-shadow .18s ease,opacity .18s ease}
      .primary-button--export:hover{transform:translateY(-1px);box-shadow:0 22px 40px rgba(17,24,39,.2)}
      .primary-button--export:active{transform:translateY(1px) scale(.985)}
      .primary-button--export[disabled]{cursor:progress;opacity:.92;box-shadow:0 12px 26px rgba(17,24,39,.14)}
      .primary-button--export.is-busy{background:linear-gradient(135deg,#374151,#111827)}
      .button-label{display:inline-flex;align-items:center;justify-content:center;gap:10px}
      .button-spinner{width:16px;height:16px;border-radius:999px;border:2px solid rgba(255,255,255,.26);border-top-color:#fff;animation:spin .75s linear infinite}
      .button-pulse{position:absolute;inset:0;background:linear-gradient(120deg,transparent 0%,rgba(255,255,255,.14) 38%,transparent 70%);transform:translateX(-110%);opacity:0}
      .primary-button--export.is-busy .button-pulse{opacity:1;animation:sweep 1.2s ease infinite}
      .success-modal-backdrop{position:fixed;inset:0;background:rgba(17,24,39,.22);backdrop-filter:blur(8px);display:grid;place-items:center;padding:24px;z-index:50}
      .success-modal-backdrop[hidden]{display:none !important}
      .success-modal{width:min(520px,calc(100vw - 48px));border-radius:28px;border:1px solid rgba(255,255,255,.84);background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(246,249,255,.92));box-shadow:0 30px 70px rgba(34,50,77,.22);padding:24px;display:grid;gap:16px}
      .success-hero{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:start}
      .success-icon{width:52px;height:52px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(116,184,22,.16),rgba(91,146,247,.14));color:#4f7b17;font-size:24px;font-weight:700}
      .success-title{margin:0;font-size:22px;font-weight:800;color:var(--text)}
      .success-copy,.success-meta{margin:0;color:var(--muted);font-size:13px;line-height:1.6}
      .success-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
      .success-close{appearance:none;border:none;background:transparent;color:#93a3b9;font-size:24px;line-height:1;cursor:pointer;padding:0 4px}
      .success-close:hover{color:#5f7495}
      .desktop-shell-card{display:grid;gap:14px;padding:18px 20px;border-radius:24px;border:1px solid rgba(255,255,255,.82);background:var(--card);box-shadow:var(--shadow)}
      .desktop-shell-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .desktop-shell-header,.desktop-history-header,.history-card,.history-actions{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      .desktop-shell-title{margin:0;font-size:20px;line-height:1.2}
      .desktop-shell-copy,.history-meta,.history-path{margin:0;color:var(--muted);font-size:12px;line-height:1.55}
      .history-list{display:grid;gap:10px}
      .history-card{padding:12px 14px;border-radius:18px;border:1px solid rgba(91,146,247,.14);background:rgba(255,255,255,.72)}
      .history-copy{display:grid;gap:4px;min-width:0}
      .history-title{font-size:14px;font-weight:700;color:var(--text);word-break:break-word}
      .history-path{word-break:break-all}
      .history-actions{justify-content:flex-end}
      .empty-state--compact{padding:16px}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes sweep{from{transform:translateX(-110%)}to{transform:translateX(110%)}}
      code{background:rgba(91,146,247,.1);padding:2px 6px;border-radius:8px;color:#7a5a17}::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--scroll);border-radius:999px;border:1px solid rgba(255,255,255,.32)}
      @media (max-width:1180px){.stats,.settings-grid,.filter-grid,.date-grid,.split,.action-card,.desktop-shell-grid{grid-template-columns:1fr}.search-row{grid-template-columns:1fr}.toolbar,.footer-meta,.session-top,.relationship-box,.toggle-row,.child-header,.action-metrics,.desktop-shell-header,.desktop-history-header,.history-card,.history-actions{flex-direction:column;align-items:stretch}.primary-button--export{width:100%;min-width:0}}
    </style>
  </head>
  <body>
    <div class="page">
      <div class="topbar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><div class="brand"><span class="brand-mark">CE</span><span>Codex Chat Exporter</span></div></div>
      <div class="hero"><h1>Session selection</h1><p>The upper area is for finding and ticking sessions; switch the type filter to Internal sessions to export them directly.</p></div>
      ${renderDesktopShell(input)}
      <div class="stats">
        <div class="stat-card"><div class="stat-value">${stats.total}</div><div class="stat-label">Total sessions</div></div>
        <div class="stat-card"><div class="stat-value">${stats.internal}</div><div class="stat-label">Internal sessions</div></div>
        <div class="stat-card"><div class="stat-value">${stats.child}</div><div class="stat-label">Child sessions</div></div>
        <div class="stat-card"><div class="stat-value">${stats.main}</div><div class="stat-label">Main sessions</div></div>
      </div>
      <section class="sessions-card">
        <div class="search-row"><input class="input" id="session-search" type="text" placeholder="Search title, path or Session ID" /><button class="button" id="select-all-sessions">Select all in list</button><button class="button" id="clear-all-sessions">Clear selection</button></div>
        <div class="filter-grid"><select class="select" id="session-type-filter"><option value="main">Main sessions</option><option value="all">All sessions</option><option value="child">Child sessions</option><option value="internal">Internal sessions</option></select><select class="select" id="sort-field"><option value="last">Sort by last-message date</option><option value="first">Sort by first-message date</option></select><select class="select" id="sort-direction"><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></div>
        <div class="date-grid"><select class="select" id="filter-field"><option value="last">Filter by last-message date</option><option value="first">Filter by first-message date</option></select><input class="datetime" id="filter-start" type="datetime-local" /><input class="datetime" id="filter-end" type="datetime-local" /></div>
        <div class="toolbar"><div class="toolbar-left"><span class="pill" id="selected-count">${selectedCount} selected</span><span class="pill" id="visible-count">Showing 0 / ${renderedSessions.length}</span></div><p class="muted">Child sessions are collapsed under their main session by default; internal sessions are not force-merged because local logs have no reliable parent link.</p></div>
        <div class="session-scroll"><div class="session-list" id="session-list">${renderSessionItems(renderedSessions, input.uiState.selectedSessionIds, input.childPreviewMap)}</div><div class="empty-state" id="empty-state" hidden>No sessions match the current filters.</div></div>
      </section>
      <section class="settings">
        <div class="settings-header"><h2>Export settings</h2><p>Controls only the export content, profile and output folder.</p></div>
        <div class="settings-grid">
          <section class="settings-card"><h3>Export content</h3><p class="field-help">The 6 content types are ticked independently; labels also show the original field names.</p><div class="section-list" id="section-list">${renderSectionItems(input.sections)}</div></section>
          <section class="settings-card">
            <div class="config-stack">
              <div class="field-group"><label class="field-label" for="profile-select">Export profile</label><select class="select" id="profile-select">${renderProfileOptions(input.profiles, input.uiState.selectedProfileId)}</select></div>
              <div class="field-group"><label class="field-label" for="custom-profile-name">Custom profile name</label><input class="input" id="custom-profile-name" type="text" placeholder="e.g. Research audit" /><div class="actions-row"><button class="button" id="save-profile-button">New profile</button><button class="button" id="update-profile-button">Overwrite current</button><button class="button" id="delete-profile-button">Delete current</button></div></div>
              <div class="field-group"><label class="field-label" for="output-dir">Export folder</label><div class="search-row"><input class="input" id="output-dir" type="text" value="${escapeHtml(input.uiState.outputDir ?? "")}" placeholder="Select export folder" /><button class="button" id="pick-output-dir">Browse</button><span></span></div></div>
              <div class="field-group"><label class="field-label">Document split</label><div class="split"><select class="select" id="document-mode"><option value="single">Single document</option><option value="multi">Split by session folder</option></select><select class="select" id="hidden-content-mode"><option value="inline">Hidden content inline</option><option value="appendix">Hidden content as appendix</option><option value="split">Hidden content as separate document</option></select></div></div>
              <div class="field-group"><label class="field-label" for="tool-trace-level">Tool trace detail</label><select class="select" id="tool-trace-level"><option value="summary">Summary</option><option value="full">Full</option></select></div>
              <div class="toggle-row"><div><div class="field-label">Include timestamps in body</div><p class="helper">Writes message times into the body so you can check specific dates and time ranges.</p></div><label class="switch"><input id="include-message-timestamps" type="checkbox" ${input.uiState.includeMessageTimestamps ? "checked" : ""} /><span class="slider"></span></label></div>
              <div class="toggle-row"><div><div class="field-label">Include child session appendix</div><p class="helper">A main session can export its identified child sessions into an appendix; internal maintenance sessions are still handled as standalone sessions.</p></div><label class="switch"><input id="include-child-sessions" type="checkbox" /><span class="slider"></span></label></div>
              <div class="field-group"><label class="field-label">Body time range</label><div class="split"><input class="datetime" id="start-time" type="datetime-local" /><input class="datetime" id="end-time" type="datetime-local" /></div><p class="field-help">Only trims the body and related traces; original session files are never modified.</p></div>
            </div>
          </section>
        </div>
        <div class="action-card">
          <div class="action-summary">
            <div class="status-line" id="status-line" data-tone="idle"></div>
            <div class="progress-shell" id="export-progress-shell" hidden>
              <div class="progress-track"><div class="progress-fill" id="export-progress-fill"></div></div>
              <div class="progress-meta">
                <span class="progress-label" id="export-progress-label">Preparing export</span>
                <span class="action-chip" id="export-progress-chip">0%</span>
              </div>
            </div>
            <p class="action-eyebrow" id="action-eyebrow">Ready to export</p>
            <h3 class="action-title">Confirm your selection, then generate the export files</h3>
            <div class="action-metrics">
              <span class="action-chip" id="selection-summary">${selectedCount} session(s) selected</span>
              <span class="action-chip">Rendered ${renderedSessions.length} / ${input.sessions.length}</span>
            </div>
            <p class="action-caption">The button is fixed in the primary action spot on the right, not the bottom-left of the bar.</p>
          </div>
          <div class="export-cta">
            <button class="primary-button primary-button--export" id="export-button"><span class="button-label" id="export-button-label">Generate export files</span><span class="button-pulse" aria-hidden="true"></span></button>
            <p class="action-caption" id="export-caption">Results are written to the selected export folder.</p>
          </div>
        </div>
      </section>
    </div>
    <div class="success-modal-backdrop" id="success-modal" hidden>
      <div class="success-modal" role="dialog" aria-modal="true" aria-labelledby="success-title">
        <div class="success-hero">
          <div class="success-icon">✓</div>
          <div>
            <h3 class="success-title" id="success-title">Export complete</h3>
            <p class="success-copy" id="success-copy">The export has been written to the target folder; you can open it now to check the results.</p>
          </div>
          <button type="button" class="success-close" id="success-close" aria-label="Close">×</button>
        </div>
        <p class="success-meta" id="success-meta"></p>
        <div class="success-actions">
          <button type="button" class="button" id="success-open-document-button">Open transcript</button>
          <button type="button" class="button" id="success-dismiss-button">Keep viewing</button>
          <button type="button" class="button" id="success-rerun-button">Export again</button>
          <button type="button" class="primary-button" id="success-open-folder-button">Open folder</button>
        </div>
      </div>
    </div>
    <script id="initial-data" type="application/json">${initialData}</script>
    <script>
      const vscode = acquireVsCodeApi();
      const initialData = JSON.parse(document.getElementById("initial-data").textContent);
      const maxSessions = Number(initialData.maxSessionsInWizard || 1000);
      const state = { profiles: initialData.profiles, sessions: Array.isArray(initialData.sessions) ? initialData.sessions.slice(0, maxSessions) : [], selectedProfileId: initialData.uiState.selectedProfileId || "reading", selectedSessionIds: new Set(initialData.uiState.selectedSessionIds || []), outputDir: initialData.uiState.outputDir || "", includeMessageTimestamps: Boolean(initialData.uiState.includeMessageTimestamps), includeChildSessionsAsAppendix: Boolean(initialData.uiState.includeChildSessionsAsAppendix), start: initialData.uiState.start || "", end: initialData.uiState.end || "", codexRoot: initialData.appShell && initialData.appShell.codexRoot ? initialData.appShell.codexRoot : "", recentExports: initialData.appShell && Array.isArray(initialData.appShell.recentExports) ? initialData.appShell.recentExports : [], exporting: false, lastExportOutputDir: "", lastExportPrimaryDocumentPath: "" };
      const profileSelect = document.getElementById("profile-select");
      const outputDirInput = document.getElementById("output-dir");
      const codexRootInput = document.getElementById("codex-root");
      const documentModeSelect = document.getElementById("document-mode");
      const hiddenContentModeSelect = document.getElementById("hidden-content-mode");
      const toolTraceLevelSelect = document.getElementById("tool-trace-level");
      const includeMessageTimestampsCheckbox = document.getElementById("include-message-timestamps");
      const includeChildSessionsCheckbox = document.getElementById("include-child-sessions");
      const startTimeInput = document.getElementById("start-time");
      const endTimeInput = document.getElementById("end-time");
      const sessionTypeFilterSelect = document.getElementById("session-type-filter");
      const sortFieldSelect = document.getElementById("sort-field");
      const sortDirectionSelect = document.getElementById("sort-direction");
      const filterFieldSelect = document.getElementById("filter-field");
      const filterStartInput = document.getElementById("filter-start");
      const filterEndInput = document.getElementById("filter-end");
      const selectedCountChip = document.getElementById("selected-count");
      const visibleCountChip = document.getElementById("visible-count");
      const selectionSummary = document.getElementById("selection-summary");
      const statusLine = document.getElementById("status-line");
      const actionEyebrow = document.getElementById("action-eyebrow");
      const customProfileNameInput = document.getElementById("custom-profile-name");
      const sessionSearchInput = document.getElementById("session-search");
      const sessionList = document.getElementById("session-list");
      const emptyState = document.getElementById("empty-state");
      const exportButton = document.getElementById("export-button");
      const exportButtonLabel = document.getElementById("export-button-label");
      const exportCaption = document.getElementById("export-caption");
      const progressShell = document.getElementById("export-progress-shell");
      const progressFill = document.getElementById("export-progress-fill");
      const progressLabel = document.getElementById("export-progress-label");
      const progressChip = document.getElementById("export-progress-chip");
      const successModal = document.getElementById("success-modal");
      const successCopy = document.getElementById("success-copy");
      const successMeta = document.getElementById("success-meta");
      const successClose = document.getElementById("success-close");
      const successDismissButton = document.getElementById("success-dismiss-button");
      const successOpenFolderButton = document.getElementById("success-open-folder-button");
      const successOpenDocumentButton = document.getElementById("success-open-document-button");
      const successRerunButton = document.getElementById("success-rerun-button");
      const recentExportList = document.getElementById("recent-export-list");
      const pickCodexRootButton = document.getElementById("pick-codex-root");
      const createShortcutButton = document.getElementById("create-shortcut-button");
      function escapeClientHtml(value){return String(value || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}
      function isoToDatetimeLocal(value){if(!value)return ""; const date=new Date(value); if(Number.isNaN(date.getTime()))return ""; const pad=(num)=>String(num).padStart(2,"0"); return [date.getFullYear(),"-",pad(date.getMonth()+1),"-",pad(date.getDate()),"T",pad(date.getHours()),":",pad(date.getMinutes())].join("");}
      function datetimeLocalToIso(value){if(!value)return undefined; const date=new Date(value); return Number.isNaN(date.getTime()) ? undefined : date.toISOString();}
      function datetimeLocalToMillis(value){if(!value)return undefined; const date=new Date(value); return Number.isNaN(date.getTime()) ? undefined : date.getTime();}
      function getProfile(profileId){return state.profiles.find((profile)=>profile.id===profileId) || state.profiles[0];}
      function setStatus(text,tone){statusLine.textContent=text || ""; statusLine.dataset.tone=tone || "idle";}
      function setProgress(percent,label){
        if(!progressShell || !progressFill || !progressLabel || !progressChip)return;
        const normalized=Math.max(0,Math.min(100,Number(percent || 0)));
        progressShell.hidden=normalized <= 0 && !state.exporting;
        progressFill.style.width=normalized + "%";
        progressLabel.textContent=label || "Preparing export";
        progressChip.textContent=Math.round(normalized) + "%";
      }
      function setExporting(exporting,label){
        state.exporting=exporting;
        exportButton.disabled=exporting;
        exportButton.classList.toggle("is-busy",exporting);
        exportButtonLabel.innerHTML=exporting ? '<span class="button-spinner" aria-hidden="true"></span><span>' + (label || "Exporting...") + '</span>' : "Generate export files";
        actionEyebrow.textContent=exporting ? "Exporting" : "Ready to export";
        exportCaption.textContent=exporting ? "Writing sessions and attached documents, please wait; no need to click again." : "Results are written to the selected export folder.";
        if(!exporting){setProgress(0,"Preparing export"); progressShell.hidden=true;} else {progressShell.hidden=false;}
      }
      function hideSuccessModal(){successModal.hidden=true;}
      function showSuccessModal(payload){
        state.lastExportOutputDir=payload.outputDir || "";
        state.lastExportPrimaryDocumentPath=payload.primaryDocumentPath || "";
        successCopy.textContent=payload.text || "The export has been written to the target folder; you can open it now to check the results.";
        successMeta.textContent=state.lastExportOutputDir ? "Export folder: " + state.lastExportOutputDir : "";
        successOpenDocumentButton.disabled=!state.lastExportPrimaryDocumentPath;
        successModal.hidden=false;
      }
      function renderRecentExports(entries){
        if(!recentExportList)return;
        if(!entries || entries.length===0){
          recentExportList.innerHTML='<div class="empty-state empty-state--compact">No exports yet. Your recent exports will appear here after you finish one.</div>';
          return;
        }
        recentExportList.innerHTML=entries.map((entry)=>{const folderName=(entry.outputDir || "").split(/[\\\\/]/).pop() || entry.outputDir; const openDocumentButton=entry.primaryDocumentPath ? '<button type="button" class="button" data-history-open-document="' + escapeClientHtml(entry.primaryDocumentPath) + '">Open transcript</button>' : ''; return '<article class="history-card"><div class="history-copy"><div class="history-title">' + escapeClientHtml(folderName) + '</div><p class="history-meta">' + escapeClientHtml(entry.createdAt || "") + ' · ' + escapeClientHtml(String(entry.exportedCount || 0)) + ' session(s)</p><p class="history-path">' + escapeClientHtml(entry.outputDir || "") + '</p></div><div class="history-actions">' + openDocumentButton + '<button type="button" class="button" data-history-open-folder="' + escapeClientHtml(entry.outputDir || "") + '">Open folder</button></div></article>';}).join("");
      }
      function updateSelectionText(){const countText=state.selectedSessionIds.size + " selected"; selectedCountChip.textContent=countText; selectionSummary.textContent=countText + " session(s)";}
      function getSessionTime(session,field){const value=field==="first" ? session.firstMessageAt || session.timestamp || session.updatedAt : session.lastMessageAt || session.updatedAt || session.timestamp; const parsed=Date.parse(value || ""); return Number.isNaN(parsed) ? 0 : parsed;}
      function matchesType(card){const filter=sessionTypeFilterSelect.value; return filter==="all" ? true : card.getAttribute("data-session-type")===filter;}
      function matchesDateRange(card){const field=filterFieldSelect.value==="first" ? "data-first-message-at" : "data-last-message-at"; const value=Date.parse(card.getAttribute(field) || ""); const millis=Number.isNaN(value) ? 0 : value; const start=datetimeLocalToMillis(filterStartInput.value); const end=datetimeLocalToMillis(filterEndInput.value); if(start!==undefined && millis<start)return false; if(end!==undefined && millis>end)return false; return true;}
      function applySessionView(){const query=(sessionSearchInput.value || "").trim().toLowerCase(); const sortField=sortFieldSelect.value; const direction=sortDirectionSelect.value; const ordered=[...state.sessions].sort((left,right)=>{const delta=getSessionTime(left,sortField)-getSessionTime(right,sortField); return direction==="asc" ? delta : -delta;}); const cards=new Map(Array.from(document.querySelectorAll("[data-session-card]")).map((card)=>[card.getAttribute("data-session-id"),card])); const visible=[]; ordered.forEach((session)=>{const card=cards.get(session.sessionId); if(!card)return; const haystack=(card.getAttribute("data-search-text") || "").toLowerCase(); if((!query || haystack.includes(query)) && matchesType(card) && matchesDateRange(card)){visible.push(card);}}); cards.forEach((card)=>card.setAttribute("hidden","")); visible.forEach((card)=>{card.removeAttribute("hidden"); sessionList.appendChild(card);}); emptyState.hidden=visible.length>0; visibleCountChip.textContent="Showing " + visible.length + " / " + state.sessions.length;}
      function applyProfile(profileId){const profile=getProfile(profileId); if(!profile)return; state.selectedProfileId=profile.id; profileSelect.value=profile.id; documentModeSelect.value=profile.documentMode; hiddenContentModeSelect.value=profile.hiddenContentMode; toolTraceLevelSelect.value=profile.toolTraceLevel; includeMessageTimestampsCheckbox.checked=profile.includeMessageTimestamps; includeChildSessionsCheckbox.checked=profile.includeChildSessionsAsAppendix; startTimeInput.value=isoToDatetimeLocal(profile.transcriptTimeFilter && profile.transcriptTimeFilter.start); endTimeInput.value=isoToDatetimeLocal(profile.transcriptTimeFilter && profile.transcriptTimeFilter.end); document.querySelectorAll("[data-section-id]").forEach((checkbox)=>{checkbox.checked=profile.includedSections.includes(checkbox.getAttribute("data-section-id"));});}
      function collectIncludedSections(){return Array.from(document.querySelectorAll("[data-section-id]")).filter((checkbox)=>checkbox.checked).map((checkbox)=>checkbox.getAttribute("data-section-id"));}
      function buildPayload(includeProfileName,customProfileName){return {selectedProfileId:state.selectedProfileId,selectedSessionIds:Array.from(state.selectedSessionIds),outputDir:outputDirInput.value.trim(),codexRoot:codexRootInput ? codexRootInput.value.trim() : undefined,documentMode:documentModeSelect.value,hiddenContentMode:hiddenContentModeSelect.value,toolTraceLevel:toolTraceLevelSelect.value,includeMessageTimestamps:includeMessageTimestampsCheckbox.checked,includeChildSessionsAsAppendix:includeChildSessionsCheckbox.checked,includedSections:collectIncludedSections(),start:datetimeLocalToIso(startTimeInput.value),end:datetimeLocalToIso(endTimeInput.value),customProfileName:includeProfileName ? customProfileName : undefined};}
      profileSelect.addEventListener("change",()=>applyProfile(profileSelect.value));
      document.getElementById("pick-output-dir").addEventListener("click",()=>{vscode.postMessage({type:"pickOutputDir"});});
      if(pickCodexRootButton){pickCodexRootButton.addEventListener("click",()=>{vscode.postMessage({type:"pickCodexRoot"});});}
      if(createShortcutButton){createShortcutButton.addEventListener("click",()=>{vscode.postMessage({type:"createDesktopShortcut",payload:{}});});}
      document.getElementById("select-all-sessions").addEventListener("click",()=>{document.querySelectorAll("[data-session-card]").forEach((card)=>{if(card.hasAttribute("hidden"))return; const checkbox=card.querySelector(".session-checkbox"); if(!checkbox)return; checkbox.checked=true; state.selectedSessionIds.add(checkbox.getAttribute("data-session-id"));}); updateSelectionText();});
      document.getElementById("clear-all-sessions").addEventListener("click",()=>{state.selectedSessionIds.clear(); document.querySelectorAll(".session-checkbox").forEach((checkbox)=>{checkbox.checked=false;}); updateSelectionText();});
      sessionList.addEventListener("change",(event)=>{const target=event.target; if(!(target instanceof HTMLInputElement) || !target.classList.contains("session-checkbox"))return; const sessionId=target.getAttribute("data-session-id"); if(!sessionId)return; if(target.checked){state.selectedSessionIds.add(sessionId);}else{state.selectedSessionIds.delete(sessionId);} updateSelectionText();});
      sessionList.addEventListener("click",(event)=>{const target=event.target; if(!(target instanceof HTMLElement))return; const button=target.closest("[data-child-toggle]"); if(button){const sessionId=button.getAttribute("data-child-toggle"); const panel=document.querySelector('[data-child-panel="' + sessionId + '"]'); if(!panel)return; const hidden=panel.hasAttribute("hidden"); if(hidden){panel.removeAttribute("hidden"); button.textContent="Collapse child sessions";}else{panel.setAttribute("hidden",""); button.textContent="Expand to view child sessions";} return;} const openFolder=target.closest("[data-history-open-folder]"); if(openFolder){vscode.postMessage({type:"openExportFolder",payload:{outputDir:openFolder.getAttribute("data-history-open-folder")}}); return;} const openDocument=target.closest("[data-history-open-document]"); if(openDocument){vscode.postMessage({type:"openExportDocument",payload:{path:openDocument.getAttribute("data-history-open-document")}});}});
      sessionSearchInput.addEventListener("input",applySessionView); sessionTypeFilterSelect.addEventListener("change",applySessionView); sortFieldSelect.addEventListener("change",applySessionView); sortDirectionSelect.addEventListener("change",applySessionView); filterFieldSelect.addEventListener("change",applySessionView); filterStartInput.addEventListener("change",applySessionView); filterEndInput.addEventListener("change",applySessionView);
      document.getElementById("save-profile-button").addEventListener("click",()=>{vscode.postMessage({type:"saveProfile",payload:buildPayload(true,customProfileNameInput.value.trim())});});
      document.getElementById("update-profile-button").addEventListener("click",()=>{const fallbackName=profileSelect.options[profileSelect.selectedIndex] && profileSelect.options[profileSelect.selectedIndex].textContent ? profileSelect.options[profileSelect.selectedIndex].textContent : ""; vscode.postMessage({type:"updateProfile",payload:buildPayload(true,customProfileNameInput.value.trim() || fallbackName)});});
      document.getElementById("delete-profile-button").addEventListener("click",()=>{vscode.postMessage({type:"deleteProfile",payload:buildPayload(false)});});
      exportButton.addEventListener("click",()=>{
        if(state.exporting)return;
        hideSuccessModal();
        setExporting(true,"Validating...");
        setStatus("Preparing export, please wait.","progress");
        setProgress(4,"Validating export parameters");
        vscode.postMessage({type:"export",payload:buildPayload(false)});
      });
      successClose.addEventListener("click",hideSuccessModal);
      successDismissButton.addEventListener("click",hideSuccessModal);
      successRerunButton.addEventListener("click",()=>{hideSuccessModal(); if(!state.exporting){exportButton.click();}});
      successModal.addEventListener("click",(event)=>{if(event.target===successModal)hideSuccessModal();});
      successOpenFolderButton.addEventListener("click",()=>{if(!state.lastExportOutputDir)return; vscode.postMessage({type:"openExportFolder",payload:{outputDir:state.lastExportOutputDir}});});
      successOpenDocumentButton.addEventListener("click",()=>{if(!state.lastExportPrimaryDocumentPath)return; vscode.postMessage({type:"openExportDocument",payload:{path:state.lastExportPrimaryDocumentPath}});});
      window.addEventListener("message",(event)=>{
        const message=event.data;
        if(message.type==="outputDirSelected"){outputDirInput.value=message.payload.outputDir || ""; setStatus("Export folder selected.","idle");}
        if(message.type==="codexRootSelected" && codexRootInput){codexRootInput.value=message.payload.codexRoot || ""; state.codexRoot=message.payload.codexRoot || ""; setStatus("Codex data folder changed; refreshing the session list.","success");}
        if(message.type==="profilesUpdated"){state.profiles=message.payload.profiles; profileSelect.innerHTML=state.profiles.map((profile)=>'<option value="' + profile.id + '">' + profile.name + '</option>').join(""); profileSelect.value=message.payload.selectedProfileId; applyProfile(message.payload.selectedProfileId);}
        if(message.type==="recentExportsUpdated"){state.recentExports=Array.isArray(message.payload.recentExports) ? message.payload.recentExports : []; renderRecentExports(state.recentExports);}
        if(message.type==="status"){setStatus(message.payload.text || "",message.payload.tone || "idle");}
        if(message.type==="exportStarted"){hideSuccessModal(); setExporting(true,message.payload.label || "Exporting..."); setStatus(message.payload.text || "Exporting, please wait.","progress"); setProgress(Number(message.payload.percent || 8),message.payload.text || "Exporting, please wait.");}
        if(message.type==="exportProgress"){setStatus(message.payload.text || "", "progress"); setProgress(Number(message.payload.percent || 0),message.payload.text || "Exporting");}
        if(message.type==="exportFinished"){setExporting(false); setStatus(message.payload.text || "Export complete.","success"); setProgress(100,message.payload.text || "Export complete"); showSuccessModal(message.payload || {}); if(Array.isArray(message.payload.recentExports)){state.recentExports=message.payload.recentExports; renderRecentExports(state.recentExports);}}
        if(message.type==="exportFailed"){setExporting(false); setStatus(message.payload.text || "Export failed.","error"); setProgress(0,message.payload.text || "Export failed");}
      });
      if(state.start)startTimeInput.value=isoToDatetimeLocal(state.start); if(state.end)endTimeInput.value=isoToDatetimeLocal(state.end); if(codexRootInput)codexRootInput.value=state.codexRoot; sessionTypeFilterSelect.value="main"; applyProfile(state.selectedProfileId); updateSelectionText(); renderRecentExports(state.recentExports); setExporting(false); applySessionView();
    </script>
  </body>
</html>`;
}
