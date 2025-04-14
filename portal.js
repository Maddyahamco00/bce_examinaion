const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const { body, validationResult } = require('express-validator');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'my-secret-key', // Hardcoded session secret
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true, // Prevents client-side script access to cookies
        secure: false, // Set to true if using HTTPS in production
        sameSite: 'strict' // Prevents CSRF attacks
    }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database Connection
const db = mysql.createConnection({
    host: 'localhost', // Hardcoded database host
    user: 'root', // Hardcoded database user
    password: '1234567890#', // Hardcoded database password
    database: 'bce_portal' // Hardcoded database name
});

db.connect((err) => {
    if (err) throw err;
    console.log('MySQL is connected');
});

// Route: Home Page
app.get('/', (req, res) => {
    db.query('SELECT unique_code FROM users LIMIT 1', (err, result) => {
        if (err) return res.status(500).send('Database Error: Unable to fetch unique code.');

        if (result.length > 0) {
            const unique_code = result[0].unique_code;

            db.query('DELETE FROM users WHERE unique_code = ?', [unique_code], (err) => {
                if (err) return res.status(500).send('Database Error: Unable to delete unique code.');
                res.render('code_purchase', { unique_code });
            });
        } else {
            res.send('No unique codes available.');
        }
    });
});

// Route: Registration Page
app.get('/register_page', (req, res) => {
    const { unique_code } = req.query;
    res.render('registration', { unique_code });
});

// Route: Register User
app.post('/register', [
    body('unique_code').notEmpty().withMessage('Unique code is required'),
    body('surname').isAlpha().withMessage('Surname must only contain letters'),
    body('othername').isAlpha().withMessage('Other names must only contain letters'),
    body('lga').notEmpty().withMessage('LGA is required'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { unique_code, surname, othername, lga } = req.body;
        const [users] = await db.promise().query('SELECT * FROM users WHERE unique_code = ?', [unique_code]);

        if (users.length > 0) {
            const [registrations] = await db.promise().query('SELECT * FROM registrations WHERE unique_code = ?', [unique_code]);

            if (registrations.length > 0) {
                res.send('This code has already been used for registration.');
            } else {
                await db.promise().query(
                    'INSERT INTO registrations (unique_code, surname, othername, lga) VALUES (?, ?, ?, ?)',
                    [unique_code, surname, othername, lga]
                );
                req.session.registrationDetails = { unique_code, surname, othername, lga };
                res.redirect('/dashboard');
            }
        } else {
            res.send('Invalid code, please try again.');
        }
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Route: Dashboard
app.get('/dashboard', (req, res) => {
    const registrationDetails = req.session.registrationDetails;
    if (!registrationDetails) return res.redirect('/');
    res.render('dashboard', { registrationDetails });
});

// Route: Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).send('Error logging out.');
        res.redirect('/');
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong. Please try again later.');
});

// Start Server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
//  npm install express mysql2 body-parser express-session ejs 
