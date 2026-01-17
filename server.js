const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CUKUP INI SAJA
app.use(express.static(path.join(__dirname, 'public')));

// ⚠️ HARUS PALING BAWAH
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Development server running at http://localhost:${PORT}`);
});
