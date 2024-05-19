const express = require("express");
const mysql = require("mysql2/promise"); // Import mysql2 with promise support
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const router=require("./routes/router");
const exp = require("constants");
const app = express();
const { v4: uuidv4 } = require("uuid");

// Middleware
app.use(cors());
app.use(express.json());
app.use(router);
app.use("/uploads",express.static("./uploads"))
app.listen(3002, () => {
  console.log(`Server is running on port 3002`);
});

// Create a MySQL connection pool (for improved performance)

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "rdbms",
});

// Define a route for signing up
app.post("/SignUpForm", async (req, res) => {
  const user = req.body.username_;
  //const nid = req.body.nid_;
  const add = req.body.address_;
  const em = req.body.email_;
  const ph = req.body.phone_;
  const ut = req.body.utype_;
  const ps = req.body.password_;

  let connection; // Declare the connection variable outside the try block

  try {
    connection = await pool.getConnection();

    // Check if email or phone or NID already exists
    const checkExistingQuery =
      "SELECT COUNT(*) AS count FROM users WHERE email = ? OR phone = ?";
    const checkExistingValues = [em, ph];

    const [existingUser] = await connection.query(
      checkExistingQuery,
      checkExistingValues
    );

    if (existingUser[0].count > 0) {
      // An existing user with the same email or phone already exists
      return res
        .status(400)
        .json({
          error: "User with the same email, phone already exists.",
        });
    }

    // No existing user found, proceed with inserting the new user
    const insertQuery = "INSERT INTO users(username,email,address,usertype,phone,password) VALUES (?, ?, ?, ?, ?, ?)";
    const values = [user, em, add, ut, ph, ps];

    await connection.query(insertQuery, values);

    console.log("Data inserted into the database");
    return res.status(200).json({ message: "Sign up successful" });
  } catch (err) {
    console.error("Error inserting data into the database:", err);
    return res
      .status(500)
      .json({
        error: "An error occurred while signing up.",
        details: err.message,
      });
  } finally {
    if (connection) {
      connection.release(); // Release the connection back to the pool
    }
  }
});

// LogInPage

app.post("/SignInForm", async (req, res) => {
  const em = req.body.email_;
  const ps = req.body.password_;

  let connection; // Declare the connection variable outside the try block

  try {
    connection = await pool.getConnection();

    const sql = `SELECT email,password,usertype FROM users WHERE email = '${em}' AND password = '${ps}'`;
    //const values = [em, ps];

    const [results] = await connection.query(sql);
    console.log(results);

    if (results.length > 0) {
      console.log("User Found");
      return res.status(200).json({ message: "Success",useremail:results[0],usertype:results[2] });
    } else {
      console.log("doesn't exist");
      return res.status(400).json({ message: "Unsuccessful" });
    }
  } catch (err) {
    console.error("Error executing query:", err);
    return res
      .status(500)
      .json({ error: "An error occurred during login.", details: err.message });
  } finally {
    if (connection) {
      connection.release(); // Release the connection back to the pool
    }
  }
});

// Define multer storage engine for file handling

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const uniqueFilename = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Get the file extension
    const fileExtension = path.extname(file.originalname);
    // Combine the unique filename and the original file extension
    const filename = uniqueFilename + fileExtension;
    cb(null, filename);
  },
});

const upload = multer({ storage });

app.post("/MobileSellForm", upload.array("images", 3), async (req, res) => {
  const {
    email,
    productName,
    company,
    model,
    ram,
    rom,
    frontCamera,
    rearCamera,
    battery,
    description,
    isWorkingProperly,
    issues,
    price,
    quantity,
    courierOption,
    location,
    phoneNumber,
    usedMnth,
  } = req.body;

  //console.log(req.body);
  //console.log(req.files);

  try {
    if (price <= 0) {
      return res.status(400).send("Price must be a positive value.");
    }

    if (req.files.length !== 3) {
      return res.status(400).send("Must upload exactly 3 images.");
    }

    const connection = await pool.getConnection();

    const sql =
      "INSERT INTO request (SellerEmail,ProductName,Company, Model, RAM, ROM,FrontCamera,RearCamera,Battery, Description, IsWorkingProperly, Issues, Price, Quantity, CourierOption, Location, PhoneNumber, Image1, Image2, Image3,usedMnth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)";

    const filenames = req.files.map((file) => file.filename);

    await connection.execute(sql, [
      email,
      productName,
      company,
      model,
      ram,
      rom,
      frontCamera,
      rearCamera,
      battery,
      description,
      isWorkingProperly,
      issues,
      price,
      quantity,
      courierOption,
      location,
      phoneNumber,
      filenames[0],
      filenames[1],
      filenames[2],
      usedMnth,
    ]);

    //console.log("Success");
    connection.release();
    res.status(200).send("Data inserted successfully");
  } catch (error) {
    console.error("Error inserting data into the database:", error);
    res.status(500).send("Error inserting data into the database:" + error.message);
  }
});

/*
  Forget Password
*/

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "sahabalchowdhury@gmail.com",
    pass: "iaekwdbdnzfbomsa",
  },
});

