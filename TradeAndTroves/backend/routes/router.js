const express = require("express");
const router = new express.Router();
const path = require("path");
const multer = require("multer");
const moment=require("moment")
// image storage config
const mysql = require("mysql2/promise");

let connection;




const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "rdbms",
  });
  








var imgConfig = multer.diskStorage({
  destination: (req, file, callback) =>
    callback(null, "./uploads"),
  filename: (req, file, callback) => {
    const uniqueFilename = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    const filename = "image" + uniqueFilename + fileExtension;
    callback(null, filename);
  },
});

const isImage = (req, file, callback) => {
  if (file.mimetype.startsWith("image")) {
    callback(null, true);
  } else {
    callback(null, Error("only image is allowed"));
  }
};

var upload = multer({
  storage: imgConfig,
  fileFilter: isImage,
});

// router.get("/getdata",(req,res)=>{
//   try{
//     connection.query()
//   }
// })


router.get("/getProfileImageName", async (req, res) => {
  const { email } = req.query; // Assuming the email is passed as a query parameter

  if (!email) {
    return res.status(400).json({ error: "Email not provided" });
  }

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute("SELECT image FROM users WHERE email = ?", [email]);
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    
    res.json({ user: rows[0].image});
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




///// Get Product Details in frontend

router.get("/getProductDetails", async (req, res) => {
  const { id } = req.query; // Assuming the email is passed as a query parameter

  if (!id) {
    return res.status(400).json({ error: "PID not provided" });
  }

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute("SELECT * FROM products WHERE PID = ?", [id]);
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ user: rows[0]});
  } catch (error) {
    console.error("Error fetching Product data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});





router.post("/uploadProfileImage", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const email = req.body.email; // Assuming email is sent in the request body
  const filename = req.file.filename; // Get the uploaded image filename

  if (!email || !filename) {
    return res.status(422).json({ status: 422, message: "Missing email or image file" });
  }

  try {
    const date = moment(new Date()).format("YYYY-MM-DD hh:mm:ss");
    const connection = await pool.getConnection();
    
    // Update the user's image filename in the database
    await connection.query("UPDATE users SET image = ? WHERE email = ?", [filename, email]);
    connection.release();

    console.log("Data added successfully");
    res.status(201).json({ status: 201, message: "Profile image uploaded successfully" });
  } catch (error) {
    console.error("Error updating user image:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



router.get('/getproducts', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute('SELECT * FROM products');
    connection.release();
    res.json(results);
    console.log(results);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/// get profile credentials


router.get("/getProfile", async (req, res) => {
  const { email } = req.query; // Assuming the email is passed as a query parameter

  if (!email) {
    return res.status(400).json({ error: "Email not provided" });
  }

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute("SELECT username,address,usertype,amount,rating,address,Longitude,Latitude,phone  FROM users WHERE email = ?", [email]);
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: rows[0]});
  } catch (error) {
    console.error("Error fetching user profile data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/updateLocationData", async (req, res) => {
  try {
    const { email, latitude, longitude } = req.body;

    if (!email || !latitude || !longitude) {
      return res.status(422).json({ error: "Missing email, latitude, or longitude" });
    }

    const query = "UPDATE users SET Latitude = ?, Longitude = ? WHERE email = ?";
    const values = [latitude, longitude, email];

    const connection = await pool.getConnection();
    await connection.execute(query, values);
    connection.release();

    res.status(201).json({ message: "Location data updated successfully" });
  } catch (error) {
    console.error("Error updating location data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get('/getcart', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute('SELECT image, Quantity, unitprice,totalprice,pid from cartinfo');
    connection.release();
    res.json(results);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.delete('/removeFromCart/:pid/:quantity', async (req, res) => {
  const image = req.params.pid;
  const quan=parseInt(req.params.quantity);

  console.log(quan)

  if (!image) {
    return res.status(400).json({ error: 'Image not provided' });
  }

  try {
    // Connect to the database
    const connection = await pool.getConnection();

    // Delete the item from the cartinfo table based on the provided image (primary key)
    const [result] = await connection.execute(`DELETE FROM cartinfo WHERE pid = ?`, [image]);

    const checkExistingQuery2 = "SELECT * FROM products WHERE pid = ?";
    const [existingproductitems] = await connection.query(checkExistingQuery2, [image]);

    const existingproductitem = existingproductitems[0];
      const newQuantity = existingproductitem.Quantity + quan;

      const checkExistingQuery = `UPDATE products SET Quantity = '${newQuantity}' WHERE pid = '${image}'`;
      const [existingUser] = await connection.query(checkExistingQuery);


    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found in the cart' });
    }

    res.json({ message: 'Product removed from the cart successfully' });
  } catch (error) {
    console.error('Error removing product from the cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




router.get("/transactions", async (req, res) => {
  const { email, usertype } = req.query;

  try {
    // Attempt to establish a database connection
    let connection = await pool.getConnection();

    // Query to fetch transactions based on email and usertype
    const [rows] = await connection.execute(
      `SELECT * FROM transactions WHERE ${
        usertype === "buyer" ? "BuyerEmail" : "SellerEmail"
      } = ? AND (SellerConfirm + BuyerConfirm) != 2`,
      [email]
    );

    console.log(rows);
    res.json({ user: rows });
    connection.release();
  } catch (error) {
    console.error("Error connecting to the database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/confirmDelivery', async (req, res) => {
  const { transactionID, userType } = req.body;
  console.log(req.body);

  try {
    const connection = await pool.getConnection();

    // Determine the field to update based on the user type
    const confirmField = userType === 'seller' ? 'SellerConfirm' : 'BuyerConfirm';

    // Update the specified field to 1 for the given transaction ID
    const [result] = await connection.execute(
      `UPDATE transactions SET ${confirmField} = 1 WHERE TransactionID = ?`,
      [transactionID]
    );

    // Check if both BuyerConfirm and SellerConfirm are 1
    const [confirmationStatus] = await connection.execute(
      'SELECT BuyerConfirm, SellerConfirm, Quantity, PID FROM transactions WHERE TransactionID = ?',
      [transactionID]
    );

    const { BuyerConfirm, SellerConfirm, Quantity, PID } = confirmationStatus[0];

    if (BuyerConfirm === 1 && SellerConfirm === 1) {
      // Use a flag to ensure quantity reduction happens only once
      const [productReductionStatus] = await connection.execute(
        'SELECT QuantityReduced FROM transactions WHERE TransactionID = ?',
        [transactionID]
      );

      const { QuantityReduced } = productReductionStatus[0];

      if (!QuantityReduced) {
        // Calculate the new quantity after reducing
        const [productQuantity]= await connection.execute(
          `select Quantity from products where PID=?`,[PID]
        );

        const {currentQuantity} = productQuantity[0];

        // Check if the new quantity is less than or equal to 0
        if (productQuantity[0].Quantity - Quantity === 0) {
          // If the new quantity is 0 or negative, delete the product entry
          await connection.execute(
            'DELETE FROM products WHERE PID = ?',
            [PID]
          );
        } else {
          // If the new quantity is positive, update the quantity in the Products table
          await connection.execute(
            'UPDATE products SET Quantity = ? WHERE PID = ?',
            [productQuantity[0].Quantity - Quantity, PID]
          );
        }

        // Update the QuantityReduced flag to prevent further reduction
        await connection.execute(
          'UPDATE transactions SET QuantityReduced = 1, TimeofTransaction = NOW() WHERE TransactionID = ?',
          [transactionID]
        );
      }
    }


    console.log(result);

    // Release the database connection
    connection.release();

    res.json({ success: true, message: 'Delivery confirmed successfully' });
  } catch (error) {
    console.error('Error updating confirmation:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


router.get('/transactionhistory', async (req, res) => {
  try {
    // Attempt to establish a database connection
    const connection = await pool.getConnection();
    const email= req.query.email;
    console.log(email);

    // Fetch transactions where SellerConfirm + BuyerConfirm is 2
    const [rows] = await connection.execute(
      'SELECT * FROM transactions WHERE   (BuyerEmail = ? OR SellerEmail = ?)',
      [email, email]
    );
//'SELECT * FROM transactions WHERE SellerConfirm + BuyerConfirm = 2 AND (BuyerEmail = ? OR SellerEmail = ?)'
    console.log(rows[0]);

    // Release the database connection
    connection.release();

    res.json({ success: true, transactions: rows });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/getproductNum', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute('SELECT count(*) as total FROM products');
    connection.release();
    res.json(results);
  } catch (error) {
    console.error('Error fetching productNumber', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//user total count
router.get('/getuserNum', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute('SELECT count(*) as total FROM users');
    connection.release();
    res.json(results);
  } catch (error) {
    console.error('Error fetching UserNumber', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//Get request/
router.get('/getrequest', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute('SELECT * FROM request');
    connection.release();
    res.json(results);
    console.log(results);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




// /Request Welcome/



router.get("/getRequestDetails", async (req, res) => {
  const { id } = req.query; // Assuming the email is passed as a query parameter

  if (!id) {
    return res.status(400).json({ error: "PID not provided" });
  }

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute("SELECT * FROM request WHERE PID = ?", [id]);
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ user: rows[0]});
  } catch (error) {
    console.error("Error fetching Product data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// Total Sales by Product
router.get('/salesby-product', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(`
      SELECT ProductName, SUM(Quantity) AS TotalQuantity, SUM(TotalPrice) AS TotalRevenue
      FROM transactions
      GROUP BY ProductName;
    `);
    connection.release();
    res.json(results);
  } catch (error) {
    console.error('Error fetching total sales by product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Total Sales by Buyer
router.get('/salesby-buyer', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(`
      SELECT BuyerEmail, COUNT(TransactionID) AS TotalTransactions, SUM(TotalPrice) AS TotalSpent
      FROM transactions
      GROUP BY BuyerEmail;
    `);
    connection.release();
    res.json(results);
  } catch (error) {
    console.error('Error fetching total sales by buyer:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Assuming you have already created a MySQL connection pool named 'pool'

// Sales Info in Last Week
router.get('/sales-last-week', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(`
      SELECT ProductName, SUM(Quantity) AS TotalQuantity
      FROM transactions
      WHERE TimeofTransaction >= CURDATE() - INTERVAL 1 WEEK
      GROUP BY ProductName;
    `);
    connection.release();
    res.json(results);
  } catch (error) {
    console.error('Error fetching sales info in the last week:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Pending Transactions
router.get('/get-pending-transactions', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(`
      SELECT *
      FROM transactions
      WHERE BuyerConfirm = 0 OR SellerConfirm = 0;
    `);
    connection.release();
    res.json(results);
  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



//review 

router.post('/addProductReview', async (req, res) => {
  const { productId, comment, email, rating } = req.body;
  
  try {
    // Get a connection from the pool
    const connection = await pool.getConnection();

    
    // Fetch user details from the users table
    const [userDetails] = await connection.execute(
      'SELECT username, image FROM users WHERE email = ?',
      [email]
      );

      console.log(userDetails);

      if (userDetails.length === 0) {
        // User not found with the provided email
        connection.release();
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      const { username, image } = userDetails[0];
      
      const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    // Insert the product review into the reviews table
    const [result] = await connection.execute(
      'INSERT INTO reviews (username, email, avatar, reviewTime, Comment, rating, PID) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, email, image,currentDateTime, comment, rating, productId]
    );
    connection.release();

    res.status(200).json({ success: true, message: 'Product review added successfully' });
  } catch (error) {
    console.error('Error adding product review:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


router.get('/getProductReviews', async (req, res) => {
  try {
    const productId = req.query.id;
    const [reviews] = await pool.execute(
      'SELECT * FROM reviews WHERE PID = ? ORDER BY reviewTime DESC',
      [productId]
    );
    console.log(reviews);
    res.json({ reviews });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;