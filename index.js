/**
 * Importing express and cors
 **/
const express = require("express");
const cors = require("cors");
require("dotenv").config();

//Stripe
const stripe = require("stripe")(process.env.STRIPE_SEC_KEY);

//console.log(process.env.DB_USER);

// firebase admin
const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf-8"
);
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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

/**
 * JWT FB Token Middleware Starts এটা পুরোপুরি JWT না, মূলত Firebase Token দিয়ে করছি
 */
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(" ")[1];
  console.log(token);
  if (!token) return res.status(401).send({ message: "Unauthorized Access!" });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    //req.tokenEmail = decoded.email;
    console.log(decoded);
    next();
  } catch (err) {
    console.log(err);
    return res.status(401).send({ message: "Unauthorized Access!", err });
  }
};

/** Middleware Ends */

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

    //verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.user?.email;
      if (!email) return res.status(401).json({ message: "Unauthorized" });

      const adminUser = await userData.findOne({ email });
      if (!adminUser || adminUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    };
    //DB ইউজার ডেটা সেভ করতে
    app.post("/storeuserdata", verifyJWT, async (req, res) => {
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
    
    app.post("/api/social-login", async (req, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;

    if (!uid || !email) {
      return res.status(401).json({ message: "Unauthorized: invalid token" });
    }

    const { name, imgURL } = req.body || {};

    const existing = await userData.findOne({ email });

    if (existing) {
      await userData.updateOne(
        { email },
        {
          $set: {
            lastLoginAt: new Date(),
            name: name || existing.name,
            imgURL: imgURL || existing.imgURL,
          },
        }
      );
      return res.json({ ok: true, action: "login", userExists: true });
    }

    const doc = {
      uid,
      email,
      name: name || null,
      imgURL: imgURL || null,
      role: "citizen",
      createdAt: new Date(),
      lastLoginAt: new Date(),
      isBlocked: false,
      isPremium: false,
    };

    await userData.insertOne(doc);
    return res.json({ ok: true, action: "created", userExists: false });
  } catch (err) {
    console.error("SOCIAL LOGIN ERROR:", err);

    // duplicate key হলে (unique index থাকলে) এটাও 500 না করে 409 দাও
    if (err?.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }

    return res.status(500).json({ message: err.message || "Server error" });
  }
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

    app.get("/api/issues-by-user", verifyJWT, async (req, res) => {
      try {
        const email = req?.user?.email;
        if (!email) {
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized!" });
        }
        const user = await userData.findOne({ email });
        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }
        let filter = {};

        if (user?.role === "admin") {
          filter = {};
        }
        if (user?.role === "staff") {
          filter = { "assignedStaff.email": email };
        }
        if (user?.role === "citizen") {
          filter = { "reportedBy.email": email };
        }
        const result = await issueData.find(filter).toArray();
        return res.status(200).send(result);
      } catch (error) {
        console.log(error);
        return res
          .status(500)
          .json({ success: false, message: "Server error" });
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

    //Latest Issue to show in homepage,
    // API
    app.get("/api/latest-resolved-issues", async (req, res) => {
      try {
        const result = await issueData
          .find({ status: "Resolved" })
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ message: "Error fetching latest issues" });
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
          success_url: `${process.env.CLIENT_URI}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.CLIENT_URI}/dashboard/payment-cancel`,
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

    //STRIPE API for Issue Boost
    // Boost Issue - create stripe session
    app.post(
      "/api/boost/create-checkout-session",
      verifyJWT,
      async (req, res) => {
        try {
          const { issueId } = req.body;
          const email = req.user?.email;
          const uid = req.user?.uid;

          if (!issueId)
            return res.status(400).json({ message: "issueId required" });
          if (!email) return res.status(401).json({ message: "Unauthorized" });

          const issue = await issueData.findOne({ _id: new ObjectId(issueId) });
          if (!issue)
            return res.status(404).json({ message: "Issue not found" });

          if (issue.isBoosted) {
            return res.status(400).json({ message: "Issue already boosted" });
          }

          // চাইলে owner restriction দিতে পারো:
          // if (issue.reportedBy?.uid !== uid) return res.status(403).json({ message: "Forbidden" });

          const amount = 100; // USD cents হিসেবে ধরলে 100 = $1.00, তুমি চাইলে 10000 = $100.00
          const name = `Boost Issue - ${issue.tracking || issue.title}`;

          const session = await stripe.checkout.sessions.create({
            success_url: `${process.env.CLIENT_URI}/dashboard/boost-success?session_id={CHECKOUT_SESSION_ID}&issueId=${issueId}`,
            cancel_url: `${process.env.CLIENT_URI}/issue/${issueId}`,
            mode: "payment",
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: { name },
                  unit_amount: amount,
                },
                quantity: 1,
              },
            ],
          });

          return res.status(200).json({ url: session.url, id: session.id });
        } catch (err) {
          console.error("Boost session error:", err);
          return res.status(400).json({ error: err.message });
        }
      }
    );

    //After payment update to DB

    // Boost Issue - store payment + mark boosted
    app.patch("/api/issues/:id/boost", verifyJWT, async (req, res) => {
      try {
        const id = req.params.id;
        const { paymentSessionID } = req.body;

        const email = req.user?.email;
        const uid = req.user?.uid;

        if (!email) return res.status(401).json({ message: "Unauthorized" });
        if (!paymentSessionID) {
          return res.status(400).json({ message: "paymentSessionID required" });
        }

        const issue = await issueData.findOne({ _id: new ObjectId(id) });
        if (!issue) return res.status(404).json({ message: "Issue not found" });

        if (issue.isBoosted) {
          return res
            .status(200)
            .json({ success: true, message: "Already boosted" });
        }

        const updateDoc = {
          $set: {
            isBoosted: true,
            boostPaymentHash: paymentSessionID,
            boostPaymentDate: new Date(),
            boostedBy: { uid, email },
          },
          $push: {
            timeline: {
              action: "Issue Boosted",
              message: `Boost payment completed (session: ${paymentSessionID})`,
              updatedBy: email,
              timestamp: new Date(),
            },
          },
        };

        const result = await issueData.updateOne(
          { _id: new ObjectId(id) },
          updateDoc,
          { upsert: false }
        );

        return res.status(200).json({ success: true, data: result });
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }
    });

    //Get Payment history list
    app.get(
      "/api/payment-history",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        try {
          const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
          const starting_after = req.query.starting_after;

          const params = { limit };
          if (starting_after) params.starting_after = starting_after;

          const paymentIntents = await stripe.paymentIntents.list(params);

          // UI-friendly shape
          const data = paymentIntents.data.map((pi) => ({
            id: pi.id,
            amount: pi.amount, // cents
            currency: pi.currency,
            status: pi.status,
            created: pi.created, // unix sec
            customer: pi.customer,
            description: pi.description,
            latest_charge: pi.latest_charge,
            metadata: pi.metadata,
          }));

          res.json({
            data,
            has_more: paymentIntents.has_more,
            next_cursor: paymentIntents.data.at(-1)?.id || null,
          });
        } catch (e) {
          console.error("Stripe error", e);
          res.status(500).json({
            message: e?.raw?.message || e.message || "Stripe error",
            code: e.code,
            type: e.type,
          });
        }
      }
    );

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
    /**All API for Admin */
    app.get("/api/staff", verifyJWT, verifyAdmin, async (req, res) => {
      const staff = await userData
        .find({ role: "staff", isBlocked: false })
        .toArray();
      res.json(staff);
    });
    app.get("/api/stafflist", verifyJWT, verifyAdmin, async (req, res) => {
      const staff = await userData.find({ role: "staff" }).toArray();
      res.json(staff);
    });

    //Issue Assign by Admin
    app.put(
      "/api/issues/:id/assign",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const { uid, name, email } = req.body;

        await issueData.updateOne(
          { _id: new ObjectId(req.params.id) },
          {
            $set: {
              assignedStaff: { uid, name, email },
              status: "Assigned to Staff", // Status remains pending until staff starts
            },
            $push: {
              timeline: {
                action: "Staff Assigned",
                message: `Issue assigned to ${name}`,
                updatedBy: "Admin",
                timestamp: new Date(),
              },
            },
          }
        );

        res.json({ success: true });
      }
    );

    //Issue Reject by Admin
    app.put("/api/issues/:id/reject", async (req, res) => {
      await issueData.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: { status: "Rejected" },
          $push: {
            timeline: {
              action: "Issue Rejected",
              message: "Issue rejected by admin",
              updatedBy: "Admin",
              timestamp: new Date(),
            },
          },
        }
      );

      res.json({ success: true });
    });

    //Create Staff API
    app.post("/api/create-staff", verifyJWT, verifyAdmin, async (req, res) => {
      let createdUid = null;

      try {
        const { name, email, password, imgURL } = req.body;

        if (!name || !email || !password) {
          return res
            .status(400)
            .json({ message: "name, email, password required" });
        }
        if (String(password).length < 6) {
          return res
            .status(400)
            .json({ message: "Password must be at least 6 characters" });
        }

        // 1) Firebase Auth user create (server side)
        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: name,
          photoURL:
            imgURL ||
            "https://i.ibb.co/TDrgpc1p/character-avatar-isolated-729149-194801.jpg",
        });

        createdUid = userRecord.uid;

        // 2) MongoDB insert (Never store password!)
        const doc = {
          uid: userRecord.uid,
          name,
          email: userRecord.email,
          imgURL: userRecord.photoURL,
          role: "staff",
          createdAt: new Date(),
          isBlocked: false,
          isPremium: true,
        };

        const existing = await userData.findOne({ email });
        if (existing) {
          // Firebase এ user তৈরি হয়ে গেছে, তাই conflict হলে rollback
          await admin.auth().deleteUser(userRecord.uid);
          return res.status(409).json({ message: "User already exists in DB" });
        }

        await userData.insertOne(doc);

        return res.status(201).json({
          message: "Staff created successfully",
          uid: doc.uid,
          email: doc.email,
        });
      } catch (err) {
        // rollback if Firebase user created but DB failed
        if (createdUid) {
          try {
            await admin.auth().deleteUser(createdUid);
          } catch (_) {}
        }
        return res.status(500).json({ error: err.message });
      }
    });
    //Staff Block/Unblock
    app.patch(
      "/api/staff/:uid/block",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        try {
          const { uid } = req.params;
          const { isBlocked } = req.body;

          const result = await userData.updateOne(
            { uid },
            { $set: { isBlocked: Boolean(isBlocked) } },
            { upsert: false }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Staff not found" });
          }

          res.json({ success: true });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    );
    //Staff Delete
    app.delete("/api/staff/:uid", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const { uid } = req.params;

        // 1) DB delete
        const dbRes = await userData.deleteOne({ uid });

        // 2) Firebase Auth delete (uid থাকলে)
        try {
          await admin.auth().deleteUser(uid);
        } catch (e) {
          // যদি firebase এ না থাকে তাও DB delete হয়ে গেছে—optional: handle/log
          console.log("Firebase delete warning:", e.message);
        }

        if (dbRes.deletedCount === 0) {
          return res.status(404).json({ message: "Staff not found in DB" });
        }

        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    //Get Users List
    app.get("/api/users", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const { role, q } = req.query;

        const filter = {};
        if (role && role !== "all") filter.role = role;

        if (q) {
          const regex = new RegExp(String(q), "i");
          filter.$or = [{ name: regex }, { email: regex }, { uid: regex }];
        }

        filter.role = { $nin: ["admin", "staff"] };

        const users = await userData
          .find(filter)
          .sort({ createdAt: -1 })
          .toArray();
        res.status(200).json(users);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    //User Block Unblock
    app.patch(
      "/api/users/:uid/block",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        try {
          const { uid } = req.params;
          const { isBlocked } = req.body;

          if (typeof isBlocked !== "boolean") {
            return res
              .status(400)
              .json({ message: "isBlocked must be boolean" });
          }

          const result = await userData.updateOne(
            { uid },
            { $set: { isBlocked } },
            { upsert: false }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found" });
          }

          res.status(200).json({ success: true, uid, isBlocked });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    );

    app.delete("/api/users/:uid", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const { uid } = req.params;

        const dbRes = await userData.deleteOne({ uid });

        try {
          await admin.auth().deleteUser(uid);
        } catch (e) {
          console.log("Firebase delete warning:", e?.message);
        }

        if (dbRes.deletedCount === 0) {
          return res.status(404).json({ message: "User not found in DB" });
        }

        res.status(200).json({ success: true, uid });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    /** API For Staff */
    //get issue data assign to staff
    app.get("/api/get-assigned-issues", verifyJWT, async (req, res) => {
      try {
        const staffEmail = req.user?.email;
        if (!staffEmail) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const issues = await issueData
          .find({ "assignedStaff.email": staffEmail })
          .sort({ createdAt: -1 })
          .toArray();

        return res.status(200).json(issues);
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }
    });

    //Resolve Action by Staff
    app.patch("/api/issues/:id/status", verifyJWT, async (req, res) => {
      try {
        const id = req.params.id;
        const staffEmail = req.user?.email;
        const { status: nextStatus } = req.body;

        if (!staffEmail)
          return res.status(401).json({ message: "Unauthorized" });
        if (!nextStatus)
          return res.status(400).json({ message: "status is required" });

        // 1) Issue must be assigned to this staff
        const issue = await issueData.findOne({
          _id: new ObjectId(id),
          "assignedStaff.email": staffEmail,
        });

        if (!issue) {
          return res
            .status(403)
            .json({ message: "Forbidden: Not assigned to you" });
        }

        // 2) Transition rules (আপনার requirement অনুযায়ী)
        // "Assigned to Staff" কে Pending equivalent ধরে নিচ্ছি
        const current = issue.status;

        const normalize = (s) => (s === "Assigned to Staff" ? "Pending" : s);

        const allowedNextMap = {
          Pending: ["In-progress"],
          "In-progress": ["Working"],
          Working: ["Resolved"],
          Resolved: ["Closed"],
          Closed: [],
        };

        const currentNorm = normalize(current);
        const allowedNext = allowedNextMap[currentNorm] || [];

        if (!allowedNext.includes(nextStatus)) {
          return res.status(400).json({
            message: `Invalid transition: ${current} -> ${nextStatus}`,
            currentStatus: current,
            allowedNext,
          });
        }

        // 3) Update status + add timeline tracking record
        const timelineRecord = {
          action: "Status Changed",
          message: `Status changed: ${current} -> ${nextStatus}`,
          updatedBy: staffEmail,
          timestamp: new Date(),
        };

        const result = await issueData.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: { status: nextStatus },
            $push: { timeline: timelineRecord },
          },
          { upsert: false }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Issue not found" });
        }

        return res.status(200).json({
          success: true,
          id,
          prevStatus: current,
          status: nextStatus,
          timelineRecord,
        });
      } catch (err) {
        return res.status(500).json({ message: err.message });
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
