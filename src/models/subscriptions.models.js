import mongoose, {Schema} from "mongoose";
import { APIError } from "../utils/apiError";
import { APIResponse } from "../utils/apiResponse";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,
        /* Since MongoDB only matches ObjectId values rather than
        embedded full documents, when we define channel as a reference
        to User, it actually still holds just the User’s _id
        as an ObjectId.
        */
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})



export const subscription = mongoose.model("Subscription", subscriptionSchema)