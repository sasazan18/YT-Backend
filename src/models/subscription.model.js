import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: { // who is subscribing
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    channel: { // to which channel
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, { timestamps: true });


export const Subscription = mongoose.model("Subscription", subscriptionSchema);