import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async () => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !!DB HOST : ${connectionInstance.connection.host}`)  //check this output

    }
    catch(err){
        console.log("MONGODB connection error", err);
        process.exit(1);  //process reference is given by node 
    }
}

export default connectDB