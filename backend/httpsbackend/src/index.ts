import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

app.use(cors());
app.use(express.json());

// -------------------- JWT Middleware --------------------
export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Authorization header missing" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token missing" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    req.user = payload;
    next();
  } catch (err) {
    console.error(err);
    return res.status(403).json({ message: "Invalid token" });
  }
}

// -------------------- Signup --------------------
app.post("/signup", async (req: Request, res: Response) => {
  try {
    const {
      name,
      age,
      emailAddress,
      phoneNumber,
      nationality,
      adhaarNumber,
      contactName,
      contactemail,
      relationship,
      password,
      destination, // optional in new schema
    } = req.body;

    if (!emailAddress || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const existingUser = await prisma.user.findUnique({ where: { emailAddress } });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name || "",
        age: age || 0,
        emailAddress,
        phoneNumber: phoneNumber || "",
        nationality: nationality || "",
        adhaarNumber: adhaarNumber || "",
        contactName: contactName || "",
        contactemail: contactemail || "",
        relationship: relationship || "",
        password: hashedPassword,
        destination: destination || "", // optional
      },
    });

    res.status(201).json({ message: "Signup successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// -------------------- Signin --------------------
app.post("/signin", async (req: Request, res: Response) => {
  try {
    const { emailAddress, password } = req.body;

    if (!emailAddress || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await prisma.user.findUnique({ where: { emailAddress } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "6h" });
    res.status(200).json({ message: "Signin successful", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// -------------------- Update Destination --------------------
app.post("/destination", authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { destination } = req.body;

  if (!destination)
    return res.status(400).json({ message: "Destination is required" });

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { destination },
    });

    res.status(200).json({ message: "Destination updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// -------------------- Get user info --------------------
app.get("/user/me", authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        age: true,
        emailAddress: true,
        phoneNumber: true,
        nationality: true,
        adhaarNumber: true,
        contactName: true,
        contactemail: true,
        relationship: true,
        password: false, // hide password
        location: true,
        destination: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});


// -------------------- Test Route --------------------
app.get("/", (_req, res) => res.send("Server running"));

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 3030;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
