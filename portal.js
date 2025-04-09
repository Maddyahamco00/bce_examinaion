const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret-key', resave: false, saveUninitialized: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234567890#',
    database: 'bce_portal'
});

db.connect((err) => {
    if (err) throw err;
    console.log('MySQL is connected');
});

app.get('/', (req, res) => {
    db.query('SELECT unique_code FROM users LIMIT 1', (err, result) => {
        if (err) throw err;

        if (result.length > 0) {
            const unique_code = result[0].unique_code;

            db.query('DELETE FROM users WHERE unique_code = ?', [unique_code], (err) => {
                if (err) throw err;
                res.render('code_purchase', { unique_code });
            });
        } else {
            res.send('No unique codes available.');
        }
    });
});

app.get('/register_page', (req, res) => {
    const { unique_code } = req.query;
    res.render('registration', { unique_code });
});

app.post('/register', (req, res) => {
    const { unique_code, surname, othername } = req.body;

    db.query('SELECT * FROM users WHERE unique_code = ?', [unique_code], (err, result) => {
        if (err) throw err;

        if (result.length > 0) {
            db.query('SELECT * FROM registrations WHERE unique_code = ?', [unique_code], (err, regResult) => {
                if (err) throw err;

                if (regResult.length > 0) {
                    res.send('This code has already been used for registration.');
                } else {
                    db.query(
                        'INSERT INTO registrations (unique_code, surname, othername) VALUES (?, ?, ?)',
                        [unique_code, surname, othername],
                        (err) => {
                            if (err) throw err;
                            req.session.registrationDetails = { unique_code, surname, othername };
                            res.redirect('/dashboard');
                        }
                    );
                }
            });
        } else {
            res.send('Invalid code, please try again.');
        }
    });
});

app.get('/dashboard', (req, res) => {
    const registrationDetails = req.session.registrationDetails;
    res.render('dashboard', { registrationDetails });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
