const state = {
  currentReportId: null
};

const form = document.querySelector("#reportForm");
const urlInput = document.querySelector("#urlInput");
const maxPagesInput = document.querySelector("#maxPagesInput");
const modelInput = document.querySelector("#modelInput");
const promptInput = document.querySelector("#promptInput");
const generateButton = document.querySelector("#generateButton");
const formMessage = document.querySelector("#formMessage");
const reportView = document.querySelector("#reportView");
const historyList = document.querySelector("#historyList");
const apiStatus = document.querySelector("#apiStatus");
const printButton = document.querySelector("#printButton");
const deleteButton = document.querySelector("#deleteButton");
const refreshButton = document.querySelector("#refreshButton");
const resetPromptButton = document.querySelector("#resetPromptButton");
const togglePromptButton = document.querySelector("#togglePromptButton");
const promptEditor = document.querySelector("#promptEditor");
let defaultPrompt = "";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(true, "Crawling public pages and generating the report...");
  try {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: urlInput.value,
        maxPages: Number(maxPagesInput.value),
        model: modelInput.value.trim(),
        prompt: promptInput.value.trim()
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.details || data.error || "Report generation failed.");
    state.currentReportId = data.reportId;
    renderReport(data.report);
    await loadHistory();
    setMessage(`Generated and saved. Crawled ${data.crawledPages} pages.`);
  } catch (error) {
    setMessage(error.message || String(error), true);
  } finally {
    setLoading(false);
  }
});

refreshButton.addEventListener("click", loadHistory);
resetPromptButton.addEventListener("click", () => {
  promptInput.value = defaultPrompt;
});
togglePromptButton.addEventListener("click", () => {
  setPromptExpanded(promptEditor.hidden);
});
printButton.addEventListener("click", () => window.print());
deleteButton.addEventListener("click", async () => {
  if (!state.currentReportId) return;
  const response = await fetch(`/api/reports/${state.currentReportId}`, { method: "DELETE" });
  if (response.ok) {
    state.currentReportId = null;
    deleteButton.hidden = true;
    reportView.className = "report-view empty";
    reportView.innerHTML = "<h2>Report deleted.</h2><p>Select another saved report or generate a new one.</p>";
    await loadHistory();
  }
});

async function init() {
  const health = await fetch("/api/health").then((response) => response.json());
  apiStatus.textContent = health.geminiConfigured
    ? `Gemini ready: ${health.defaultModel}`
    : "No API key: heuristic mode";
  renderModelOptions(health.availableModels || [health.defaultModel], health.defaultModel);
  const prompts = await fetch("/api/prompts/default").then((response) => response.json());
  defaultPrompt = prompts.userPrompt || "";
  promptInput.value = defaultPrompt;
  await loadHistory();
}

function renderModelOptions(models, defaultModel) {
  modelInput.innerHTML = "";
  const uniqueModels = [...new Set(models.filter(Boolean))];
  if (!uniqueModels.includes(defaultModel)) uniqueModels.unshift(defaultModel);
  for (const model of uniqueModels) {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = modelLabel(model);
    option.selected = model === defaultModel;
    modelInput.appendChild(option);
  }
}

function modelLabel(model) {
  const labels = {
    "gemini-3.5-flash": "gemini-3.5-flash - balanced default",
    "gemini-3.1-pro-preview": "gemini-3.1-pro-preview - strongest reasoning",
    "gemini-3.1-flash-lite": "gemini-3.1-flash-lite - fastest / lowest cost",
    "gemini-2.5-pro": "gemini-2.5-pro - stable high quality",
    "gemini-2.5-flash": "gemini-2.5-flash - stable balanced",
    "gemini-2.5-flash-lite": "gemini-2.5-flash-lite - stable low cost"
  };
  return labels[model] || model;
}

function setPromptExpanded(isExpanded) {
  promptEditor.hidden = !isExpanded;
  togglePromptButton.setAttribute("aria-expanded", String(isExpanded));
  togglePromptButton.textContent = isExpanded ? "Hide prompt" : "Edit prompt";
}

