// ClientManager.ts
import { WebSocket } from "ws";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import nodemailer from "nodemailer";
const graph = {
    Alipur: ["Narela", "Bawana", "Burari", "Swaroop Nagar"],
    Narela: ["Alipur", "Bawana", "Holambi Kalan"],
    Bawana: ["Alipur", "Narela", "Rohini"],
    "Holambi Kalan": ["Narela", "Burari"],
    "Swaroop Nagar": ["Alipur", "Burari"],
    Burari: ["Alipur", "Swaroop Nagar", "Wazirabad", "Mukherjee Nagar"],
    Wazirabad: ["Burari", "Timarpur"],
    Timarpur: ["Wazirabad", "Civil Lines"],
    "Civil Lines": ["Timarpur", "Kashmiri Gate", "GTB Nagar"],
    "GTB Nagar": ["Mukherjee Nagar", "Model Town", "Civil Lines"],
    "Mukherjee Nagar": ["Burari", "GTB Nagar", "Kamla Nagar"],
    "Model Town": ["Azadpur", "GTB Nagar", "Shalimar Bagh"],
    Azadpur: ["Model Town", "Adarsh Nagar", "Shalimar Bagh"],
    "Adarsh Nagar": ["Azadpur", "Shalimar Bagh"],
    "Shalimar Bagh": ["Azadpur", "Rohini", "Pitampura"],
    Rohini: ["Bawana", "Pitampura", "Mangolpuri"],
    Pitampura: ["Rohini", "Shalimar Bagh", "Punjabi Bagh"],
    Mangolpuri: ["Rohini", "Peeragarhi"],
    Peeragarhi: ["Mangolpuri", "Paschim Vihar"],
    "Paschim Vihar": ["Peeragarhi", "Punjabi Bagh"],
    "Punjabi Bagh": ["Paschim Vihar", "Rajouri Garden", "Ashok Vihar"],
    "Rajouri Garden": ["Punjabi Bagh", "Tagore Garden", "Tilak Nagar"],
    "Tagore Garden": ["Rajouri Garden", "Tilak Nagar"],
    "Tilak Nagar": ["Tagore Garden", "Janakpuri"],
    Janakpuri: ["Tilak Nagar", "Uttam Nagar", "Dwarka"],
    "Uttam Nagar": ["Janakpuri", "Dwarka"],
    Dwarka: ["Uttam Nagar", "Najafgarh", "IGI Airport"],
    Najafgarh: ["Dwarka", "Nangloi"],
    Nangloi: ["Najafgarh", "Punjabi Bagh"],
    "Kashmiri Gate": ["Civil Lines", "Old Delhi"],
    "Old Delhi": ["Kashmiri Gate", "Chandni Chowk"],
    "Chandni Chowk": ["Old Delhi", "Daryaganj"],
    Daryaganj: ["Chandni Chowk", "Paharganj", "ITO"],
    Paharganj: ["Daryaganj", "Karol Bagh", "Connaught Place"],
    "Karol Bagh": ["Paharganj", "Patel Nagar"],
    "Patel Nagar": ["Karol Bagh", "Rajendra Nagar"],
    "Rajendra Nagar": ["Patel Nagar", "Connaught Place"],
    "Connaught Place": ["Rajendra Nagar", "Mandi House", "Janpath"],
    "Mandi House": ["Connaught Place", "ITO"],
    ITO: ["Daryaganj", "Mandi House", "Lajpat Nagar"],
    "Lajpat Nagar": ["ITO", "East of Kailash", "Kailash Colony"],
    "East of Kailash": ["Lajpat Nagar", "Nehru Place"],
    "Kailash Colony": ["Lajpat Nagar", "Greater Kailash"],
    "Greater Kailash": ["Kailash Colony", "Chirag Delhi"],
    "Chirag Delhi": ["Greater Kailash", "Hauz Khas"],
    "Hauz Khas": ["Chirag Delhi", "Green Park", "SDA"],
    "Green Park": ["Hauz Khas", "AIIMS"],
    AIIMS: ["Green Park", "Safdarjung Enclave"],
    "Safdarjung Enclave": ["AIIMS", "RK Puram"],
    "RK Puram": ["Safdarjung Enclave", "Vasant Vihar"],
    "Vasant Vihar": ["RK Puram", "Vasant Kunj"],
    "Vasant Kunj": ["Vasant Vihar", "Mehrauli", "Mahipalpur"],
    Mehrauli: ["Vasant Kunj", "Saket"],
    Saket: ["Mehrauli", "Malviya Nagar"],
    "Malviya Nagar": ["Saket", "Hauz Khas"],
    SDA: ["Hauz Khas", "AIIMS"],
    Mahipalpur: ["Vasant Kunj", "Aerocity"],
    Aerocity: ["Mahipalpur", "IGI Airport"],
    "IGI Airport": ["Aerocity", "Dwarka"],
    "Laxmi Nagar": ["Preet Vihar", "Nirman Vihar"],
    "Preet Vihar": ["Laxmi Nagar", "Anand Vihar"],
    "Anand Vihar": ["Preet Vihar", "Karkardooma"],
    Karkardooma: ["Anand Vihar", "Vivek Vihar"],
    "Vivek Vihar": ["Karkardooma", "Shahdara"],
    Shahdara: ["Vivek Vihar", "Seemapuri"],
    Seemapuri: ["Shahdara", "Dilshad Garden"],
    "Dilshad Garden": ["Seemapuri", "Jhilmil"],
    "Yamuna Vihar": ["Seelampur", "Bhajanpura"],
    Bhajanpura: ["Yamuna Vihar", "Gokulpuri"],
    Seelampur: ["Yamuna Vihar", "Welcome"],
    Welcome: ["Seelampur", "Shahdara"],
};
export class ClientManager {
    userid;
    ws;
    safetyMap = {};
    constructor(ws, userid) {
        this.ws = ws;
        this.userid = userid;
        this.ws.on("message", (msg) => {
            try {
                const data = JSON.parse(msg.toString());
                this.handleMessage(data).catch((err) => console.error("handleMessage error:", err));
            }
            catch (err) {
                console.error("Invalid JSON message received:", msg.toString());
            }
        });
        this.ws.on("close", () => {
            console.log(`Client ${this.userid} disconnected`);
            this.close().catch(console.error);
        });
    }
    // ------------------------ handleMessage ------------------------
    async handleMessage(data) {
        console.log(`Message from ${this.userid}:`, data);
        if (!data.location || !data.time) {
            console.warn("Invalid data received, ignoring.");
            return;
        }
        // 1) Save/update user's last location in DB
        const lastLoc = await prisma.location.findFirst({
            where: { uid: this.userid },
        });
        if (lastLoc) {
            const updateData = { time: data.time };
            if (lastLoc.location !== data.location)
                updateData.location = data.location;
            await prisma.location.update({
                where: { id: lastLoc.id },
                data: updateData,
            });
        }
        else {
            await prisma.location.create({
                data: {
                    uid: this.userid,
                    location: data.location,
                    time: data.time,
                    safe: this.safetyMap[data.location],
                },
            });
        }
        // 2) Get user's destination from DB
        const user = await prisma.user.findFirst({
            where: { id: this.userid },
            select: { destination: true },
        });
        ;
        const destination = user?.destination;
        if (!destination) {
            console.log("No destination set for user:", this.userid);
            this.ws.send(JSON.stringify({ error: "No destination set for user" }));
            return;
        }
        // 3) Compute route
        console.log(data.location);
        console.log(destination);
        if (!graph[data.location] || !graph[destination]) {
            console.log("Invalid location or destination:", data.location, destination);
            return [];
        }
        const routeResult = await this.route(data.location, destination);
        // 4) Send route back to client
        this.ws.send(JSON.stringify(routeResult));
        console.log("Route sent to client:", routeResult);
    }
    //----------------------------safemap-------------------------------------
    async setNode() {
        try {
            const resp = await axios.get("http://localhost/safty", { timeout: 5000 });
            if (resp && resp.data) {
                if (typeof resp.data === "object" && "safetyScores" in resp.data) {
                    Object.assign(this.safetyMap, resp.data.safetyScores);
                }
                else if (typeof resp.data === "object") {
                    Object.assign(this.safetyMap, resp.data);
                }
            }
        }
        catch (err) {
            console.warn("API failed, using random scores");
        }
        // Fill missing nodes with random scores
        for (const node of Object.keys(graph)) {
            if (!this.safetyMap[node]) {
                this.safetyMap[node] = Math.floor(Math.random() * 10) + 1;
            }
        }
    }
    // ------------------------ route ------------------------
    async route(currentLocation, destination) {
        let safetyMap = { ...this.safetyMap };
        const missingLocations = Object.keys(graph).filter(loc => safetyMap[loc] == null);
        if (missingLocations.length > 0) {
            try {
                const resp = await axios.get("http://localhost/safty", { timeout: 5000 });
                const data = resp.data; // treat as any to avoid TS errors
                const apiScores = data?.safetyScores ?? data ?? {};
                for (const loc of missingLocations) {
                    if (apiScores[loc] != null) {
                        safetyMap[loc] = apiScores[loc];
                    }
                }
            }
            catch (err) {
                console.warn("API failed for missing locations, using random scores:", err instanceof Error ? err.message : err);
            }
        }
        // Fill remaining missing scores with random values
        for (const loc of Object.keys(graph)) {
            if (safetyMap[loc] == null || isNaN(safetyMap[loc])) {
                safetyMap[loc] = Math.floor(Math.random() * 10) + 1;
            }
        }
        // Dijkstra routing
        const nodes = Object.keys(graph);
        const dist = {};
        const prev = {};
        const visited = new Set();
        const scoreToCost = (score) => 10 - score;
        for (const n of nodes) {
            dist[n] = Infinity;
            prev[n] = null;
        }
        dist[currentLocation] = 0;
        while (true) {
            // Pick the unvisited node with the smallest distance
            const unvisitedNodes = nodes.filter(n => !visited.has(n) && dist[n] < Infinity);
            if (unvisitedNodes.length === 0)
                break;
            const u = unvisitedNodes.reduce((a, b) => (dist[a] <= dist[b] ? a : b));
            visited.add(u);
            // Stop if we reached destination
            if (u === destination)
                break;
            for (const v of graph[u]) {
                if (visited.has(v))
                    continue;
                const alt = dist[u] + scoreToCost(safetyMap[v]);
                if (alt < dist[v]) {
                    dist[v] = alt;
                    prev[v] = u;
                }
            }
        }
        const path = [];
        let cur = destination;
        if (!isFinite(dist[destination]))
            return [];
        while (cur) {
            path.unshift(cur);
            cur = prev[cur];
        }
        return path;
    }
    // ------------------------ isSafe ------------------------
    async isSafe(threshold = 1) {
        const lasttime = await prisma.location.findFirst({
            where: { uid: this.userid },
            select: { time: true, safe: true }, // safe is numeric score
        });
        if (!lasttime?.time)
            return true;
        const now = new Date();
        const previous = new Date(lasttime.time);
        const diffMinutes = Math.max(Math.abs(now.getTime() - previous.getTime()) / (1000 * 60), 1); // avoid divide by 0
        const safeScore = lasttime.safe ?? 0;
        // Higher score is better, longer time reduces safety
        const combined = safeScore / diffMinutes;
        // Consider safe if combined >= threshold
        return combined >= threshold && false;
    }
    // ------------------------ close ------------------------
    async close() {
        if (!(await this.isSafe())) {
            console.log("User not safe: sending alert email");
            // 1) Get user's email and name from DB
            const user = await prisma.user.findUnique({
                where: { id: this.userid },
                select: { contactemail: true, name: true, relationship: true },
            });
            if (!user?.contactemail) {
                console.warn("No email found for user:", this.userid);
                return;
            }
            // 2) Create a transporter with SMTP settings
            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com", // Gmail SMTP server
                port: 587, // 465 for secure
                secure: false, // true if port is 465
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS, // use app password
                },
            });
            // 3) Email options
            const mailOptions = {
                from: `"Safety Alert" <${process.env.SMTP_USER}>`,
                to: user.contactemail,
                subject: "⚠️ Safety Alert",
                text: `Hi ${user.name || ""} ' ${user.relationship || ""},\n\nThis is an alert regarding your relative. They might be in an unsafe location. Please check on them and take necessary precautions.`,
            };
            // 4) Send email
            try {
                await transporter.sendMail(mailOptions);
                console.log("Alert email sent to:", user.contactemail);
            }
            catch (err) {
                console.error("Failed to send alert email:", err);
            }
        }
    }
}
