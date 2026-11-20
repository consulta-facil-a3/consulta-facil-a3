/*
 * Regras de validação do Consulta Fácil.
 * Funções puras, sem acesso ao DOM: rodam no navegador (window.CFValidation)
 * e no Node (require), onde são cobertas pelos testes em tests/.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CFValidation = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  /* Dígitos verificadores do CPF (módulo 11). Rejeita sequências repetidas. */
  function isValidCpf(value) {
    var cpf = digits(value);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    for (var size = 9; size <= 10; size++) {
      var sum = 0;
      for (var i = 0; i < size; i++) sum += Number(cpf[i]) * (size + 1 - i);
      var check = (sum * 10) % 11;
      if (check === 10) check = 0;
      if (check !== Number(cpf[size])) return false;
    }
    return true;
  }

  /*
   * Data de nascimento no formato dd/mm/aaaa.
   * Retorna null quando válida ou o motivo do erro: "format", "invalid" ou "future".
   */
  function birthDateError(value, today) {
    var match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || "").trim());
    if (!match) return "format";
    var day = Number(match[1]);
    var month = Number(match[2]);
    var year = Number(match[3]);
    var date = new Date(year, month - 1, day);
    var exists = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    if (!exists || year < 1900) return "invalid";
    var now = today || new Date();
    var limit = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (date > limit) return "future";
    return null;
  }

  /* Celular ou fixo com DDD: 10 ou 11 dígitos. */
  function isValidPhone(value) {
    var length = digits(value).length;
    return length === 10 || length === 11;
  }

  function formatCpf(value) {
    var v = digits(value).slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    return v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function formatDate(value) {
    var v = digits(value).slice(0, 8);
    v = v.replace(/(\d{2})(\d)/, "$1/$2");
    return v.replace(/(\d{2})(\d)/, "$1/$2");
  }

  return {
    digits: digits,
    isValidCpf: isValidCpf,
    birthDateError: birthDateError,
    isValidPhone: isValidPhone,
    formatCpf: formatCpf,
    formatDate: formatDate
  };
});
