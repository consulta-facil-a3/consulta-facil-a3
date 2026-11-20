/*
 * Consulta Fácil: protótipo navegável.
 * Organização: estado, regras de navegação, renderização, componentes (modal,
 * abas, avisos), formulários, ações por clique e inicialização.
 */
(function () {
  "use strict";

  var V = window.CFValidation;

  /* ---------- estado ---------- */

  var DEFAULT_SCREEN = "entrar";
  var MAIN_SCREENS = ["inicio", "consultas", "ajuda"];
  var BARE_SCREENS = ["entrar", "agente"];
  var LAST_SLOT = "14:20";      // horário usado para demonstrar a vaga disputada
  var FALLBACK_SLOT = "16:20";  // alternativa livre quando a última vaga é perdida
  var DEMO_CPF = "529.982.247-25"; // fictício, com dígitos verificadores válidos
  var DEMO_BIRTH = "12/03/1958";

  var state = {
    name: "Maria",
    ubs: "UBS Jardim das Flores",
    ubsShort: "Jardim das Flores",
    esp: "Pediatria",
    doctor: "Dra. Ana Ribeiro",
    initials: "AR",
    date: "Sex, 20 de novembro",
    dateShort: "sex, 20/11",
    time: null,
    slotTaken: false,
    protocol: "CF-2026-001842"
  };

  var DATE_SHORT = {
    "Qui, 19 de novembro": "hoje, 19/11",
    "Sex, 20 de novembro": "sex, 20/11",
    "Seg, 23 de novembro": "seg, 23/11",
    "Ter, 24 de novembro": "ter, 24/11",
    "Qua, 25 de novembro": "qua, 25/11"
  };

  /* ---------- utilitários ---------- */

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function focusWithoutScroll(node) {
    try { node.focus({ preventScroll: true }); } catch (err) { node.focus(); }
  }

  var app = document.getElementById("app");
  var stage = $(".stage");
  var screens = $$(".screen");

  /* ---------- regras de navegação ---------- */

  function screenExists(id) {
    return !!id && !!document.getElementById("screen-" + id);
  }

  function resolveScreen(id) {
    return screenExists(id) ? id : DEFAULT_SCREEN;
  }

  function isBookableSlot(time) {
    return $$("#slotGrid .slot").some(function (btn) {
      return btn.getAttribute("data-time") === time && (time === LAST_SLOT || !btn.disabled);
    });
  }

  /* Garante que cada tela abra com o estado que ela pressupõe. */
  function normalizeStateFor(id) {
    if (id === "vaga-ocupada") {
      state.slotTaken = true;
      state.time = LAST_SLOT;
    }
    var lostSlot = state.time === LAST_SLOT && state.slotTaken;
    if ((id === "confirmar" || id === "comprovante") && (!state.time || lostSlot)) {
      state.time = FALLBACK_SLOT;
    }
  }

  function screenFromHash() {
    return location.hash.replace(/^#\//, "");
  }

  /* ---------- renderização ---------- */

  function paint() {
    $$("[data-bind]").forEach(function (node) {
      var value = state[node.getAttribute("data-bind")];
      if (value !== null && value !== undefined) node.textContent = value;
    });
    $("#protocol").textContent = state.protocol;
    paintSlots();
    var current = document.body.getAttribute("data-screen");
    $$("[data-route]").forEach(function (btn) {
      if (btn.getAttribute("data-route") === current) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
    });
    $$(".tabbar button").forEach(function (btn) {
      if (btn.getAttribute("data-go") === current) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
  }

  function paintSlots() {
    $$("#slotGrid .slot").forEach(function (btn) {
      var time = btn.getAttribute("data-time");
      if (time === LAST_SLOT) {
        btn.disabled = state.slotTaken;
        btn.textContent = time;
        btn.appendChild(el("small", null, state.slotTaken ? "Ocupada" : "Última vaga"));
      }
      btn.setAttribute("aria-pressed", !btn.disabled && time === state.time ? "true" : "false");
    });
    $("#continueBtn").disabled = !state.time || (state.time === LAST_SLOT && state.slotTaken);
    $("#slotWarning").hidden = !(state.time === LAST_SLOT && !state.slotTaken);
    $$(".date-chip").forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip.getAttribute("data-date") === state.date ? "true" : "false");
    });
  }

  function show(requestedId, push) {
    var id = resolveScreen(requestedId);
    var target = document.getElementById("screen-" + id);
    screens.forEach(function (screen) {
      screen.classList.toggle("active", screen === target);
    });
    document.body.setAttribute("data-screen", id);
    document.body.classList.toggle("bare", BARE_SCREENS.indexOf(id) !== -1);
    document.body.classList.toggle("flow", MAIN_SCREENS.indexOf(id) === -1 && BARE_SCREENS.indexOf(id) === -1);
    paint();
    if (push !== false) {
      try { history.pushState({ screen: id }, "", "#/" + id); } catch (err) { location.hash = "#/" + id; }
    }
    if (app) app.scrollTop = 0;
    var heading = target.querySelector("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      focusWithoutScroll(heading);
    }
    return id;
  }

  /* Navegação pelo roteiro lateral: reinicia a etapa escolhida. */
  function jumpTo(id) {
    closeModal();
    if (id === "horarios") { state.slotTaken = false; state.time = null; }
    normalizeStateFor(id);
    show(id);
  }

  /* ---------- avisos ---------- */

  var toastTimer = null;

  function toast(message) {
    var box = $("#toast");
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove("show"); }, 3200);
  }

  function loading(text, delay, done) {
    var box = $("#loading");
    $("#loadingText").textContent = text;
    box.classList.add("show");
    setTimeout(function () {
      box.classList.remove("show");
      if (done) done();
    }, delay || 900);
  }

  /* ---------- modal ---------- */

  var MODALS = {
    waitlist: function () {
      return {
        title: "Entrar na fila de espera?",
        body: "Avisaremos por WhatsApp quando abrir uma vaga de " + state.esp + " na " + state.ubs + ". A ordem considera prioridade clínica e tempo de espera.",
        action: { label: "Entrar na fila", className: "btn btn-primary", action: "join" }
      };
    },
    specHelp: function () {
      return {
        title: "Não sabe qual escolher?",
        body: "Se há febre, dor forte ou falta de ar, procure a UBS hoje. Para acompanhamento, comece pelo clínico geral. Ele encaminha para o especialista quando necessário.",
        action: { label: "Entendi", className: "btn btn-secondary", close: true }
      };
    },
    phone: function () {
      return {
        title: "Falar com a UBS",
        body: "UBS Jardim das Flores: (11) 3333-1010, das 7h às 19h. Central de agendamento: 0800 123 4567.",
        action: { label: "Ligar para a central", className: "btn btn-secondary", href: "tel:08001234567" }
      };
    },
    cancel: function () {
      return {
        title: "Cancelar esta consulta?",
        body: "Você pode cancelar até 12 horas antes. A vaga volta para a fila de espera. Se já cancelou 3 vezes neste mês, a recepção pode entrar em contato para ajudar no próximo agendamento.",
        action: { label: "Confirmar cancelamento", className: "btn btn-primary", action: "cancel-appointment" }
      };
    }
  };

  var lastFocus = null;
  var pendingCancel = null;

  function buildModalAction(spec) {
    if (spec.href) return el("a", { "class": spec.className, href: spec.href }, spec.label);
    var attrs = { "class": spec.className, type: "button" };
    if (spec.close) attrs["data-close-modal"] = "";
    if (spec.action) attrs["data-modal-action"] = spec.action;
    return el("button", attrs, spec.label);
  }

  function isModalOpen() {
    return $("#modalBackdrop").classList.contains("open");
  }

  function openModal(kind, trigger) {
    var factory = MODALS[kind];
    if (!factory) return;
    var content = factory();
    lastFocus = trigger || document.activeElement;
    $("#modalTitle").textContent = content.title;
    $("#modalBody").replaceChildren(el("p", null, content.body));
    $("#modalActions").replaceChildren(buildModalAction(content.action));
    var backdrop = $("#modalBackdrop");
    backdrop.classList.add("open");
    if (stage) stage.inert = true;
    var title = $("#modalTitle");
    title.setAttribute("tabindex", "-1");
    title.focus();
  }

  function closeModal(restoreFocus) {
    var backdrop = $("#modalBackdrop");
    if (!backdrop.classList.contains("open")) return;
    backdrop.classList.remove("open");
    if (stage) stage.inert = false;
    if (restoreFocus !== false && lastFocus && document.contains(lastFocus)) focusWithoutScroll(lastFocus);
    lastFocus = null;
  }

  /* Mantém o Tab dentro do modal (reforço para navegadores sem suporte a inert). */
  function trapFocus(event) {
    var focusables = $$("#modalBackdrop button, #modalBackdrop a[href]").filter(function (node) {
      return !node.disabled && node.offsetParent !== null;
    });
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    var inside = $("#modalBackdrop").contains(document.activeElement);
    if (event.shiftKey && (document.activeElement === first || !inside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
      event.preventDefault();
      first.focus();
    }
  }

  function cancelAppointment(card) {
    if (!card) return;
    var status = card.querySelector(".status");
    status.textContent = "Cancelada por você";
    status.classList.add("off");
    card.classList.add("canceled");
    $$(".consult-actions button", card).forEach(function (btn) { btn.disabled = true; });
    toast("Consulta cancelada. A vaga voltou para a fila de espera.");
  }

  /* ---------- abas (padrão WAI-ARIA, com setas, Home e End) ---------- */

  var tabs = $$('.tabs [role="tab"]');

  function selectTab(tab, moveFocus) {
    tabs.forEach(function (item) {
      var selected = item === tab;
      item.setAttribute("aria-selected", selected ? "true" : "false");
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute("aria-controls")).hidden = !selected;
    });
    if (moveFocus) tab.focus();
  }

  function onTabKeydown(event) {
    var index = tabs.indexOf(event.target);
    if (index === -1) return;
    var next = null;
    if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
    else if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (event.key === "Home") next = tabs[0];
    else if (event.key === "End") next = tabs[tabs.length - 1];
    if (!next) return;
    event.preventDefault();
    selectTab(next, true);
  }

  /* ---------- acessibilidade: letra e contraste ---------- */

  var FONT_SIZES = [17, 19, 21, 23];
  var fontIndex = 0;

  function loadPreferences() {
    try {
      var savedFont = localStorage.getItem("cf-font");
      if (savedFont && FONT_SIZES[Number(savedFont)] !== undefined) fontIndex = Number(savedFont);
      if (localStorage.getItem("cf-contrast") === "1") document.body.classList.add("high-contrast");
    } catch (err) { /* modo privado pode bloquear o armazenamento */ }
  }

  function savePreference(key, value) {
    try { localStorage.setItem(key, value); } catch (err) { /* idem */ }
  }

  function paintAccessibility() {
    var pressed = document.body.classList.contains("high-contrast");
    document.documentElement.style.fontSize = FONT_SIZES[fontIndex] + "px";
    $("#contrastBtn").setAttribute("aria-pressed", pressed ? "true" : "false");
    $("#helpContrast").textContent = pressed ? "Desativar contraste" : "Ativar contraste";
  }

  function changeFont(delta) {
    fontIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, fontIndex + delta));
    savePreference("cf-font", String(fontIndex));
    paintAccessibility();
    toast(fontIndex === 0 ? "Tamanho original da letra." : "Letra ampliada: " + (fontIndex + 1) + " de " + FONT_SIZES.length + ".");
  }

  function toggleContrast() {
    var pressed = document.body.classList.toggle("high-contrast");
    savePreference("cf-contrast", pressed ? "1" : "0");
    paintAccessibility();
    toast(pressed ? "Alto contraste ativado." : "Contraste padrão restaurado.");
  }

  /* ---------- calendário (.ics) ---------- */

  function icsText(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function icsDate(date) {
    return date.getUTCFullYear() + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate()) + "T" +
      pad(date.getUTCHours()) + pad(date.getUTCMinutes()) + pad(date.getUTCSeconds()) + "Z";
  }

  function makeCalendarFile() {
    var time = state.time || FALLBACK_SLOT;
    var dayMatch = /(\d{1,2}) de novembro/.exec(state.date);
    var day = dayMatch ? Number(dayMatch[1]) : 20;
    // Horário de Brasília (UTC-3, sem horário de verão desde 2019) convertido para UTC.
    var start = new Date(Date.UTC(2026, 10, day, Number(time.slice(0, 2)) + 3, Number(time.slice(3, 5))));
    var end = new Date(start.getTime() + 40 * 60000);
    var ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Consulta Facil//Vale Verde//PT-BR",
      "BEGIN:VEVENT",
      "UID:" + state.protocol + "@consultafacil.valeverde",
      "DTSTAMP:" + icsDate(new Date()),
      "DTSTART:" + icsDate(start),
      "DTEND:" + icsDate(end),
      "SUMMARY:" + icsText("Consulta de " + state.esp + " - Consulta Fácil"),
      "LOCATION:" + icsText(state.ubs),
      "DESCRIPTION:" + icsText("Profissional: " + state.doctor + ". Protocolo: " + state.protocol),
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    var link = el("a", { href: url, download: "consulta-facil.ics" });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("Arquivo do calendário baixado.");
  }

  /* ---------- formulários ---------- */

  function applyMask(input, formatter) {
    input.addEventListener("input", function () { input.value = formatter(input.value); });
  }

  var BIRTH_MESSAGES = {
    format: "Digite a data de nascimento no formato dd/mm/aaaa.",
    invalid: "Essa data não existe. Confira o dia, o mês e o ano.",
    future: "A data de nascimento não pode ser no futuro."
  };

  /* Retorna { field, message } do primeiro erro, ou null. */
  function validateIdentity(cpfInput, birthInput) {
    if (V.digits(cpfInput.value).length !== 11) return { field: cpfInput, message: "Digite os 11 números do CPF." };
    if (!V.isValidCpf(cpfInput.value)) return { field: cpfInput, message: "Este CPF não é válido. Confira os números." };
    var birthError = V.birthDateError(birthInput.value);
    if (birthError) return { field: birthInput, message: BIRTH_MESSAGES[birthError] };
    return null;
  }

  function setFieldError(box, error) {
    [$("#cpf"), $("#birth")].forEach(function (input) { input.removeAttribute("aria-invalid"); });
    if (!error) {
      box.classList.remove("show");
      return;
    }
    box.textContent = error.message;
    box.classList.add("show");
    error.field.setAttribute("aria-invalid", "true");
    error.field.focus();
  }

  function onLoginSubmit(event) {
    event.preventDefault();
    var error = validateIdentity($("#cpf"), $("#birth"));
    setFieldError($("#loginError"), error);
    if (error) return;
    state.name = "Maria";
    show("inicio");
  }

  function fillDemo() {
    $("#cpf").value = DEMO_CPF;
    $("#birth").value = DEMO_BIRTH;
  }

  function onAgentSubmit(event) {
    event.preventDefault();
    var error = validateIdentity($("#agentCpf"), $("#agentBirth"));
    if (error) {
      toast(error.message);
      error.field.focus();
      return;
    }
    if (!$("#agentConsent").checked) {
      toast("O paciente precisa autorizar o atendimento.");
      $("#agentConsent").focus();
      return;
    }
    state.name = "João da Silva";
    show("ubs");
  }

  function onConfirmSubmit(event) {
    event.preventDefault();
    if ($("#whatsappToggle").checked && !V.isValidPhone($("#phone").value)) {
      toast("Digite um celular com DDD ou desligue o lembrete.");
      $("#phone").focus();
      return;
    }
    loading("Salvando sua consulta...", 950, function () {
      state.protocol = "CF-2026-" + String(Math.floor(100000 + Math.random() * 900000));
      show("comprovante");
    });
  }

  function onContinue() {
    if (!state.time) return;
    if (state.time === LAST_SLOT && !state.slotTaken) {
      loading("Confirmando sua vaga...", 1100, function () {
        state.slotTaken = true;
        show("vaga-ocupada");
      });
      return;
    }
    show("confirmar");
  }

  function filterUbs() {
    var query = this.value.trim().toLowerCase();
    var visible = 0;
    $$("#ubsList .list-card").forEach(function (card) {
      var text = (card.getAttribute("data-ubs") + " " + card.getAttribute("data-district")).toLowerCase();
      var match = text.indexOf(query) !== -1;
      card.hidden = !match;
      if (match) visible++;
    });
    $("#noUbs").hidden = visible !== 0;
  }

  /* ---------- ações por clique (delegação) ---------- */

  var CLICK_ACTIONS = [
    ["[data-route]", function (node) { jumpTo(node.getAttribute("data-route")); }],
    ["[data-go]", function (node, event) {
      event.preventDefault();
      show(node.getAttribute("data-go"));
    }],
    ["[data-ubs]", function (node) {
      state.ubs = node.getAttribute("data-ubs");
      state.ubsShort = node.getAttribute("data-short");
      show("especialidade");
    }],
    ["[data-esp]", function (node) {
      state.esp = node.getAttribute("data-esp");
      state.doctor = node.getAttribute("data-doctor");
      state.initials = node.getAttribute("data-initials");
      state.time = null;
      show("horarios");
    }],
    [".date-chip", function (node) {
      state.date = node.getAttribute("data-date");
      state.dateShort = DATE_SHORT[state.date] || state.date;
      paint();
    }],
    [".slot", function (node) {
      if (node.disabled) return;
      state.time = node.getAttribute("data-time");
      paintSlots();
    }],
    ["[data-alt-time]", function (node) {
      state.time = node.getAttribute("data-alt-time");
      show("confirmar");
    }],
    ["[data-modal]", function (node) {
      pendingCancel = node.closest(".consult-card");
      openModal(node.getAttribute("data-modal"), node);
    }],
    ["[data-close-modal]", function () { closeModal(); }],
    ["[data-modal-action]", function (node) {
      var action = node.getAttribute("data-modal-action");
      if (action === "join") {
        closeModal();
        toast("Você entrou na fila de espera. Avisaremos por WhatsApp.");
      }
      if (action === "cancel-appointment") {
        closeModal(false);
        cancelAppointment(pendingCancel);
        focusWithoutScroll($("#h-consultas"));
      }
      pendingCancel = null;
    }],
    ['.tabs [role="tab"]', function (node) { selectTab(node, false); }]
  ];

  function onDocumentClick(event) {
    if (event.target === $("#modalBackdrop")) {
      closeModal();
      return;
    }
    for (var i = 0; i < CLICK_ACTIONS.length; i++) {
      var node = event.target.closest(CLICK_ACTIONS[i][0]);
      if (node) {
        CLICK_ACTIONS[i][1](node, event);
        return;
      }
    }
  }

  function onDocumentKeydown(event) {
    if (!isModalOpen()) return;
    if (event.key === "Escape") closeModal();
    else if (event.key === "Tab") trapFocus(event);
  }

  function onPopState() {
    closeModal(false);
    var id = resolveScreen(screenFromHash());
    normalizeStateFor(id);
    show(id, false);
  }

  /* ---------- inicialização ---------- */

  function bindEvents() {
    applyMask($("#cpf"), V.formatCpf);
    applyMask($("#agentCpf"), V.formatCpf);
    applyMask($("#birth"), V.formatDate);
    applyMask($("#agentBirth"), V.formatDate);

    $("#loginForm").addEventListener("submit", onLoginSubmit);
    $("#agentForm").addEventListener("submit", onAgentSubmit);
    $("#confirmForm").addEventListener("submit", onConfirmSubmit);
    $("#demoBtn").addEventListener("click", function () {
      fillDemo();
      setFieldError($("#loginError"), null);
      toast("Dados fictícios preenchidos. Clique em Entrar.");
      $("#cpf").focus();
    });
    $("#ubsSearch").addEventListener("input", filterUbs);
    $("#continueBtn").addEventListener("click", onContinue);
    $("#seeOtherTimes").addEventListener("click", function () {
      state.time = null;
      show("horarios");
    });
    $("#whatsappToggle").addEventListener("change", function () {
      $("#phoneField").hidden = !this.checked;
      if (this.checked) setTimeout(function () { $("#phone").focus(); }, 50);
    });
    $("#icsBtn").addEventListener("click", makeCalendarFile);
    $("#fontUp").addEventListener("click", function () { changeFont(1); });
    $("#fontDown").addEventListener("click", function () { changeFont(-1); });
    $("#helpFont").addEventListener("click", function () { changeFont(1); });
    $("#contrastBtn").addEventListener("click", toggleContrast);
    $("#helpContrast").addEventListener("click", toggleContrast);
    $("#callBtn").addEventListener("click", function () { openModal("phone", this); });
    $(".tabs").addEventListener("keydown", onTabKeydown);

    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onDocumentKeydown);
    window.addEventListener("popstate", onPopState);
  }

  function start() {
    loadPreferences();
    paintAccessibility();
    bindEvents();
    selectTab(tabs[0], false);

    var params = new URLSearchParams(location.search);
    var initial = resolveScreen(params.get("tela") || screenFromHash());
    if (params.get("demo") === "1") fillDemo();
    var slot = params.get("slot");
    if (slot && isBookableSlot(slot)) state.time = slot;
    normalizeStateFor(initial);
    show(initial, false);
    try { history.replaceState({ screen: initial }, "", location.pathname + "#/" + initial); } catch (err) { /* file:// antigo */ }
  }

  start();
})();
