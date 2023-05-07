const express = require("express");
const router = express.Router();
const db = require("../db");
const ExpressError = require("../expressError")


//get info on all invoices
router.get('/', async (req, res, next) => {
  try {
    const results = await db.query(`SELECT * FROM invoices`);
    return res.json({ invoices: results.rows })
  } catch (e) {
    return next(e);
  }
})

//get info on single invoice by id
router.get("/:id", async function(req, res, next) {
  try {
    const results = await db.query(
        `SELECT i.id, 
        i.comp_code, 
        i.amt, 
        i.paid, 
        i.add_date, 
        i.paid_date, 
        c.name, 
        c.description 
        FROM invoices AS i
        INNER JOIN companies AS c ON (i.comp_code = c.code)  
        WHERE id = $1`, [req.params.id]);

    if (results.rows.length === 0) {
      let notFoundError = new Error(`There is no invoice with id '${req.params.id}`);
      notFoundError.status = 404;
      throw notFoundError;
    }
    return res.json({ invoice: results.rows[0] });
  } catch (err) {
    return next(err);
  }
});

//add new invoice
router.post("/", async function(req, res, next) {
  try {
    const { comp_code, amt } = req.body;

    const result = await db.query(
      `INSERT INTO invoices (comp_code, amt) 
         VALUES ($1, $2) 
         RETURNING *`,
      [comp_code, amt]);

    return res.status(201).json({invoice: result.rows[0]});  // 201 CREATED
  } catch (err) {
    return next(err);
  }
});

//edit existing invoice
router.put("/:id", async function (req, res, next) {
  try {
    let {amt, paid} = req.body;
    let id = req.params.id;
    let paidDate = null;

    const currResult = await db.query(
          `SELECT paid
           FROM invoices
           WHERE id = $1`,
        [id]);

    if (currResult.rows.length === 0) {
      throw new ExpressError(`No such invoice: ${id}`, 404);
    }

    const currPaidDate = currResult.rows[0].paid_date;

    if (!currPaidDate && paid) {
      paidDate = new Date();
    } else if (!paid) {
      paidDate = null
    } else {
      paidDate = currPaidDate;
    }

    const result = await db.query(
          `UPDATE invoices
           SET amt=$1, paid=$2, paid_date=$3
           WHERE id=$4
           RETURNING id, comp_code, amt, paid, add_date, paid_date`,
        [amt, paid, paidDate, id]);

    return res.json({"invoice": result.rows[0]});
  }

  catch (err) {
    return next(err);
  }

});

//Delete invoice
router.delete("/:id", async function(req, res, next) {
  try {
    const result = await db.query(
      "DELETE FROM invoices WHERE id = $1 RETURNING id", [req.params.id]);

    if (result.rows.length === 0) {
      throw new ExpressError(`There is no invoice with id of '${req.params.id}`, 404);
    }
    return res.json({ status: "deleted" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;