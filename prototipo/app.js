(function () {
  "use strict";

  var app = document.getElementById("app");
  var screens = Array.prototype.slice.call(document.querySelectorAll(".screen"));
  var mainScreens = ["inicio", "consultas", "ajuda"];
  var bareScreens = ["entrar", "agente"];
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

  var dateShort = {
    "Qui, 19 de novembro": "hoje, 19/11",
    "Sex, 20 de novembro": "sex, 20/11",
    "Seg, 23 de novembro": "seg, 23/11",
    "Ter, 24 de novembro": "ter, 24/11",
    "Qua, 25 de novembro": "qua, 25/11"
  };

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function paint() {
    $$("[data-bind]").forEach(function (el) {
      var key = el.getAttribute("data-bind");
      if (key === "dateShort") el.textContent = state.dateShort;
      else if (key === "initials") el.textContent = state.initials;
      else if (state[key] !== null && state[key] !== undefined) el.textContent = state[key];
    });
    $("#protocol").textContent = state.protocol;
    paintSlots();
    $$("[data-route]").forEach(function (btn) {
      if (btn.getAttribute("data-route") === document.body.getAttribute("data-screen")) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
    });
    $$(".tabbar button").forEach(function (btn) {
      var current = btn.getAttribute("data-go") === document.body.getAttribute("data-screen");
      if (current) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
  }

  function paintSlots() {
    $$("#slotGrid .slot").forEach(function (btn) {
      var time = btn.getAttribute("data-time");
      if (time === "14:20") {
        if (state.slotTaken) {
          btn.disabled = true;
          btn.innerHTML = "14:20<small>Ocupada</small>";
        } else {
          btn.disabled = false;
          btn.innerHTML = "14:20<small>Última vaga</small>";
        }
      }
      if (btn.disabled) btn.setAttribute("aria-pressed", "false");
      else btn.setAttribute("aria-pressed", btn.getAttribute("data-time") === state.time ? "true" : "false");
    });
    var continueBtn = $("#continueBtn");
    if (continueBtn) {
      continueBtn.disabled = !state.time || (state.time === "14:20" && state.slotTaken);
    }
    var warning = $("#slotWarning");
    if (warning) warning.hidden = !(state.time === "14:20" && !state.slotTaken);
    $$(".date-chip").forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip.getAttribute("data-date") === state.date ? "true" : "false");
    });
  }

  function show(id, push) {
    var target = document.getElementById("screen-" + id);
    if (!target) return;
    screens.forEach(function (screen) {
      screen.classList.toggle("active", screen === target);
    });
    document.body.setAttribute("data-screen", id);
    document.body.classList.toggle("bare", bareScreens.indexOf(id) !== -1);
    document.body.classList.toggle("flow", mainScreens.indexOf(id) === -1 && bareScreens.indexOf(id) === -1);
    paint();
    if (push !== false) {
      try {
        history.pushState({ screen: id }, "", "#/" + id);
      } catch (err) {
        window.location.hash = "#/" + id;
      }
    }
    if (app) app.scrollTop = 0;
    var heading = target.querySelector("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      try { heading.focus({ preventScroll: true }); } catch (err) { heading.focus(); }
    }
  }

  function toast(message) {
    var el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { el.classList.remove("show"); }, 3200);
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

  var lastFocus = null;

  function openModal(kind) {
    lastFocus = document.activeElement;
    var title = $("#modalTitle");
    var body = $("#modalBody");
    var actions = $("#modalActions");
    var content = {
      waitlist: {
        title: "Entrar na fila de espera?",
        body: "Avisaremos por WhatsApp quando abrir uma vaga de " + state.esp + " na " + state.ubs + ". A ordem considera prioridade clínica e tempo de espera.",
        actions: '<button class="btn btn-primary" type="button" data-modal-action="join">Entrar na fila</button>'
      },
      specHelp: {
        title: "Não sabe qual escolher?",
        body: "Se há febre, dor forte ou falta de ar, procure a UBS hoje. Para acompanhamento, comece pelo clínico geral. Ele encaminha para o especialista quando necessário.",
        actions: '<button class="btn btn-secondary" type="button" data-close-modal>Entendi</button>'
      },
      phone: {
        title: "Falar com a UBS",
        body: "UBS Jardim das Flores: (11) 3333-1010, das 7h às 19h. Central de agendamento: 0800 123 4567.",
        actions: '<a class="btn btn-secondary" href="tel:08001234567">Ligar para a central</a>'
      },
      cancel: {
        title: "Cancelar esta consulta?",
        body: "Você pode cancelar até 12 horas antes. A vaga volta para a fila de espera. Se já cancelou 3 vezes neste mês, a recepção pode entrar em contato para ajudar no próximo agendamento.",
        actions: '<button class="btn btn-primary" type="button" data-modal-action="cancel-appointment">Confirmar cancelamento</button>'
      }
    }[kind];
    if (!content) return;
    title.textContent = content.title;
    body.innerHTML = "<p>" + content.body + "</p>";
    actions.innerHTML = content.actions;
    var backdrop = $("#modalBackdrop");
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    title.setAttribute("tabindex", "-1");
    title.focus();
  }

  function closeModal() {
    var backdrop = $("#modalBackdrop");
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus && document.contains(lastFocus)) {
      try { lastFocus.focus({ preventScroll: true }); } catch (err) { lastFocus.focus(); }
    }
    lastFocus = null;
  }

  function cancelFirstAppointment() {
    var card = $("#upcoming .consult-card");
    if (!card) return;
    var status = card.querySelector(".status");
    status.textContent = "Cancelada por você";
    status.classList.add("off");
    card.classList.add("canceled");
    $$(".consult-actions button", card).forEach(function (btn) { btn.disabled = true; });
    toast("Consulta cancelada. A vaga voltou para a fila de espera.");
  }

  function makeCalendarFile() {
    var time = state.time || "14:20";
    var startHour = Number(time.slice(0, 2));
    var startMinute = Number(time.slice(3, 5));
    var endMinutes = startHour * 60 + startMinute + 40;
    var endHour = Math.floor(endMinutes / 60);
    var endMinute = endMinutes % 60;
    var hour = String(startHour).padStart(2, "0") + String(startMinute).padStart(2, "0");
    var end = String(endHour).padStart(2, "0") + String(endMinute).padStart(2, "0");
    var dayMatch = /(\d{1,2}) de novembro/.exec(state.date);
    var day = "202611" + String(dayMatch ? dayMatch[1] : "20").padStart(2, "0");
    var ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Consulta Facil//Vale Verde//PT-BR",
      "BEGIN:VEVENT",
      "UID:" + Date.now() + "@consultafacil.valeverde",
      "DTSTAMP:20261116T120000Z",
      "DTSTART:" + day + "T" + hour + "00",
      "DTEND:" + day + "T" + end + "00",
      "SUMMARY:Consulta de " + state.esp + " - Consulta Facil",
      "LOCATION:" + state.ubs,
      "DESCRIPTION:Profissional: " + state.doctor + ". Protocolo: " + state.protocol,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "consulta-facil.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    toast("Arquivo do calendário baixado.");
  }

  var fontSizes = [17, 19, 21, 23];
  var fontIndex = 0;
  try {
    var savedFont = localStorage.getItem("cf-font");
    if (savedFont && fontSizes[Number(savedFont)] !== undefined) fontIndex = Number(savedFont);
    var savedContrast = localStorage.getItem("cf-contrast");
    if (savedContrast === "1") document.body.classList.add("high-contrast");
  } catch (err) { /* modo privado pode bloquear o armazenamento */ }

  function applyFont() {
    document.documentElement.style.fontSize = fontSizes[fontIndex] + "px";
    $("#contrastBtn").setAttribute("aria-pressed", document.body.classList.contains("high-contrast") ? "true" : "false");
    try { localStorage.setItem("cf-font", String(fontIndex)); } catch (err) {}
  }

  function changeFont(delta) {
    fontIndex = Math.max(0, Math.min(fontSizes.length - 1, fontIndex + delta));
    applyFont();
    toast(fontIndex === 0 ? "Tamanho original da letra." : "Letra ampliada: " + (fontIndex + 1) + " de " + fontSizes.length + ".");
  }

  function toggleContrast() {
    document.body.classList.toggle("high-contrast");
    var pressed = document.body.classList.contains("high-contrast");
    $("#contrastBtn").setAttribute("aria-pressed", pressed ? "true" : "false");
    $("#helpContrast").textContent = pressed ? "Desativar contraste" : "Ativar contraste";
    try { localStorage.setItem("cf-contrast", pressed ? "1" : "0"); } catch (err) {}
    toast(pressed ? "Alto contraste ativado." : "Contraste padrão restaurado.");
  }

  function maskCpf(input) {
    input.addEventListener("input", function () {
      var v = input.value.replace(/\D/g, "").slice(0, 11);
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      input.value = v;
    });
  }

  function maskDate(input) {
    input.addEventListener("input", function () {
      var v = input.value.replace(/\D/g, "").slice(0, 8);
      v = v.replace(/(\d{2})(\d)/, "$1/$2");
      v = v.replace(/(\d{2})(\d)/, "$1/$2");
      input.value = v;
    });
  }

  maskCpf($("#cpf"));
  maskCpf($("#agentCpf"));
  maskDate($("#birth"));
  maskDate($("#agentBirth"));

  $("#loginForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var cpf = $("#cpf").value.replace(/\D/g, "");
    var birth = $("#birth").value.trim();
    var error = $("#loginError");
    if (cpf.length !== 11) {
      error.textContent = "Digite os 11 números do CPF.";
      error.classList.add("show");
      $("#cpf").focus();
      return;
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(birth)) {
      error.textContent = "Digite a data de nascimento no formato dd/mm/aaaa.";
      error.classList.add("show");
      $("#birth").focus();
      return;
    }
    error.classList.remove("show");
    state.name = "Maria";
    show("inicio");
  });

  $("#demoBtn").addEventListener("click", function () {
    $("#cpf").value = "123.456.789-00";
    $("#birth").value = "12/03/1958";
    $("#loginError").classList.remove("show");
    toast("Dados fictícios preenchidos. Clique em Entrar.");
    $("#cpf").focus();
  });

  $("#agentForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var cpf = $("#agentCpf").value.replace(/\D/g, "");
    var birth = $("#agentBirth").value.trim();
    if (cpf.length !== 11 || !/^\d{2}\/\d{2}\/\d{4}$/.test(birth)) {
      toast("Informe CPF e data de nascimento do paciente.");
      return;
    }
    if (!$("#agentConsent").checked) {
      toast("O paciente precisa autorizar o atendimento.");
      $("#agentConsent").focus();
      return;
    }
    state.name = "João da Silva";
    show("ubs");
  });

  $("#ubsSearch").addEventListener("input", function () {
    var q = this.value.trim().toLowerCase();
    var visible = 0;
    $$("#ubsList .list-card").forEach(function (card) {
      var text = (card.getAttribute("data-ubs") + " " + card.getAttribute("data-district")).toLowerCase();
      var match = text.indexOf(q) !== -1;
      card.hidden = !match;
      if (match) visible++;
    });
    $("#noUbs").hidden = visible !== 0;
  });

  function jumpTo(id) {
    closeModal();
    if (id === "horarios") { state.slotTaken = false; state.time = null; }
    if (id === "vaga-ocupada") { state.slotTaken = true; state.time = "14:20"; }
    if (id === "comprovante" && (!state.time || (state.time === "14:20" && state.slotTaken))) state.time = "16:20";
    show(id);
  }

  document.addEventListener("click", function (event) {
    var route = event.target.closest("[data-route]");
    if (route) {
      jumpTo(route.getAttribute("data-route"));
      return;
    }

    var go = event.target.closest("[data-go]");
    if (go) {
      event.preventDefault();
      show(go.getAttribute("data-go"));
      return;
    }

    var ubs = event.target.closest("[data-ubs]");
    if (ubs) {
      state.ubs = ubs.getAttribute("data-ubs");
      state.ubsShort = ubs.getAttribute("data-short");
      show("especialidade");
      return;
    }

    var esp = event.target.closest("[data-esp]");
    if (esp) {
      state.esp = esp.getAttribute("data-esp");
      state.doctor = esp.getAttribute("data-doctor");
      state.initials = esp.getAttribute("data-initials");
      state.time = null;
      show("horarios");
      return;
    }

    var dateChip = event.target.closest(".date-chip");
    if (dateChip) {
      state.date = dateChip.getAttribute("data-date");
      state.dateShort = dateShort[state.date] || state.date;
      paint();
      return;
    }

    var slot = event.target.closest(".slot");
    if (slot && !slot.disabled) {
      state.time = slot.getAttribute("data-time");
      paintSlots();
      return;
    }

    var alt = event.target.closest("[data-alt-time]");
    if (alt) {
      state.time = alt.getAttribute("data-alt-time");
      show("confirmar");
      return;
    }

    var modalTrigger = event.target.closest("[data-modal]");
    if (modalTrigger) {
      openModal(modalTrigger.getAttribute("data-modal"));
      return;
    }

    if (event.target.closest("[data-close-modal]")) {
      closeModal();
      return;
    }

    if (event.target === $("#modalBackdrop")) {
      closeModal();
      return;
    }

    var modalAction = event.target.closest("[data-modal-action]");
    if (modalAction) {
      var action = modalAction.getAttribute("data-modal-action");
      lastFocus = null;
      closeModal();
      if (action === "join") toast("Você entrou na fila de espera. Avisaremos por WhatsApp.");
      if (action === "cancel-appointment") cancelFirstAppointment();
      return;
    }

    var tab = event.target.closest(".tabs button");
    if (tab) {
      var past = tab.id === "tabPast";
      $("#tabUpcoming").setAttribute("aria-selected", past ? "false" : "true");
      $("#tabPast").setAttribute("aria-selected", past ? "true" : "false");
      $("#upcoming").hidden = past;
      $("#past").hidden = !past;
    }
  });

  $("#continueBtn").addEventListener("click", function () {
    if (!state.time) return;
    if (state.time === "14:20" && !state.slotTaken) {
      loading("Confirmando sua vaga...", 1100, function () {
        state.slotTaken = true;
        show("vaga-ocupada");
      });
      return;
    }
    show("confirmar");
  });

  $("#seeOtherTimes").addEventListener("click", function () {
    state.time = null;
    show("horarios");
  });

  $("#whatsappToggle").addEventListener("change", function () {
    $("#phoneField").hidden = !this.checked;
    if (this.checked) setTimeout(function () { $("#phone").focus(); }, 50);
  });

  $("#confirmForm").addEventListener("submit", function (event) {
    event.preventDefault();
    if ($("#whatsappToggle").checked) {
      var digits = $("#phone").value.replace(/\D/g, "");
      if (digits.length < 10) {
        toast("Digite um celular com DDD ou desligue o lembrete.");
        $("#phone").focus();
        return;
      }
    }
    loading("Salvando sua consulta...", 950, function () {
      state.protocol = "CF-2026-" + String(Math.floor(100000 + Math.random() * 899999));
      paint();
      show("comprovante");
    });
  });

  $("#icsBtn").addEventListener("click", makeCalendarFile);
  $("#fontUp").addEventListener("click", function () { changeFont(1); });
  $("#fontDown").addEventListener("click", function () { changeFont(-1); });
  $("#contrastBtn").addEventListener("click", toggleContrast);
  $("#helpFont").addEventListener("click", function () { changeFont(1); });
  $("#helpContrast").addEventListener("click", toggleContrast);
  $("#callBtn").addEventListener("click", function () {
    openModal("phone");
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && $("#modalBackdrop").classList.contains("open")) closeModal();
  });

  window.addEventListener("popstate", function () {
    var id = location.hash.replace(/^#\//, "") || "entrar";
    show(id, false);
  });

  var params = new URLSearchParams(location.search);
  var initial = params.get("tela") || location.hash.replace(/^#\//, "") || "entrar";
  if (params.get("demo") === "1") {
    $("#cpf").value = "123.456.789-00";
    $("#birth").value = "12/03/1958";
  }
  if (params.get("slot")) state.time = params.get("slot");
  if (initial === "vaga-ocupada") {
    state.slotTaken = true;
    state.time = params.get("slot") || "14:20";
  }
  if (initial === "comprovante" && !state.time) state.time = "14:20";
  show(initial, false);
  if (initial === "horarios" && params.get("slot")) paintSlots();
  if (location.search && initial) {
    try { history.replaceState({ screen: initial }, "", location.pathname + "#/" + initial); } catch (err) {}
  }

  applyFont();
  $("#helpContrast").textContent = document.body.classList.contains("high-contrast") ? "Desativar contraste" : "Ativar contraste";
  if (params.get("debug") === "1") {
    setTimeout(function () {
      var phone = $(".phone");
      var screen = $("#screen-entrar");
      var input = $("#cpf");
      var pre = document.createElement("pre");
      pre.id = "debug";
      pre.textContent = JSON.stringify({
        innerWidth: window.innerWidth,
        dpr: window.devicePixelRatio,
        bodyScroll: document.body.scrollWidth,
        phone: phone.getBoundingClientRect(),
        screen: screen.getBoundingClientRect(),
        input: input.getBoundingClientRect()
      }, null, 2);
      document.body.appendChild(pre);
    }, 300);
  }
  window.ConsultaFacil = { state: state, show: show };
})();
