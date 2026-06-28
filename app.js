const STORAGE_KEY = "cardclear-data-v1";
const SUPABASE_URL = "https://rmooksnngqyzqraeicvr.supabase.co";
const SUPABASE_KEY = "sb_publishable_4m_fZwCfwVTBD5eAJhl1LQ_D63Pe2U_";
const SUPABASE_TABLE = "credit_card_tracker_state";
const SUPABASE_ROW_ID = "default";
const ACCESS_CODE = "andrew";
const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const money = (value) => currency.format(Number.isFinite(value) ? value : 0);

const defaultCards = [
  {
    id: makeId(),
    name: "Everyday Visa",
    balance: 2450,
    apr: 24.9,
    limit: 4000,
    minimum: 65,
    payment: 160,
  },
  {
    id: makeId(),
    name: "Travel Mastercard",
    balance: 1380,
    apr: 19.9,
    limit: 3000,
    minimum: 40,
    payment: 95,
  },
  {
    id: makeId(),
    name: "Store Card",
    balance: 780,
    apr: 29.9,
    limit: 1200,
    minimum: 30,
    payment: 70,
  },
];

const defaultBills = [];

let state = loadLocalState();
let balanceChart;
let supabaseClient = null;
let supabaseReady = false;
let saveTimer = null;

const els = {
  totalBalance: document.querySelector("#totalBalance"),
  utilisationSummary: document.querySelector("#utilisationSummary"),
  monthlyPayments: document.querySelector("#monthlyPayments"),
  minimumSummary: document.querySelector("#minimumSummary"),
  payoffDate: document.querySelector("#payoffDate"),
  payoffMonths: document.querySelector("#payoffMonths"),
  interestForecast: document.querySelector("#interestForecast"),
  strategySummary: document.querySelector("#strategySummary"),
  cardsTable: document.querySelector("#cardsTable"),
  scheduleGrid: document.querySelector("#scheduleGrid"),
  billsTable: document.querySelector("#billsTable"),
  insightList: document.querySelector("#insightList"),
  scheduleSummary: document.querySelector("#scheduleSummary"),
  cardModal: document.querySelector("#cardModal"),
  cardForm: document.querySelector("#cardForm"),
  modalTitle: document.querySelector("#modalTitle"),
  cardId: document.querySelector("#cardId"),
  cardName: document.querySelector("#cardName"),
  cardBalance: document.querySelector("#cardBalance"),
  cardApr: document.querySelector("#cardApr"),
  cardLimit: document.querySelector("#cardLimit"),
  cardMinimum: document.querySelector("#cardMinimum"),
  cardPayment: document.querySelector("#cardPayment"),
  monthlyIncomeInput: document.querySelector("#monthlyIncomeInput"),
  totalBills: document.querySelector("#totalBills"),
  rachelTotal: document.querySelector("#rachelTotal"),
  possibleExtra: document.querySelector("#possibleExtra"),
  possibleExtraNote: document.querySelector("#possibleExtraNote"),
  billForm: document.querySelector("#billForm"),
  billId: document.querySelector("#billId"),
  billName: document.querySelector("#billName"),
  billAmount: document.querySelector("#billAmount"),
  billSplit: document.querySelector("#billSplit"),
  saveBillButton: document.querySelector("#saveBillButton"),
  extraMonthlyInput: document.querySelector("#extraMonthlyInput"),
  oneOffInput: document.querySelector("#oneOffInput"),
  oneOffMonthInput: document.querySelector("#oneOffMonthInput"),
  scenarioSavings: document.querySelector("#scenarioSavings"),
  scenarioTimeSaved: document.querySelector("#scenarioTimeSaved"),
  resetScenarioButton: document.querySelector("#resetScenarioButton"),
  addCardButton: document.querySelector("#addCardButton"),
  closeModalButton: document.querySelector("#closeModalButton"),
  cancelModalButton: document.querySelector("#cancelModalButton"),
  exportButton: document.querySelector("#exportButton"),
  importButton: document.querySelector("#importButton"),
  importFile: document.querySelector("#importFile"),
  storageStatus: document.querySelector("#storageStatus"),
};

