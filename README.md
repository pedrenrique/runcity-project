# RunCity

Um app de corrida com cara de jogo. A ideia surgiu quando começamos a brincar com o conceito do Strava (tracking de corrida, pace, distância) misturado com uma camada de competição de território, você corre na cidade, fecha uma área no mapa, e aquele pedaço passa a ser seu. Quem fizer a maior área, leva o jogo.

## A ideia

A maioria dos apps de corrida foca só no desempenho individual, quanto você correu, em quanto tempo, qual o pace. A gente gostava da parte dos dados, mas queria algo a mais pra incentivar a sair pra correr. A solução foi adicionar uma camada de "guerra urbana" inspirada em jogos tipo Splatoon: o trajeto da corrida vira um polígono no mapa quando você volta perto do ponto de partida, e esse polígono é seu.

Modo de jogo:

- **Competitivo**: sala com até 8 pessoas, tempo limitado (5, 10, 15 minutos…). Quem fechar mais m² no tempo, ganha.

O ranking junta tudo. Tem por cidade, geral e entre amigos, e dá pra filtrar por dia, semana ou mês.

## As telas

Tudo navegável no front:

- **Login / Cadastro** com opção de "esqueci a senha".
- **Home/Dashboard** com seu nível, XP, stats principais e os botões dos modos
- **Lobby** pra criar sala, entrar por código ou olhar salas abertas
- **Partida ativa** mostrando os territórios de cada jogador em cores diferentes, ranking ao vivo e cronômetro
- **Tela de resultado** com pódio, pace, km, área conquistada e quantidade de áreas fechadas
- **Ranking** com top 3 em destaque e lista paginada
- **Mapa da cidade** que mostra todos os territórios dominados por cada jogador
- **Perfil** o seu ou de outro jogador (`?id=X`), com aba de stats, conquistas e histórico

## Tecnologia

HTML, CSS e JavaScript. O servidor é um Express minimalista só pra servir os arquivos da pasta `public/`. O mapa usa [Leaflet](https://leafletjs.com/) com tiles dark do CARTO pra combinar com o tema do app.

A camada de autenticação no front (cadastro, login, sessão) está roda no back-end, comunicando com o servidor.

## Como jogar

Basta acessar o link: https://runcity-project-production.up.railway.app/login.html

Criamos dois usuários para testar a corrida em conjunto, e a conexão entre as contas.

1º conta:
Professor
professor@gmail.com

2º conta:
Amigo
amigo@gmail.com
