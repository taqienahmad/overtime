const jwt =
  require("jsonwebtoken");

/*
====================================
VERIFY TOKEN
====================================
*/
function verifyToken(
  req,
  res,
  next
) {

  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {

    return res.status(401).json({

      success: false,

      message:
        "Token tidak ditemukan"

    });

  }

  const token =
    authHeader.split(" ")[1];

  try {

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.user = decoded;

    next();

  } catch (err) {

    return res.status(401).json({

      success: false,

      message:
        "Token tidak valid atau sudah expired"

    });

  }

}

/*
====================================
REQUIRE ROLE
====================================
*/
function requireRole(
  ...roles
) {

  return (req, res, next) => {

    if (
      !req.user ||
      !roles.includes(req.user.role)
    ) {

      return res.status(403).json({

        success: false,

        message:
          "Anda tidak memiliki akses untuk aksi ini"

      });

    }

    next();

  };

}

module.exports = {
  verifyToken,
  requireRole
};
