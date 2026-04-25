const path = require('path');
require('dotenv').config();
const app = require('./api/index');

const PORT = process.env.PORT || 3000;

// Serve static files for local development
app.use(require('express').static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