async function loadHistory() {
  const data = await fetch("/api/reports").then((response) => response.json());
  historyList.innerHTML = "";
  if (!data.reports.length) {
    historyList.innerHTML = '<p class="message">No saved reports yet.</p>';
    return;
  }
  for (const item of data.reports) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `history-item ${item.id === state.currentReportId ? "active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(item.companyName)}</strong><span>${escapeHtml(item.url)}</span><span>${formatDate(item.generatedAt)} · ${escapeHtml(item.analysisMode)} · ${escapeHtml(item.model)}</span>`;
    button.addEventListener("click", () => loadReport(item.id));
    historyList.appendChild(button);
  }
}

async function loadReport(id) {
  const data = await fetch(`/api/reports/${id}`).then((response) => response.json());
  state.currentReportId = id;
  renderReport(data.report);
  await loadHistory();
}

function renderReport(report) {
  deleteButton.hidden = !state.currentReportId;
  reportView.className = "report-view";
  reportView.innerHTML = `
    <h2>${escapeHtml(report.companyName)}</h2>
    <div class="report-meta">
      <span class="pill">${escapeHtml(report.analysisMode)}</span>
      <span class="pill">${escapeHtml(report.model)}</span>
      <span class="pill">${formatDate(report.generatedAt)}</span>
      <a class="pill" href="${escapeAttribute(report.websiteUrl)}" target="_blank" rel="noreferrer">Website</a>
    </div>

    <section class="grid-two">
      <div class="summary-box">
        <h3>Japanese Summary</h3>
        <p>${escapeHtml(report.executiveSummaryJa)}</p>
      </div>
      <div class="summary-box">
        <h3>English Summary</h3>
        <p>${escapeHtml(report.executiveSummaryEn)}</p>
      </div>
    </section>

    ${section("Company Overview", report.companyOverview)}
    ${section("Product / Service", report.productServiceSummary)}
    ${section("Target Customers", report.targetCustomers)}
    ${section("Customer Journey", report.likelyCustomerJourney)}
    ${section("Current Conversion Path", report.currentConversionPath)}
    ${listSection("Observed Pain Points", report.observedPainPoints)}
    ${listSection("LINE Opportunity Areas", report.lineOpportunityAreas)}
    ${proposalSection(report.proposals)}
    ${evidenceSection(report.evidence)}
    ${listSection("Caveats", report.caveats)}
  `;
}

function section(title, value) {
  return `<section class="report-section"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(value)}</p></section>`;
}

function listSection(title, values) {
  const items = (values || []).map((value) => `<li>${escapeHtml(value)}</li>`).join("");
  return `<section class="report-section"><h3>${escapeHtml(title)}</h3><ul>${items}</ul></section>`;
}

function proposalSection(proposals) {
  const items = (proposals || [])
    .map(
      (proposal) => `
      <article class="proposal">
        <h4>${escapeHtml(proposal.titleJa)} / ${escapeHtml(proposal.titleEn)}</h4>
        <p>${escapeHtml(proposal.descriptionJa)}</p>
        <p>${escapeHtml(proposal.descriptionEn)}</p>
        <div class="scores">
          <span class="pill">Impact ${proposal.impact}/5</span>
          <span class="pill">Effort ${proposal.effort}/5</span>
          <span class="pill">Confidence ${proposal.confidence}/5</span>
          <span class="pill">Evidence ${escapeHtml((proposal.evidenceIds || []).join(", ") || "None")}</span>
        </div>
      </article>`
    )
    .join("");
  return `<section class="report-section"><h3>Campaign / Chatbot Proposals</h3><div class="proposal-list">${items}</div></section>`;
}

function evidenceSection(evidence) {
  const rows = (evidence || [])
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.id)}</td>
        <td><a href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title || item.url)}</a></td>
        <td>${escapeHtml(item.type)}<br />${escapeHtml(item.confidence)}</td>
        <td>${escapeHtml((item.facts || []).join(" / "))}</td>
      </tr>`
    )
    .join("");
  return `
    <section class="report-section">
      <h3>Evidence</h3>
      <table>
        <thead><tr><th>ID</th><th>Source</th><th>Type</th><th>Extracted Facts</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

function setLoading(isLoading, message = "") {
  generateButton.disabled = isLoading;
  generateButton.textContent = isLoading ? "Generating..." : "Generate report";
  if (message) setMessage(message);
}

function setMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

init().catch((error) => {
  apiStatus.textContent = "App setup error";
  setMessage(error.message || String(error), true);
});
