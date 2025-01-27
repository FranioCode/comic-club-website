const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');

const app = express();
const port = 3000;

// Konfiguracja multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware
app.use(express.static(path.join(__dirname, 'src/pages')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'src/assets')));
app.use(express.json());
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Initialize files
async function initializeFiles() {
    try {
        await fs.mkdir('uploads', { recursive: true });
        const files = ['chat.json', 'images.json', 'registrations.json'];
        for (const file of files) {
            try {
                await fs.access(`uploads/${file}`);
            } catch {
                await fs.writeFile(`uploads/${file}`, '[]');
            }
        }
    } catch (err) {
        console.error('Error initializing files:', err);
    }
}

// Auth Middleware
function checkAuth(req, res, next) {
    if (req.session.loggedIn) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

function checkAdmin(req, res, next) {
    if (req.session.loggedIn && req.session.username === 'admin') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// Auth Routes
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'password') {
        req.session.loggedIn = true;
        req.session.username = username;
        res.json({ message: 'Zalogowano pomyślnie' });
    } else {
        res.status(401).json({ message: 'Nieprawidłowe dane logowania' });
    }
});

app.get('/isAdmin', (req, res) => {
    res.json({ 
        isAdmin: req.session.loggedIn && req.session.username === 'admin' 
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Wylogowano pomyślnie' });
});

// File Upload Routes
app.post('/upload', checkAuth, upload.single('file'), async (req, res) => {
    try {
        const { author } = req.body;
        const { filename } = req.file;
        const imageData = { filename, author };
        
        const data = await fs.readFile('uploads/images.json', 'utf8');
        const images = JSON.parse(data);
        images.push(imageData);
        await fs.writeFile('uploads/images.json', JSON.stringify(images));
        
        res.json({ message: 'Plik został przesłany!' });
    } catch (err) {
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Chat Routes
app.post('/chat', async (req, res) => {
    try {
        const { username, message } = req.body;
        const chatMessage = { 
            username, 
            message, 
            timestamp: new Date().toISOString() 
        };
        
        const data = await fs.readFile('uploads/chat.json', 'utf8');
        const messages = JSON.parse(data);
        messages.push(chatMessage);
        await fs.writeFile('uploads/chat.json', JSON.stringify(messages));
        
        res.json({ message: 'Wiadomość została wysłana!' });
    } catch (err) {
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

app.get('/chat', async (req, res) => {
    try {
        const data = await fs.readFile('uploads/chat.json', 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

app.delete('/chat/:timestamp', checkAdmin, async (req, res) => {
    try {
        const { timestamp } = req.params;
        const data = await fs.readFile('uploads/chat.json', 'utf8');
        let messages = JSON.parse(data);
        messages = messages.filter(msg => msg.timestamp !== timestamp);
        await fs.writeFile('uploads/chat.json', JSON.stringify(messages));
        res.json({ message: 'Wiadomość została usunięta!' });
    } catch (err) {
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Registration Routes
app.post('/submit', async (req, res) => {
    try {
        const registration = req.body;
        const data = await fs.readFile('uploads/registrations.json', 'utf8');
        const registrations = JSON.parse(data);
        registrations.push(registration);
        await fs.writeFile('uploads/registrations.json', JSON.stringify(registrations));
        res.json({ message: 'Formularz został przesłany!' });
    } catch (err) {
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

app.get('/registrations', async (req, res) => {
    try {
        const data = await fs.readFile('uploads/registrations.json', 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Initialize and start server
initializeFiles().then(() => {
    app.listen(port, () => {
        console.log(`Serwer działa na http://localhost:${port}`);
    });
});