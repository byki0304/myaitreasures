/* Integer-only settlement engine: no network, storage or external dependencies. */
(function (global) {
  'use strict';
  const LIMIT = 1000000000;
  const RATES = [0, 10, 5, 1];
  function tax(e) { return Math.floor((Number(e.amount) * RATES[e.tax] + 50) / 100); }
  function final(e) { return Number(e.amount) + tax(e); }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }
  function validate(data) {
    const errors = {};
    const length = s => Array.from(s.trim()).length;
    if (length(data.meeting) < 1 || length(data.meeting) > 60) errors.meeting = 'meetingError';
    if (!validDate(data.date)) errors.date = 'dateError';
    if (!['KRW', 'JPY'].includes(data.currency)) errors.currency = 'currencyError';
    if (data.people.length < 2) errors.people = 'peopleError';
    const seen = new Set();
    for (const p of data.people) {
      if (length(p.name) < 1 || length(p.name) > 40) errors[`person-${p.id}`] = 'nameError';
      else if (seen.has(p.name.trim())) errors[`person-${p.id}`] = 'duplicateError';
      seen.add(p.name.trim());
    }
    if (!data.expenses.length) errors.expenses = 'expensesError';
    let total = 0;
    for (const e of data.expenses) {
      if (length(e.detail) < 1 || length(e.detail) > 100) errors[`detail-${e.id}`] = 'detailError';
      if (!/^\d+$/.test(String(e.amount)) || Number(e.amount) < 1 || Number(e.amount) > LIMIT) errors[`amount-${e.id}`] = 'amountError';
      if (!data.people.some(p => p.id === Number(e.payer))) errors[`payer-${e.id}`] = 'payerError';
      if (!e.members.length || e.members.some(id => !data.people.some(p => p.id === id)) || new Set(e.members).size !== e.members.length) errors[`members-${e.id}`] = 'membersError';
      if (!Number.isInteger(e.tax) || !RATES.hasOwnProperty(e.tax)) errors[`tax-${e.id}`] = 'taxError';
      if (!errors[`amount-${e.id}`] && !errors[`tax-${e.id}`]) total += final(e);
    }
    if (total > LIMIT) errors.expenses = 'totalError';
    return errors;
  }
  function settle(data) {
    const errors = validate(data);
    if (Object.keys(errors).length) throw new Error('Invalid settlement input');
    const rows = data.people.map(p => ({ id: p.id, name: p.name.trim(), paid: 0, share: 0 }));
    const ledger = data.expenses.map(e => {
      const amount = final(e), members = rows.filter(p => e.members.includes(p.id));
      const base = Math.floor(amount / members.length), remainder = amount % members.length;
      const allocations = members.map((p, i) => {
        const share = base + (i < remainder ? 1 : 0); p.share += share;
        return { id: p.id, share, extra: i < remainder };
      });
      rows.find(p => p.id === Number(e.payer)).paid += amount;
      return { ...e, detail: e.detail.trim(), taxAmount: tax(e), final: amount, base, remainder, allocations };
    });
    rows.forEach(p => p.balance = p.share - p.paid);
    const debt = rows.filter(p => p.balance > 0).map(p => ({ ...p, left: p.balance }));
    const credit = rows.filter(p => p.balance < 0).map(p => ({ ...p, left: -p.balance }));
    const transfers = []; let i = 0, j = 0;
    while (i < debt.length && j < credit.length) {
      const amount = Math.min(debt[i].left, credit[j].left);
      transfers.push({ from: debt[i].id, to: credit[j].id, amount });
      debt[i].left -= amount; credit[j].left -= amount;
      if (debt[i].left === 0) i++;
      if (credit[j].left === 0) j++;
    }
    return { total: ledger.reduce((s, e) => s + e.final, 0), rows, ledger, transfers };
  }
  global.TreasuresEngine = { LIMIT, RATES, tax, final, validDate, validate, settle };
  if (typeof module !== 'undefined') module.exports = global.TreasuresEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
