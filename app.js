const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Configuration
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Admin State
let isAdmin = false;

// Global Middleware
app.use((req, res, next) => {
    res.locals.isAdmin = isAdmin;
    next();
});

// Helper: Read Database
const getBlogs = () => {
    const dataPath = path.join(__dirname, 'data', 'blogs.json');
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify([])); // Create if missing
    }
    const rawData = fs.readFileSync(dataPath);
    return JSON.parse(rawData);
};

// Helper: Write Database
const saveBlogs = (blogs) => {
    const dataPath = path.join(__dirname, 'data', 'blogs.json');
    fs.writeFileSync(dataPath, JSON.stringify(blogs, null, 2));
};

// --- PUBLIC ROUTES ---

app.get('/', (req, res) => {
    let blogs = getBlogs();
    const searchQuery = req.query.search;

    if (searchQuery) {
        blogs = blogs.filter(blog => 
            blog.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    res.render('index', { blogs, searchQuery });
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/blog/:id', (req, res) => {
    const blogs = getBlogs();
    const blog = blogs.find(b => b.id === req.params.id);
    
    if (blog) {
        res.render('details', { blog });
    } else {
        res.redirect('/');
    }
});

// --- ADMIN ROUTES ---

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        isAdmin = true;
        res.redirect('/');
    } else {
        res.render('login', { error: 'Invalid Credentials' });
    }
});

app.get('/logout', (req, res) => {
    isAdmin = false;
    res.redirect('/');
});

// PHASE 1: CREATE BLOG
app.get('/create', (req, res) => {
    if (!isAdmin) return res.redirect('/login');
    res.render('create');
});

app.post('/create', (req, res) => {
    if (!isAdmin) return res.redirect('/login');
    
    const blogs = getBlogs();
    const newBlog = {
        id: Date.now().toString(),
        title: req.body.title,
        content: req.body.content,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    };
    
    blogs.unshift(newBlog);
    saveBlogs(blogs);
    res.redirect('/');
});

// PHASE 2: EDIT BLOG
app.get('/edit/:id', (req, res) => {
    if (!isAdmin) return res.redirect('/login');
    
    const blogs = getBlogs();
    const blog = blogs.find(b => b.id === req.params.id);
    
    if (blog) {
        res.render('edit', { blog });
    } else {
        res.redirect('/');
    }
});

app.post('/edit/:id', (req, res) => {
    if (!isAdmin) return res.redirect('/login');
    
    let blogs = getBlogs();
    const index = blogs.findIndex(b => b.id === req.params.id);
    
    if (index !== -1) {
        blogs[index].title = req.body.title;
        blogs[index].content = req.body.content;
        saveBlogs(blogs);
    }
    
    res.redirect(`/blog/${req.params.id}`);
});

// PHASE 3: DELETE BLOG
app.post('/delete/:id', (req, res) => {
    if (!isAdmin) return res.redirect('/login');
    
    let blogs = getBlogs();
    blogs = blogs.filter(b => b.id !== req.params.id);
    saveBlogs(blogs);
    
    res.redirect('/');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Portfolio Engine running on http://localhost:${PORT}`);
});