// Generate and store OTP for users

const otps = new Map();
var otp2;
var emailstore;

// Send OTP to the user's email

app.post("/ForgetPass", async (req, res) => {
  const email = req.body.email_;
  emailstore = email;

  // Generate a random OTP
  const otp = crypto.randomInt(1000, 9999).toString();
  otp2 = otp;

  // Store OTP for the user
  otps.set(email, otp);

  try {
    connection = await pool.getConnection();

    const checkExistingQuery =
      "SELECT COUNT(*) AS count FROM users WHERE email = ?";
    const checkExistingValues = [email];

    const [existingUser] = await connection.query(
      checkExistingQuery,
      checkExistingValues
    );

    if (existingUser[0].count > 0) {
      // Send OTP via email
      const mailOptions = {
        from: "sahabalchowdhury@gmail.com",
        to: email,
        subject: "Password Reset OTP",
        text: `Your OTP for password reset is: ${otp} `,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          res.status(500).json({ message: "Error sending OTP" });
        } else {
          console.log("Email sent: " + info.response);
          console.log(emailstore);
          res.json({ message: "OTP sent to your email" });
        }
      });
    }
  } catch (err) {
  } finally {
    if (connection) {
      connection.release(); // Release the connection back to the pool
    }
  }
});

/*
    Confirm OTP
*/

app.post("/ConfirmOTP", (req, res) => {
  const p = req.body.otp_;

  if (otp2 == p) {
    return res.status(200).json({ message: "successful" });
  } else {
    return res.status(400).json({ error: "OTP doesnt match" });
  }
});

/*
  Reset Password
*/

app.post("/ResetPassword", async (req, res) => {
  const ps = req.body.password_;
  const ps2 = req.body.password2_;

  let connection;

  try {
    connection = await pool.getConnection();

    const checkExistingQuery = `UPDATE users SET password = '${ps}' WHERE email = '${emailstore}'`;
    // const checkExistingValues = [ps,emailstore];

    const [existingUser] = await connection.query(checkExistingQuery);
    return res.status(200).json({ message: "successful" });
  } catch (err) {
    console.error("Error inserting data into the database:", err);
    return res
      .status(500)
      .json({
        error: "An error occurred while signing up.",
        details: err.message,
      });
  } finally {
  }
});








/////Get user Data from searchbar

