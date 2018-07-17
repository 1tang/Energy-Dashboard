const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

router.use('/', require('./live'));
router.use('/', require('./fourtyeight'));
router.use('/', require('./map'));

// root route redirects to /live
router.get('/', (req, res) => {
    res.redirect('/live');
});

// contact route
router.get('/contact', (req, res) => {
    res.render('contact', {msg: "", contHead: "Get in Contact!"});
});

router.post("/contact/send", (req, res) => {
    const output = `
        <p>You have a new contact request</p>
        <h3>Contact Details</h3>
        <ul>
            <li>Name: ${req.body.name}</li>
            <li>Email: ${req.body.email}</li>
        </ul>
        <h3>Message</h3>
        <p>${req.body.message}</p>
    `;

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: 'smtp.live.com',
        port: 25,
        secure: false, // true for 25, false for other ports
        auth: {
            user: process.env.MYEMAIL, 
            pass: process.env.MYPASSWORD
        }
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: process.env.MYEMAIL, // sender address
        to: process.env.EDASH_MAIL, // list of receivers
        subject: 'Energy Dashboard Contact Request', // Subject line
        text: 'Hello world?', // plain text body
        html: output // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        res.render('contact', {msg: "Your message was sent successfully - thanks!", contHead: "Message Sent!"});
    });
});

// about route
router.get('/about', (req, res) => {
    var test = "testing"
    res.render('about');
});

// data sources route
router.get('/data', (req, res) => {
    res.render('data', {test: "this is a test message"} );
});

// embedded generation route
router.get('/embedded', (req, res) => {
    res.render('embedded');
});

module.exports = router;
