import mongoose from "mongoose";
import { DBName } from "../constants.js";

const connectDB = async () => {
    try {
    const connectionI = await mongoose.connect(`${process.env.MONGODB_URI}/${DBName}`);
    console.log("MongoDB connected.");
    console.log(connectionI.connection.host)
    }
    catch (error)
    {
        console.error(error)
        process.exit(1)
    }
}

export default connectDB