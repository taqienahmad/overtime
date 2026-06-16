console.log(
  "OVERTIME ROUTES LOADED"
);

const express =
  require("express");

const multer =
  require("multer");

const {

  uploadExcel,

  getPendingOvertime,

  validateOvertime,

  getGroupedOvertime,

  createApprovalSession,

  sendApproval,

  getApprovalByToken,

  submitApproval

} = require(
  "../controllers/overtimeController"
);

const {
  verifyToken,
  requireRole
} = require(
  "../middlewares/authMiddleware"
);

const router =
  express.Router();

const path =
  require("path");

const storage =
  multer.diskStorage({

    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },

    filename: (req, file, cb) => {

      const ext =
        path.extname(file.originalname);

      const uniqueName =
        `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

      cb(null, uniqueName);

    }

  });

const upload =
  multer({
    storage
  });

/*
====================================
PING
====================================
*/
router.get(
  "/ping",
  (req, res) => {
    res.send("PING OK");
  }
);

/*
====================================
GET PENDING
====================================
*/
router.get(
  "/pending",
  verifyToken,
  getPendingOvertime
);

/*
====================================
GROUPED BY EMAIL
====================================
*/
router.get(
  "/grouped",
  verifyToken,
  requireRole("ADMIN"),
  getGroupedOvertime
);


/*
====================================
GROUPED APPROVALSESSION
====================================
*/
router.post(
  "/approval-session",
  verifyToken,
  requireRole("ADMIN"),
  createApprovalSession
);

/*
====================================
ROUTE UNTUK MENGIRIM EMAIL
====================================
*/
router.post(
  "/send-email",
  verifyToken,
  requireRole("ADMIN"),
  sendApproval
);

/*
====================================
APPROVAL BY TOKEN
====================================
*/
router.get(
  "/approval/:token",
  getApprovalByToken
);

/*
====================================
SUBMIT APPROVAL
====================================
*/
router.post(
  "/approval-submit/:token",
  submitApproval
);

/*
====================================
UPLOAD EXCEL
====================================
*/
router.post(
  "/upload",
  verifyToken,
  requireRole("ADMIN"),
  upload.single("file"),
  uploadExcel
);


/*
====================================
VALIDATE OVERTIME
====================================
*/
router.post(
  "/validate/:id",
  verifyToken,
  requireRole("ADMIN", "PROJECT_MANAGER"),
  validateOvertime
);

module.exports =
  router;