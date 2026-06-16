const pool = require("../db");

const {
  readExcel
} = require("../services/excelService");

const {
  v4: uuidv4
} = require("uuid");

const {
  sendApprovalEmail
} = require(
  "../services/emailService"
);

/*
====================================
UPLOAD EXCEL
====================================
*/
async function uploadExcel(
  req,
  res
) {

  try {

    console.log(
      "UPLOAD ENDPOINT HIT"
    );

    if (!req.file) {

      return res.status(400).json({

        success: false,

        message:
          "File tidak ditemukan"

      });

    }

    const rows =
      readExcel(
        req.file.path
      );

    const uploadResult =
      await pool.query(
        `
        INSERT INTO overtime.overtime_uploads
        (
          file_name,
          uploaded_by
        )
        VALUES
        ($1,$2)
        RETURNING id
        `,
        [
          req.file.originalname,
          "ADMIN"
        ]
      );

    const uploadId =
      uploadResult.rows[0].id;

    let inserted = 0;

    for (
      const row of rows
    ) {

      await pool.query(
      `
      INSERT INTO overtime.overtime_records
      (
        employee_name,
        employee_email,
        project_name,
        overtime_hours,
        upload_id,
        billable_hours,
        non_billable_hours
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      `,
      [
        row["Nama"],
        row["Email Address"],
        row["Project"],
        row["Total Overtime (Hours)"],
        uploadId,
        0,
        0
      ]
      );

      inserted++;

    }

    return res.json({

      success: true,

      fileName:
        req.file.originalname,

      totalRows:
        rows.length,

      inserted

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      success: false,

      error:
        err.message

    });

  }

}

/*
====================================
GET PENDING OVERTIME
====================================
*/
async function getPendingOvertime(
  req,
  res
) {

  try {

    const result =
      await pool.query(
        `
        SELECT
          id,
          employee_name,
          employee_email,
          project_name,
          overtime_hours,
          status,
          validation_type,
          validation_remark,
          validated_at
        FROM overtime.overtime_records
        WHERE validation_type IS NULL
        ORDER BY id
        `
      );

    return res.json({

      success: true,

      total:
        result.rows.length,

      data:
        result.rows

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      success: false,

      error:
        err.message

    });

  }

}

/*
====================================
VALIDATE OVERTIME
====================================
*/
async function validateOvertime(
  req,
  res
) {

  try {

    const id =
      req.params.id;

    const {
      validationType,
      remark
    } = req.body;

    const result =
      await pool.query(
        `
        UPDATE overtime.overtime_records
        SET
          validation_type = $1,
          validation_remark = $2,
          validated_at = NOW(),
          status = 'VALIDATED'
        WHERE id = $3
        RETURNING *
        `,
        [
          validationType,
          remark,
          id
        ]
      );

    if (
      result.rows.length === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          "Record tidak ditemukan"

      });

    }

    return res.json({

      success: true,

      data:
        result.rows[0]

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      success: false,

      error:
        err.message

    });

  }

}


/*
====================================
GROUP BY APPROVER EMAIL
====================================
*/
async function getGroupedOvertime(
  req,
  res
) {

  try {

    const result =
      await pool.query(
        `
        SELECT
          employee_email,
          project_name,
          COUNT(*) AS total_members,
          SUM(overtime_hours) AS total_hours,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', id,
              'employee_name', employee_name,
              'overtime_hours', overtime_hours,
              'status', status,
              'validation_type', validation_type
            )
          ) AS members
        FROM overtime.overtime_records
        WHERE validation_type IS NULL
        GROUP BY
          employee_email,
          project_name
        ORDER BY
          project_name
        `
      );

    return res.json({

      success: true,

      totalGroups:
        result.rows.length,

      data:
        result.rows

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      success: false,

      error:
        err.message

    });

  }

}

/*
====================================
CREATE APPROVAL SESSION
====================================
*/
async function createApprovalSession(
  req,
  res
) {

  try {

    const {
      email,
      project
    } = req.body;

    if (
      !email ||
      !project
    ) {

      return res.status(400).json({

        success: false,

        message:
          "email dan project wajib diisi"

      });

    }

    const token =
      uuidv4();

    const result =
      await pool.query(
        `
        INSERT INTO
        overtime.overtime_approval_sessions
        (
          approver_email,
          project_name,
          approval_token
        )
        VALUES
        ($1,$2,$3)
        RETURNING *
        `,
        [
          email,
          project,
          token
        ]
      );

    return res.json({

      success: true,

      token,

      approvalUrl:
        `http://localhost:3000/approval/${token}`,

      data:
        result.rows[0]

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      success: false,

      error:
        err.message

    });

  }

}


