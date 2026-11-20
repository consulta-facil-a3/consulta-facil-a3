# Consulta Fácil — A3

Estudo de caso da disciplina **Modelos, Métodos e Técnicas da Engenharia de Software**: plano de engenharia para o agendamento de consultas na rede pública do município fictício de Vale Verde.

**Protótipo navegável:** https://felipe0365.github.io/consulta-facil-a3/

## Conteúdo

| Pasta | O que tem |
| --- | --- |
| `prototipo/` | Protótipo navegável em HTML, CSS e JavaScript puro (publicado no GitHub Pages) |
| `relatorio/` | Relatório em HTML e o PDF final (`consulta-facil-a3.pdf`) |
| `capturas/` | Capturas de tela do protótipo usadas no relatório |

## Como usar o protótipo

Abra o link acima no celular ou no navegador, toque em **Preencher dados de demonstração** e siga o fluxo: entrar, escolher UBS e especialidade, escolher horário, confirmar e receber o comprovante. Os controles **A-**, **A+** e de contraste ficam no topo. Para ver a exceção de vaga ocupada, escolha **14:20** e toque em **Continuar**.

Telas específicas podem ser abertas direto pela URL, por exemplo `?tela=horarios&slot=14:20`.

## Rodar localmente

Não há build nem dependências. Sirva a pasta `prototipo/` com qualquer servidor estático:

```bash
npx serve prototipo
# ou
python -m http.server -d prototipo 8000
```

## Deploy

Todo push na branch `main` que altere `prototipo/` dispara o workflow `.github/workflows/pages.yml`, que publica a pasta no GitHub Pages.

## Licenças

A fonte Atkinson Hyperlegible em `prototipo/fonts/` é distribuída sob a SIL Open Font License (ver `prototipo/fonts/OFL.txt`).
