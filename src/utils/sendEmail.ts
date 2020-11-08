'use strict';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import key from '../mailing-service-294919-e6e6e3bc1b54.json';

// async..await is not allowed in global scope, must use a wrapper
export async function sendEmail(to: string, html: string, subject: string) {
  // create reusable transporter object using the default SMTP transport

  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: 'admin@knat.dev',
      serviceClient: key.client_id,
      privateKey: key.private_key,
    },
  });

  try {
    await transporter.verify();
    transporter.on('token', (token) => {
      console.log('A new access token was generated');
      console.log('User: %s', token.user);
      console.log('Access Token: %s', token.accessToken);
      console.log('Expires: %s', new Date(token.expires));
    });
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: '"Knat Dev - Reddit Clone" <admin@knat.dev>', // sender address
      to, // list of receivers
      subject, // Subject line
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);

    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (e) {
    console.log(e.message);
  }
}
