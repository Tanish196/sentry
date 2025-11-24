// ClientManager.ts
import { WebSocket } from "ws";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
const prisma =new PrismaClient();
import nodemailer from "nodemailer"
interface Data {
  location: string;
  time: string;
}

const graph: Record<string, string[]> = {
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
const locationCoords: Record<string, { lat: number; lng: number }> = {
  Alipur: { lat: 28.7986, lng: 77.1331 },
  Narela: { lat: 28.8521, lng: 77.0920 },
  Bawana: { lat: 28.8266, lng: 77.0319 },
  "Holambi Kalan": { lat: 28.7877, lng: 77.1025 },
  "Swaroop Nagar": { lat: 28.7487, lng: 77.1660 },
  Burari: { lat: 28.7285, lng: 77.2090 },
  Wazirabad: { lat: 28.7353, lng: 77.2210 },
  Timarpur: { lat: 28.6977, lng: 77.2245 },
  "Civil Lines": { lat: 28.6822, lng: 77.2243 },
  "GTB Nagar": { lat: 28.6962, lng: 77.2060 },
  "Mukherjee Nagar": { lat: 28.7045, lng: 77.2067 },
  "Model Town": { lat: 28.7043, lng: 77.1893 },
  Azadpur: { lat: 28.7090, lng: 77.1810 },
  "Adarsh Nagar": { lat: 28.7255, lng: 77.1650 },
  "Shalimar Bagh": { lat: 28.7014, lng: 77.1708 },
  Rohini: { lat: 28.7490, lng: 77.0560 },
  Pitampura: { lat: 28.6980, lng: 77.1325 },
  Mangolpuri: { lat: 28.6906, lng: 77.0944 },
  Peeragarhi: { lat: 28.6796, lng: 77.0776 },
  "Paschim Vihar": { lat: 28.6693, lng: 77.1085 },
  "Punjabi Bagh": { lat: 28.6672, lng: 77.1180 },
  "Rajouri Garden": { lat: 28.6412, lng: 77.1208 },
  "Tagore Garden": { lat: 28.6471, lng: 77.1132 },
  "Tilak Nagar": { lat: 28.6320, lng: 77.0893 },
  Janakpuri: { lat: 28.6231, lng: 77.0872 },
  "Uttam Nagar": { lat: 28.6235, lng: 77.0567 },
  Dwarka: { lat: 28.5921, lng: 77.0460 },
  Najafgarh: { lat: 28.6139, lng: 76.9798 },
  Nangloi: { lat: 28.6824, lng: 77.0672 },
  "Kashmiri Gate": { lat: 28.6676, lng: 77.2268 },
  "Old Delhi": { lat: 28.6613, lng: 77.2300 },
  "Chandni Chowk": { lat: 28.6560, lng: 77.2303 },
  Daryaganj: { lat: 28.6414, lng: 77.2477 },
  Paharganj: { lat: 28.6435, lng: 77.2189 },
  "Karol Bagh": { lat: 28.6510, lng: 77.1910 },
  "Patel Nagar": { lat: 28.6395, lng: 77.1780 },
  "Rajendra Nagar": { lat: 28.6417, lng: 77.1894 },
  "Connaught Place": { lat: 28.6315, lng: 77.2167 },
  "Mandi House": { lat: 28.6285, lng: 77.2328 },
  ITO: { lat: 28.6264, lng: 77.2396 },
  "Lajpat Nagar": { lat: 28.5703, lng: 77.2435 },
  "East of Kailash": { lat: 28.5608, lng: 77.2425 },
  "Kailash Colony": { lat: 28.5567, lng: 77.2355 },
  "Greater Kailash": { lat: 28.5342, lng: 77.2405 },
  "Chirag Delhi": { lat: 28.5308, lng: 77.2312 },
  "Hauz Khas": { lat: 28.5494, lng: 77.2001 },
  "Green Park": { lat: 28.5586, lng: 77.2063 },
  AIIMS: { lat: 28.5672, lng: 77.2086 },
  "Safdarjung Enclave": { lat: 28.5660, lng: 77.1975 },
  "RK Puram": { lat: 28.5687, lng: 77.1730 },
  "Vasant Vihar": { lat: 28.5691, lng: 77.1570 },
  "Vasant Kunj": { lat: 28.5266, lng: 77.1533 },
  Mehrauli: { lat: 28.5245, lng: 77.1855 },
  Saket: { lat: 28.5222, lng: 77.2049 },
  "Malviya Nagar": { lat: 28.5280, lng: 77.2100 },
  SDA: { lat: 28.5440, lng: 77.2089 },
  Mahipalpur: { lat: 28.5436, lng: 77.1180 },
  Aerocity: { lat: 28.5450, lng: 77.1190 },
  "IGI Airport": { lat: 28.5562, lng: 77.1000 },
  "Laxmi Nagar": { lat: 28.6260, lng: 77.2789 },
  "Preet Vihar": { lat: 28.6468, lng: 77.3150 },
  "Anand Vihar": { lat: 28.6462, lng: 77.3155 },
  Karkardooma: { lat: 28.6534, lng: 77.3090 },
  "Vivek Vihar": { lat: 28.6721, lng: 77.3154 },
  Shahdara: { lat: 28.6750, lng: 77.3200 },
  Seemapuri: { lat: 28.6878, lng: 77.3413 },
  "Dilshad Garden": { lat: 28.6752, lng: 77.3223 }
};

export class ClientManager {
  private userid: string; 
  private ws: WebSocket;
  private safetyMap: Record<string, number> = {};
  constructor(ws: WebSocket, userid: string) {
    this.ws = ws;
    this.userid = userid;
    this.ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString()) as Data;
        this.handleMessage(data).catch((err) =>
          console.error("handleMessage error:", err)
        );
      } catch (err) {
        console.error("Invalid JSON message received:", msg.toString());
      }
    });

    this.ws.on("close", () => {
      console.log(`Client ${this.userid} disconnected`);
      this.close().catch(console.error);
    });
  }

  // ------------------------ handleMessage ------------------------
  private async handleMessage(data: Data) {
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
      const updateData: any = { time: data.time };
      if (lastLoc.location !== data.location) updateData.location = data.location;
      await prisma.location.update({
        where: { id: lastLoc.id },
        data: updateData,
      });
    } else {
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
    });;
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
    const routeCoords = routeResult.map(loc => locationCoords[loc]);
    this.ws.send(JSON.stringify({
      path: routeResult,
      coords: routeCoords
    }));
    
    console.log("Route sent to client:", {
      path: routeResult,
      coords: routeCoords
    })
  }
    //----------------------------safemap-------------------------------------
