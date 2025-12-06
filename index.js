/**
 * Importing express and cors 
 **/
const express = require('express');
const cors = require('cors');
require('dotenv').config()
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

app.listen(port, (res)=>{
    console.log(`SERVER RUNNING @ ${port}`);
    
});

/**......................Express Config Ends....................... */

app.get('/', (req, res) => {
    res.send('Express Server is Running!');
})