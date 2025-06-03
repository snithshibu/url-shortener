const express = require('express');
const mongoose = require('mongoose');
const dns = require('dns');
const cors = require('cors');
const shortid = require('shortid');
const validUrl = require('valid-url');
const Url = require('./models/Url');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database connection
mongoose.connect('mongodb://localhost/urlshortener', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/api/shorturl', async (req, res) => {
  const { url } = req.body;

  // Check if URL is valid
  if (!validUrl.isWebUri(url)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    // Verify URL via DNS lookup
    const urlObj = new URL(url);
    dns.lookup(urlObj.hostname, async (err) => {
      if (err) {
        return res.json({ error: 'invalid url' });
      }

      // Check if URL already exists in database
      let existingUrl = await Url.findOne({ originalUrl: url });

      if (existingUrl) {
        return res.json({
          original_url: existingUrl.originalUrl,
          short_url: existingUrl.shortUrl
        });
      }

      // Create new URL entry
      const shortUrl = shortid.generate();
      const newUrl = new Url({
        originalUrl: url,
        shortUrl
      });

      await newUrl.save();

      res.json({
        original_url: newUrl.originalUrl,
        short_url: newUrl.shortUrl
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json('Server error');
  }
});

app.get('/api/shorturl/:short_url', async (req, res) => {
  try {
    const url = await Url.findOne({ shortUrl: req.params.short_url });

    if (url) {
      return res.redirect(url.originalUrl);
    } else {
      return res.status(404).json('No URL found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).json('Server error');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});