public async setNode() {
  try {
    const resp = await axios.get("http://localhost/safty", { timeout: 5000 });
    if (resp && resp.data) {
      if (typeof resp.data === "object" && "safetyScores" in resp.data) {
        Object.assign(this.safetyMap, resp.data.safetyScores);
      } else if (typeof resp.data === "object") {
        Object.assign(this.safetyMap, resp.data);
      }
    }
  } catch (err: unknown) {
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
private async route(currentLocation: string, destination: string): Promise<string[]> {
  let safetyMap: Record<string, number> = { ...this.safetyMap };

  const missingLocations = Object.keys(graph).filter(loc => safetyMap[loc] == null);

  if (missingLocations.length > 0) {
    try {
      const resp = await axios.get("http://localhost/safty", { timeout: 5000 });
      const data = resp.data as any; // treat as any to avoid TS errors

      const apiScores: Record<string, number> = data?.safetyScores ?? data ?? {};

      for (const loc of missingLocations) {
        if (apiScores[loc] != null) {
          safetyMap[loc] = apiScores[loc];
        }
      }
    } catch (err: unknown) {
      console.warn(
        "API failed for missing locations, using random scores:",
        err instanceof Error ? err.message : err
      );
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
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visited = new Set<string>();
  const scoreToCost = (score: number) => 10 - score;

  for (const n of nodes) {
    dist[n] = Infinity;
    prev[n] = null;
  }
  dist[currentLocation] = 0;

while (true) {
  // Pick the unvisited node with the smallest distance
  const unvisitedNodes = nodes.filter(n => !visited.has(n) && dist[n] < Infinity);
  if (unvisitedNodes.length === 0) break;

  const u = unvisitedNodes.reduce((a, b) => (dist[a] <= dist[b] ? a : b));

  visited.add(u);

  // Stop if we reached destination
  if (u === destination) break;

  for (const v of graph[u]) {
    if (visited.has(v)) continue;
    const alt = dist[u] + scoreToCost(safetyMap[v]);
    if (alt < dist[v]) {
      dist[v] = alt;
      prev[v] = u;
    }
  }
}

  const path: string[] = [];
  let cur: string | null = destination;
  if (!isFinite(dist[destination])) return [];
  while (cur) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return path;
}


  // ------------------------ isSafe ------------------------
 private async isSafe(threshold: number = 0.0042553239): Promise<boolean> {
  const lasttime = await prisma.location.findFirst({
    where: { uid: this.userid },
    select: { time: true, safe: true }, // safe is numeric score
  });

  if (!lasttime?.time) return true;

  const now = new Date();
  const previous = new Date(lasttime.time);
  const diffMinutes = Math.max(Math.abs(now.getTime() - previous.getTime()) / (1000 * 60), 1); // avoid divide by 0

  const safeScore = lasttime.safe ?? 0;

  // Higher score is better, longer time reduces safety
  const combined = safeScore / diffMinutes;
  console.log(combined);
  console.log(threshold);
  // Consider safe if combined >= threshold
  return combined >= threshold;
}

  // ------------------------ close ------------------------
public async close() {
  if (!(await this.isSafe())) {
    console.log("User not safe: sending alert email");

    // 1) Get user's email and name from DB
    const user = await prisma.user.findUnique({
      where: { id: this.userid },
      select: { contactemail: true, name: true, relationship:true},
    });

    if (!user?.contactemail) {
      console.warn("No email found for user:", this.userid);
      return;
    }

    // 2) Create a transporter with SMTP settings
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // Gmail SMTP serve
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
    } catch (err) {
      console.error("Failed to send alert email:", err);
    }
  }
}

}