/*
====================================
SEND APPROVAL EMAIL
====================================
*/
async function sendApproval(
  req,
  res
) {

  try {

    const {

      email,

      project,

      approvalUrl

    } = req.body;

    const session =
      await pool.query(
        `
        SELECT id
        FROM overtime.overtime_approval_sessions
        WHERE approver_email = $1
        AND project_name = $2
        ORDER BY id DESC
        LIMIT 1
        `,
        [email, project]
      );

    const referenceId =
      session.rows[0]
        ? session.rows[0].id
        : null;

    await sendApprovalEmail(

      email,

      project,

      approvalUrl,

      referenceId

    );

    return res.json({

      success: true,

      message:
        "Email berhasil dikirim"

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      success: false,

      error:
        err.message

    });

  }

}

/*
====================================
GET APPROVAL DATA BY TOKEN
====================================
*/
async function getApprovalByToken(
  req,
  res
) {

  try {

    const token =
      req.params.token;

    const session =
      await pool.query(
        `
        SELECT *
        FROM overtime.overtime_approval_sessions
        WHERE approval_token = $1
        `,
        [token]
      );

    if (
      session.rows.length === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          "Token tidak ditemukan"

      });

    }

    const approval =
      session.rows[0];

    const records =
      await pool.query(
        `
        SELECT
          id,
          employee_name,
          overtime_hours,
          billable_hours,
          non_billable_hours,
          status,
          validation_type
        FROM overtime.overtime_records
        WHERE employee_email = $1
        AND project_name = $2
        ORDER BY id
        `,
        [
          approval.approver_email,
          approval.project_name
        ]
      );

    return res.json({

      success: true,

      project:
        approval.project_name,

      approver:
        approval.approver_email,

      status:
        approval.status,

      members:
        records.rows

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      success: false,

      error:
        err.message

    });

  }

}

/*
====================================
SUBMIT APPROVAL
====================================
*/
async function submitApproval(
  req,
  res
) {

  const client =
    await pool.connect();

  try {

    const token =
      req.params.token;

    const {
      members
    } = req.body;

    if (
      !Array.isArray(members) ||
      members.length === 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "members wajib diisi"

      });

    }

    const session =
      await client.query(
        `
        SELECT *
        FROM overtime.overtime_approval_sessions
        WHERE approval_token = $1
        `,
        [token]
      );

    if (
      session.rows.length === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          "Token tidak ditemukan"

      });

    }

    const approval =
      session.rows[0];

    if (
      approval.status === "APPROVED"
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Approval sudah disubmit"

      });

    }

    await client.query("BEGIN");

    for (
      const member of members
    ) {

      const {
        id,
        billable_hours,
        non_billable_hours
      } = member;

      const record =
        await client.query(
          `
          SELECT overtime_hours
          FROM overtime.overtime_records
          WHERE id = $1
          AND employee_email = $2
          AND project_name = $3
          `,
          [
            id,
            approval.approver_email,
            approval.project_name
          ]
        );

      if (
        record.rows.length === 0
      ) {

        await client.query("ROLLBACK");

        return res.status(404).json({

          success: false,

          message:
            `Record id ${id} tidak ditemukan`

        });

      }

      const overtimeHours =
        Number(record.rows[0].overtime_hours);

      const billable =
        Number(billable_hours) || 0;

      const nonBillable =
        Number(non_billable_hours) || 0;

      if (
        billable + nonBillable !==
          overtimeHours
      ) {

        await client.query("ROLLBACK");

        return res.status(400).json({

          success: false,

          message:
            `Billable + Non Billable harus sama dengan Overtime Hours pada record id ${id}`

        });

      }

      await client.query(
        `
        UPDATE overtime.overtime_records
        SET
          billable_hours = $1,
          non_billable_hours = $2,
          status = 'VALIDATED',
          validation_type = 'APPROVED',
          validated_at = NOW()
        WHERE id = $3
        `,
        [
          billable,
          nonBillable,
          id
        ]
      );

      await client.query(
        `
        INSERT INTO overtime.overtime_validations
        (
          record_id,
          validator_email,
          validation_status,
          remarks,
          validated_at
        )
        VALUES
        ($1, $2, 'APPROVED', $3, NOW())
        `,
        [
          id,
          approval.approver_email,
          `Billable: ${billable}, Non Billable: ${nonBillable}`
        ]
      );

    }

    await client.query(
      `
      UPDATE overtime.overtime_approval_sessions
      SET
        status = 'APPROVED',
        approved_at = NOW()
      WHERE approval_token = $1
      `,
      [token]
    );

    await client.query("COMMIT");

    return res.json({

      success: true,

      message:
        "Approval berhasil disubmit"

    });

  } catch (err) {

    await client.query("ROLLBACK");

    console.error(err);

    return res.status(500).json({

      success: false,

      error:
        err.message

    });

  } finally {

    client.release();

  }

}

module.exports = {

  uploadExcel,

  getPendingOvertime,

  validateOvertime,

  getGroupedOvertime,

  createApprovalSession,

  sendApproval,

  getApprovalByToken,

  submitApproval

};