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
    const userData = piirsDB.collection("userData"); // collection বানাইলাম
    const issueData = piirsDB.collection("issueData"); // ২য় collection বানাইলাম, ....
    //await issueData.createIndex({tracking:1}, {unique: true}); // এই লাইনটা সার্চ করে যুক্ত করা হয়েছে যাতে ট্র্যাকিং নাম্বার জেনারেটর ফাংশন থেকে জেনারেট হওয়া নাম্বার ইউনিক থাকে
    //Connection test code
    await client.db("admin").command({ ping: 1 });
    console.log("pinged your deployment. Connected to MongoDB!");

    //সার্ভার রুট পেইজ
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
      try {
        const getIssue = req.body;
        const recordIssue = { tracking: generateTrack(), ...getIssue };
        const result = await issueData.insertOne(recordIssue);
        return res.status(201).json({
          success: true,
          insertedId: result.insertedId,
          tracking: recordIssue.tracking,
        });
      } catch (err) {
        //mongodb যদি tracking exsisting পায় সেটার জন্য
        if (err.code === 11000) {
          return res.status(409).json({
            success: false,
            message: "Tracking No Conflict, Please Try againa!",
          });
        }
        return res.status(500).json({ success: false, message: err.message });
      }
    });

    //get all issue
    app.get("/api/all-issue", async (req, res) => {
      try {
        const result = await issueData.find().toArray();
        return res.status(201).send(result);
      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
    });

    //get single issue
    app.get("/api/issue/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await issueData.findOne({ _id: new ObjectId(id) });
        return res.status(201).send(result);
      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
    });

    //Update issue
    app.patch("/api/update/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateIssue = req.body;
        const query = { _id: new ObjectId(id) };
        const applyUpdate = { $set: { ...updateIssue } };
        const option = {};
        const result = await issueData.updateOne(query, applyUpdate, option);
        return res.status(201).json({ success: true, data: result });
      } catch (err) {
        console.error("Error updating issue!", err);
        return res.status(500).json({ success: false, message: err.message });
      }
    });

    //delete issue
    app.delete("/api/remove-issue/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await issueData.deleteOne(query);
        return res.status(201).json({ success: true, data: result });
      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
    });

    //get user specific issues
    app.get("/api/issues-by-user/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const issues = await issueData
          .find({
            "reportedBy.email": email,
          })
          .toArray();
        return res.status(201).send(issues);
      } catch (err) {
        console.error("Error fetching issues:", err);
        return res.status(500).json({ success: false, message: err.message });
      }
    });

    // Upvote API

    app.put("/api/issues/:id/upvote", async (req, res) => {
      try {
        const { userId } = req.body;
        const issueId = req.params.id;
       
        
        const issue = await issueData.findOne({
          _id: new ObjectId(issueId),
        });

        // Check if already upvoted
        const hasUpvoted = issue.upvotedBy?.includes(userId);

        if (hasUpvoted) {
          // Remove upvote
          await issueData.updateOne(
            { _id: new ObjectId(issueId) },
            {
              $inc: { upvotes: -1 },
              $pull: { upvotedBy: userId },
            }
          );

          return res.json({
            success: true,
            message: "Upvote removed",
            action: "removed",
          });
        } else {
          // Add upvote
          await issueData.updateOne(
            { _id: new ObjectId(issueId) },
            {
              $inc: { upvotes: 1 },
              $push: { upvotedBy: userId },
            }
          );

          return res.json({
            success: true,
            message: "Upvoted",
            action: "added",
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    /** Issue CURD API Ends */
    /**......................API Section Ends....................... */

    /** Get User Data API */
    app.get("/api/get-user-data/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await userData.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        res.status(200).send(user);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    /** Get User API Ends */

    /** Update User Data in DB */
    app.patch("/api/update-user/", async (req, res) => {
      try {
        const query = { uid: req.body.uid };
        const updateData = {
          $set: {
            name: req.body.name,
            imgURL: req.body.imgURL,
          },
        };
        console.log(query);

        const options = { upsert: false };
        const result = await userData.updateOne(query, updateData, options);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found!" });
        }
        res.send(result);
      } catch (err) {
        res.status(500).send({ Error: err.message });
      }
    });
    /** */

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

/**Extra Functions */

//Tracking Number Generator
const crypto = require("crypto"); //npm এর বিল্ট-ইন জিনিস
const { log } = require("console");
function generateTrack(prefix = "RI") {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${year}${month}${day}-${rand}`;
}
