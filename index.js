/**
 * Importing express and cors
 **/
const express = require("express");
const cors = require("cors");
require("dotenv").config();
//console.log(process.env.DB_USER);

/**
 * Init App as express
 */
const app = express();

//app using express, json, cors এগুলো ফাংশনাল করা হচ্ছে
app.use(express.json());
app.use(cors());

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
      //const result = await issueData.insertOne(recordIssue);
      //res.send(result);
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
    //app.delete("/api/remove-issue/:id");

    /** Issue CURD API Ends */
  } catch (err) {
    console.error(err);
  }
}
/**......................API Section Ends....................... */

//run ফাংশনকে কল করলাম
run().catch(console.dir);
