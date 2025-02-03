const { Builder, By, until } = require('selenium-webdriver');
const express = require('express');
const { authenticateJWT } = require('../auth/authenticateJWT');
const router = express.Router();

// Function to initialize WebDriver
async function getDriver(browser) {
  return new Builder().forBrowser(browser).build();
}

// Supported language codes in Cambridge Dictionary
const LANGUAGE_MAP = {
  vi: 'english-vietnamese',
  zh: 'english-chinese-simplified',
  fr: 'english-french',
  es: 'english-spanish',
  de: 'english-german',
  ru: 'english-russian',
  ko: 'english-korean',
  ja: 'english-japanese',
};

// Web Scraping Function
async function translateWord(word, targetLang = 'vi', browser = 'chrome') {
  let driver = await getDriver(browser);
  let result = { word, targetLang, browser, definitions: [], translations: [] };

  try {
    // Get correct Cambridge Dictionary URL
    const langPath = LANGUAGE_MAP[targetLang] || 'english-vietnamese';
    const url = `https://dictionary.cambridge.org/dictionary/${langPath}/${word}`;
    await driver.get(url);

    // Wait for definitions
    await driver.wait(until.elementLocated(By.css('.def')), 5000);
    let definitions = await driver.findElements(By.css('.def'));

    for (let def of definitions) {
      result.definitions.push(await def.getText());
    }

    // Extract translation (if available)
    try {
      let translation = await driver.findElement(By.css('.dtrans.trans'));
      result.translation = await translation.getText();
    } catch {
      result.translation = 'No translation found.';
    }
  } catch (error) {
    console.error(`[${browser.toUpperCase()}] Error:`, error);
    result.error = 'Failed to fetch data.';
  } finally {
    await driver.quit();
  }

  return result;
}

const searchByWord = async (req, res) => {
  const word = req.query.word;
  const browser = req.query.browser || 'chrome';

  if (!word) {
    return res.status(400).json({ error: "Missing 'word' parameter" });
  }
  const data = await translateWord(word, browser);
  res.json(data);
};

router.get('/byword', async (req, res) => {
  await authenticateJWT(req, res, searchByWord(req, res));
});

module.exports = router;
