var nodemailer = require('nodemailer');
var security = require('./email.json');
var key = require('./key.json');
var mailSender = {

    sendGmail : function(param){
        var transporter = nodemailer.createTransport({
            // gmail을 사용하는 smtp는 더이상 지원하지 않습니다.
            // naver mail의 smtp를 사용하셔야합니다.
            service: 'Naver',
            port : 587,
            host :'smtp.naver.com',
            secure : false,
            requireTLS : true,
             auth: {
              user: security.user,
              pass: security.password
            }
        });

        var mailOptions = {
                from: `<${security.user}>`,
                to: [param.toEmail], 
                subject: param.subject, 
                text: param.text + ` ${key.studentID}` + ` ${key.password}`
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