import express  from "express";
import cors from 'cors'
import cookieParser from "cookie-parser";

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: '16kb'}))

//url encoding
app.use(express.urlencoded({extended: true}))  //extended object inside object
app.use(express.static("public"))

app.use(cookieParser())

//router import
import userRouter from './routes/user.routes.js'

//router declaration
app.use("/api/v1/users", userRouter)

export default app