/**
 * Importing express and cors
 **/
const express = require("express");
const cors = require("cors");
require("dotenv").config();

//Stripe
const stripe = require("stripe")(process.env.STRIPE_SEC_KEY);

//console.log(process.env.DB_USER);

/**
 * Init App as express
 */
const app = express();

//app using express, json, cors এগুলো ফাংশনাল করা হচ্ছে

const corsOptions = {
  origin: process.env.CLIENT_URI,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

/**
 * Declare Port!
 */
const port = process.env.PORT || 3000;

/**
 * Port Listen Declaration
 */

app.listen(port, (res) => {
  console.log(`SERVER RUNNING @ ${port}`);
});

/**......................Express Config Ends....................... */

/**......................Database Config Starts....................... */
//MongoDB এর কাজ শুরু, প্রথমে MongoDB import করবো
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
//mongoDB এর URI সেট করা হলো .env থেকে
const uri = process.env.MONGODB_URI;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
/**......................Database Config Ends....................... */

/**......................API Section Starts....................... */
async function run() {
  try {
    //উপরে MongoDB এর client কে কানেক্ট করলাম
    await client.connect();
    const piirsDB = client.db("piirsDB"); //database বানাইলাম, থাকলে আবার ক্রিয়েট হবে না
    const issueData = piirsDB.collection("issueData"); // collection বানাইলাম, ....
    const userData = piirsDB.collection("userData"); //২য় collection বানাইলাম
    //Connection test code
    await client.db("admin").command({ ping: 1 });
    console.log("pinged your deployment. Connected to MongoDB!");

    app.get("/", (req, res) => {
      res.send("Express Server is Running!");
    });

    //DB ইউজার ডেটা সেভ করতে
    app.post("/storeuserdata", async (req, res) => {
      const userInfo = req.body;
      console.log(
        userInfo.uid,
        userInfo.name,
        userInfo.email,
        userInfo.imgURL,
        userInfo.role,
        userInfo.createdAt,
        userInfo.isBlocked
      );
      const result = await userData.insertOne(userInfo);
      res.send(result);
    });

    //test api
    app.get("/get-test", async (req, res) => {
      const packet = issueData.find(); //packet জাস্ট নাম দেওয়া হয়েছে
      const result = await packet.toArray();
      res.send(result);
    });

    //test api
    app.post("/get-post", async (req, res) => {
      const newIssue = req.body;
      console.log(newIssue);
      const result = await issueData.insertOne(newIssue);
      res.send(result);
    });

    /** Issue CURD API Starts */
    //create a issue
    app.post("/api/record-issue", async (req, res) => {
      const recordIssue = req.body;
      console.log(recordIssue);
      const result = await issueData.insertOne(recordIssue);
      res.send(result);
      res.send(recordIssue);
    });

    //get all issue
    app.get("/api/all-issue", async (req, res) => {
      const result = await issueData.find().toArray();
      res.send(result);
    });

    //get single issue
    app.get("/api/issue/:id", async (req, res) => {
      const id = req.params.id;
      const result = await issueData.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    //Update issue
    app.patch("/api/update/:id", async (req, res) => {
      const id = req.params.id;
      const updateIssue = req.body;
      const query = { _id: new ObjectId(id) };
      const applyUpdate = { $set: { ...updateIssue } };
      const option = {};
      const result = await issueData.updateOne(query, applyUpdate, option);
      res.send(result);
    });

    //delete issue
    app.delete("/api/remove-issue/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await issueData.deleteOne(query);
      res.send(result);
    });

    /** Issue CURD API Ends */
    /**......................API Section Ends....................... */

    /** STRIPE API Starts */
    app.post("/create-checkout-sessions", async (req, res) => {
      try {
        const {
          amount = 100,
          name = "One-time payment",
          quantity = 1,
        } = req.body;
        // amount is expected in smallest currency unit, e.g., cents for USD or paisa for BDT if supported
        const session = await stripe.checkout.sessions.create({
          success_url:
            "http://localhost:5173/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "http://localhost:5173/dashboard/payment-cancel",
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "usd", // change to your currency, e.g., 'usd' or 'bdt' if supported
                product_data: {
                  name: name,
                },
                unit_amount: amount, // amount in cents (or smallest currency unit)
              },
              quantity,
            },
          ],
        });
        return res.status(200).json({ url: session.url, id: session.id });
      } catch (err) {
        console.error("Stripe session error:", err);
        const message =
          err.raw && err.raw.message ? err.raw.message : err.message;
        return res.status(400).json({ error: message });
      }
    });
    /** STRIPE API Ends */

    //store premium sub data
    app.patch("/store-premium-sub-data", async (req, res) => {
      try {
        const query = { uid: req.body.uid };
        const paymentData = {
          $set: {
            isPremium: true,
            paymentHash: req.body.paymentSessionID,
            paymentDate: new Date(),
          },
        };
        const option = { upsert: false };
        const result = await userData.updateOne(query, paymentData, option);
        //console.log(paymentData);
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found!" });
        }
        res.send(result);
      } catch (err) {
        res.status(500).send({ Error: err.message });
      }
    });
  } catch (err) {
    console.error(err);
  }
}

//run ফাংশনকে কল করলাম
run().catch(console.dir);
