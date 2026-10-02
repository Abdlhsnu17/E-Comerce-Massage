require("dotenv").config();

const { ensureMassageCatalog } = require("../services/massageCatalogBootstrap");
const { pool } = require("../config/db");

ensureMassageCatalog()
  .then(() => console.log("Katalog dummy spa & massage siap."))
  .catch(error => {
    console.error("Gagal menyiapkan katalog dummy:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
