# RunCity

Um app de corrida com cara de jogo. A ideia surgiu quando começamos a brincar com o conceito do Strava (tracking de corrida, pace, distância) misturado com uma camada de competição de território — você corre na cidade, fecha uma área no mapa, e aquele pedaço passa a ser seu. Se outra pessoa correr por cima do seu território, ela rouba.

O nome veio fácil: RunCity. Você corre pela cidade pra dominar a cidade.

## A ideia

A maioria dos apps de corrida foca só no desempenho individual — quanto você correu, em quanto tempo, qual o pace. A gente gostava da parte dos dados, mas queria algo a mais pra incentivar a sair pra correr. A solução foi adicionar uma camada de "guerra urbana" inspirada em jogos tipo Splatoon: o trajeto da corrida vira um polígono no mapa quando você volta perto do ponto de partida, e esse polígono é seu.

Dois modos:

- **Solo** — sem ninguém disputando com você. Corre no seu ritmo, vai fechando áreas, e seus territórios entram no mapa geral da cidade.
- **Competitivo** — sala com até 8 pessoas, tempo limitado (5, 10, 15 minutos…). Quem fechar mais m² no tempo, ganha.

O ranking junta tudo. Tem por cidade, geral e entre amigos, e dá pra filtrar por dia, semana ou mês.

## As telas

Tudo navegável no front:

- **Login / Cadastro** com opção de "esqueci a senha" e botão pra entrar com Google (visual por enquanto, sem fluxo OAuth real)
- **Home/Dashboard** com seu nível, XP, stats principais e os botões dos dois modos
- **Lobby** pra criar sala, entrar por código ou olhar salas abertas
- **Corrida Solo** com mapa, GPS simulado e o traçado da rota crescendo em tempo real
- **Partida ativa** mostrando os territórios de cada jogador em cores diferentes, ranking ao vivo e cronômetro
- **Tela de resultado** com pódio, pace, km, área conquistada e quantidade de áreas fechadas
- **Ranking** com top 3 em destaque e lista paginada
- **Mapa da cidade** que mostra todos os territórios dominados — clica em qualquer um e vê o dono, área, data de captura e info de roubo (de quem foi tomado, quando)
- **Perfil** — o seu ou de outro jogador (`?id=X`), com aba de stats, conquistas e histórico

## Tecnologia

HTML, CSS e JavaScript puros. Sem framework, sem build step, nada de webpack. O servidor é um Express minimalista só pra servir os arquivos da pasta `public/`. O mapa usa [Leaflet](https://leafletjs.com/) com tiles dark do CARTO pra combinar com o tema do app.

A camada de autenticação no front (cadastro, login, sessão) está rodando 100% local via `localStorage`, sem comunicar com servidor — o backend de verdade ainda vai vir. As funções de fetch já estão escritas no padrão certo pra trocar depois, é só plugar os endpoints.

## Como rodar

```
npm install
node index.js
```

Abre `http://localhost:3000` no navegador. Funciona melhor em viewport de celular (o app é todo pensado em mobile-first, com moldura simulada quando a tela é maior).

## Status

Trabalho da disciplina de Programação Web — 9º semestre. Em desenvolvimento.

Várias coisas ainda são mock: o sistema de salas multiplayer existe só no cliente (sem websocket nem servidor de partida), os jogadores que aparecem no ranking são fictícios, e o GPS da corrida solo é simulado. O esqueleto e a navegação estão fechados, e dá pra usar o app inteiro de ponta a ponta — só não esperando dados reais saindo do navegador.
