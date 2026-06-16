const pool =
  require("../db");

const bcrypt =
  require("bcryptjs");

const jwt =
  require("jsonwebtoken");

const ALLOWED_ROLES = [
  "ADMIN",
  "PROJECT_MANAGER",
  "FINANCE",
  "MANAGEMENT"
];

/*
====================================
REGISTER
====================================
*/
async function register(
  req,
  res
) {

  try {

    const {
      name,
      email,
      password,
      role
    } = req.body;

    if (
      !name ||
      !email ||
      !password
    ) {

      return res.status(400).json({

        success: false,

        message:
          "name, email, dan password wajib diisi"

      });

    }

    const finalRole =
      role && ALLOWED_ROLES.includes(role)
        ? role
        : "PROJECT_MANAGER";

    const passwordHash =
      await bcrypt.hash(password, 10);

    const result =
      await pool.query(
        `
        INSERT INTO overtime.users
        (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role, status, created_at
        `,
        [name, email, passwordHash, finalRole]
      );

    return res.status(201).json({

      success: true,

      data:
        result.rows[0]

    });

  } catch (err) {

    if (err.code === "23505") {

      return res.status(409).json({

        success: false,

        message:
          "Email sudah terdaftar"

      });

    }

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
LOGIN
====================================
*/
async function login(
  req,
  res
) {

  try {

    const {
      email,
      password
    } = req.body;

    if (
      !email ||
      !password
    ) {

      return res.status(400).json({

        success: false,

        message:
          "email dan password wajib diisi"

      });

    }

    const result =
      await pool.query(
        `
        SELECT id, name, email, password_hash, role, status
        FROM overtime.users
        WHERE email = $1
        `,
        [email]
      );

    const user =
      result.rows[0];

    if (
      !user ||
      user.status !== "ACTIVE"
    ) {

      return res.status(401).json({

        success: false,

        message:
          "Email atau password salah"

      });

    }

    const passwordValid =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!passwordValid) {

      return res.status(401).json({

        success: false,

        message:
          "Email atau password salah"

      });

    }

    const token =
      jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET,
        {
          expiresIn:
            process.env.JWT_EXPIRES_IN || "8h"
        }
      );

    return res.json({

      success: true,

      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }

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

module.exports = {
  register,
  login
};
