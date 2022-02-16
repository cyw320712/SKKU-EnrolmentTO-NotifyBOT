var nodemailer = require('nodemailer');
var security = require('./email.json');
var mailSender = {

    sendGmail : function(param){
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            prot : 587,
            host :'smtp.gmlail.com',
            secure : false,
            requireTLS : true,
             auth: {
              user: security.user,
              pass: security.password
            }
        });

        var mailOptions = {
                from: `<${security.user}>`,
                to: param.toEmail, 
                subject: param.subject, 
                text: param.text 
            };
        
        transporter.sendMail(mailOptions, function(error, info){
            if (error)
                console.log(error);
            else
                console.log("Email sent to " + param.toEmail);
        });   
    }
}

module.exports = mailSender;