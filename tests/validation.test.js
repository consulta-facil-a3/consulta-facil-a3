const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../prototipo/validation.js");

test("CPF: aceita CPFs com dígitos verificadores corretos", () => {
  assert.equal(V.isValidCpf("529.982.247-25"), true);
  assert.equal(V.isValidCpf("52998224725"), true);
  assert.equal(V.isValidCpf("111.444.777-35"), true);
});

test("CPF: rejeita dígitos errados, tamanho errado e sequências repetidas", () => {
  assert.equal(V.isValidCpf("123.456.789-00"), false);
  assert.equal(V.isValidCpf("529.982.247-26"), false);
  assert.equal(V.isValidCpf("111.111.111-11"), false);
  assert.equal(V.isValidCpf("5299822472"), false);
  assert.equal(V.isValidCpf(""), false);
});

const today = new Date(2026, 10, 20);

test("Nascimento: aceita datas reais no passado", () => {
  assert.equal(V.birthDateError("12/03/1958", today), null);
  assert.equal(V.birthDateError("29/02/2024", today), null);
  assert.equal(V.birthDateError("20/11/2026", today), null);
});

test("Nascimento: identifica formato, data inexistente e data futura", () => {
  assert.equal(V.birthDateError("12/3/1958", today), "format");
  assert.equal(V.birthDateError("", today), "format");
  assert.equal(V.birthDateError("99/99/9999", today), "invalid");
  assert.equal(V.birthDateError("31/04/1990", today), "invalid");
  assert.equal(V.birthDateError("29/02/2023", today), "invalid");
  assert.equal(V.birthDateError("01/01/1899", today), "invalid");
  assert.equal(V.birthDateError("21/11/2026", today), "future");
});

test("Telefone: exige DDD com 10 ou 11 dígitos", () => {
  assert.equal(V.isValidPhone("(11) 98888-7777"), true);
  assert.equal(V.isValidPhone("(11) 3333-1010"), true);
  assert.equal(V.isValidPhone("98888-7777"), false);
  assert.equal(V.isValidPhone("(11) 98888-77771"), false);
});

test("Máscaras de CPF e data", () => {
  assert.equal(V.formatCpf("52998224725"), "529.982.247-25");
  assert.equal(V.formatCpf("5299"), "529.9");
  assert.equal(V.formatCpf("529.982.247-25999"), "529.982.247-25");
  assert.equal(V.formatDate("12031958"), "12/03/1958");
  assert.equal(V.formatDate("1203"), "12/03");
});
