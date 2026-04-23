const Tesseract = require('tesseract.js');
Tesseract.recognize('test_mco_login_3.png', 'eng').then(({data: {text}}) => {
    console.log("TEXT EXTRACTED: \n", text);
    process.exit(0);
});