function defaultState() {
  return {
    cards: defaultCards,
    bills: defaultBills,
    budget: { monthlyIncome: 0 },
    strategy: "avalanche",
    scenario: { extraMonthly: 50, oneOff: 250, oneOffMonth: 2 },
    cardSort: { field: "balance", direction: "desc" },
    billSort: { field: "amount", direction: "desc" },
  };
}

function normaliseState(value) {
  return {
    cards: Array.isArray(value?.cards) ? value.cards : defaultCards,
    bills: Array.isArray(value?.bills) ? value.bills : defaultBills,
    budget: {
      monthlyIncome: Number(value?.budget?.monthlyIncome ?? 0),
    },
    strategy: value?.strategy || "avalanche",
    scenario: {
      extraMonthly: Number(value?.scenario?.extraMonthly ?? 50),
      oneOff: Number(value?.scenario?.oneOff ?? 250),
      oneOffMonth: Number(value?.scenario?.oneOffMonth ?? 2),
    },
    cardSort: {
      field: value?.cardSort?.field || "balance",
      direction: value?.cardSort?.direction === "asc" ? "asc" : "desc",
    },
    billSort: {
      field: value?.billSort?.field || "amount",
      direction: value?.billSort?.direction === "asc" ? "asc" : "desc",
    },
  };
}

function loadLocalState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaultState();

  try {
    return normaliseState(JSON.parse(saved));
  } catch {
    return defaultState();
  }
}

