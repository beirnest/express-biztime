const express = require("express");
const router = express.Router();
const db = require("../db");
const ExpressError = require("../expressError");
const slugify = require('slugify');


//get info on all companies
router.get('/', async (req, res, next) => {
  try {
    const results = await db.query(`SELECT * FROM companies`);
    return res.json({ companies: results.rows })
  } catch (e) {
    return next(e);
  }
})

//get info on single company by company code
router.get("/:code", async function (req, res, next) {
  try {
    let code = req.params.code;

    const compResult = await db.query(
          `SELECT code, name, description
           FROM companies
           WHERE code = $1`,
        [code]
    );

    const invResult = await db.query(
          `SELECT id
           FROM invoices
           WHERE comp_code = $1`,
        [code]
    );

    if (compResult.rows.length === 0) {
      throw new ExpressError(`No such company: ${code}`, 404)
    }

    const company = compResult.rows[0];
    const invoices = invResult.rows;

    company.invoices = invoices.map(inv => inv.id);

    return res.json({"company": company});
  }

  catch (err) {
    return next(err);
  }
});
//add new company
router.post("/", async function(req, res, next) {
  try {
    const { name, description } = req.body;

    const result = await db.query(
      `INSERT INTO companies (code, name, description) 
         VALUES ($1, $2, $3) 
         RETURNING code, name, description`,
      [slugify(name, {lower:true}), name, description]);

    return res.status(201).json({company: result.rows[0]});  // 201 CREATED
  } catch (err) {
    return next(err);
  }
});

//edit existing company
router.put("/:code", async function(req, res, next) {
  try {
    if ("code" in req.body) {
      throw new ExpressError("Not allowed", 400)
    }

    const { name, description } = req.body;
    const code = req.params.code;

    const result = await db.query(
      `UPDATE companies 
           SET name=$1, description=$2
           WHERE code=$3
           RETURNING code, name, description`,
      [name, description, code]
      );

    if (result.rows.length === 0) {
      throw new ExpressError(`There is no company with code of '${code}`, 404);
    }

    return res.json({ company: result.rows[0]});
  } catch (err) {
    return next(err);
  }
});

//Delete company
router.delete("/:code", async function(req, res, next) {
  try {
    const result = await db.query(
      "DELETE FROM companies WHERE code = $1 RETURNING code", [req.params.code]);

    if (result.rows.length === 0) {
      throw new ExpressError(`There is no company with code of '${req.params.code}`, 404);
    }
    return res.json({ status: "deleted" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;