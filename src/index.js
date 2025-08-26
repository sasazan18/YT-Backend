// require('dotenv').config({path : './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})

const PORT = process.env.PORT || 8000

connectDB()
.then(() => {
    const server = app.listen(PORT, () => {
        console.log(`Server is listening on PORT: ${PORT}`)
    })
    server.on("error", (error) => {
        console.log("Server failed to start: ", error)
        process.exit(1)
    })
})
.catch((err) => {
   console.log("Connection failed!!!", err);  
})


























// Another way to connect to DB and starting the APP
/*
import express from "express";
const app = express()

;(async () => {
    try {
      await  mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
      app.on("error", (error) => {
        console.log("ERR: ", error)
        throw error
      })

      app.listen(process.env.PORT, () => {
        console.log(`App is listening on PORT: ${process.env.PORT}`)
      })
        
    } catch (error) {
        console.error("ERROR: ",error)
        throw error
    }
})()
*/
