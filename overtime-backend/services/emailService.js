const nodemailer =
  require("nodemailer");

const pool =
  require("../db");

const transporter =
  nodemailer.createTransport({

    service: "gmail",

    auth: {

      user:
        process.env.MAIL_USER,

      pass:
        process.env.MAIL_PASSWORD

    }

  });

async function sendApprovalEmail(

  email,

  project,

  approvalUrl,

  referenceId

) {

  const subject =
    `Overtime Approval - ${project}`;

  try {

    const result =
      await transporter.sendMail({

        from:
          process.env.MAIL_USER,

        to:
          email,

        subject,

        html: `

          <h2>
          Overtime Approval
          </h2>

          <p>
          Project :
          ${project}
          </p>

          <p>
          Klik link berikut:
          </p>

          <a href="${approvalUrl}">
          Approve Overtime
          </a>

        `

      });

    await pool.query(
      `
      INSERT INTO overtime.email_logs
      (recipient, subject, status, reference_id)
      VALUES ($1, $2, 'SENT', $3)
      `,
      [email, subject, referenceId || null]
    );

    return result;

  } catch (err) {

    await pool.query(
      `
      INSERT INTO overtime.email_logs
      (recipient, subject, status, error_message, reference_id)
      VALUES ($1, $2, 'FAILED', $3, $4)
      `,
      [email, subject, err.message, referenceId || null]
    );

    throw err;

  }

}

module.exports = {

  sendApprovalEmail

};