// require('dotenv').config({path: './env'})
import dotenv from "dotenv"

import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";

import express  from "express";
import connectDB from "./db/index.js";

import app from "./app.js";

dotenv.config({
    path: './env'
})

connectDB()
.then(() => {
    const port = process.env.PORT || 7000
    app.listen(port, () => {
        console.log(`Server is running at port ${port}`);
    })
})
.catch((err) => {
    console.log("Mongo DB connection failed !!!! ", err);
})









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