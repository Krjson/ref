const express = require('express');
const mongoose = require('mongoose');
const app = express();
const connectToMongoDB = require('./connection');
const bcrypt = require('bcryptjs')
const User = require('./user'); // модель пользователя
const path = require('path');

const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const store = new MongoDBStore({
    uri: 'mongodb+srv://admin:admin@cluster0.srfsgmv.mongodb.net/mySite',
    collection: 'sessions'
});


app.use(session({
    secret: 'secret key',
    resave: false,
    saveUninitialized: false,
    store: store
}));


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    // проверяем, что оба поля заполнены
    if (!email || !password) {
        return res.status(400).send('Введите email и пароль');
    }

    // проверяем, что такой пользователь еще не зарегистрирован
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).send('Пользователь с таким email уже зарегистрирован');
    }

    // хешируем пароль
    const hashedPassword = bcrypt.hashSync(password, 10);

    // создаем нового пользователя
    const user = new User({
        email,
        password: hashedPassword,
    });

    // сохраняем пользователя в базе данных
    try {
        await user.save();
        res.send('Вы успешно зарегистрировались');
    } catch (err) {
        res.status(500).send('Ошибка при сохранении пользователя в базе данных');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // проверяем, что оба поля заполнены
    if (!email || !password) {
        return res.status(400).send('Введите email и пароль');
    }

    // ищем пользователя по email
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).send('Неверный email или пароль');
    }

    // проверяем пароль
    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    if (!isPasswordCorrect) {
        return res.status(400).send('Неверный email или пароль');
    }

    // добавляем информацию об авторизации в сессию
    req.session.isAuthenticated = true;
    req.session.user = {
        _id: user._id,
        email: user.email,
    };

    // перенаправляем на главную страницу
    res.redirect('/');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/', (req, res) => {
    res.render('index', { session: req.session });
});

app.get('/logout', function(req, res) {
    req.session.destroy(function(err) {
      if(err) {
        console.log(err);
      } else {
        res.redirect('/login');
      }
    });
  });

async function start() {
    const uri = await connectToMongoDB();
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    app.listen(3000, () => {
        console.log('Сервер запущен на порту 3000');
    });
}

start();