app.get("/getUserDetails", async (req, res) => {
  const { name } = req.query; // Assuming the email is passed as a query parameter

  if (!name) {
    return res.status(400).json({ error: "Name not provided" });
  }

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute("SELECT username,image,phone,address,usertype,rating,Longitude,Latitude FROM users WHERE username LIKE ?", ['%' + name + '%']);
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: rows});
  } catch (error) {
    console.error("Error fetching user Details data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});






const bodyParser = require("body-parser");
const SSLCommerzPayment = require('sslcommerz-lts')
const store_id = 'eagri6531587833123'
const store_passwd = 'eagri6531587833123@ssl'
const is_live = false //true for live, false for sandbox

app.use(bodyParser.json());

app.post("/order", async (req, res) => {
  let prod;
  console.log("Order");
  const order = req.body;
  console.log(order);
  const pid = order.prouctId;
  //const tranId = "BXASK3R73-JBCDB387";
  const tranId= uuidv4();

  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(
      "SELECT ProductName, Price, Quantity FROM products WHERE PID = ?",
      [pid] // Set to null if pid is undefined
    );
    prod = rows[0];
    //console.log(prod);
    connection.release();
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ error: "An error occurred", details: err.message });
  }

  const data = {
    // total_amount: prod.UnitPrice*order.Quantity,
    total_amount: order.Quantity * prod.Price,
    currency: "BDT",
    tran_id: tranId, // use unique tran_id for each api call
    success_url: "http://localhost:3000/PaymentSuccess/" + tranId,
    fail_url: "http://localhost:3030/fail",
    cancel_url: "http://localhost:3030/cancel",
    ipn_url: "http://localhost:3030/ipn",
    shipping_method: "Courier",
    product_name: prod.ProductName,
    product_category: "Electronic",
    product_profile: "general",
    cus_name: "Customer Name",
    cus_email: order.email,
    cus_add1: "Dhaka",
    cus_add2: "Dhaka",
    cus_city: "Dhaka",
    cus_state: "Dhaka",
    cus_postcode: "1000",
    cus_country: "Bangladesh",
    cus_phone: order.phoneNumber,
    cus_fax: "01711111111",
    ship_name: "Customer Name",
    ship_add1: "Dhaka",
    ship_add2: "Dhaka",
    ship_city: "Dhaka",
    ship_state: "Dhaka",
    ship_postcode: 1000,
    ship_country: "Bangladesh",
  };

  console.log(data.total_amount);

  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
  sslcz.init(data).then((apiResponse) => {
    // Redirect the user to payment gateway
    let GatewayPageURL = apiResponse.GatewayPageURL;
    res.send({ url: GatewayPageURL });
    console.log("Redirecting to: ", GatewayPageURL);

    const finalOrder = {
      prod,
      order,
      paidStatus: false,
      transactionId: tranId,
    };

    console.log("Products");
    console.log(prod);
    console.log("Orders");
    console.log(order);
 
  });


  try {
    const connection = await pool.getConnection();

    const [prod_rows] = await connection.execute(
      "select * from products where PID=?",
      [pid]
    );
    console.log("Prod Details");
    console.log(prod_rows[0]);

    const sql = `insert into transactions(TransactionID,BuyerEmail,SellerEmail,PID,ProductName,Quantity,TotalPrice) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    

    //const connection = await pool.getConnection();
    await connection.execute(sql, [
      tranId,
      order.email,
      prod_rows[0].SellerEmail,
      prod_rows[0].PID,
      prod_rows[0].ProductName,
      order.Quantity,
      order.Quantity * prod_rows[0].Price,
    ]);

    console.log("Success");

    connection.release();
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ error: "An error occurred", details: err.message });
  }

  app.post("/PaymentSuccess/:tranId", async (req, res) => {
    const { tranId } = req.params; // Access it from route parameters
    console.log("Transaction ID:", tranId);

    // Redirect to the PaymentSuccess page with the transactionId as a query parameter
    res.redirect(
      "http://localhost:3000/PaymentSuccess?transactionId=" + tranId
    );
  });
});





app.post('/ProductWelcome', async (req, res) => {
  const { image, unitPrice, quantity, totalPrice, pid } = req.body;
  console.log(req.body);
  let connection;
  
  try {
    connection = await pool.getConnection();

    // Check if pid already exists in cartinfo
    const checkExistingQuery = "SELECT * FROM cartinfo WHERE pid = ?";
    const checkExistingQuery2 = "SELECT * FROM products WHERE pid = ?";
    const [existingCartItems] = await connection.query(checkExistingQuery, [pid]);
    const [existingproductitems] = await connection.query(checkExistingQuery2, [pid]);
    if (existingCartItems.length === 0) {
      // If pid doesn't exist, insert a new cart item
      const insertQuery = 'INSERT INTO cartinfo (image, unitprice, quantity, totalprice, pid) VALUES (?, ?, ?, ?, ?)';
      const [insertResult] = await connection.query(insertQuery, [image, unitPrice, quantity, totalPrice, pid]);
      const existingproductitem = existingproductitems[0];
      const newQuantity = existingproductitem.Quantity - quantity;

      const checkExistingQuery = `UPDATE products SET Quantity = '${newQuantity}' WHERE pid = '${pid}'`;
      const [existingUser] = await connection.query(checkExistingQuery);

      res.status(200).json({ message: 'Cart item added successfully' });
    } else {
      const existingCartItem = existingCartItems[0];
      const newQuantity = existingCartItem.quantity + quantity;
      const newTotalPrice = existingCartItem.totalprice + totalPrice;

      const existingproductitem = existingproductitems[0];
      const newQuantity2 = existingproductitem.Quantity - quantity;

      const checkExistingQuery2 = `UPDATE products SET Quantity = '${newQuantity2}' WHERE pid = '${pid}'`;
      const [existingUser2] = await connection.query(checkExistingQuery2);



      const checkExistingQuery = `UPDATE cartinfo SET totalprice = '${newTotalPrice}', quantity='${newQuantity}' WHERE pid = '${pid}'`;
      const [existingUser] = await connection.query(checkExistingQuery);
      res.status(200).json({ message: 'Cart item added successfully' });
   
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error processing cart item' });
  } finally {
    if (connection) {
      connection.release(); // Release the connection back to the pool
    }
  }
});





// /Granting Request/

router.post('/RequestWelcomebhai', async (req, res) => {
  const {
    PID,
    SellerEmail,
    ProductName,
    Company,
    Model,
    RAM,
    ROM,
    FrontCamera,
    RearCamera,
    Battery,
    Description,
    IsWorkingProperly,
    Price,
    Quantity,
    CourierOption,
    Location,
    PhoneNumber,
    Image1,
    Image2,
    Image3,
    usedMnth

  } = req.body;
  let connection;


  try {

    connection = await pool.getConnection();
    const insertQuery = "INSERT INTO products (PID,SellerEmail,ProductName,Company,Model,RAM,ROM,FrontCamera,RearCamera,Battery,Description,IsWorkingProperly,Price,Quantity,CourierOption,Location,PhoneNumber,Image1,Image2,Image3,usedMnth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?)";
    const values = [
      PID,
      SellerEmail,
      ProductName,
      Company,
      Model,
      RAM,
      ROM,
      FrontCamera,
      RearCamera,
      Battery,
      Description,
      IsWorkingProperly,
      Price,
      Quantity,
      CourierOption,
      Location,
      PhoneNumber,
      Image1,
      Image2,
      Image3,
      usedMnth
    ];
    await connection.query(insertQuery, values);
    const [result] = await connection.execute(`DELETE FROM request WHERE pid = ?`, [PID]);
    res.status(200).json({ message: 'Product added to the database successfully' });
  } catch (error) {
    console.error('Error adding product to the database:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 
