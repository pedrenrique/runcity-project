require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/corridas',     require('./routes/corridas'));
app.use('/api/amigos',       require('./routes/amigos'));
app.use('/api/notificacoes', require('./routes/notificacoes'));
app.use('/api/salas',        require('./routes/salas'));
app.use('/api/ranking',      require('./routes/ranking'));

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
