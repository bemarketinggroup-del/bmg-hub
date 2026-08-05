(function initializePrimeNgAdapter() {
  "use strict";

  const addClasses = (element, ...classes) => {
    if (!element) return;
    element.classList.add(...classes.filter(Boolean));
  };

  const enhanceButton = (button) => {
    addClasses(button, "p-button", "p-component", "p-ripple");
    if (button.matches(".ghost-button, .secondary-button")) addClasses(button, "p-button-outlined");
    if (button.matches(".text-button")) addClasses(button, "p-button-text");
    if (button.matches(".danger-button")) addClasses(button, "p-button-danger");
    if (button.matches(".icon-button")) addClasses(button, "p-button-rounded", "p-button-icon-only");
    if (button.matches("[aria-pressed], .mode-tab, [role='tab']")) addClasses(button, "p-togglebutton");

    button.querySelectorAll(":scope > svg, :scope > .lc").forEach((icon) => addClasses(icon, "p-button-icon"));
    if (!button.getAttribute("aria-label") && button.matches(".icon-button")) {
      const accessibleName = button.getAttribute("title") || button.textContent.trim();
      if (accessibleName) button.setAttribute("aria-label", accessibleName);
    }
  };

  const enhanceField = (field) => {
    addClasses(field, "p-component");
    if (field.matches("textarea")) addClasses(field, "p-inputtext", "p-textarea");
    if (field.matches("select")) addClasses(field, "p-select", "p-select-native");
    if (field.matches("input[type='checkbox']")) addClasses(field, "p-checkbox-input");
    if (field.matches("input[type='radio']")) addClasses(field, "p-radiobutton-input");
    if (field.matches("input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='file'])")) {
      addClasses(field, "p-inputtext");
    }
    if (field.matches("input[type='file']")) addClasses(field, "p-fileupload-choose");
  };

  const enhanceDialog = (dialog) => {
    addClasses(dialog, "p-dialog", "p-component");
    dialog.setAttribute("aria-modal", "true");
    dialog.querySelectorAll(":scope .modal-head").forEach((header) => {
      addClasses(header, "p-dialog-header");
      header.querySelectorAll("h2, h3").forEach((title) => addClasses(title, "p-dialog-title"));
    });
    dialog.querySelectorAll(":scope .modal-actions").forEach((footer) => addClasses(footer, "p-dialog-footer"));
  };

  const enhanceTabs = (tabList) => {
    addClasses(tabList, "p-tabs", "p-tablist", "p-component");
    if (!tabList.hasAttribute("role")) tabList.setAttribute("role", "tablist");
    tabList.querySelectorAll(":scope > button, :scope [role='tab']").forEach((tab) => {
      addClasses(tab, "p-tab", "p-component");
      if (!tab.hasAttribute("role")) tab.setAttribute("role", "tab");
      const active = tab.classList.contains("is-active") || tab.getAttribute("aria-selected") === "true";
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
  };

  const enhanceTable = (table) => {
    addClasses(table, "p-datatable-table");
    addClasses(table.tHead, "p-datatable-thead");
    Array.from(table.tBodies).forEach((body) => addClasses(body, "p-datatable-tbody"));
    const container = table.closest(".p-datatable") || table.parentElement;
    if (container) addClasses(container, "p-datatable", "p-component");
  };

  const enhanceTree = (root) => {
    if (!(root instanceof Element || root instanceof Document)) return;
    const selectAll = (selector) => [
      ...(root instanceof Element && root.matches(selector) ? [root] : []),
      ...root.querySelectorAll(selector)
    ];

    selectAll("button").forEach(enhanceButton);
    selectAll("input, textarea, select").forEach(enhanceField);
    selectAll("dialog.modal").forEach(enhanceDialog);
    selectAll(".mode-tabs, .team-tabs, .smart-off-detail-periods, [data-prime-tabs]").forEach(enhanceTabs);
    selectAll("table").forEach(enhanceTable);

    selectAll(".panel, details.panel").forEach((panel) => addClasses(panel, "p-panel", "p-component"));
    selectAll(".panel-head").forEach((header) => addClasses(header, "p-panel-header"));
    selectAll(".metric, .lead-card, .graphic-review-card, .client-card, .drive-card, .ped-content-card, .ped-staging-card, .ped-agenda-item, .ped-carousel-editor-card").forEach((card) => addClasses(card, "p-card", "p-component"));
    selectAll(".toolbar, .task-workspace-head, .google-calendar-head, .graphics-workspace-head, .ped-carousel-editor-toolbar").forEach((toolbar) => addClasses(toolbar, "p-toolbar", "p-component"));
    selectAll(".search, .user-directory-search, .task-client-search, .team-chat-search").forEach((field) => addClasses(field, "p-iconfield"));
    selectAll(".notification-panel, .task-status-popover, .task-client-results, .team-chat-reference-picker").forEach((popover) => addClasses(popover, "p-popover", "p-component"));

    selectAll(".client-tag, .task-status, .graphic-review-status, .user-role-tag, .user-status-tag, .ped-status, .service-status, .ped-carousel-editor-status").forEach((tag) => addClasses(tag, "p-tag", "p-component"));
    selectAll(".nav-unread-badge, .p-badge, [data-badge], .ped-carousel-count, .ped-carousel-editor-order").forEach((badge) => addClasses(badge, "p-badge", "p-component"));
    selectAll(".user-avatar, .team-chat-avatar, .sidebar-user-avatar, [data-avatar]").forEach((avatar) => addClasses(avatar, "p-avatar", "p-component"));
    selectAll(".form-message, .smart-conflict-message, .ped-error, .graphics-empty.is-error").forEach((message) => addClasses(message, "p-message", "p-component"));
    selectAll("progress").forEach((progress) => {
      addClasses(progress, "p-progressbar", "p-component");
      progress.setAttribute("aria-label", progress.getAttribute("aria-label") || "Avanzamento operazione");
    });
    selectAll(".drive-folder-spinner, .smart-loading-spinner, .drive-spinner").forEach((spinner) => {
      addClasses(spinner, "p-progressspinner", "p-component");
      spinner.setAttribute("role", "progressbar");
      spinner.setAttribute("aria-label", spinner.getAttribute("aria-label") || "Caricamento");
    });
  };

  const refreshInteractiveState = (event) => {
    const tabList = event.target.closest(".mode-tabs, .team-tabs, .smart-off-detail-periods, [data-prime-tabs]");
    if (tabList) window.requestAnimationFrame(() => enhanceTabs(tabList));
  };

  const renderRipple = (event) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const button = event.target.closest("button.p-ripple:not(:disabled)");
    if (!button) return;
    const bounds = button.getBoundingClientRect();
    const size = Math.max(bounds.width, bounds.height) * 1.35;
    const ink = document.createElement("span");
    ink.className = "p-ink";
    ink.style.width = `${size}px`;
    ink.style.height = `${size}px`;
    ink.style.left = `${event.clientX - bounds.left - size / 2}px`;
    ink.style.top = `${event.clientY - bounds.top - size / 2}px`;
    button.appendChild(ink);
    window.setTimeout(() => ink.remove(), 520);
  };

  enhanceTree(document);
  document.documentElement.classList.add("primeng-adapter-active");
  document.addEventListener("click", refreshInteractiveState);
  document.addEventListener("pointerdown", renderRipple);

  // I contenuti di BMG Hub vengono renderizzati in molte aree indipendenti.
  // Un refresh leggero intercetta anche gli aggiornamenti asincroni senza
  // sostituire i metodi DOM nativi usati dai flussi Drive, PED e Calendar.
  window.setInterval(() => {
    if (document.visibilityState === "visible") enhanceTree(document);
  }, 1200);
})();
