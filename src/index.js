// require('dotenv').config({path: './env'})
import dotenv from "dotenv"

import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";

import express  from "express";
import connectDB from "./db/index.js";

// const app = express();

dotenv.config({
    path: './env'
})

connectDB()









/*
//IIFE
(async () => {
    try{
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       app.on("err", (error) => {
        console.log("ERROR: ", error);
        throw error
       })

       app.listen(process.env.PORT, () => {
        console.log(`App is running on port ${process.env.PORT}`);
       })
    }
    catch(error){
        console.log("Error", error)
        throw error
    }
})()
*/