# Consulta Fácil — A3

Estudo de caso da disciplina **Modelos, Métodos e Técnicas da Engenharia de Software**: plano de engenharia para o agendamento de consultas na rede pública do município fictício de Vale Verde.

**Protótipo navegável:** https://consulta-facil-a3.github.io/consulta-facil-a3/

## Conteúdo

| Pasta | O que tem |
| --- | --- |
| `prototipo/` | Protótipo navegável em HTML, CSS e JavaScript puro (publicado no GitHub Pages) |

## Como usar o protótipo

Abra o link acima no celular ou no navegador, toque em **Preencher dados de demonstração** e siga o fluxo: entrar, escolher UBS e especialidade, escolher horário, confirmar e receber o comprovante. Os controles **A-**, **A+** e de contraste ficam no topo. Para ver a exceção de vaga ocupada, escolha **14:20** e toque em **Continuar**.

Telas específicas podem ser abertas direto pela URL, por exemplo `?tela=horarios&slot=14:20`.

## Rodar localmente

Requer Node.js 20 ou superior.

```bash
npm install        # instala ESLint e html-validate (só para desenvolvimento)
npm start          # serve prototipo/ em http://localhost:8080
npm run check      # lint de JS e HTML + testes
```

O app não tem build: qualquer servidor estático apontado para `prototipo/` funciona (por exemplo `python -m http.server -d prototipo 8080`).

## Estrutura do código

| Arquivo | Responsabilidade |
| --- | --- |
| `prototipo/index.html` | Marcação das telas, com semântica e atributos ARIA |
| `prototipo/styles.css` | Estilos, tema de alto contraste e layout responsivo |
| `prototipo/validation.js` | Regras puras de validação (CPF, data de nascimento, telefone, máscaras) |
| `prototipo/app.js` | Estado, navegação entre telas, modal, abas e formulários |
| `tests/` | Testes das regras de validação (`node --test`) |

## Deploy

O workflow `.github/workflows/pages.yml` roda lint e testes em todo push e pull request. Na branch `main`, se tudo passar, publica `prototipo/` no GitHub Pages.

## Licenças

A fonte Atkinson Hyperlegible em `prototipo/fonts/` é distribuída sob a SIL Open Font License (ver `prototipo/fonts/OFL.txt`).