function makeId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `card-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function initStorage() {
  if (!window.supabase) {
    updateStorageStatus("Local backup only. Supabase library did not load.");
    return;
  }

  try {
    // supabaseClient is initialised earlier in DOMContentLoaded; reuse it.
    if (!supabaseClient) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabaseClient
      .from(SUPABASE_TABLE)
      .select("data")
      .eq("id", SUPABASE_ROW_ID)
      .maybeSingle();

    if (error) throw error;

    if (data?.data) {
      state = normaliseState(data.data);
      // Merge rows from the dedicated `bills` table into the JSON state
      // without overwriting any bills the user already added manually.
      if (supabaseClient) {
        try {
          const { data: billsData, error: billsError } = await supabaseClient.from('bills').select('*');
          if (!billsError && Array.isArray(billsData) && billsData.length) {
            const existingIds = new Set((state.bills || []).map((b) => String(b.id)));
            const imported = billsData
              .filter((b) => !existingIds.has(String(b.id)))
              .map((b) => ({
                id: b.id || makeId(),
                name: b.notes || b.name || "",
                amount: Number(b.amount) || 0,
                splitWithRachel: false,
                dueDate: b.due_date || null,
              }));

            if (imported.length) {
              state.bills = Array.isArray(state.bills) ? state.bills.concat(imported) : imported;
              // Persist merged state back to the single-state table so UI stays in sync
              await saveToSupabase();
            }
          }
        } catch (err) {
          console.warn("Failed to import bills from bills table:", err);
        }
      }
    } else {
      await saveToSupabase();
    }

    supabaseReady = true;
    updateStorageStatus("Synced with Supabase. Local backup is also kept.");
  } catch (error) {
    console.error("Supabase storage error:", error);
    supabaseReady = false;
    updateStorageStatus("Using local backup. Add the Supabase table from schema.sql to sync online.");
  }
}

function updateStorageStatus(message) {
  if (els.storageStatus) els.storageStatus.textContent = message;
}

function saveState({ remote = true } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (remote) queueSupabaseSave();
}

function queueSupabaseSave() {
  if (!supabaseReady) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveToSupabase().catch((error) => {
      console.error("Supabase save error:", error);
      updateStorageStatus("Local changes saved. Supabase sync failed.");
    });
  }, 450);
}

async function saveToSupabase() {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.from(SUPABASE_TABLE).upsert(
    {
      id: SUPABASE_ROW_ID,
      data: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
  updateStorageStatus("Synced with Supabase. Local backup is also kept.");
}

function cloneCards(cards) {
  return cards
    .map((card) => ({
      ...card,
      balance: Number(card.balance) || 0,
      apr: Number(card.apr) || 0,
      limit: Number(card.limit) || 0,
      minimum: Number(card.minimum) || 0,
      payment: Number(card.payment) || 0,
    }))
    .filter((card) => card.balance > 0);
}

function sortCards(cards, strategy) {
  return [...cards].sort((a, b) => {
    if (strategy === "snowball") return a.balance - b.balance || b.apr - a.apr;
    if (strategy === "highest-balance") return b.balance - a.balance || b.apr - a.apr;
    return b.apr - a.apr || a.balance - b.balance;
  });
}

function getStrategyLabel(strategy) {
  const labels = {
    avalanche: "Avalanche",
    snowball: "Snowball",
    "highest-balance": "Highest balance rollover",
  };
  return labels[strategy] || "Avalanche";
}

function projectPayoff(cards, options = {}) {
  const active = cloneCards(cards);
  const strategy = options.strategy || state.strategy;
  const extraMonthly = Number(options.extraMonthly || 0);
  const oneOff = Number(options.oneOff || 0);
  const oneOffMonth = Number(options.oneOffMonth || 0);
  const monthlyBudget = active.reduce((sum, card) => sum + Math.max(card.payment, card.minimum), 0) + extraMonthly;
  const schedule = [];
  let totalInterest = 0;
  let month = 0;
  let stuckCounter = 0;

  if (!active.length) return { schedule, totalInterest: 0, months: 0, paidOff: true, monthlyBudget };

  while (active.some((card) => card.balance > 0.01) && month < 600) {
    month += 1;
    let monthInterest = 0;
    let paymentPool = monthlyBudget + (month === oneOffMonth ? oneOff : 0);

    active.forEach((card) => {
      if (card.balance <= 0) return;
      const interest = card.balance * (card.apr / 100 / 12);
      card.balance += interest;
      monthInterest += interest;
      totalInterest += interest;
    });

    const openCards = active.filter((card) => card.balance > 0.01);
    openCards.forEach((card) => {
      const basePayment = Math.min(card.balance, Math.max(card.payment, card.minimum, 0));
      card.balance -= basePayment;
      paymentPool -= basePayment;
    });

    const targetCards = sortCards(openCards, strategy);
    const rolloverAmount = Math.max(0, paymentPool);
    const rolloverTarget = rolloverAmount > 0 ? targetCards.find((card) => card.balance > 0.01)?.name || null : null;

    targetCards.forEach((card) => {
      if (paymentPool <= 0 || card.balance <= 0) return;
      const payment = Math.min(card.balance, paymentPool);
      card.balance -= payment;
      paymentPool -= payment;
    });

    const remainingBalance = active.reduce((sum, card) => sum + Math.max(card.balance, 0), 0);
    const monthlyPaid = Math.max(0, monthlyBudget + (month === oneOffMonth ? oneOff : 0) - Math.max(paymentPool, 0));
    schedule.push({
      month,
      balance: remainingBalance,
      interest: monthInterest,
      paid: monthlyPaid,
      target: rolloverTarget,
      rolloverAmount,
      date: addMonths(new Date(), month),
    });

    if (month > 1 && schedule.at(-2).balance <= remainingBalance + 0.01) {
      stuckCounter += 1;
    } else {
      stuckCounter = 0;
    }

    if (stuckCounter >= 4) {
      return { schedule, totalInterest, months: month, paidOff: false, monthlyBudget };
    }
  }

  return {
    schedule,
    totalInterest,
    months: schedule.length,
    paidOff: schedule.at(-1)?.balance <= 0.01 || active.every((card) => card.balance <= 0.01),
    monthlyBudget,
  };
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatMonth(date) {
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function render() {
  saveState();
  syncControls();
  renderSummary();
  renderBills();
  renderCards();
  renderInsights();
  renderSchedule();
  renderChart();
  lucide.createIcons();
}

function syncControls() {
  document.querySelectorAll("[data-strategy]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.strategy === state.strategy);
  });
  els.extraMonthlyInput.value = state.scenario.extraMonthly;
  els.oneOffInput.value = state.scenario.oneOff;
  els.monthlyIncomeInput.value = state.budget?.monthlyIncome || "";

  const current = Number(state.scenario.oneOffMonth || 1);
  els.oneOffMonthInput.innerHTML = Array.from({ length: 24 }, (_, index) => {
    const month = index + 1;
    return `<option value="${month}" ${month === current ? "selected" : ""}>Month ${month}</option>`;
  }).join("");
}

function getBillTotals() {
  const totalBills = state.bills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const rachelTotal = state.bills.reduce((sum, bill) => {
    return sum + (bill.splitWithRachel ? Number(bill.amount || 0) / 2 : 0);
  }, 0);
  const yourBills = totalBills - rachelTotal;
  const cardPayments = state.cards.reduce((sum, card) => sum + Number(card.payment || 0), 0);
  // Monthly income reported to the app should include the user's entered income
  // plus Rachel's contribution so the 'Could pay extra' box reflects combined funds.
  const monthlyIncome = Number(state.budget?.monthlyIncome || 0) + rachelTotal;
  const possibleExtra = monthlyIncome ? monthlyIncome - yourBills - cardPayments : 0;

  return {
    totalBills,
    rachelTotal,
    yourBills,
    cardPayments,
    monthlyIncome,
    possibleExtra,
  };
}

function renderBills() {
  const totals = getBillTotals();
  renderBillSortIndicators();
  els.totalBills.textContent = money(totals.totalBills);
  els.rachelTotal.textContent = money(totals.rachelTotal);
  els.possibleExtra.textContent = money(Math.max(totals.possibleExtra, 0));
  if (!totals.monthlyIncome) {
    els.possibleExtraNote.textContent = "Add income to calculate";
  } else if (totals.possibleExtra < 0) {
    els.possibleExtraNote.textContent = `Short by ${money(Math.abs(totals.possibleExtra))} after bills/cards`;
  } else {
    els.possibleExtraNote.textContent = `${money(totals.yourBills)} your bills + ${money(totals.cardPayments)} cards`;
  }

  if (!state.bills.length) {
    els.billsTable.innerHTML = `<tr><td class="empty-state" colspan="6">Add your regular monthly bills here.</td></tr>`;
    return;
  }

  els.billsTable.innerHTML = getSortedBills()
    .map((bill) => {
      const amount = Number(bill.amount || 0);
      const rachelShare = bill.splitWithRachel ? amount / 2 : 0;
      const yourShare = amount - rachelShare;
      return `
        <tr>
          <td><strong>${escapeHtml(bill.name)}</strong></td>
          <td>${money(amount)}</td>
          <td>
            <label class="table-check">
              <input type="checkbox" data-bill-split="${bill.id}" ${bill.splitWithRachel ? "checked" : ""}>
              <span>Halves</span>
            </label>
          </td>
          <td>${money(rachelShare)}</td>
          <td>${money(yourShare)}</td>
          <td>
            <div class="card-actions">
              <button class="mini-button" data-bill-edit="${bill.id}" type="button" title="Edit ${escapeHtml(bill.name)}" aria-label="Edit ${escapeHtml(bill.name)}"><i data-lucide="pencil"></i></button>
              <button class="mini-button danger" data-bill-delete="${bill.id}" type="button" title="Delete ${escapeHtml(bill.name)}" aria-label="Delete ${escapeHtml(bill.name)}"><i data-lucide="trash-2"></i></button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function getSortedBills() {
  const { field, direction } = state.billSort || { field: "amount", direction: "desc" };
  const multiplier = direction === "asc" ? 1 : -1;

  return [...state.bills].sort((a, b) => {
    const aValue = getBillSortValue(a, field);
    const bValue = getBillSortValue(b, field);

    if (aValue < bValue) return -1 * multiplier;
    if (aValue > bValue) return 1 * multiplier;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function getBillSortValue(bill, field) {
  const amount = Number(bill.amount || 0);
  if (field === "name") return String(bill.name || "").toLowerCase();
  if (field === "splitWithRachel") return bill.splitWithRachel ? 1 : 0;
  if (field === "rachelShare") return bill.splitWithRachel ? amount / 2 : 0;
  if (field === "yourShare") return bill.splitWithRachel ? amount / 2 : amount;
  return amount;
}

function renderBillSortIndicators() {
  const { field, direction } = state.billSort || { field: "amount", direction: "desc" };
  document.querySelectorAll("[data-bill-sort]").forEach((button) => {
    const isActive = button.dataset.billSort === field;
    button.setAttribute("aria-sort", isActive ? (direction === "asc" ? "ascending" : "descending") : "none");
    button.querySelector("span").textContent = isActive ? (direction === "asc" ? "▲" : "▼") : "";
  });
}

function renderSummary() {
  const totals = getTotals();
  const baseProjection = projectPayoff(state.cards);
  els.totalBalance.textContent = money(totals.balance);
  els.utilisationSummary.textContent = `${Math.round(totals.utilisation)}% total utilisation`;
  els.monthlyPayments.textContent = money(totals.payment);
  els.minimumSummary.textContent = `${money(totals.minimum)} minimum due`;
  els.interestForecast.textContent = money(baseProjection.totalInterest);
  els.strategySummary.textContent = `${getStrategyLabel(state.strategy)} strategy`;

  if (!baseProjection.schedule.length) {
    els.payoffDate.textContent = "-";
    els.payoffMonths.textContent = "No active balances";
    return;
  }

  els.payoffDate.textContent = baseProjection.paidOff ? formatMonth(baseProjection.schedule.at(-1).date) : "Needs review";
  els.payoffMonths.textContent = baseProjection.paidOff
    ? `${baseProjection.months} months at ${money(baseProjection.monthlyBudget)}/month`
    : "Payments may not beat interest";
}

function getTotals() {
  const balance = state.cards.reduce((sum, card) => sum + Number(card.balance || 0), 0);
  const limit = state.cards.reduce((sum, card) => sum + Number(card.limit || 0), 0);
  const minimum = state.cards.reduce((sum, card) => sum + Number(card.minimum || 0), 0);
  const payment = state.cards.reduce((sum, card) => sum + Number(card.payment || 0), 0);
  return {
    balance,
    limit,
    minimum,
    payment,
    utilisation: limit ? (balance / limit) * 100 : 0,
  };
}

function getSortedCards() {
  const { field, direction } = state.cardSort || { field: "balance", direction: "desc" };
  const multiplier = direction === "asc" ? 1 : -1;

  return [...state.cards].sort((a, b) => {
    const aValue = getCardSortValue(a, field);
    const bValue = getCardSortValue(b, field);

    if (aValue < bValue) return -1 * multiplier;
    if (aValue > bValue) return 1 * multiplier;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function getCardSortValue(card, field) {
  if (field === "name") return String(card.name || "").toLowerCase();
  if (field === "utilisation") return card.limit ? (Number(card.balance || 0) / Number(card.limit || 0)) * 100 : 0;
  return Number(card[field] || 0);
}

function renderSortIndicators() {
  const { field, direction } = state.cardSort || { field: "balance", direction: "desc" };
  document.querySelectorAll("[data-card-sort]").forEach((button) => {
    const isActive = button.dataset.cardSort === field;
    button.setAttribute("aria-sort", isActive ? (direction === "asc" ? "ascending" : "descending") : "none");
    button.querySelector("span").textContent = isActive ? (direction === "asc" ? "▲" : "▼") : "";
  });
}

function renderCards() {
  renderSortIndicators();

  if (!state.cards.length) {
    els.cardsTable.innerHTML = `<tr><td class="empty-state" colspan="8">Add your first credit card to start planning.</td></tr>`;
    return;
  }

  els.cardsTable.innerHTML = getSortedCards()
    .map((card) => {
      const utilisation = card.limit ? Math.min((card.balance / card.limit) * 100, 100) : 0;
      const utilClass = utilisation > 85 ? "danger" : utilisation > 60 ? "warning" : "";
      return `
        <tr>
          <td><strong>${escapeHtml(card.name)}</strong></td>
          <td>${money(card.balance)}</td>
          <td>${Number(card.apr).toFixed(2)}%</td>
          <td>${money(card.limit)}</td>
          <td><strong>${utilisation.toFixed(0)}%</strong><div class="utilisation-bar ${utilClass}"><i style="width:${utilisation}%"></i></div></td>
          <td>${money(card.minimum)}</td>
          <td>${money(card.payment)}</td>
          <td>
            <div class="card-actions">
              <button class="mini-button" data-edit="${card.id}" type="button" title="Edit ${escapeHtml(card.name)}" aria-label="Edit ${escapeHtml(card.name)}"><i data-lucide="pencil"></i></button>
              <button class="mini-button danger" data-delete="${card.id}" type="button" title="Delete ${escapeHtml(card.name)}" aria-label="Delete ${escapeHtml(card.name)}"><i data-lucide="trash-2"></i></button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderInsights() {
  const base = projectPayoff(state.cards);
  const scenario = projectPayoff(state.cards, {
    extraMonthly: state.scenario.extraMonthly,
    oneOff: state.scenario.oneOff,
    oneOffMonth: state.scenario.oneOffMonth,
  });
  const avalanche = projectPayoff(state.cards, { strategy: "avalanche" });
  const snowball = projectPayoff(state.cards, { strategy: "snowball" });
  const highestBalance = projectPayoff(state.cards, { strategy: "highest-balance" });
  const highestApr = [...state.cards].sort((a, b) => b.apr - a.apr)[0];
  const largestBalance = [...state.cards].sort((a, b) => b.balance - a.balance)[0];
  const savings = Math.max(0, base.totalInterest - scenario.totalInterest);
  const monthsSaved = Math.max(0, base.months - scenario.months);

  els.scenarioSavings.textContent = `${money(savings)} saved`;
  els.scenarioTimeSaved.textContent = monthsSaved ? `${monthsSaved} months faster` : "No time saved yet";

  const strategyWinner =
    avalanche.totalInterest <= snowball.totalInterest
      ? `Avalanche saves about ${money(snowball.totalInterest - avalanche.totalInterest)} interest compared with snowball.`
      : `Snowball is quicker for motivation, with similar cost on this setup.`;

  const insights = [
    {
      title: "Rollover target",
      body:
        state.strategy === "highest-balance" && largestBalance
          ? `When a card is cleared, its payment rolls into ${largestBalance.name}, currently your highest balance.`
          : highestApr
            ? `Extra payments are strongest on ${highestApr.name} at ${Number(highestApr.apr).toFixed(2)}% APR.`
            : "Add a card to see your best target.",
    },
    {
      title: "Strategy check",
      body: strategyWinner,
    },
    {
      title: "Highest-balance option",
      body: highestBalance.paidOff
        ? `Targeting the highest balance clears this setup in ${highestBalance.months} months with about ${money(highestBalance.totalInterest)} interest.`
        : "Highest-balance rollover still needs higher monthly payments to make reliable progress.",
    },
    {
      title: "Scenario result",
      body: scenario.paidOff
        ? `${money(state.scenario.extraMonthly)} extra per month and ${money(state.scenario.oneOff)} one-off could clear the plan by ${formatMonth(scenario.schedule.at(-1)?.date || new Date())}.`
        : "The scenario still needs higher payments to make reliable progress.",
    },
  ];

  els.insightList.innerHTML = insights
    .map((insight) => `<div class="insight"><strong>${insight.title}</strong><span>${insight.body}</span></div>`)
    .join("");
}

function renderSchedule() {
  const projection = projectPayoff(state.cards);
  const months = projection.schedule;

  if (!months.length) {
    els.scheduleSummary.textContent = "No remaining payment months yet.";
    els.scheduleGrid.innerHTML = `<div class="empty-state">No schedule yet.</div>`;
    return;
  }

  els.scheduleSummary.textContent = projection.paidOff
    ? `Showing all ${months.length} remaining months through ${formatMonth(months.at(-1).date)}.`
    : `Showing ${months.length} months. Payments may not beat interest, so review the plan.`;

  els.scheduleGrid.innerHTML = months
    .map(
      (item) => `
        <article class="schedule-card">
          <span>${formatMonth(item.date)}</span>
          <strong>${money(item.balance)} left</strong>
          <small>${money(item.paid)} paid, ${money(item.interest)} interest</small>
          <em class="${item.target ? "is-rollover" : ""}">${item.target ? `Rollover ${money(item.rolloverAmount)} to ${escapeHtml(item.target)}` : "Base payments only"}</em>
        </article>
      `,
    )
    .join("");
}

function renderChart() {
  const base = projectPayoff(state.cards);
  const scenario = projectPayoff(state.cards, {
    extraMonthly: state.scenario.extraMonthly,
    oneOff: state.scenario.oneOff,
    oneOffMonth: state.scenario.oneOffMonth,
  });
  const maxLength = Math.max(base.schedule.length, scenario.schedule.length, 12);
  const labels = Array.from({ length: Math.min(maxLength, 60) }, (_, index) => `M${index + 1}`);
  const baseData = labels.map((_, index) => base.schedule[index]?.balance ?? 0);
  const scenarioData = labels.map((_, index) => scenario.schedule[index]?.balance ?? 0);

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Current plan",
          data: baseData,
          borderColor: "#176b5d",
          backgroundColor: "rgba(23, 107, 93, 0.12)",
          fill: true,
          tension: 0.28,
        },
        {
          label: "What-if",
          data: scenarioData,
          borderColor: "#d9862c",
          backgroundColor: "rgba(217, 134, 44, 0.08)",
          fill: true,
          tension: 0.28,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${money(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { callback: (value) => money(value) },
        },
      },
    },
  };

  if (balanceChart) {
    balanceChart.data = config.data;
    balanceChart.options = config.options;
    balanceChart.update();
    return;
  }

  balanceChart = new Chart(document.querySelector("#balanceChart"), config);
}

function openCardModal(card = null) {
  els.modalTitle.textContent = card ? "Edit card" : "Add card";
  els.cardId.value = card?.id || "";
  els.cardName.value = card?.name || "";
  els.cardBalance.value = card?.balance ?? "";
  els.cardApr.value = card?.apr ?? "";
  els.cardLimit.value = card?.limit ?? "";
  els.cardMinimum.value = card?.minimum ?? "";
  els.cardPayment.value = card?.payment ?? "";
  els.cardModal.showModal();
}

function saveCard(event) {
  event.preventDefault();
  const card = {
    id: els.cardId.value || makeId(),
    name: els.cardName.value.trim(),
    balance: Number(els.cardBalance.value),
    apr: Number(els.cardApr.value),
    limit: Number(els.cardLimit.value),
    minimum: Number(els.cardMinimum.value),
    payment: Number(els.cardPayment.value),
  };

  if (!card.name || [card.balance, card.apr, card.limit, card.minimum, card.payment].some((value) => Number.isNaN(value))) return;

  const existingIndex = state.cards.findIndex((item) => item.id === card.id);
  if (existingIndex >= 0) {
    state.cards[existingIndex] = card;
  } else {
    state.cards.push(card);
  }

  els.cardModal.close();
  render();
}

function saveBill(event) {
  event.preventDefault();
  const bill = {
    id: els.billId.value || makeId(),
    name: els.billName.value.trim(),
    amount: Number(els.billAmount.value),
    splitWithRachel: els.billSplit.checked,
  };

  if (!bill.name || Number.isNaN(bill.amount)) return;

  const existingIndex = state.bills.findIndex((item) => item.id === bill.id);
  if (existingIndex >= 0) {
    state.bills[existingIndex] = bill;
  } else {
    state.bills.push(bill);
  }

  resetBillForm();
  render();
}

function resetBillForm() {
  els.billId.value = "";
  els.billName.value = "";
  els.billAmount.value = "";
  els.billSplit.checked = false;
  els.saveBillButton.querySelector("span").textContent = "Add bill";
}

function editBill(id) {
  const bill = state.bills.find((item) => item.id === id);
  if (!bill) return;

  els.billId.value = bill.id;
  els.billName.value = bill.name;
  els.billAmount.value = bill.amount;
  els.billSplit.checked = Boolean(bill.splitWithRachel);
  els.saveBillButton.querySelector("span").textContent = "Save bill";
  els.billName.focus();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `credit-card-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.cards)) throw new Error("Invalid file");
      state = normaliseState(parsed);
      render();
    } catch {
      alert("That file does not look like CardClear export data.");
    }
  };
  reader.readAsText(file);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setDebugStatus(message) {
  const debug = document.querySelector("#debugStatus");
  if (debug) debug.textContent = `Debug: ${message}`;
}

function showLoginOverlay() {
  const overlay = document.getElementById("loginOverlay");
  if (overlay) overlay.classList.remove("hidden");
}

function hideLoginOverlay() {
  const overlay = document.getElementById("loginOverlay");
  if (overlay) overlay.classList.add("hidden");
}

function setLoginError(message) {
  const error = document.getElementById("loginError");
  if (error) error.textContent = message;
}

function attemptLogin() {
  const input = document.getElementById("loginInput");
  if (!input) return;
  const value = String(input.value || "").trim();
  if (value === ACCESS_CODE) {
    hideLoginOverlay();
    setDebugStatus("Access granted. Initialising app...");
    initStorage().finally(() => {
      render();
    });
    return;
  }

  setLoginError("Access code incorrect. Try again.");
  input.focus();
}

document.addEventListener("DOMContentLoaded", async () => {
  setDebugStatus("DOM loaded, waiting for access code...");

  const loginButton = document.getElementById("loginButton");
  const loginInput = document.getElementById("loginInput");

  if (loginButton) loginButton.addEventListener("click", attemptLogin);
  if (loginInput) {
    loginInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") attemptLogin();
    });
  }

  showLoginOverlay();
  els.addCardButton.addEventListener("click", () => openCardModal());
  els.closeModalButton.addEventListener("click", () => els.cardModal.close());
  els.cancelModalButton.addEventListener("click", () => els.cardModal.close());
  els.cardForm.addEventListener("submit", saveCard);
  els.billForm.addEventListener("submit", saveBill);
  els.exportButton.addEventListener("click", exportData);
  els.importButton.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) importData(file);
    event.target.value = "";
  });

  document.querySelectorAll("[data-strategy]").forEach((button) => {
    button.addEventListener("click", () => {
      state.strategy = button.dataset.strategy;
      render();
    });
  });

  [els.extraMonthlyInput, els.oneOffInput, els.oneOffMonthInput].forEach((input) => {
    input.addEventListener("input", () => {
      state.scenario = {
        extraMonthly: Number(els.extraMonthlyInput.value || 0),
        oneOff: Number(els.oneOffInput.value || 0),
        oneOffMonth: Number(els.oneOffMonthInput.value || 1),
      };
      render();
    });
  });

  els.monthlyIncomeInput.addEventListener("input", () => {
    state.budget.monthlyIncome = Number(els.monthlyIncomeInput.value || 0);
    render();
  });

  els.resetScenarioButton.addEventListener("click", () => {
    state.scenario = { extraMonthly: 0, oneOff: 0, oneOffMonth: 1 };
    render();
  });

  document.querySelectorAll("[data-card-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.dataset.cardSort;
      const current = state.cardSort || { field: "balance", direction: "desc" };
      state.cardSort = {
        field,
        direction: current.field === field && current.direction === "desc" ? "asc" : "desc",
      };
      render();
    });
  });

  // Fallback: if the header buttons lost their `data-bill-sort` attributes
  // (for example due to caching or deployment transformations), wire them
  // up by matching their visible label text so sorting still works.
  if (document.querySelectorAll("[data-bill-sort]").length === 0) {
    document.querySelectorAll("#bills thead button.sort-button").forEach((button) => {
      const txt = (button.textContent || "").toLowerCase();
      if (txt.includes("monthly amount") || txt.includes("amount")) button.dataset.billSort = "amount";
      else if (txt.includes("bill")) button.dataset.billSort = "name";
      else if (txt.includes("rachel halves")) button.dataset.billSort = "splitWithRachel";
      else if (txt.includes("rachel pays")) button.dataset.billSort = "rachelShare";
      else if (txt.includes("your share")) button.dataset.billSort = "yourShare";
    });
  }

  document.querySelectorAll("[data-bill-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.dataset.billSort;
      const current = state.billSort || { field: "amount", direction: "desc" };
      state.billSort = {
        field,
        direction: current.field === field && current.direction === "desc" ? "asc" : "desc",
      };
      render();
    });
  });

  els.cardsTable.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) {
      const card = state.cards.find((item) => item.id === editButton.dataset.edit);
      if (card) openCardModal(card);
    }

    if (deleteButton) {
      state.cards = state.cards.filter((item) => item.id !== deleteButton.dataset.delete);
      render();
    }
  });

  els.billsTable.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-bill-edit]");
    const deleteButton = event.target.closest("[data-bill-delete]");

    if (editButton) editBill(editButton.dataset.billEdit);

    if (deleteButton) {
      state.bills = state.bills.filter((item) => item.id !== deleteButton.dataset.billDelete);
      render();
    }
  });

  els.billsTable.addEventListener("change", (event) => {
    const splitInput = event.target.closest("[data-bill-split]");
    if (!splitInput) return;

    const bill = state.bills.find((item) => item.id === splitInput.dataset.billSplit);
    if (!bill) return;

    bill.splitWithRachel = splitInput.checked;
    render();
  });

});
