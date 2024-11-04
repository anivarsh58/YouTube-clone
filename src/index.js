import mongoose from "mongoose";

import { DBName } from "./constants.js";
import express from "express";
const app = express();
import connectDB from "./db/db.js";
import dotenv from "dotenv";

dotenv.config({
    path: "./env"
})

connectDB()
.then(() =>
{   
    app.on("error", (error) =>
    {
        console.log(error);
        throw error;
    })
    app.listen(process.env.PORT || 8000, () =>
{
    console.log(`Server started on ${process.env.PORT}.`)
})
})
.catch((error) => {
    console.log(error);
})

// (async () => {
//     try
//     {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DBName}`);
//     app.on("error", (error) => {
//         console.log(error)
//     })
//     }
//     catch(error)
//     {
//         console.error(error)
//         throw error
//     }
// })();

app.listen(process.env.PORT, () => {
    console.log(`Server has started on ${process.env.PORT}`);
})